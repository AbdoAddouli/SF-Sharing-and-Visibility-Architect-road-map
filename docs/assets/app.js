/* =============================================================================
 * Abdo's Salesforce Academy — unified learning app
 * One shell, eleven academies (admin, ba, cpq, datacloud, dev, headless, sales,
 * service, mktcloud, agentforce, appbuilder). Hash routing with an academy
 * prefix, shared renderer, unified search, and a single namespaced progress
 * store with legacy-key migration.
 * ============================================================================= */

/* ------------------------- theme ------------------------- */

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('abdo-academy-theme', t); } catch (e) {}
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = t === 'dark' ? '&#127769;' : '&#9728;&#65039;';
}

/* ------------------------- small helpers ------------------------- */

const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const esc = (s = '') => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const cyrb53 = s => { let h = 9; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761); return (h ^ h >>> 9) >>> 0; };
const scrollToId = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); };

/* ------------------------- academy registry ------------------------- */

const ACADEMIES = window.ABDO_DATA || {};
const SLUGS = Object.keys(ACADEMIES);
let cur = null;                       // active academy { slug, meta, modules, answerIds }

const curMods = () => (cur ? cur.modules : []);
const byId = id => curMods().find(m => m.id === id);

function entryBySlug(slug) { return ACADEMIES[slug] || null; }

/* Full guide url for a module (the source markdown lives in that academy's repo) */
function guideUrl(entry, mod) {
  const base = entry.meta.guideBase || entry.meta.repoBlob;
  return mod.guide ? base + mod.guide : base;
}

/* ------------------------- progress store ------------------------- */

/* Standalone single-academy variant: the unified academy site keys its store
   'abdo-academy-v1' and can read the same key for every academy. All academy
   sites share the github.io origin, so one shared key would mean this site's
   writes rewrote the unified site's store. Keep the progress keys private;
   the theme key is deliberately still shared so one toggle covers all sites. */
const KEY = 'sfsharing-v1';
let store = load();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || defaultStore(); }
  catch (e) { return defaultStore(); }
}
function defaultStore() {
  return { done: {}, quiz: {}, best: {}, stars: {}, guide: {}, bookmarks: {}, notes: {}, name: '', lastOpen: null, migrated: 0 };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
}

/* namespaced key builders */
const kDone  = (slug, mid, li) => slug + ':' + mid + ':' + li;
const kMod   = (slug, mid)     => slug + ':' + mid;

function doneIn(slug, mid, li)   { return !!store.done[kDone(slug, mid, li)]; }
function lessonDone(mid, li)     { return cur ? doneIn(cur.slug, mid, li) : false; }
function markDone(mid, li, v)    { if (cur) store.done[kDone(cur.slug, mid, li)] = v; save(); }

function guideReadOf(slug, mid)  { return !!store.guide[kMod(slug, mid)]; }
function guideRead(mid)          { return cur ? guideReadOf(cur.slug, mid) : false; }
function markGuideRead(mid, v)   { if (cur) store.guide[kMod(cur.slug, mid)] = v; save(); }

function lessonKey(slug, mid, li) { return kDone(slug, mid, li); }
function isBookmarkedIn(slug, mid, li) { return !!store.bookmarks[kDone(slug, mid, li)]; }
function isBookmarked(mid, li) { return cur ? isBookmarkedIn(cur.slug, mid, li) : false; }
function toggleBookmark(mid, li) {
  if (!cur) return false;
  const k = kDone(cur.slug, mid, li);
  if (store.bookmarks[k]) delete store.bookmarks[k]; else store.bookmarks[k] = 1;
  save();
  return !!store.bookmarks[k];
}
function bookmarkCount() { return store.bookmarks ? Object.keys(store.bookmarks).length : 0; }

function getNoteIn(slug, mid, li) { return (store.notes && store.notes[kDone(slug, mid, li)]) || ''; }
function getNote(mid, li) { return cur ? getNoteIn(cur.slug, mid, li) : ''; }
function setNote(mid, li, v) {
  if (!cur) return;
  if (!store.notes) store.notes = {};
  const k = kDone(cur.slug, mid, li);
  if (v && v.trim()) store.notes[k] = v; else delete store.notes[k];
  save();
}
function noteCount() { return store.notes ? Object.keys(store.notes).length : 0; }

function moduleProgressOf(entry, mid) {
  const m = entry.modules.find(x => x.id === mid);
  if (!m) return { done: 0, total: 0, pct: 0, quizPct: 0, complete: false, earned: 0, units: 0 };
  const lessons = m.lessons.length;
  let done = 0;
  if (guideReadOf(entry.slug, mid)) {
    done = lessons;
  } else {
    m.lessons.forEach((_, i) => { if (doneIn(entry.slug, mid, i)) done++; });
  }
  const units = lessons * 2 + 1;
  const earned = done * 2 + (store.quiz[kMod(entry.slug, mid)] ? 1 : 0);
  const pct = Math.round((earned / units) * 100);
  const complete = earned >= units;
  return { done, total: lessons, pct, quizPct: quizPctOf(entry, mid), complete, earned, units };
}
function moduleProgress(mid) { return cur ? moduleProgressOf(cur, mid) : { done: 0, total: 0, pct: 0, quizPct: 0, complete: false, earned: 0, units: 0 }; }

function quizPctOf(entry, mid) {
  const m = entry.modules.find(x => x.id === mid);
  const best = store.best[kMod(entry.slug, mid)];
  if (!m || !best) return 0;
  return Math.round((best / m.quiz.questions.length) * 100);
}

function overallPctOf(entry) {
  const rows = entry.modules.map(m => {
    const p = moduleProgressOf(entry, m.id);
    return p.units ? p.earned / p.units * 100 : 0;
  });
  if (!rows.length) return 0;
  return Math.round(rows.reduce((a, b) => a + b, 0) / rows.length);
}
function overallPct() { return cur ? overallPctOf(cur) : globalPct(); }

function globalPct() {
  if (!SLUGS.length) return 0;
  const rows = SLUGS.map(s => overallPctOf(ACADEMIES[s]));
  return Math.round(rows.reduce((a, b) => a + b, 0) / rows.length);
}

function minutesLeftOf(entry) {
  let left = 0;
  entry.modules.forEach(m => {
    if (guideReadOf(entry.slug, m.id)) return;
    m.lessons.forEach((l, i) => { if (!doneIn(entry.slug, m.id, i)) left += (l.mins || 0); });
    if (!store.quiz[kMod(entry.slug, m.id)]) left += (m.quiz.mins || 0);
  });
  return left;
}
function minutesLeft() { return cur ? minutesLeftOf(cur) : SLUGS.reduce((a, s) => a + minutesLeftOf(ACADEMIES[s]), 0); }

function nextIncomplete(limit) {
  const out = [];
  if (!cur) return out;
  for (const m of cur.modules) {
    if (guideReadOf(cur.slug, m.id)) continue;
    for (let i = 0; i < m.lessons.length; i++) {
      if (!doneIn(cur.slug, m.id, i)) { out.push({ m, i }); if (out.length >= limit) return out; }
    }
  }
  return out;
}
function resumePoint(entry) {
  const last = store.lastOpen;
  if (last && last.slug === entry.slug) {
    const m = entry.modules.find(x => x.id === last.mid);
    if (m) return { m, li: Math.max(0, Math.min(last.li || 0, m.lessons.length - 1)) };
  }
  for (const m of entry.modules) {
    for (let i = 0; i < m.lessons.length; i++) {
      if (!doneIn(entry.slug, m.id, i)) return { m, li: i };
    }
  }
  const first = entry.modules[0];
  return first ? { m: first, li: 0 } : null;
}

/* ------------------------- legacy migration ------------------------- */
/* The source sites each used their own localStorage key (several of
   them shared one by accident). On first run we adopt whatever progress we
   can match to this store so nothing is lost when you move to the academy. */

/* The unified academy site uses this list to adopt progress from the retired
   per-academy sites. The legacy stores belong to *other* academies; their
   unprefixed lesson ids ("01", "02", …) would match this academy's id map and
   be adopted here, which would be worse than losing them. Nothing to migrate. */
const LEGACY_KEYS = [];

function migrateLegacy() {
  let existing;
  try { existing = JSON.parse(localStorage.getItem(KEY)); } catch (e) { existing = null; }
  if (existing && existing.migrated) return;   // already ran once

  let adopted = 0;
  for (const lk of LEGACY_KEYS) {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(lk)); } catch (e) { continue; }
    if (!raw || typeof raw !== 'object') continue;

    for (const slug of SLUGS) {
      const entry = ACADEMIES[slug];
      const idMap = new Map();            // prefixed id -> unprefixed legacy id
      entry.modules.forEach(m => idMap.set(m.id.slice(slug.length + 1), m.id));

      if (raw.done && typeof raw.done === 'object') {
        for (const k of Object.keys(raw.done)) {
          const parts = k.split(':');
          if (parts.length < 2) continue;
          const li = parts[parts.length - 1];
          const mid = parts.slice(0, -1).join(':');
          const prefixed = idMap.get(mid);
          if (!prefixed) continue;
          const nk = kDone(slug, prefixed, li);
          if (!(nk in store.done)) { store.done[nk] = raw.done[k]; adopted++; }
        }
      }
      for (const field of ['quiz', 'best', 'guide']) {
        if (raw[field] && typeof raw[field] === 'object') {
          for (const mid of Object.keys(raw[field])) {
            const prefixed = idMap.get(mid);
            if (!prefixed) continue;
            const nk = kMod(slug, prefixed);
            if (!(nk in store[field])) store[field][nk] = raw[field][mid];
          }
        }
      }
    }
  }
  store.migrated = Date.now();
  save();
  if (adopted) console.info('Migrated ' + adopted + ' completed lessons from the standalone academies.');
}

/* ------------------------- progress export / import ------------------------- */

function exportProgress() {
  try {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sharing-and-visibility-architect-progress.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Progress exported &#11015;&#65039;');
  } catch (e) { toast('Export failed'); }
}
function pickImport() {
  let input = $('#importFile');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json'; input.id = 'importFile';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) importProgress(input.files[0]);
      input.value = '';
    });
  }
  input.click();
}
function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('bad');
      store = Object.assign(defaultStore(), data);
      save(); navigate('home');
      toast('Progress imported &#11014;&#65039;');
    } catch (e) { toast('Could not read that file'); }
  };
  reader.readAsText(file);
}

/* ------------------------- routing ------------------------- */

let route = { view: 'dashboard', acad: null, mid: null, li: null };

