/* ============================================================================
 * build/site.mjs — build (or verify) the study site in docs/ from the two
 *                 hand-authored data files in docs/assets/.
 *
 *   docs/assets/curriculum.js   source of truth: `const ACADEMY`, `const GUIDE`
 *   docs/assets/answers.js      source of truth: `const EXERCISE_ANSWERS`
 *            |
 *            |  node build/site.mjs
 *            v
 *   docs/assets/curricula.js            window.ABDO_DATA for the renderer
 *   docs/assets/answers/sharing.json    answer keys, pre-rendered to HTML
 *   docs/assets/guides/sharing/*.json   phase guides, pre-rendered to HTML
 *   docs/assets/guides/manifest.json    guide index (title / file / toc size)
 *
 * The renderer (docs/assets/app.js) and the stylesheet are shared verbatim with
 * the unified Abdo's Salesforce Academy site, so the two stay pixel-identical.
 * Only the data is generated, which is why the generated files carry a
 * "do not edit by hand" header.
 *
 *   node build/site.mjs           regenerate every generated file
 *   node build/site.mjs --check   fail if any generated file is stale (CI)
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from './markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const ASSETS = path.join(PROJECT, 'docs', 'assets');
const GUIDE_DIR = path.join(PROJECT, 'docs', 'guide');

/* ---- academy identity (mirrors the entry in the unified academy's build) ---- */
const SLUG = 'sharing';
const META = {
  brand: 'Sharing & Visibility Architect Academy',
  name: 'Sharing and Visibility Architecture',
  cert: 'Salesforce Certified Platform Sharing and Visibility Architect',
  icon: '\ud83d\udd10',
  color: '#7E22CE',
  desc: "20 phases on OWD, role hierarchy, sharing rules, teams, Apex managed sharing, external users, permissions, scalability and the Summer '26 / Winter '27 enforcement wave.",
  repo: 'SF-Sharing-and-Visibility-Architect-road-map',
};

const repoBlob = (repo) => `https://github.com/AbdoAddouli/${repo}/blob/main/`;
const repoUrl = (repo) => `https://github.com/AbdoAddouli/${repo}`;
const liveUrl = (repo) => `https://abdoaddouli.github.io/${repo}/`;

