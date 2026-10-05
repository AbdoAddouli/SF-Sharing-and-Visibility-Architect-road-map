const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const unesc = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const PASS_TAGS = /<\/?(?:br|kbd|b|strong|em|i|code|sup|sub|small|mark)\s*\/?>/gi;
const PH = String.fromCharCode(0);
const PH_CODE = new RegExp(PH + 'c(\\d+)' + PH, 'g');
const PH_TAG = new RegExp(PH + 't(\\d+)' + PH, 'g');
const PH_ANY = new RegExp(PH, 'g');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'section';
}

function plain(s) {
  return String(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inline(text, ctx) {
  const codes = [];
  const tags = [];

  let s = String(text);
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return PH + 'c' + (codes.length - 1) + PH;
  });
  s = s.replace(PASS_TAGS, (tag) => {
    tags.push(tag);
    return PH + 't' + (tags.length - 1) + PH;
  });

  s = esc(s);

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_, alt, src) => {
    const raw = unesc(src);
    const href = ctx.linkFor ? ctx.linkFor(raw) : null;
    return `<img src="${esc(href || raw)}" alt="${alt}" loading="lazy">`;
  });

  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_, label, href) => {
    const raw = unesc(href);
    const mapped = ctx.linkFor ? ctx.linkFor(raw) : null;
    if (mapped) return `<a href="${esc(mapped)}">${label}</a>`;
    if (/^https?:\/\//i.test(raw)) return `<a href="${esc(raw)}" target="_blank" rel="noopener">${label}</a>`;
    return `<a href="${esc(raw)}">${label}</a>`;
  });

  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, pre, url) =>
    `${pre}<a href="${esc(url)}" target="_blank" rel="noopener">${url}</a>`);

  s = s
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\n]+)_(?![\w_])/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

  s = s.replace(PH_CODE, (_, i) => `<code class="inline">${esc(codes[+i])}</code>`);
  s = s.replace(PH_TAG, (_, i) => tags[+i]);
  return s;
}

const ITEM_RE = /^(\s*)([-*+]|\d+[.)])(\s+)([\s\S]*)$/;

function matchItem(line) {
  const m = ITEM_RE.exec(line);
  if (!m) return null;
  const indent = m[1].replace(/\t/g, '  ').length;
  const ordered = /\d/.test(m[2]);
  let text = m[4];
  let task = false;
  let checked = false;
  const t = /^\[([ xX])\][ \t]+([\s\S]*)$/.exec(text);
  if (t) { task = true; checked = t[1].toLowerCase() === 'x'; text = t[2]; }
  return { indent, ordered, contentIndent: indent + m[2].length + m[3].length, text, task, checked };
}

const indentOf = (line) => line.match(/^[ \t]*/)[0].replace(/\t/g, '  ').length;

function unwrap(html) {
  const m = /^<p>([\s\S]*)<\/p>$/.exec(html.trim());
  return m ? m[1] : html;
}

function parseList(lines, i, ctx) {
  const first = matchItem(lines[i]);
  const baseIndent = first.indent;
  const ordered = first.ordered;
  const items = [];
  let cur = null;
  let hasTask = false;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length) break;
      const nItem = matchItem(lines[j]);
      const nIndent = indentOf(lines[j]);
      const continues = cur && (nIndent > baseIndent || (nItem && nItem.indent === baseIndent));
      if (!continues) break;
      cur.raw.push('');
      i = j;
      continue;
    }

    const m = matchItem(line);
    if (m && m.indent === baseIndent && m.ordered === ordered) {
      if (cur) items.push(cur);
      cur = { raw: [m.text], contentIndent: m.contentIndent, task: m.task, checked: m.checked };
      if (m.task) hasTask = true;
      i++;
      continue;
    }

    const ind = indentOf(line);
    if (cur && ind >= cur.contentIndent) { cur.raw.push(line.slice(Math.min(ind, cur.contentIndent))); i++; continue; }
    if (cur && ind > baseIndent) { cur.raw.push(line.slice(cur.contentIndent)); i++; continue; }
    break;
  }
  if (cur) items.push(cur);

  const inner = items.map((item) => {
    const body = unwrap(renderBlocks(item.raw, ctx));
    if (item.task) {
      return `<li class="task${item.checked ? ' done' : ''}">` +
        `<span class="t-box">${item.checked ? '&#10003;' : ''}</span>` +
        `<div class="t-text">${body}</div></li>`;
    }
    return `<li>${body}</li>`;
  }).join('');

  if (hasTask) return { html: `<ul class="task-list">${inner}</ul>`, next: i };
  const tag = ordered ? 'ol' : 'ul';
  return { html: `<${tag}>${inner}</${tag}>`, next: i };
}