function hashFor() {
  const r = route;
  const a = r.acad || (cur ? cur.slug : '');
  if (r.view === 'phase')      return '/a/' + a + '/phase/' + r.mid;
  if (r.view === 'lesson')     return '/a/' + a + '/lesson/' + r.mid + '/' + r.li + (r.anchor ? '/' + r.anchor : '');
  if (r.view === 'quiz')       return '/a/' + a + '/quiz/' + r.mid;
  if (r.view === 'guide')      return '/a/' + a + '/guide/' + r.mid + (r.anchor ? '/' + r.anchor : '');
  if (r.view === 'certificate')return '/a/' + a + '/certificate';
  if (r.view === 'academy')    return '/a/' + a;
  if (r.view === 'bookmarks')  return '/bookmarks';
  return '/';
}
function parseHash() {
  const h = decodeURIComponent((location.hash || '#/').replace(/^#/, ''));
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'a') {
    const acad = parts[1];
    if (!ACADEMIES[acad]) return { view: 'dashboard', acad: null };
    if (parts[2] === 'phase')      return { view: 'phase', acad, mid: parts[3] };
    if (parts[2] === 'lesson')     return { view: 'lesson', acad, mid: parts[3], li: Number(parts[4]), anchor: parts[5] || null };
    if (parts[2] === 'quiz')       return { view: 'quiz', acad, mid: parts[3] };
    if (parts[2] === 'guide')      return { view: 'guide', acad, mid: parts[3], anchor: parts[4] || null };
    if (parts[2] === 'certificate')return { view: 'certificate', acad };
    return { view: 'academy', acad };
  }
  if (parts[0] === 'bookmarks') return { view: 'bookmarks', acad: null };
  return { view: 'dashboard', acad: null };
}

function navigate(view, mid, li, anchor) {
  route = { view, acad: cur ? cur.slug : (route.acad || null), mid: mid || null, li: li != null ? li : null, anchor: anchor || null };
  if (view === 'dashboard' || view === 'bookmarks') route.acad = null;
  history.replaceState(null, '', '#' + hashFor());
  render();
}
/* hash helper used inside templates: H('phase', mod.id) */
function H(view, mid, li, anchor) {
  const a = cur ? cur.slug : '';
  switch (view) {
    case 'dashboard': return '#/';
    case 'bookmarks': return '#/bookmarks';
    case 'academy':   return '#/a/' + a;
    case 'phase':     return '#/a/' + a + '/phase/' + mid;
    case 'lesson':    return '#/a/' + a + '/lesson/' + mid + '/' + li + (anchor ? '/' + anchor : '');
    case 'quiz':      return '#/a/' + a + '/quiz/' + mid;
    case 'guide':     return '#/a/' + a + '/guide/' + mid;
    case 'certificate': return '#/a/' + a + '/certificate';
    default: return '#/';
  }
}

/* ------------------------- renderer ------------------------- */

const view = $('#view');

function render() {
  if (quizKeyHandler) { document.removeEventListener('keydown', quizKeyHandler); quizKeyHandler = null; }

  const r = parseHash();
  route = r;
  cur = r.acad ? entryBySlug(r.acad) : null;

  if (!cur && ['phase', 'lesson', 'quiz', 'guide', 'certificate', 'academy'].includes(r.view)) {
    route = { view: 'dashboard', acad: null };
    history.replaceState(null, '', '#/');
    return render();
  }

  const mod = (r.mid && cur) ? byId(r.mid) : null;

  /* document title */
  const suffix = mod ? ' · ' + mod.title : '';
  const brand = cur ? cur.meta.brand : "Abdo's Salesforce Academy";
  document.title = brand + suffix;

  renderSidebar();

  const op = overallPct();
  const tp = $('#topPct'); if (tp) tp.textContent = op + '%';
  const tbar = $('#topBar'); if (tbar) tbar.style.width = op + '%';
  // Standalone single-academy variant: the dashboard subtitle used to fall back to
  // SLUGS.length + ' academies', which reads "1 academies" here. Use the academy brand.
  const bsub = $('#brandSub'); if (bsub) bsub.textContent = cur ? cur.meta.brand : 'Sharing and Visibility Architecture';
  // The footer count used to be a literal in index.html and had already gone
  // stale (it still said 8 after Marketing Cloud made it 9). Drive it from the
  // registry so adding an academy cannot desync it again.
  const fcount = $('#footerCount'); if (fcount) fcount.textContent = SLUGS.length;
  bindTopSearch();

  if (r.view === 'phase' && mod)  return renderModule(mod);
  if (r.view === 'lesson' && mod) return renderLesson(mod, Math.min(Number(r.li) || 0, mod.lessons.length - 1));
  if (r.view === 'quiz' && mod)   return renderQuiz(mod);
  if (r.view === 'guide' && mod)  return renderGuide(mod);
  if (r.view === 'bookmarks')     return renderBookmarks();
  if (r.view === 'certificate' && cur) return renderCertificate(cur);
  if (r.view === 'academy')       return renderHome();
  return renderDashboard();
}

/* ------------------------- sidebar ------------------------- */

function renderSidebar() {
  const aside = $('aside.sidebar');
  aside.innerHTML = `
    <div class="side-brand">
      <div class="logo">&#127891;</div>
      <div><b>Abdo&rsquo;s Salesforce Academy</b><span>${SLUGS.length} academies &middot; one studio</span></div>
    </div>
    <div class="acad-switch">
      <label for="acadSelect">Academy</label>
      <select id="acadSelect" aria-label="Switch academy">
        <option value="">All academies</option>
        ${SLUGS.map(s => `<option value="${s}" ${cur && cur.slug === s ? 'selected' : ''}>${esc(ACADEMIES[s].meta.icon)} ${esc(ACADEMIES[s].meta.brand)}</option>`).join('')}
      </select>
    </div>`;

  const nav = document.createElement('nav');
  nav.className = 'side-nav';
  nav.id = 'sidebarNav';

  const mkLink = (href, viewName, icon, label, extra) => {
    const a = document.createElement('a');
    a.href = href;
    const active = route.view === viewName;
    a.className = 'side-link' + (active ? ' active' : '');
    if (active) a.setAttribute('aria-current', 'page');
    a.innerHTML = `<span class="sli">${icon}</span> ${label}${extra || ''}`;
    return a;
  };
  nav.appendChild(mkLink('#/', 'dashboard', '&#127968;', 'Dashboard'));
  nav.appendChild(mkLink('#/bookmarks', 'bookmarks', '&#9733;', 'Bookmarks', bookmarkCount() ? `<span class="sl-count">${bookmarkCount()}</span>` : ''));

  if (cur) {
    const badge = document.createElement('div');
    badge.className = 'side-acad';
    badge.style.setProperty('--c', cur.meta.color);
    badge.innerHTML = `<span class="sa-ico">${cur.meta.icon}</span><span class="sa-txt"><b>${esc(cur.meta.brand)}</b><small>${cur.meta.phases} phases &middot; ${esc(cur.meta.cert)}</small></span>`;
    nav.appendChild(badge);

    cur.modules.forEach(m => {
      const p = moduleProgressOf(cur, m.id);
      const a = document.createElement('a');
      a.href = H('phase', m.id);
      a.className = 'side-phase' + (route.mid === m.id ? ' active' : '');
      if (route.mid === m.id) a.setAttribute('aria-current', 'page');
      a.innerHTML = `
        <span class="sp-n" style="border-color:${m.color}">${String(m.n).padStart(2, '0')}</span>
        <span class="sp-body">
          <span class="sp-title">${m.title}</span>
          <span class="sp-bar"><i style="width:${p.pct}%;background:${m.color}"></i></span>
        </span>
        <span class="sp-pct">${p.pct}%</span>
        ${p.complete ? '<span class="sp-ok">&#10003;</span>' : ''}`;
      nav.appendChild(a);
    });
  } else {
    const hint = document.createElement('div');
    hint.className = 'side-hint';
    hint.textContent = 'Pick an academy above to open its phase roadmap.';
    nav.appendChild(hint);
  }

  aside.appendChild(nav);

  const tools = document.createElement('div');
  tools.className = 'side-tools';
  tools.innerHTML = `
    <button class="tool-btn" id="exportBtn" title="Download your progress as a file">&#11015;&#65039; Export</button>
    <button class="tool-btn" id="importBtn" title="Restore progress from a file">&#11014;&#65039; Import</button>
    <button class="tool-btn danger" id="resetBtn" title="Erase all progress">&#8634; Reset</button>`;
  aside.appendChild(tools);
  $("#exportBtn", tools).addEventListener('click', exportProgress);
  $("#importBtn", tools).addEventListener('click', pickImport);
  $("#resetBtn", tools).addEventListener('click', () => {
    if (confirm('Erase all progress, bookmarks and notes across every academy? This cannot be undone.')) {
      store = defaultStore(); save(); navigate('home'); toast('Progress reset');
    }
  });

  const op = cur ? overallPctOf(cur) : globalPct();
  const progWrap = document.createElement('div');
  progWrap.className = 'side-progress';
  progWrap.innerHTML = `<div class="sp-bar big"><i style="width:${op}%"></i></div>
    <div class="side-prog-label"><b>${op}%</b> ${cur ? 'of this academy' : 'across all academies'}</div>`;
  aside.appendChild(progWrap);

  const sel = $('#acadSelect', aside);
  if (sel) sel.addEventListener('change', () => {
    location.hash = sel.value ? '#/a/' + sel.value : '#/';
  });
}

/* ------------------------- dashboard (all academies) ------------------------- */

function globalStats() {
  let lessons = 0, quizCount = 0, questions = 0, mastered = 0, passed = 0, units = 0, doneUnits = 0;
  SLUGS.forEach(s => {
    const e = ACADEMIES[s];
    e.modules.forEach(m => {
      lessons += m.lessons.length;
      quizCount++;
      questions += m.quiz.questions.length;
      const p = moduleProgressOf(e, m.id);
      if (p.complete) mastered++;
      units += p.units; doneUnits += p.earned;
      const best = store.best[kMod(e.slug, m.id)];
      if (best != null && best >= m.quiz.questions.length) passed++;
    });
  });
  return { lessons, quizCount, questions, mastered, passed, units, doneUnits, phases: units ? Math.round(doneUnits / units * 100) : 0 };
}

function renderDashboard() {
  const gp = globalPct();
  const st = globalStats();
  const left = minutesLeft();
  const entries = SLUGS.map(s => ACADEMIES[s]);
  const started = entries.find(e => overallPctOf(e) > 0);
  const resume = started ? resumePoint(started) : null;

  view.innerHTML = `
    <div class="home-hero reveal">
      <div>
        <div class="hero-kicker">Salesforce certifications &middot; one interactive studio</div>
        <h1 class="hero-title">Become <span class="grad">Salesforce certified</span>, one phase at a time.</h1>
        <p class="hero-sub">${SLUGS.length} academies &middot; ${entries.reduce((a, e) => a + e.meta.phases, 0)} phases &middot; ${st.lessons} lessons &middot; ${st.questions} quiz questions &mdash; every roadmap with its GitHub repo and live site in one place.</p>
        <div class="hero-actions">
          ${resume ? `<button class="btn primary" id="startBtn">&#9654; ${started ? esc(started.meta.brand) : ''} &mdash; continue</button>` : ''}
          <button class="btn ghost" id="browseBtn">Browse academies</button>
          <button class="btn ghost" id="searchBtn2">&#128269; Search all <span class="kbd">/</span></button>
          <span class="hero-meta">&#128197; ${entries.reduce((a, e) => a + e.meta.phases, 0)} phases &middot; ~${left} min of study left</span>
        </div>
      </div>
      <div class="ring-wrap">
        <div class="ring" style="--p:${gp}"><span>${gp}<small>%</small></span></div>
        <div class="ring-caption">across every academy</div>
      </div>
    </div>

    <div class="stats reveal">
      <div class="stat"><div class="st-n">${SLUGS}<small>/</small></div><div class="st-l">academies</div></div>
      <div class="stat"><div class="st-n">${st.doneUnits}<small>/${st.units}</small></div><div class="st-l">units completed</div></div>
      <div class="stat"><div class="st-n">${st.passed}<small>/${st.questions}</small></div><div class="st-l">quiz questions perfect</div></div>
      <div class="stat"><div class="st-n">${left}<small> min</small></div><div class="st-l">~ study time left</div></div>
    </div>

    <div class="grid-head reveal"><h2>Academies</h2><span>${entries.length} &middot; pick a certification track</span></div>
    <div class="acad-grid reveal">
      ${entries.map(e => {
        const pct = overallPctOf(e);
        return `
        <div class="acad-card" style="--c:${e.meta.color}">
          <div class="acd-top">
            <span class="acd-icon">${e.meta.icon}</span>
            <span class="acd-cert">${esc(e.meta.cert)}</span>
            ${pct >= 100 ? '<span class="acd-done">&#10003;</span>' : ''}
          </div>
          <h3>${esc(e.meta.brand)}</h3>
          <div class="acd-name">${esc(e.meta.name)}</div>
          <p class="acd-desc">${esc(e.meta.desc)}</p>
          <div class="acd-prog">
            <div class="sp-bar"><i style="width:${pct}%;background:${e.meta.color}"></i></div>
            <div class="acd-meta"><span>${pct}% &middot; ${e.meta.phases} phases</span></div>
          </div>
          <div class="acd-foot">
            <a class="btn primary sm" href="#/a/${e.slug}">${pct > 0 ? 'Continue &#8594;' : 'Start &#8594;'}</a>
            <a class="acd-ext" href="${e.meta.live}" target="_blank" rel="noopener" title="Open the original standalone site">&#8599; Site</a>
            <a class="acd-ext" href="${e.meta.github}" target="_blank" rel="noopener" title="Open the GitHub repo">&#128196; Repo</a>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  const sb = $('#startBtn');
  if (sb) sb.addEventListener('click', () => {
    if (!started || !resume) return;
    location.hash = '#/a/' + started.slug + '/lesson/' + resume.m.id + '/' + resume.li;
  });
  const bb = $('#browseBtn');
  if (bb) bb.addEventListener('click', () => scrollToId('acadGrid'));
  const sb2 = $('#searchBtn2');
  if (sb2) sb2.addEventListener('click', openSearch);
}

/* ------------------------- academy home ------------------------- */

function renderHome() {
  const entry = cur;
  const MODULES = entry.modules;
  const meta = entry.meta;
  const op = overallPctOf(entry);
  const totalLessons = MODULES.reduce((a, m) => a + m.lessons.length, 0);
  const left = minutesLeftOf(entry);

  const resume = resumePoint(entry);
  const next = resume;
  const upcoming = nextIncomplete(3);

  let nextQ = null;
  for (const m of MODULES) {
    for (let i = 0; i < m.lessons.length; i++) {
      if (!doneIn(entry.slug, m.id, i)) { nextQ = { m, i }; break; }
    }
    if (nextQ) break;
  }
  if (!nextQ) nextQ = { m: MODULES[0], i: 0 };

  const doneUnits = MODULES.reduce((a, m) => a + moduleProgressOf(entry, m.id).earned, 0);
  const units = MODULES.reduce((a, m) => a + moduleProgressOf(entry, m.id).units, 0);

  view.innerHTML = `
    <div class="home-hero reveal">
      <div>
        <div class="hero-kicker">${esc(meta.name)} &middot; study for ${esc(meta.cert)}</div>
        <h1 class="hero-title">Become <span class="grad">${esc(meta.cert)} certified</span>, phase by phase.</h1>
        <p class="hero-sub">${MODULES.length} guided phases, ${totalLessons} lessons, ${MODULES.length} quizzes &mdash; with real metadata in the <a href="${meta.github}" target="_blank" rel="noopener" class="inline-link">GitHub repo</a> to deploy and practise on.</p>
        <div class="hero-actions">
          <button class="btn primary" id="startBtn">&#9654; ${resume ? 'Continue learning' : 'Start phase 1'}</button>
          <button class="btn ghost" id="phasesBtn">Browse all phases</button>
          <button class="btn ghost" id="searchBtn2">&#128269; Search <span class="kbd">/</span></button>
          <a class="btn ghost ext" href="${meta.live}" target="_blank" rel="noopener">&#8599; Original site</a>
          <span class="hero-meta">&#128197; ${MODULES.length} phases &middot; ${totalLessons} lessons &middot; ~${left} min left</span>
        </div>
      </div>
      <div class="ring-wrap">
        <div class="ring" style="--p:${op}"><span>${op}<small>%</small></span></div>
        <div class="ring-caption">roadmap progress</div>
      </div>
    </div>

    <div class="stats reveal">
      <div class="stat"><div class="st-n">${doneUnits}<small>/${units}</small></div><div class="st-l">units completed</div></div>
      <div class="stat"><div class="st-n">${MODULES.filter(m => moduleProgressOf(entry, m.id).complete).length}<small>/</small></div><div class="st-l">phases mastered</div></div>
      <div class="stat"><div class="st-n">${MODULES.filter(m => { const b = store.best[kMod(entry.slug, m.id)]; return b != null && b >= m.quiz.questions.length; }).length}<small>/</small></div><div class="st-l">quizzes passed</div></div>
      <div class="stat"><div class="st-n">${left}<small> min</small></div><div class="st-l">~ study time left</div></div>
    </div>

    ${op >= 100 ? `
    <a class="cert-banner reveal" href="${H('certificate')}">
      <span class="cb-ico">&#127891;</span>
      <span class="cb-body"><b>Roadmap complete!</b><span>You finished all ${MODULES.length} phases &mdash; claim your certificate.</span></span>
      <span class="cb-go">Get certificate &#8594;</span>
    </a>` : ''}

    <div class="home-cards">
      <div class="card continue-card" style="--c:${resume.m.color}">
        <div class="cc-top"><span class="cc-label">Continue where you left off</span><span class="pill">Phase ${resume.m.n}</span></div>
        <h3>${resume.li != null && resume.li < resume.m.lessons.length ? esc(resume.m.lessons[resume.li].title) : esc(resume.m.lessons[0].title)}</h3>
        <div class="cc-sub">${esc(resume.m.title)}</div>
        <div class="sp-bar"><i style="width:${moduleProgressOf(entry, resume.m.id).pct}%;background:${resume.m.color}"></i></div>
        <button class="btn primary sm" id="resumeBtn">Resume &#8594;</button>
      </div>
      <div class="card next-card" style="--c:${nextQ.m.color}">
        <div class="cc-top"><span class="cc-label">Next up</span><span class="pill">Phase ${nextQ.m.n}</span></div>
        <h3>${nextQ.i != null && nextQ.i < nextQ.m.lessons.length ? esc(nextQ.m.lessons[nextQ.i].title) : esc(nextQ.m.lessons[0].title)}</h3>
        <div class="cc-sub">${nextQ.m.lessons[nextQ.i] ? nextQ.m.lessons[nextQ.i].mins + ' min &middot; ' : ''}${nextQ.m.lessons.length} lessons &middot; ${nextQ.m.quiz.questions.length}-question quiz</div>
        <button class="btn sm" id="nextBtn">Open &#8594;</button>
      </div>
      <div class="card plan-card" style="--c:#e8b93d">
        <div class="cc-top"><span class="cc-label">Your next steps</span><span class="pill">${upcoming.length}</span></div>
        <ol class="plan-list">
          ${upcoming.length ? upcoming.map(x => `
            <li>
              <a href="${H('lesson', x.m.id, x.i)}">
                <span class="pl-n" style="background:${x.m.color}">${String(x.m.n).padStart(2, '0')}</span>
                <span class="pl-t">${esc(x.m.lessons[x.i].title)}<small>${esc(x.m.title)} &middot; ${x.m.lessons[x.i].mins} min</small></span>
              </a>
            </li>`).join('') : '<li class="pl-done">&#127881; Nothing left &mdash; every lesson is complete!</li>'}
        </ol>
      </div>
    </div>

    <div class="grid-head reveal"><h2>Your roadmap</h2><span id="gridCount"></span></div>
    <div class="grid-tools reveal">
      <span class="gt-ico">&#128269;</span>
      <input id="phaseFilter" type="search" placeholder="Filter phases…" autocomplete="off" />
    </div>
    <div class="module-grid reveal" id="modGrid"></div>`;

  const s = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('click', fn); };
  s('startBtn',   () => navigate('lesson', resume.m.id, resume.li));
  s('resumeBtn',  () => navigate('lesson', resume.m.id, resume.li));
  s('nextBtn',    () => navigate('lesson', nextQ.m.id, nextQ.i));
  s('phasesBtn',  () => navigate('phase', MODULES[0].id));
  s('searchBtn2', openSearch);

  const grid = $('#modGrid');
  const countEl = $('#gridCount');
  function drawGrid(q) {
    q = (q || '').trim().toLowerCase();
    grid.innerHTML = '';
    const list = !q ? MODULES : MODULES.filter(m =>
      (m.title + ' ' + m.tagline + ' ' + (m.objectives || []).join(' ') + ' ' + m.lessons.map(l => l.title).join(' ')).toLowerCase().includes(q));
    if (countEl) countEl.textContent = q
      ? list.length + ' of ' + MODULES.length + ' phases match'
      : MODULES.length + ' phases &middot; study in order or jump anywhere';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'grid-empty';
      empty.textContent = 'No phases match "' + q + '".';
      grid.appendChild(empty);
      return;
    }
    list.forEach(m => {
      const p = moduleProgressOf(entry, m.id);
      const card = document.createElement('a');
      card.href = H('phase', m.id);
      card.className = 'mod-card';
      card.style.setProperty('--c', m.color);
      card.innerHTML = `
        <div class="mc-top">
          <span class="mc-num">${String(m.n).padStart(2, '0')}</span>
          <span class="mc-ico">${m.icon}</span>
          ${p.complete ? '<span class="mc-done">&#10003; completed</span>' : ''}
        </div>
        <h3>${esc(m.title)}</h3>
        <div class="mc-tag">${esc(m.tagline)}</div>
        <div class="mc-prog">
          <div class="sp-bar"><i style="width:${p.pct}%;background:${m.color}"></i></div>
          <div class="mc-sub">${p.done}/${p.total} lessons &middot; ${p.quizPct}% quiz</div>
        </div>
        <div class="mc-foot">
          <span>${m.lessons.length} lessons &middot; ${m.quiz.questions.length} quiz</span>
          <span class="mc-arrow">&#8594;</span>
        </div>`;
      grid.appendChild(card);
    });
  }
  drawGrid('');
  const pf = $('#phaseFilter');
  if (pf) pf.addEventListener('input', () => drawGrid(pf.value));
}

/* ------------------------- module/phase page ------------------------- */

/* Exercises live either as module-level cards (Admin) or as t:'ex'/'t:'proj'
   blocks inside lessons (every other academy). The build emits mod.exIndex so
   both shapes are reachable from the phase page. */
function moduleExercises(mod) {
  if (Array.isArray(mod.exIndex) && mod.exIndex.length) return mod.exIndex;
  return (mod.exercises || []).map((ex, card) => ({ id: ex.id || null, li: -1, card, kind: ex.type === 'project' ? 'proj' : 'card' }));
}

function exerciseBlock(mod, entry) {
  if (entry.li === -1) return (mod.exercises || [])[entry.card || 0] || null;
  const lesson = mod.lessons[entry.li];
  if (!lesson) return null;
  return (lesson.blocks || []).find(b => (b.t === 'ex' || b.t === 'proj') && (b.id || null) === entry.id) || null;
}

function exerciseAnchorForId(id) {
  return 'ex-' + String(id != null ? id : 'ex').replace(/[^\w-]/g, '-');
}

function exerciseAnchorId(mod, entry) {
  if (entry.li === -1) {
    const ex = (mod.exercises || [])[entry.card || 0] || {};
    return 'ex-card-' + (ex.id != null ? ex.id : (ex.n != null ? ex.n : (entry.card || 0)));
  }
  return exerciseAnchorForId(entry.id != null ? entry.id : 'ex' + entry.li);
}

function renderModule(mod) {
  const p = moduleProgress(mod.id);
  const quizScore = store.quiz[kMod(cur.slug, mod.id)];
  const quizBest  = store.best[kMod(cur.slug, mod.id)];
  const exCount = moduleExercises(mod).length;

  view.innerHTML = `
    <div class="crumb reveal"><a href="${H('dashboard')}">Dashboard</a> <span>&#8250;</span> <a href="${H('academy')}">${esc(cur.meta.brand)}</a> <span>&#8250;</span> <b>${mod.title}</b></div>

    <div class="phase-hero reveal" style="--c:${mod.color}">
      <div class="ph-ico">${mod.icon}</div>
      <div class="ph-body">
        <div class="ph-kicker">Phase ${String(mod.n).padStart(2, '0')} &middot; ${esc(mod.tagline)}</div>
        <h1>${mod.title}</h1>
        <div class="ph-obj"><span>By the end you can:</span>
          <ul>${(mod.objectives || []).map(o => `<li>${esc(o)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="ph-side">
        <div class="ring sm" style="--p:${p.pct};--c:${mod.color}"><span>${p.pct}<small>%</small></span></div>
        <div class="ph-stats">
          <span>${p.done}/${p.total} lessons</span>
          <span>${quizScore ? '&#10003; quiz taken' : 'quiz pending'}</span>
        </div>
        <a class="btn primary sm" href="${H('guide', mod.id)}">&#128214; Read the full guide</a>
      </div>
    </div>

    <div class="lessons reveal">
      <a class="lesson-row guide-row" href="${H('guide', mod.id)}" style="--c:${mod.color}">
        <span class="lr-state guide">&#128214;</span>
        <span class="lr-info">
          <b>Full module guide</b>
          <span class="lr-meta">complete walkthrough right here &middot; sections, tables, code &amp; checklists${guideRead(mod.id) ? ' &middot; read &#10003;' : ''}</span>
        </span>
        <span class="lr-arrow">&#8594;</span>
      </a>
      ${mod.lessons.map((l, i) => `
        <a class="lesson-row" href="${H('lesson', mod.id, i)}" style="--c:${mod.color}">
          <span class="lr-state">${lessonDone(mod.id, i) ? '<span class="lr-done">&#10003;</span>' : String(i + 1).padStart(2, '0')}</span>
          <span class="lr-info">
            <b>${l.title}</b>
            <span class="lr-meta">${l.mins} min</span>
          </span>
          <span class="lr-arrow">&#8594;</span>
        </a>`).join('')}
    </div>

    ${exCount ? renderExercises(mod) : ''}

    <div class="quiz-card reveal" style="--c:${mod.color}">
      <div class="qc-left">
        <div class="qc-ico">&#129504;</div>
        <div>
          <h3>Module quiz &middot; check your understanding</h3>
          <p>${mod.quiz.questions.length} questions &middot; ${mod.quiz.mins} min.
             ${quizBest != null ? `Your best: <b>${quizBest}/${mod.quiz.questions.length}</b> (${Math.round(quizBest / mod.quiz.questions.length * 100)}%).` : 'Not attempted yet.'}
          </p>
        </div>
      </div>
      <div class="qc-right">
        ${quizBest != null && quizBest === mod.quiz.questions.length ? '<span class="qc-perfect">&#9733; perfect</span>' : ''}
        <a class="btn primary" href="${H('quiz', mod.id)}">${quizBest != null ? 'Retake quiz' : 'Take quiz &#8594;'}</a>
      </div>
    </div>

    <div class="artifacts reveal">
      <h3>&#128230; Real artifacts in this repo</h3>
      <div class="artifacts-grid">
        ${(mod.art || []).map(a => `
          <a class="artifact" target="_blank" rel="noopener"
             href="${artifactHref(a.href)}" style="--c:${mod.color}">
            <span class="a-ico">&#128444;&#65039;</span> <span>${a.label}</span>
          </a>`).join('')}
      </div>
      ${mod.hero ? `<p class="mod-art-note">&#128200; This phase ships a diagram: <a href="${cur.meta.repoBlob}assets/${encodeURIComponent(mod.hero)}" target="_blank" rel="noopener">${esc(mod.hero)} &#8599;</a></p>` : ''}
    </div>

    <div class="phase-nav reveal">
      ${mod.n > 1 ? `<a class="btn ghost" href="${H('phase', cur.modules[mod.n - 2].id)}">&#8592; ${cur.modules[mod.n - 2].title}</a>` : '<span></span>'}
      ${mod.n < cur.modules.length
        ? `<a class="btn primary" href="${H('phase', cur.modules[mod.n].id)}">${cur.modules[mod.n].title} &#8594;</a>`
        : `<a class="btn primary" href="${H('quiz', mod.id)}">&#127919; Take the final quiz</a>`}
    </div>`;

  if (exCount) wireExercises();
}

function artifactHref(h) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(h)) return h;
  return cur.meta.repoBlob + h.split('/').map(encodeURIComponent).join('/');
}

/* ------------------------- lesson page ------------------------- */

function renderLesson(mod, li) {
  const lesson = mod.lessons[li];
  const prevI = li > 0 ? li - 1 : null;
  const nextI = li < mod.lessons.length - 1 ? li + 1 : null;
  const done = lessonDone(mod.id, li);
  const bm = isBookmarked(mod.id, li);
  const note = getNote(mod.id, li);
  const exCount = moduleExercises(mod).length;

  view.innerHTML = `
    <div class="crumb reveal"><a href="${H('dashboard')}">Dashboard</a> <span>&#8250;</span> <a href="${H('academy')}">${esc(cur.meta.brand)}</a> <span>&#8250;</span> <a href="${H('phase', mod.id)}">${mod.title}</a> <span>&#8250;</span> <b>${lesson.title}</b></div>

    <div class="lesson-wrap reveal">
      <aside class="lesson-toc">
        <div class="toc-title">${mod.title}</div>
        ${mod.lessons.map((l, i) => `
          <a href="${H('lesson', mod.id, i)}" class="toc-item ${i === li ? 'active' : ''}">
            <span class="toc-state">${lessonDone(mod.id, i) ? '&#10003;' : i + 1}</span>
            <span>${l.title}<span class="toc-min">${l.mins}&#8242;</span></span>
          </a>`).join('')}
        ${exCount ? `<a href="${H('phase', mod.id)}" class="toc-item toc-ex" style="--c:${mod.color}" data-scroll="exercises">
          <span class="toc-state">&#129513;</span><span>Exercises &amp; Mini Projects</span></a>` : ''}
        <a href="${H('guide', mod.id)}" class="toc-item toc-guide" style="--c:${mod.color}">
          <span class="toc-state">&#128214;</span><span>Full module guide</span>
        </a>
        <a href="${H('quiz', mod.id)}" class="toc-item toc-quiz" style="--c:${mod.color}">
          <span class="toc-state">&#129504;</span><span>Module quiz</span>
        </a>
      </aside>

      <article class="lesson article" style="--c:${mod.color}">
        <div class="lesson-head" style="--c:${mod.color}">
          <div class="lh-meta">Phase ${String(mod.n).padStart(2, '0')} &middot; Lesson ${li + 1} of ${mod.lessons.length} &middot; ${lesson.mins} min</div>
          <h1>${lesson.title}</h1>
        </div>
        <div class="chips">
          ${(mod.objectives || []).map(o => `<span class="chip-o">${o}</span>`).join('')}
        </div>

        <div class="blocks">${(lesson.blocks || []).map(renderBlock).join('')}</div>

        <div class="lesson-foot">
          <div class="lf-left">
            ${done
              ? '<button class="btn ghost sm" id="unbtn">&#8617; Mark as unlearned</button>'
              : `<button class="btn primary" id="doneBtn">&#10003; Mark lesson complete</button>`}
            <button class="btn ghost sm bm-btn${bm ? ' on' : ''}" id="bmBtn" aria-pressed="${bm ? 'true' : 'false'}" title="Bookmark this lesson (press B)">${bm ? '&#9733; Bookmarked' : '&#9734; Bookmark'}</button>
            <button class="btn ghost sm" id="noteBtn" title="Notes (press N)">&#128221; Notes${note ? ' &bull;' : ''}</button>
          </div>
          <div class="lf-right">
            ${exCount ? `<button class="btn ghost sm" id="exBtn">&#129513; Exercises</button>` : ''}
            ${prevI != null ? `<a class="btn ghost sm" href="${H('lesson', mod.id, prevI)}">&#8592; Prev</a>` : ''}
            ${nextI != null
              ? `<a class="btn primary sm" href="${H('lesson', mod.id, nextI)}">Next &#8594;</a>`
              : `<a class="btn primary sm" href="${H('quiz', mod.id)}">Take the quiz &#8594;</a>`}
          </div>
        </div>
      </article>
    </div>

    <div class="notes-panel reveal" id="notesPanel"${note ? '' : ' hidden'}>
      <div class="np-head"><span>&#128221; Notes for this lesson</span><span class="np-saved" id="npStatus"></span></div>
      <textarea id="noteArea" rows="4" placeholder="Type notes, gotchas or questions — saved automatically in your browser.">${esc(note)}</textarea>
      <div class="np-foot"><span class="np-hint">Stored locally &middot; autosaved</span><button class="btn ghost sm" id="noteClear">Clear notes</button></div>
    </div>`;

  const b = $('#doneBtn'); const u = $('#unbtn');
  if (b) b.addEventListener('click', () => { markDone(mod.id, li, true); store.lastOpen = { slug: cur.slug, mid: mod.id, li }; save(); toast('Lesson complete! &#127881;'); render(); });
  if (u) u.addEventListener('click', () => { markDone(mod.id, li, false); render(); });

  const bmb = $('#bmBtn');
  if (bmb) bmb.addEventListener('click', () => {
    const on = toggleBookmark(mod.id, li);
    bmb.classList.toggle('on', on);
    bmb.setAttribute('aria-pressed', on ? 'true' : 'false');
    bmb.innerHTML = on ? '&#9733; Bookmarked' : '&#9734; Bookmark';
    renderSidebar();
    toast(on ? 'Bookmarked &#9733;' : 'Bookmark removed');
  });

  const exBtn = $('#exBtn');
  if (exBtn) exBtn.addEventListener('click', () => { navigate('phase', mod.id); requestAnimationFrame(() => scrollToId('exercises')); });
  $$('.toc-ex', view).forEach(a => a.addEventListener('click', e => { e.preventDefault(); navigate('phase', mod.id); requestAnimationFrame(() => scrollToId('exercises')); }));

  hydrateAnswers();
  $$('.ex-answer[data-ex]').forEach(det => det.addEventListener('toggle', () => { if (det.open) fillAnswer($('[data-ex-body]', det)); }));

  const noteBtn = $('#noteBtn');
  const notePanel = $('#notesPanel');
  if (noteBtn && notePanel) noteBtn.addEventListener('click', () => {
    notePanel.hidden = !notePanel.hidden;
    if (!notePanel.hidden) { const ta = $('#noteArea'); if (ta) ta.focus(); }
  });
  const noteArea = $('#noteArea');
  const npStatus = $('#npStatus');
  if (noteArea) {
    let noteTimer;
    noteArea.addEventListener('input', () => {
      if (npStatus) npStatus.textContent = 'Saving…';
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        setNote(mod.id, li, noteArea.value);
        if (npStatus) npStatus.textContent = noteArea.value.trim() ? 'Saved &#10003;' : '';
      }, 600);
    });
  }
  const noteClear = $('#noteClear');
  if (noteClear) noteClear.addEventListener('click', () => {
    if (noteArea) noteArea.value = '';
    setNote(mod.id, li, '');
    if (npStatus) npStatus.textContent = '';
    toast('Notes cleared');
  });

  store.lastOpen = { slug: cur.slug, mid: mod.id, li }; save();
  /* Deep link from the phase exercise index (#/a/<slug>/lesson/<mid>/<li>/<ex-id>)
     lands on that card instead of the top of the lesson. Repeat once the lazily
     loaded answers have changed the page height. */
  const anchorEl = route.anchor ? document.getElementById(route.anchor) : null;
  requestAnimationFrame(() => {
    if (anchorEl) anchorEl.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  });
  if (anchorEl) setTimeout(() => anchorEl.scrollIntoView({ block: 'start' }), 400);
}

/* ------------------------- block renderer ------------------------- */

const answerCache = Object.create(null);

function answerIds() {
  return (cur && Array.isArray(cur.answerIds)) ? cur.answerIds : [];
}

function loadAnswers(slug) {
  if (answerCache[slug]) return answerCache[slug];
  answerCache[slug] = fetch('assets/answers/' + slug + '.json')
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return answerCache[slug];
}

function fillAnswer(el) {
  if (!el || el.getAttribute('data-filled')) return;
  const id = el.getAttribute('data-ex-body');
  const slug = cur ? cur.slug : null;
  if (!id || !slug) return;
  loadAnswers(slug).then(map => {
    if (!cur || cur.slug !== slug) return;
    const target = $('[data-ex-body]', el.closest('.ex-answer') || document);
    if (!target || target.getAttribute('data-filled')) return;
    const html = map[id];
    if (!html) { const det = target.closest('.ex-answer'); if (det) det.remove(); return; }
    target.innerHTML = html;
    target.setAttribute('data-filled', '1');
  });
}

function hydrateAnswers() {
  $$('.ex-answer-body[data-ex-body]').forEach(fillAnswer);
}

/* Source roadmaps declare exercise code three ways: a plain string, {x, lang},
   or a map of named snippets ({setup: [...], apex}). Normalise all of them. */
const CODE_LANGS = { apex: 'apex', js: 'javascript', ts: 'typescript', soql: 'soql', sql: 'sql', html: 'markup', xml: 'markup' };

function codeText(v) {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.filter(x => typeof x === 'string' && x.trim()).join('\n');
  return '';
}

function codeSpecs(code) {
  if (!code) return [];
  if (typeof code === 'string' || Array.isArray(code)) {
    const t = codeText(code);
    return t.trim() ? [{ x: t }] : [];
  }
  if (typeof code !== 'object') return [];
  if (code.x != null) {
    const t = codeText(code.x);
    return t.trim() ? [{ x: t, lang: code.lang }] : [];
  }
  return Object.keys(code)
    .map(k => ({ x: codeText(code[k]), lang: CODE_LANGS[k] || 'text' }))
    .filter(s => s.x.trim());
}

function renderCodeBlock(code) {
  return codeSpecs(code).map(s => renderBlock({ t: 'code', x: s.x, lang: s.lang })).join('');
}

function renderBlock(b) {
  switch (b.t) {
    case 'p': return `<p>${esc(b.x)}</p>`;
    case 'h': return `<h2>${esc(b.x)}</h2>`;
    case 'list': return `<ul class="tick-list">${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'num': return `<ol>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ol>`;
    case 'table': return `
      <div class="tbl"><table>
        <thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
    case 'code': {
      const cid = 'c' + cyrb53(b.x);
      const bT = b.lang || 'text';
      return `<div class="codeblock">
        <div class="cb-head"><span class="cb-lang">${esc(bT)}</span><button class="cb-copy" data-copy="${cid}" title="Copy">&#9881; Copy</button></div>
        <pre id="${cid}" class="lang-${esc(bT)}"><code>${esc(b.x)}</code></pre>
      </div>`;
    }
    case 'callout': {
      const icons = { tip: '&#128161;', warn: '&#9888;&#65039;' };
      return `<div class="callout ${esc(b.kind)}"><div class="co-ico">${icons[b.kind] || '&#128161;'}</div><div>${esc(b.x)}</div></div>`;
    }
    case 'selfcheck': return `
      <div class="selfcheck">
        <div class="sc-head"><span class="sc-qmark">?</span> <span>Check yourself</span></div>
        <div class="sc-q">${esc(b.q)}</div>
        <div class="sc-actions"><button class="btn sm ghost showA">Show answer</button></div>
        <div class="sc-a" hidden>${esc(b.a)}</div>
      </div>`;
    /* Real-world case study: a problem a company actually had, the config that
     * solved it, how it was built, and the part that bit them. `ex`/`proj` ask
     * the learner to BUILD something; `case` shows what was already built, so it
     * carries no id, no stars and no self-rating - it is reference material, not
     * a graded activity. */
    case 'case': {
      const steps = (b.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
      return `
        <div class="case-card">
          <div class="case-head">
            <span class="case-eyebrow">&#127970; Real world</span>
            ${b.org ? `<span class="case-org">${esc(b.org)}</span>` : ''}
          </div>
          <h3 class="case-title">${esc(b.title)}</h3>
          <div class="case-label">&#129657; The problem</div>
          <p class="case-p">${esc(b.problem)}</p>
          <div class="case-label">&#128736; The solution</div>
          <p class="case-p">${esc(b.solution)}</p>
          <div class="case-label">&#128295; How it was built</div>
          <ol class="case-list">${steps}</ol>
          <div class="case-gotcha">&#9888;&#65039; <b>What went wrong:</b> ${esc(b.gotcha)}</div>
          ${b.exam ? `<div class="case-exam">&#127919; <b>Exam angle:</b> ${esc(b.exam)}</div>` : ''}
        </div>`;
    }
    case 'ex':
    case 'proj': {
      const isProject = b.t === 'proj';
      const items = b.steps || b.reqs || [];
      const lis = items.map(i =>
        typeof i === 'string'
          ? `<li>${esc(i)}</li>`
          : `<li class="ex-group"><b>${esc(i.h)}</b><ul>${i.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></li>`
      ).join('');
      const stars = '&#9733;'.repeat(b.stars || 1) + '&#9734;'.repeat(Math.max(0, 4 - (b.stars || 1)));
      const code = renderCodeBlock(b.code);
      const footer = isProject
        ? `<div class="ex-verify">&#127919; Success — ${esc(b.success || '')}</div>`
        : (b.verify ? `<div class="ex-verify">&#10004; Verify — ${esc(b.verify)}</div>` : '');
      const hasAnswer = answerIds().indexOf(b.id) > -1;
      const answer = hasAnswer
        ? `<details class="ex-answer" data-ex="${esc(b.id)}"><summary><span class="ea-ico">&#128161;</span><span>Show answer</span><span class="ea-caret">&#9662;</span></summary><div class="ex-answer-body" data-ex-body="${esc(b.id)}"><div class="ex-answer-loading">Loading the reference answer&hellip;</div></div></details>`
        : '';
      return `
        <div class="ex-card ${isProject ? 'proj' : ''}" data-stars="${b.stars || 1}" id="${esc(exerciseAnchorForId(b.id))}">
          <div class="ex-head">
            <span class="ex-id">${esc(b.id)}</span>
            <span class="ex-stars">${stars}</span>
          </div>
          <h3 class="ex-title">${esc(b.title)}</h3>
          <p class="ex-obj">${esc(b.obj)}</p>
          ${code}
          <div class="ex-label">${isProject ? '&#128203; Requirements' : '&#129513; Instructions'}</div>
          <ol class="ex-list">${lis}</ol>
          ${footer}
          ${answer}
        </div>`;
    }
    default: return '';
  }
}

/* ------------------------- module-level exercises (Admin style) ------------------------- */

function renderSol(text) {
  return String(text || '').split(/```/).map((part, i) => {
    if (!part.trim()) return '';
    if (i % 2 === 1) return `<pre class="ex-code"><code>${esc(part)}</code></pre>`;
    const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
    let out = '';
    let listBuf = [];
    const flushList = () => {
      if (listBuf.length) {
        out += `<ul class="tick-list">${listBuf.map(l => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
        listBuf = [];
      }
    };
    lines.forEach(l => {
      if (l.startsWith('- ')) { listBuf.push(l); }
      else { flushList(); out += `<p>${esc(l)}</p>`; }
    });
    flushList();
    return out;
  }).join('');
}

/* ------------------------- phase exercises ------------------------- */

function renderExercises(mod) {
  const index = moduleExercises(mod);
  if (!index.length) return '';

  const cards = mod.exercises || [];
  const lessons = index.filter(e => e.li !== -1);
  const levels = { 'Easy': 'ex-level easy', 'Medium': 'ex-level med', 'Hard': 'ex-level hard' };

  const cardHtml = cards.map((ex, card) => {
    const lvl = levels[ex.level] || 'ex-level';
    const badge = ex.type === 'project' ? '<span class="ex-type-badge project">project</span>' : '<span class="ex-type-badge exercise">exercise</span>';
    const anchor = exerciseAnchorId(mod, { li: -1, card, id: ex.id });
    return `
        <div class="ex-card" id="${esc(anchor)}" data-revealed="false">
          <div class="ex-summary">
            <div class="ex-meta-line">
              <span class="ex-num">#${ex.n}</span>
              ${badge}
              <span class="${lvl}">${esc(ex.level || '')}</span>
              <span class="ex-mins">${ex.mins || ''} min</span>
            </div>
            <div class="ex-title-row">
              <span class="ex-title">${esc(ex.title)}</span>
              <button class="ex-toggle" type="button" aria-expanded="false">Show solution <span class="chv">&#9662;</span></button>
            </div>
          </div>
          <div class="ex-body">
            <p class="ex-brief">${esc(ex.brief)}</p>
            <ol class="ex-steps">${(ex.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            <div class="sol-gate" hidden>
              <p class="gate-msg">&#129489;&#8205;&#128187; Did you try this yourself before peeking? Attempting it first is how you actually learn Salesforce.</p>
              <div class="gate-actions">
                <button class="btn sm primary gate-yes" type="button">Yes &mdash; I&rsquo;ve attempted it. Show solution</button>
                <button class="btn sm ghost gate-no" type="button">No, let me keep trying</button>
              </div>
            </div>
            <div class="ex-solution" hidden>
              <div class="ex-sol-head">Solution</div>
              <div class="ex-sol-body">${renderSol(ex.solution)}</div>
            </div>
          </div>
        </div>`;
  }).join('');

  const lessonHtml = lessons.map((entry) => {
    const block = exerciseBlock(mod, entry);
    if (!block) return '';
    const title = block.title || block.id || 'Exercise';
    const stars = entry.stars || block.stars || 0;
    const lesson = mod.lessons[entry.li];
    const hasAnswer = block.id != null && answerIds().indexOf(block.id) > -1;
    return `
        <a class="ex-link" href="${H('lesson', mod.id, entry.li, exerciseAnchorId(mod, entry))}" style="--c:${mod.color}">
          <span class="ex-link-badge ${entry.kind === 'proj' ? 'proj' : 'ex'}">${entry.kind === 'proj' ? 'project' : esc(block.id || '')}</span>
          <span class="ex-link-info">
            <b>${esc(title)}</b>
            <span class="ex-link-meta">${lesson ? `Lesson ${entry.li + 1} &middot; ${esc(lesson.title)}` : `Lesson ${entry.li + 1}`}${stars ? ' &middot; ' + '&#9733;'.repeat(stars) : ''}${hasAnswer ? ' &middot; reference answer &#128161;' : ''}</span>
          </span>
          <span class="lr-arrow">&#8594;</span>
        </a>`;
  }).join('');

  const sub = lessons.length
    ? `${index.length} hands-on task${index.length === 1 ? '' : 's'}${cards.length ? ` &middot; ${cards.length} below with gated solutions` : ' across the lessons of this phase'}.`
    : `${index.length} hands-on tasks. Try each one in your org first &mdash; solutions are gated so nothing spoils your practice.`;

  return `
    <div class="exercises reveal" id="exercises" style="--c:${mod.color}">
      <div class="ex-head">
        <div class="ex-head-icon">&#129513;</div>
        <div>
          <h2>Exercises &amp; Mini Projects</h2>
          <p class="ex-sub">${sub}</p>
        </div>
      </div>
      ${lessonHtml ? `<div class="ex-links">${lessonHtml}</div>` : ''}
      ${cardHtml}
    </div>`;
}

function wireExercises() {
  $$('.ex-card[data-revealed]').forEach(card => {
    const btn = card.querySelector('.ex-toggle');
    const gate = card.querySelector('.sol-gate');
    const sol = card.querySelector('.ex-solution');
    const chv = btn && btn.querySelector('.chv');
    if (!btn || !gate || !sol) return;
    const setOpen = open => {
      sol.hidden = !open;
      card.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (chv) chv.textContent = open ? '&#9652;' : '&#9662;';
      btn.firstChild.textContent = open ? 'Hide solution ' : 'Show solution ';
    };
    btn.addEventListener('click', () => {
      if (card.dataset.revealed === 'true') { setOpen(sol.hidden); return; }
      gate.hidden = false;
      btn.style.display = 'none';
    });
    gate.querySelector('.gate-yes').addEventListener('click', () => {
      card.dataset.revealed = 'true';
      gate.hidden = true;
      btn.style.display = '';
      setOpen(true);
    });
    gate.querySelector('.gate-no').addEventListener('click', () => {
      gate.hidden = true;
      btn.style.display = '';
      toast('Nice — no peeking! &#128079; Try the exercise first, then come back for the solution.');
    });
  });
}

/* ------------------------- guide page (external source) ------------------------- */

const guideCache = Object.create(null);
let guideSpy = null;

function guideJson(slug, modId) {
  return 'assets/guides/' + slug + '/' + modId + '.json';
}

function loadGuide(slug, modId) {
  const key = slug + '/' + modId;
  if (guideCache[key]) return Promise.resolve(guideCache[key]);
  return fetch(guideJson(slug, modId))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => { guideCache[key] = data; return data; });
}

function buildGuideToc(mod, toc) {
  const box = $('#guideToc');
  if (!box) return;
  if (!toc.length) { box.innerHTML = '<div class="toc-title">On this page</div><div class="gt-empty">No sections</div>'; return; }
  const nav = document.createElement('div');
  nav.className = 'gt-nav';
  toc.forEach(t => {
    const a = document.createElement('a');
    a.className = 'gt-item lvl' + t.level;
    a.href = '#/a/' + cur.slug + '/guide/' + mod.id + '/' + t.id;
    a.textContent = t.text;
    a.dataset.anchor = t.id;
    nav.appendChild(a);
  });
  box.innerHTML = '<div class="toc-title">On this page</div>';
  box.appendChild(nav);

  const setActive = (a) => {
    $$('.gt-item', box).forEach(x => x.classList.remove('active'));
    if (a) a.classList.add('active');
  };
  $$('.gt-item', box).forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const el = document.getElementById(a.dataset.anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
    setActive(a);
  }));

  if (guideSpy) guideSpy.disconnect();
  if (!('IntersectionObserver' in window)) return;
  const byAnchor = new Map($$('.gt-item', box).map(a => [a.dataset.anchor, a]));
  guideSpy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const a = byAnchor.get(en.target.id);
      if (a) setActive(a);
    });
  }, { rootMargin: '-100px 0px -70% 0px', threshold: 0 });
  $$('.gt-item', box).forEach(a => {
    const el = document.getElementById(a.dataset.anchor);
    if (el) guideSpy.observe(el);
  });
}