const CHECK = process.argv.includes('--check');
const warnings = [];
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const json = (v) => JSON.stringify(v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/* ---- 1. read the authored data ------------------------------------------- */

const curriculumFile = path.join(ASSETS, 'curriculum.js');
const answersFile = path.join(ASSETS, 'answers.js');

if (!fs.existsSync(curriculumFile)) {
  console.error('docs/assets/curriculum.js is missing');
  process.exit(1);
}

const { ACADEMY, GUIDE } = new Function(
  fs.readFileSync(curriculumFile, 'utf8') + '\n;return { ACADEMY, GUIDE };'
)();

if (!Array.isArray(ACADEMY) || !ACADEMY.length) {
  console.error('curriculum.js did not export a non-empty ACADEMY array');
  process.exit(1);
}

let ANSWERS = {};
if (fs.existsSync(answersFile)) {
  try {
    ANSWERS = new Function(fs.readFileSync(answersFile, 'utf8') + '\n;return { EXERCISE_ANSWERS };')().EXERCISE_ANSWERS || {};
  } catch (e) {
    console.error(`answers.js failed to evaluate: ${e.message}`);
    process.exit(1);
  }
}

const guideBase = (GUIDE && String(GUIDE).trim()) ? GUIDE : repoBlob(META.repo) + 'docs/guide/';

/* ---- 2. normalise the module schema -------------------------------------- */

/* The renderer expects one flat shape for every module: prefixed ids, a quiz
   object, and an exIndex that points at every exercise — whether it was
   authored as a module-level card or as an `ex` / `proj` lesson block. */
const modules = ACADEMY.map((m, i) => {
  const norm = Object.assign({}, m);
  norm.id = SLUG + '-' + m.id;
  if (!norm.n) norm.n = i + 1;
  if (!norm.icon) norm.icon = META.icon;
  if (!norm.color) norm.color = META.color;
  if (!norm.tagline) norm.tagline = '';
  norm.lessons = Array.isArray(norm.lessons) ? norm.lessons : [];
  if (!norm.quiz) norm.quiz = { title: 'Module quiz', mins: 8, questions: [] };
  norm.quiz.title = norm.quiz.title || 'Module quiz';
  norm.quiz.mins = norm.quiz.mins || 8;
  norm.quiz.questions = Array.isArray(norm.quiz.questions) ? norm.quiz.questions : [];

  norm.exIndex = [];
  (norm.exercises || []).forEach((ex, card) => {
    norm.exIndex.push({ id: ex.id || null, li: -1, card, kind: ex.type === 'project' ? 'proj' : 'card' });
  });
  norm.lessons.forEach((l, li) => {
    for (const b of l.blocks || []) {
      if (b.t !== 'ex' && b.t !== 'proj') continue;
      norm.exIndex.push({ id: b.id || null, li, kind: b.t, stars: b.stars || 0 });
    }
  });

  return norm;
});

/* ---- 3. answer keys ------------------------------------------------------ */

const exerciseIds = new Set();
for (const m of modules) {
  for (const ex of m.exercises || []) if (ex.id) exerciseIds.add(ex.id);
  for (const l of m.lessons || []) {
    for (const b of l.blocks || []) if ((b.t === 'ex' || b.t === 'proj') && b.id) exerciseIds.add(b.id);
  }
}

const answerIds = Object.keys(ANSWERS).filter((id) => exerciseIds.has(id)).sort();
const orphans = Object.keys(ANSWERS).filter((id) => !exerciseIds.has(id));
if (orphans.length) warnings.push(`${orphans.length} answer key(s) with no matching exercise: ${orphans.slice(0, 5).join(', ')}${orphans.length > 5 ? '…' : ''}`);
if (!answerIds.length) warnings.push('no exercise answer keys are referenced by the curriculum');

const answerHtml = {};
for (const id of answerIds) {
  const value = ANSWERS[id];
  const isObj = value && typeof value === 'object';
  const body = String(isObj ? (value.body || '') : value).trim();
  let html = body
    ? renderMarkdown(body, { headingOffset: 2 }).html
    : '<p><em>No reference answer recorded yet.</em></p>';
  if (isObj && value.title) html = '<p><strong>' + esc(value.title) + '</strong></p>' + html;
  answerHtml[id] = html;
}

/* ---- 4. phase guides ----------------------------------------------------- */

function cleanName(file) {
  return path.basename(file).replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const byFile = new Map();
ACADEMY.forEach((m, i) => {
  const modId = SLUG + '-' + m.id;
  const n = m.n || i + 1;
  if (m.guide) byFile.set(cleanName(m.guide), { modId, n });
});

const mdFiles = fs.existsSync(GUIDE_DIR) ? fs.readdirSync(GUIDE_DIR).filter((f) => f.endsWith('.md')).sort() : [];
const numbered = mdFiles.filter((f) => /^\d\d-/.test(f));

const guides = {};
for (let i = 0; i < ACADEMY.length; i++) {
  const m = ACADEMY[i];
  const modId = SLUG + '-' + m.id;
  const n = m.n || i + 1;
  const file = (m.guide && fs.existsSync(path.join(GUIDE_DIR, m.guide)))
    ? m.guide
    : (numbered[n - 1] || numbered[i] || null);

  if (!file) { warnings.push(`${modId}: no guide file`); continue; }

  /* Links between guides become in-site deep links; anything else falls back to
     the source markdown on GitHub, exactly like the unified site does. */
  const linkFor = (href) => {
    const clean = String(href).split('#')[0].split('?')[0];
    if (!clean) return null;
    if (/^https?:\/\//i.test(clean)) return null;
    const target = byFile.get(cleanName(clean));
    if (target) return `#/a/${SLUG}/guide/${target.modId}`;
    if (/\.md$/i.test(clean)) return guideBase + clean.replace(/^\.\//, '');
    return guideBase + clean.replace(/^\.\//, '').split('/').map(encodeURIComponent).join('/');
  };

  const { html, toc, title } = renderMarkdown(fs.readFileSync(path.join(GUIDE_DIR, file), 'utf8'), { linkFor });

  guides[modId] = {
    id: modId,
    slug: SLUG,
    n,
    title: m.title,
    docTitle: title || m.title,
    file,
    source: 'docs/guide/' + file.split(path.sep).join('/'),
    url: guideBase + file.split('/').map(encodeURIComponent).join('/'),
    toc,
    html,
  };
}

const manifest = {
  generated: new Date().toISOString().slice(0, 10),
  academies: {
    [SLUG]: {
      brand: META.brand,
      guideDir: 'docs/guide',
      repo: META.repo,
      modules: Object.values(guides).map((g) => ({ id: g.id, n: g.n, title: g.title, file: g.file, toc: g.toc.length })),
    },
  },
};

/* ---- 5. emit (or verify) ------------------------------------------------- */

const entry = {
  slug: SLUG,
  meta: {
    slug: SLUG,
    brand: META.brand,
    name: META.name,
    cert: META.cert,
    icon: META.icon,
    color: META.color,
    desc: META.desc,
    repo: META.repo,
    github: repoUrl(META.repo),
    live: liveUrl(META.repo),
    guideBase,
    repoBlob: repoBlob(META.repo),
    phases: modules.length,
    source: 'docs/guide',
  },
  modules,
  answerIds,
};

let curricula = '/* =============================================================================\n';
curricula += ' * Sharing & Visibility Architect Academy — curriculum data for the study site\n';
curricula += ' * GENERATED by build/site.mjs · do not edit by hand.\n';
curricula += ' * Run  node build/site.mjs  after editing docs/assets/curriculum.js or answers.js.\n';
curricula += ' * ============================================================================= */\n\n';
curricula += 'window.ABDO_DATA = window.ABDO_DATA || {};\n';
curricula += `\nwindow.ABDO_DATA[${JSON.stringify(SLUG)}] =\n  ${json(entry)};\n`;

const files = new Map();
files.set(path.join(ASSETS, 'curricula.js'), curricula);
if (Object.keys(answerHtml).length) files.set(path.join(ASSETS, 'answers', SLUG + '.json'), json(answerHtml));
for (const [modId, data] of Object.entries(guides)) files.set(path.join(ASSETS, 'guides', SLUG, modId + '.json'), json(data));
files.set(path.join(ASSETS, 'guides', 'manifest.json'), json(manifest));

/* Guides that are no longer part of the curriculum must not linger on disk. */
const stale = [];
const guideOut = path.join(ASSETS, 'guides', SLUG);
if (fs.existsSync(guideOut)) {
  const expected = new Set([...Object.keys(guides)].map((id) => id + '.json'));
  for (const f of fs.readdirSync(guideOut)) {
    if (f.endsWith('.json') && !expected.has(f)) stale.push(path.join(guideOut, f));
  }
}

const problems = [];
if (CHECK) {
  for (const [file, want] of files) {
    const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (have === null) problems.push(`missing ${path.relative(PROJECT, file)} — run  node build/site.mjs`);
    else if (have !== want) problems.push(`stale ${path.relative(PROJECT, file)} — run  node build/site.mjs`);
  }
  for (const file of stale) problems.push(`orphan ${path.relative(PROJECT, file)} — run  node build/site.mjs`);
} else {
  for (const [file, body] of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, 'utf8');
  }
  for (const file of stale) fs.rmSync(file, { force: true });
}

const lessons = modules.reduce((a, m) => a + m.lessons.length, 0);
const kb = Math.round(Buffer.byteLength(curricula) / 1024);

if (CHECK) {
  if (problems.length) {
    console.error('FAILED — the committed site data is out of date:');
    problems.forEach((p) => console.error('  - ' + p));
    process.exit(1);
  }
  console.log(`OK — site data is current: ${modules.length} phases, ${lessons} lessons, ${Object.keys(guides).length} guides, ${answerIds.length} answer keys`);
} else {
  console.log(`✓ ${SLUG}  ${modules.length} phases · ${lessons} lessons · ${Object.keys(guides).length} guides · ${answerIds.length} answers`);
  console.log(`\nWrote ${files.size} file(s) under docs/assets/  (curricula.js ${kb} KB)`);
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((w) => console.log('  - ' + w));
}