const isSepRow = (line) =>
  /\|/.test(line) && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function parseTable(lines, i, ctx) {
  const head = splitRow(lines[i]);
  const aligns = splitRow(lines[i + 1]).map((c) => {
    const l = /^:.*:/.test(c);
    const r = /.*:$/.test(c);
    return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
  });
  let j = i + 2;
  const rows = [];
  while (j < lines.length && lines[j].trim() && lines[j].includes('|')) {
    rows.push(splitRow(lines[j]));
    j++;
  }
  const style = (k) => (aligns[k] ? ` style="text-align:${aligns[k]}"` : '');
  const thead = '<thead><tr>' + head.map((c, k) => `<th${style(k)}>${inline(c, ctx)}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map((r) =>
    '<tr>' + head.map((_, k) => `<td${style(k)}>${inline(r[k] || '', ctx)}</td>`).join('') + '</tr>'
  ).join('') + '</tbody>';
  return { html: `<div class="tbl"><table>${thead}${tbody}</table></div>`, next: j };
}

const RE = {
  fence:  /^(\s*)(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/,
  atx:    /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/,
  setext: /^ {0,3}(=+|-{2,})\s*$/,
  hr:     /^ {0,3}([-*_])[ \t]*(\1[ \t]*){2,}$/,
  quote:  /^ {0,3}>[ \t]?/,
  html:   /^ {0,3}<(?:\/?[a-zA-Z][a-zA-Z0-9-]*)/,
  blank:  /^\s*$/,
};

function heading(level, raw, ctx) {
  const lvl = Math.min(6, Math.max(2, level + (ctx.headingOffset || 0)));
  const text = plain(raw);
  let id = slugify(text);
  if (ctx.ids.has(id)) {
    let k = 2;
    while (ctx.ids.has(id + '-' + k)) k++;
    id = id + '-' + k;
  }
  ctx.ids.add(id);
  if (lvl <= 3) ctx.toc.push({ id, text, level: lvl });
  return `<h${lvl} id="${id}">${inline(raw, ctx)}</h${lvl}>`;
}

function renderBlocks(lines, ctx) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (RE.blank.test(line)) { i++; continue; }

    const f = RE.fence.exec(line);
    if (f) {
      const marker = f[2];
      const lang = (f[3] || 'text').toLowerCase();
      const closer = new RegExp('^\\s*' + marker[0] + '{' + marker.length + ',}\\s*$');
      const body = [];
      i++;
      while (i < lines.length && !closer.test(lines[i])) { body.push(lines[i]); i++; }
      i++;
      const cid = 'g' + (ctx.codeSeq++);
      out.push(
        '<div class="codeblock">' +
        `<div class="cb-head"><span class="cb-lang">${esc(lang)}</span>` +
        `<button class="cb-copy" data-copy="${cid}" title="Copy">&#9881; Copy</button></div>` +
        `<pre id="${cid}" class="lang-${esc(lang)}"><code>${esc(body.join('\n'))}</code></pre></div>`
      );
      continue;
    }

    if (RE.hr.test(line)) { out.push('<hr class="g-hr">'); i++; continue; }

    const h = RE.atx.exec(line);
    if (h) {
      const level = h[1].length;
      if (level === 1 && !ctx.title && !out.length) { ctx.title = plain(h[2]); i++; continue; }
      out.push(heading(level, h[2], ctx));
      i++;
      continue;
    }

    if (i + 1 < lines.length && RE.setext.test(lines[i + 1]) && line.trim() && !matchItem(line)) {
      const level = lines[i + 1].trim()[0] === '=' ? 1 : 2;
      if (level === 1 && !ctx.title && !out.length) { ctx.title = plain(line); i += 2; continue; }
      out.push(heading(level, line, ctx));
      i += 2;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      const t = parseTable(lines, i, ctx);
      out.push(t.html);
      i = t.next;
      continue;
    }

    if (RE.quote.test(line)) {
      const inner = [];
      while (i < lines.length && (RE.quote.test(lines[i]) ||
        (inner.length && lines[i].trim() && !matchItem(lines[i]) && !RE.fence.test(lines[i]) && !RE.atx.test(lines[i])))) {
        inner.push(lines[i].replace(RE.quote, ''));
        i++;
      }
      const lead = inner.join(' ').trim();
      const warn = /^(warning|warn|caution|danger|gotcha)\b[:\u2014-]?/i.test(lead);
      const tip = /^(tip|note|remember|key idea|pro tip)\b[:\u2014-]?/i.test(lead);
      const body = unwrap(renderBlocks(inner, ctx));
      const cls = warn ? 'callout warn' : tip ? 'callout tip' : 'g-quote';
      const ico = warn ? '&#9888;&#65039;' : tip ? '&#128161;' : '';
      out.push(`<blockquote class="${cls}">` +
        (ico ? `<div class="co-ico">${ico}</div>` : '') + `<div>${body}</div></blockquote>`);
      continue;
    }

    if (matchItem(line)) {
      const l = parseList(lines, i, ctx);
      out.push(l.html);
      i = l.next;
      continue;
    }

    if (RE.html.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) { buf.push(lines[i]); i++; }
      out.push(buf.join('\n'));
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim()) {
      const l = lines[i];
      if (buf.length && (RE.fence.test(l) || RE.atx.test(l) || RE.hr.test(l) || matchItem(l) ||
        RE.quote.test(l) || RE.html.test(l))) break;
      if (buf.length && !l.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && isSepRow(lines[i + 1])) break;
      if (buf.length && RE.setext.test(lines[i + 1] || '')) break;
      buf.push(l);
      i++;
    }
    out.push(`<p>${inline(buf.join(' '), ctx)}</p>`);
  }

  return out.join('\n');
}

export function renderMarkdown(src, opts = {}) {
  const ctx = {
    toc: [],
    ids: new Set(),
    codeSeq: 1,
    title: '',
    headingOffset: opts.headingOffset || 0,
    linkFor: opts.linkFor || null,
  };
  const lines = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
  const html = renderBlocks(lines, ctx).replace(PH_ANY, '');
  return { html, toc: ctx.toc, title: ctx.title };
}

export default renderMarkdown;