function paintGuide(mod) {
  const body = $('#guideBody');
  if (!body) return;
  if (guideSpy) { guideSpy.disconnect(); guideSpy = null; }
  const slug = cur.slug;
  loadGuide(slug, mod.id).then(data => {
    if (!cur || cur.slug !== slug || !$('#guideBody')) return;
    body.innerHTML = data.html || '<p class="guide-fail">This guide is empty.</p>';
    buildGuideToc(mod, data.toc || []);
    if (route.anchor) {
      const el = document.getElementById(route.anchor);
      if (el) el.scrollIntoView({ block: 'start' });
    }
  }).catch(() => {
    if (!cur || cur.slug !== slug || !$('#guideBody')) return;
    body.innerHTML =
      '<div class="guide-fail"><div class="gf-ico">&#128196;</div>' +
      '<h3>This guide is not bundled yet</h3>' +
      '<p>Run <code class="inline">node build/build-guides.mjs</code> to generate the in-site guides, or read the source file on GitHub.</p>' +
      '<a class="btn primary" href="' + esc(guideUrl(cur, mod)) + '" target="_blank" rel="noopener">Open the source on GitHub &#8599;</a></div>';
    const box = $('#guideToc');
    if (box) box.innerHTML = '<div class="toc-title">On this page</div><div class="gt-empty">No sections</div>';
  });
}

function renderGuide(mod) {
  const p = moduleProgress(mod.id);
  const read = guideRead(mod.id);
  const url = guideUrl(cur, mod);

  view.innerHTML = `
    <div class="crumb reveal"><a href="${H('dashboard')}">Dashboard</a> <span>&#8250;</span> <a href="${H('academy')}">${esc(cur.meta.brand)}</a> <span>&#8250;</span> <a href="${H('phase', mod.id)}">${mod.title}</a> <span>&#8250;</span> <b>Full guide</b></div>

    <div class="guide-hero reveal" style="--c:${mod.color}">
      <div class="ph-ico">${mod.icon}</div>
      <div class="ph-body">
        <div class="ph-kicker">Phase ${String(mod.n).padStart(2, '0')} &middot; complete guide</div>
        <h1>${mod.title}</h1>
        <p class="qc-sub">The whole phase guide, right here in the academy &mdash; every section, table, code sample and checklist from <code class="inline">${esc(mod.guide || 'the guide file')}</code>. Use the contents on the left to jump around, then mark it read to complete the module. ${read ? '<b>You marked this guide as read.</b>' : ''}</p>
        <div class="guide-meta">
          <a class="btn ghost sm" href="${url}" target="_blank" rel="noopener">&#128196; View source on GitHub &#8599;</a>
          ${(mod.art || []).map(a => `<a class="artifact" target="_blank" rel="noopener" href="${artifactHref(a.href)}" style="--c:${mod.color}"><span class="a-ico">&#128444;&#65039;</span> <span>${a.label}</span></a>`).join('')}
        </div>
      </div>
      <div class="ph-side">
        <div class="ring sm" style="--p:${p.pct};--c:${mod.color}"><span>${p.pct}<small>%</small></span></div>
        <div class="ph-stats"><span>${read ? '&#10003; guide read' : 'guide unread'}</span></div>
      </div>
    </div>

    <div class="guide-wrap">
      <aside class="guide-toc" id="guideToc"><div class="toc-title">On this page</div><div class="gt-loading">Loading contents&hellip;</div></aside>
      <article class="guide-article article" id="guideBody">
        <div class="guide-loading"><span class="spinner"></span>Loading the full guide&hellip;</div>
      </article>
    </div>

    <div class="lesson-foot reveal">
      <div class="lf-left">
        <button class="btn primary" id="greadBtn">${read ? '&#10003; Guide read — toggle' : '&#10004; Mark guide as read'}</button>
        <a class="btn ghost" href="${url}" target="_blank" rel="noopener">Source on GitHub &#8599;</a>
      </div>
      <div class="lf-right">
        ${mod.n > 1 ? `<a class="btn ghost sm" href="${H('guide', cur.modules[mod.n - 2].id)}">&#8592; ${cur.modules[mod.n - 2].title}</a>` : ''}
        ${mod.n < cur.modules.length
          ? `<a class="btn primary sm" href="${H('guide', cur.modules[mod.n].id)}">${cur.modules[mod.n].title} &#8594;</a>`
          : `<a class="btn primary sm" href="${H('quiz', mod.id)}">&#127919; Take the final quiz &#8594;</a>`}
      </div>
    </div>`;

  paintGuide(mod);

  const rb = $('#greadBtn');
  if (rb) rb.addEventListener('click', () => { markGuideRead(mod.id, !guideRead(mod.id)); toast(guideRead(mod.id) ? 'Guide marked as read — module complete! &#127881;' : 'Guide marked as unread'); render(); });

  store.lastOpen = { slug: cur.slug, mid: mod.id, li: 0 }; save();
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

/* ------------------------- quiz page ------------------------- */

let quizKeyHandler = null;

function renderQuiz(mod, opts) {
  opts = opts || {};
  const all = mod.quiz.questions;
  const idxs = opts.indices || all.map((_, i) => i);
  const practice = !!opts.practice;
  const n = idxs.length;
  const prevBest = store.quiz[kMod(cur.slug, mod.id)];
  const keyHint = Math.min(9, Math.max.apply(null, idxs.map(i => all[i].opts.length)));

  view.innerHTML = `
    <div class="crumb reveal"><a href="${H('dashboard')}">Dashboard</a> <span>&#8250;</span> <a href="${H('academy')}">${esc(cur.meta.brand)}</a> <span>&#8250;</span> <a href="${H('phase', mod.id)}">${mod.title}</a> <span>&#8250;</span> <b>Quiz${practice ? ' · practice' : ''}</b></div>

    <div class="quiz-top reveal" style="--c:${mod.color}">
      <div>
        <div class="ph-kicker">Phase ${String(mod.n).padStart(2, '0')} &middot; ${esc(mod.quiz.title)}${practice ? ' · practice mode' : ''}</div>
        <h1>${mod.icon} ${mod.title} — Quiz</h1>
        <p class="qc-sub">${n} question${n === 1 ? '' : 's'}. ${practice ? 'Re-try only the ones you missed. ' : ''}Tip: answer with <span class="kbd">1</span>&ndash;<span class="kbd">${keyHint}</span> or <span class="kbd">A</span>&ndash;<span class="kbd">D</span>.</p>
      </div>
      <div class="quiz-best">
        ${prevBest != null
          ? `Best: <b>${Math.round(prevBest * all.length)}/${all.length}</b> · ${Math.round(prevBest * 100)}%`
          : 'No score yet'}
      </div>
    </div>

    ${practice ? '' : `<div class="quiz-meter reveal"><div class="qm-bar"><i id="quizBar"></i></div><span class="qm-count" id="quizCount">0 / ${n} answered</span></div>`}

    <div class="quiz-list reveal" id="quizList"></div>
    <div class="quiz-summary" id="quizSummary" hidden></div>
    <div class="lesson-foot reveal" id="quizFoot"></div>`;

  const list = $('#quizList');
  idxs.forEach((srcIndex, pos) => {
    const q = all[srcIndex];
    const item = document.createElement('div');
    item.className = 'q-item';
    item.dataset.qi = pos;
    item.dataset.src = srcIndex;
    item.innerHTML = `
      <div class="q-head"><span class="q-num">Q${pos + 1}</span><span class="q-prog"></span></div>
      <div class="q-text">${esc(q.q)}</div>
      <div class="q-opts">
        ${q.opts.map((o, oi) => `
          <button class="q-opt" data-oi="${oi}">
            <span class="q-letter">${String.fromCharCode(65 + oi)}</span>
            <span class="q-otext">${esc(o)}</span>
            <span class="q-mark"></span>
          </button>`).join('')}
      </div>
      <div class="q-why" hidden><div class="qw-label"></div><div class="qw-text">${esc(q.why || '')}</div></div>`;
    list.appendChild(item);
  });

  const foot = $('#quizFoot');
  foot.innerHTML = `
    <div class="lf-left"><button class="btn ghost sm" id="resetQuiz">&#8634; Reset</button></div>
    <div class="lf-right">
      ${practice ? '' : '<button class="btn primary" id="saveScore" disabled>&#10003; Save my score</button>'}
      <a class="btn ghost sm" href="${H('phase', mod.id)}">Back to module</a>
    </div>`;

  $('#resetQuiz').addEventListener('click', () => renderQuiz(mod, opts));

  const saveBtn = $('#saveScore');
  const bar = $('#quizBar');
  const count = $('#quizCount');
  let answered = 0, score = 0;
  const wrong = [];

  function answer(item, oi) {
    if (item.dataset.state) return;
    const src = +item.dataset.src;
    const q = all[src];
    const prog = $('.q-prog', item);
    const correct = oi === q.a;
    item.dataset.state = correct ? 'right' : 'wrong';
    prog.textContent = correct ? '&#10003; correct' : '&#10007;';
    prog.classList.add(correct ? 'ok' : 'bad');

    $$('.q-opt', item).forEach(o => {
      const t = +o.dataset.oi;
      o.classList.add(t === q.a ? 'right' : 'dim');
      if (t === oi && !correct) o.classList.add('wrong');
      o.disabled = true;
    });
    const why = $('.q-why', item);
    why.hidden = false;
    $('.qw-label', why).innerHTML = correct ? '&#127881; That&#8217;s right' : '&#128584; Not quite';
    why.classList.add(correct ? 'ok' : 'bad');

    answered++; if (correct) score++; else wrong.push(src);
    if (bar) bar.style.width = Math.round(answered / n * 100) + '%';
    if (count) count.textContent = answered + ' / ' + n + ' answered';
    if (saveBtn) saveBtn.disabled = answered < n;
    if (answered === n) finish();
  }

  function finish() {
    const pct = Math.round(score / n * 100);
    toast(`Quiz complete: ${score}/${n} (${pct}%)`);
    if (pct === 100) confetti();
    const sum = $('#quizSummary');
    if (!sum) return;
    sum.hidden = false;
    const missed = n - score;
    sum.innerHTML = `
      <div class="qs-head" style="--c:${mod.color}">
        <div class="qs-score"><b>${score}</b><small>/${n}</small></div>
        <div class="qs-body">
          <h3>${pct === 100 ? '&#127942; Perfect score!' : missed <= Math.ceil(n * 0.25) ? '&#128170; Almost there' : '&#128218; Keep studying'}</h3>
          <p>${missed ? `You missed ${missed} question${missed === 1 ? '' : 's'}. Review the explanations above${practice ? '.' : ' or practice just those.'}` : 'You answered every question correctly.'}</p>
        </div>
      </div>
      ${(!practice && wrong.length) ? `<button class="btn primary" id="practiceWrong">&#127919; Practice ${wrong.length} missed question${wrong.length === 1 ? '' : 's'}</button>` : ''}
      ${practice ? '<button class="btn ghost" id="backFull">&#8617; Back to the full quiz</button>' : ''}`;
    const pw = $('#practiceWrong');
    if (pw) pw.addEventListener('click', () => renderQuiz(mod, { indices: wrong.slice(), practice: true }));
    const bf = $('#backFull');
    if (bf) bf.addEventListener('click', () => renderQuiz(mod));
    requestAnimationFrame(() => sum.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  $$('.q-item', list).forEach(item => {
    $$('.q-opt', item).forEach(btn => {
      btn.addEventListener('click', () => answer(item, +btn.dataset.oi));
    });
  });

  function onKey(e) {
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const item = $$('.q-item', list).find(it => !it.dataset.state);
    if (!item) return;
    let oi = -1;
    if (/^[1-9]$/.test(e.key)) oi = +e.key - 1;
    else if (/^[a-dA-D]$/.test(e.key)) oi = e.key.toUpperCase().charCodeAt(0) - 65;
    if (oi < 0) return;
    const optEls = $$('.q-opt', item);
    if (oi >= optEls.length) return;
    e.preventDefault();
    answer(item, oi);
    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
    item.classList.add('kb-flash');
    setTimeout(() => item.classList.remove('kb-flash'), 500);
  }
  quizKeyHandler = onKey;
  document.addEventListener('keydown', onKey);

  if (saveBtn) saveBtn.addEventListener('click', () => {
    if (practice) return;
    const pct = score / all.length;
    const pk = kMod(cur.slug, mod.id);
    if (prevBest == null || pct > prevBest) {
      store.quiz[pk] = pct;
      store.best[pk] = Math.round(pct * all.length);
      save();
      toast('Score saved — keep it up! &#127942;');
      saveBtn.innerHTML = '&#10003; Saved — nice work!';
      saveBtn.disabled = true;
    }
    renderSidebar();
  });
}

/* ------------------------- bookmarks (across every academy) ------------------------- */

function renderBookmarks() {
  const rows = [];
  SLUGS.forEach(slug => {
    const e = ACADEMIES[slug];
    e.modules.forEach(m => m.lessons.forEach((l, i) => {
      if (isBookmarkedIn(slug, m.id, i)) rows.push({ e, m, l, i, note: getNoteIn(slug, m.id, i) });
    }));
  });
  const notes = noteCount();

  const rowHtml = r => `
      <a class="lesson-row" href="#/a/${r.e.slug}/lesson/${r.m.id}/${r.i}" style="--c:${r.m.color}">
        <span class="lr-state">&#9733;</span>
        <span class="lr-info">
          <b>${esc(r.l.title)}</b>
          <span class="lr-meta">${r.e.meta.icon} ${esc(r.m.title)} · ${r.l.mins} min${doneIn(r.e.slug, r.m.id, r.i) ? ' · completed &#10003;' : ''}</span>
          ${r.note ? `<span class="bm-note">&#128221; ${esc(r.note.slice(0, 160))}${r.note.length > 160 ? '&hellip;' : ''}</span>` : ''}
        </span>
        <span class="lr-arrow">&#8594;</span>
      </a>`;

  view.innerHTML = `
    <div class="crumb reveal"><a href="${H('dashboard')}">Dashboard</a> <span>&#8250;</span> <b>Bookmarks</b></div>
    <div class="phase-hero reveal" style="--c:var(--accent)">
      <div class="ph-ico">&#9733;</div>
      <div class="ph-body">
        <div class="ph-kicker">Saved for later</div>
        <h1>Your bookmarks</h1>
        <p class="qc-sub">${rows.length} saved lesson${rows.length === 1 ? '' : 's'}${notes ? ' · ' + notes + ' note' + (notes === 1 ? '' : 's') : ''} across ${SLUGS.length} academies. Bookmark a lesson with the &#9734; button, or press <span class="kbd">B</span>.</p>
      </div>
    </div>
    ${rows.length ? `<div class="lessons reveal">${rows.map(rowHtml).join('')}</div>`
      : `<div class="empty-state reveal"><div class="es-ico">&#9734;</div><h3>No bookmarks yet</h3><p>While reading a lesson, tap <b>Bookmark</b> (or press <span class="kbd">B</span>) to save it here.</p><a class="btn primary" href="${H('dashboard')}">Back to the dashboard</a></div>`}`;
}

/* ------------------------- certificate (per academy) ------------------------- */

function renderCertificate(entry) {
  const op = overallPctOf(entry);
  const complete = op >= 100;
  const name = store.name || '';
  const meta = entry.meta;
  const totalLessons = entry.modules.reduce((a, m) => a + m.lessons.length, 0);
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  view.innerHTML = `
    <div class="crumb reveal"><a href="${H('dashboard')}">Dashboard</a> <span>&#8250;</span> <a href="${H('academy')}">${esc(meta.brand)}</a> <span>&#8250;</span> <b>Certificate</b></div>
    ${complete ? '' : `<div class="callout warn reveal"><div class="co-ico">&#9888;&#65039;</div><div>You are at <b>${op}%</b>. Finish every lesson, guide and quiz to unlock the certificate. You can preview it below.</div></div>`}
    <div class="cert reveal" id="cert">
      <div class="cert-inner">
        <div class="cert-top"><span class="cert-logo">&#127891;</span><span class="cert-brand">Abdo&rsquo;s Salesforce Academy &middot; ${esc(meta.brand)}</span></div>
        <div class="cert-kicker">Certificate of Completion</div>
        <div class="cert-name" id="certName">${name ? esc(name) : 'Your name here'}</div>
        <div class="cert-copy">has successfully completed the <b>${esc(meta.cert)}</b> roadmap &mdash; ${entry.modules.length} phases, ${totalLessons} lessons and ${entry.modules.length} assessments.</div>
        <div class="cert-row">
          <div><span class="cert-lab">Progress</span><b>${op}%</b></div>
          <div><span class="cert-lab">Date</span><b>${date}</b></div>
          <div><span class="cert-lab">Phases complete</span><b>${entry.modules.filter(m => moduleProgressOf(entry, m.id).complete).length}/${entry.modules.length}</b></div>
        </div>
        <div class="cert-seal${complete ? ' on' : ''}">${complete ? 'COMPLETE' : 'PREVIEW'}</div>
      </div>
    </div>
    <div class="cert-tools reveal">
      <input id="certNameInput" type="text" placeholder="Type your name&hellip;" value="${esc(name)}" maxlength="60" aria-label="Name on certificate" />
      <button class="btn primary" id="printCert">&#128424; Print / Save as PDF</button>
      <a class="btn ghost" href="${H('academy')}">&#8592; ${esc(meta.brand)}</a>
    </div>`;

  const ni = $('#certNameInput');
  if (ni) ni.addEventListener('input', () => {
    store.name = ni.value; save();
    const el = $('#certName');
    if (el) el.textContent = ni.value.trim() ? ni.value : 'Your name here';
  });
  const pc = $('#printCert');
  if (pc) pc.addEventListener('click', () => window.print());
}

/* ------------------------- toast ------------------------- */

let toastTimer;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ------------------------- confetti ------------------------- */

function confetti() {
  const colors = ['#00A1E0', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#e8b93d'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    const x = Math.random() * 100;
    const d = Math.random() * 2.4 + 1.2;
    const s = 8 + Math.random() * 8;
    p.style.left = x + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = d + 's';
    p.style.width = p.style.height = s + 'px';
    p.style.setProperty('--tx', (Math.random() * 160 - 80) + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), d * 1000 + 400);
  }
}

/* ------------------------- global UI wiring ------------------------- */

document.addEventListener('click', e => {
  const sc = e.target.closest('.selfcheck');
  if (sc) {
    const a = $('.sc-a', sc); const btn = $('.showA', sc);
    if (a.hidden) { a.hidden = false; btn.textContent = 'Hide answer'; }
    else { a.hidden = true; btn.textContent = 'Show answer'; }
    return;
  }
  const copy = e.target.closest('.cb-copy');
  if (copy) {
    const pre = document.getElementById(copy.dataset.copy);
    if (pre) {
      const txt = pre.innerText;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
        .then(() => { copy.textContent = '&#10003; Copied'; setTimeout(() => copy.textContent = '&#9881; Copy', 1400); })
        .catch(() => { const r = document.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); copy.textContent = '&#10003; Copied'; setTimeout(() => copy.textContent = '&#9881; Copy', 1400); });
    }
  }
});

/* ------------------------- search / command palette ------------------------- */
/* Searches every academy at once, so a query like "case" surfaces Service
   Cloud lessons alongside Admin phase overviews. */

let searchBox = null;
let searchItems = [];
let searchActive = -1;

function ensureSearch() {
  if (searchBox) return searchBox;
  searchBox = document.createElement('div');
  searchBox.className = 'search-wrap';
  searchBox.setAttribute('role', 'dialog');
  searchBox.setAttribute('aria-label', 'Search every academy');
  searchBox.innerHTML = `
    <div class="sw-top"><span class="sw-ico">&#128269;</span>
      <input id="globalQ" type="search" placeholder="Search all academies — lessons, phases, quizzes…" autocomplete="off" aria-label="Search" />
      <span class="kbd">esc</span>
    </div>
    <div class="search-results" id="searchRes"></div>
    <div class="sw-foot"><span id="swCount"></span><span class="sw-keys"><span class="kbd">&#8593;</span><span class="kbd">&#8595;</span> navigate · <span class="kbd">&#9166;</span> open</span></div>`;
  document.body.appendChild(searchBox);

  const input = $('#globalQ', searchBox);
  input.addEventListener('input', runSearch);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 1) { searchBox.classList.add('open'); runSearch(); } });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = searchItems[searchActive] || searchItems[0];
      if (r) { closeSearch(); location.hash = r.href; }
    } else if (e.key === 'Escape') { closeSearch(); }
  });
  return searchBox;
}

function runSearch() {
  const sb = searchBox || ensureSearch();
  const input = $('#globalQ', sb);
  const wrap = $('#searchRes', sb);
  const count = $('#swCount', sb);
  const q = input.value.trim().toLowerCase();
  searchItems = [];
  searchActive = -1;
  wrap.innerHTML = '';
  if (q.length < 1) {
    wrap.innerHTML = '<div class="sr-hint">Start typing — try "flow", "case", "omnichannel", "apex", "segmentation".</div>';
    if (count) count.textContent = '';
    return;
  }

  const results = [];
  SLUGS.forEach(slug => {
    const e = ACADEMIES[slug];
    const icon = e.meta.icon;
    const inAcad = 'in ' + e.meta.brand;
    e.modules.forEach(m => {
      if ((m.title + ' ' + m.tagline + ' ' + (m.objectives || []).join(' ')).toLowerCase().includes(q)) {
        results.push({ href: '#/a/' + slug + '/phase/' + m.id, ico: icon, label: m.title, sub: inAcad + ' · Phase overview' });
      }
      m.lessons.forEach((l, i) => {
        const hay = (m.title + ' ' + m.tagline + ' ' + l.title + ' ' + (m.objectives || []).join(' ') + ' ' + (l.blocks || []).map(bd => bd.x || (bd.items || []).join(' ')).join(' ')).toLowerCase();
        if (hay.includes(q)) results.push({ href: '#/a/' + slug + '/lesson/' + m.id + '/' + i, ico: icon, label: l.title, sub: inAcad + ' · ' + m.title });
      });
      m.quiz.questions.forEach(qq => {
        if ((qq.q + ' ' + (qq.why || '')).toLowerCase().includes(q)) {
          results.push({ href: '#/a/' + slug + '/quiz/' + m.id, ico: '&#129504;', label: 'Quiz · ' + m.title, sub: inAcad + ' · ' + qq.q.slice(0, 60) + '…' });
        }
      });
    });
  });

  const seen = new Set(); const uniq = [];
  results.forEach(r => { const k = r.href + '|' + r.label; if (!seen.has(k)) { seen.add(k); uniq.push(r); } });
  const top = uniq.slice(0, 14);
  searchItems = top;

  if (!top.length) {
    wrap.innerHTML = '<div class="sr-empty">No results for &ldquo;' + esc(q) + '&rdquo; — try "flow", "case", "apex", "segmentation".</div>';
    if (count) count.textContent = '0 results';
  } else {
    top.forEach((r, i) => {
      const a = document.createElement('a');
      a.className = 'sr-item' + (i === 0 ? ' active' : '');
      a.href = r.href;
      a.innerHTML = `<span class="sr-ico">${r.ico}</span><span class="sr-txt"><b>${esc(r.label)}</b><small>${esc(r.sub)}</small></span><span class="sr-go">&#8594;</span>`;
      a.addEventListener('click', closeSearch);
      a.addEventListener('mouseenter', () => setSearchActive(i));
      wrap.appendChild(a);
    });
    if (count) count.textContent = top.length + (uniq.length > top.length ? '+' : '') + ' result' + (uniq.length === 1 ? '' : 's');
  }
  sb.classList.add('open');
}

function setSearchActive(i) {
  if (!searchBox) return;
  const items = $$('.sr-item', searchBox);
  if (!items.length) { searchActive = -1; return; }
  searchActive = (i + items.length) % items.length;
  items.forEach((el, k) => el.classList.toggle('active', k === searchActive));
  const el = items[searchActive];
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}
function moveSearchActive(d) {
  if (!searchBox) return;
  const items = $$('.sr-item', searchBox);
  if (!items.length) return;
  setSearchActive(searchActive < 0 ? (d > 0 ? 0 : items.length - 1) : searchActive + d);
}

function openSearch() {
  const sb = ensureSearch();
  sb.classList.add('open');
  const inp = $('#globalQ', sb);
  inp.focus();
  const top = $('#topSearch');
  if (top && top.value && !inp.value) inp.value = top.value;
  runSearch();
}
function closeSearch() {
  if (searchBox) { searchBox.classList.remove('open'); const inp = $('#globalQ', searchBox); inp.value = ''; searchActive = -1; }
}

/* hotkey */
window.addEventListener('keydown', e => {
  const ae = document.activeElement;
  const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
  if ((e.key === '/' || e.key === 'f') && !e.ctrlKey && !e.metaKey) {
    if (!typing) { e.preventDefault(); openSearch(); }
    return;
  }
  if (e.key === 'Escape') {
    if (searchBox && searchBox.classList.contains('open')) { closeSearch(); e.preventDefault(); return; }
  }
  if (e.key === 'ArrowLeft' && !typing && route.view === 'lesson' && cur) {
    if (route.li > 0) navigate('lesson', route.mid, route.li - 1);
  }
  if (e.key === 'ArrowRight' && !typing && route.view === 'lesson' && cur) {
    const mod = byId(route.mid);
    if (mod && route.li < mod.lessons.length - 1) navigate('lesson', route.mid, route.li + 1);
  }
  if (!typing && route.view === 'lesson') {
    if (e.key === 'b' || e.key === 'B') { const bb = $('#bmBtn'); if (bb) { e.preventDefault(); bb.click(); } }
    if (e.key === 'n' || e.key === 'N') { const nb = $('#noteBtn'); if (nb) { e.preventDefault(); nb.click(); } }
  }
});

function bindTopSearch() {
  const topQ = $('#topSearch');
  if (!topQ || topQ.dataset.bound) return;
  topQ.dataset.bound = '1';
  topQ.addEventListener('focus', () => {
    const sb = ensureSearch();
    sb.classList.add('open');
    $('#globalQ', sb).value = topQ.value;
    runSearch();
  });
  topQ.addEventListener('input', () => {
    const sb = ensureSearch();
    sb.classList.add('open');
    $('#globalQ', sb).value = topQ.value;
    runSearch();
  });
}

/* ------------------------- chrome wiring ------------------------- */

const themeBtn = $('#themeToggle');
if (themeBtn) {
  themeBtn.innerHTML = getTheme() === 'dark' ? '&#127769;' : '&#9728;&#65039;';
  themeBtn.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
}

const menuBtn = $('#menuBtn');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    document.body.classList.toggle('sb-open');
    const open = document.body.classList.contains('sb-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
document.addEventListener('click', e => {
  if (document.body.classList.contains('sb-open') && !e.target.closest('.sidebar') && !e.target.closest('#menuBtn')) {
    document.body.classList.remove('sb-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }
});

function updateReadBar() {
  const bar = document.getElementById('readBar');
  if (!bar) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  const p = h > 0 ? Math.max(0, Math.min(100, (window.scrollY / h) * 100)) : 0;
  bar.style.width = p + '%';
}
window.addEventListener('scroll', updateReadBar, { passive: true });
window.addEventListener('resize', updateReadBar);

window.addEventListener('hashchange', () => { route = parseHash(); safeRender(); requestAnimationFrame(updateReadBar); });

/* ------------------------- boot ------------------------- */

function safeRender() {
  try {
    render();
  } catch (err) {
    console.error('Render failed', err);
    const v = $('#view');
    if (v) v.innerHTML = '<div class="empty"><h2>This page failed to load</h2><p>Pick another phase from the menu.</p><a class="btn primary" href="#/">Back to dashboard</a></div>';
  }
}

if (!SLUGS.length) {
  document.addEventListener('DOMContentLoaded', () => {
    const v = $('#view');
    if (v) v.innerHTML = '<div class="empty"><h2>Curriculum data missing</h2><p>Run <code>node build/build-data.mjs</code> to generate <code>assets/curricula.js</code>.</p></div>';
  });
} else {
  migrateLegacy();
  route = parseHash();
  safeRender();
}