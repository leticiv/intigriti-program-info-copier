// ==UserScript==
// @name         Intigriti — Program Info Copier
// @namespace    https://github.com/leticiv/intigriti-program-info-copier
// @version      3.0.0
// @description  Extrai todas as informações de um programa Intigriti com seleção de seções e copia formatado
// @author       leticiv
// @match        https://app.intigriti.com/programs/*
// @match        https://app.intigriti.com/researcher/programs/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ─── Tokens (Rose/pink theme) ──────────────────────────────────────────────
  const T = {
    bg:        '#0a0a0a',
    surface:   '#111111',
    elevated:  '#181818',
    border:    '#1e1e1e',
    borderHi:  '#2e2e2e',
    text:      '#e8e8e8',
    muted:     '#555555',
    accent:    '#EB6F92',
    accentLo:  'rgba(235,111,146,.12)',
    green:     '#3DDC84',
    greenLo:   'rgba(61,220,132,.12)',
    red:       '#FF5F57',
    redLo:     'rgba(255,95,87,.12)',
    yellow:    '#FFB800',
    radius:    12,
    radiusSm:  6,
  };

  // ─── Style ─────────────────────────────────────────────────────────────────
  GM_addStyle(`
    #ipic-inner {
      all: initial;
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* ── botão minimalista ────────────────────────────────────────────── */
    #ipic-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: ${T.surface};
      border: 1px solid ${T.border};
      border-radius: 50%;
      cursor: pointer;
      transition: all .2s ease;
      color: ${T.muted};
      opacity: .5;
    }
    #ipic-btn:hover {
      opacity: 1;
      border-color: ${T.accent};
      color: ${T.accent};
      box-shadow: 0 0 20px ${T.accentLo};
      width: auto;
      border-radius: ${T.radius}px;
      padding: 0 14px 0 10px;
      gap: 6px;
    }
    #ipic-btn:hover .ipic-btn-label {
      display: inline;
    }
    #ipic-btn .ipic-btn-label {
      display: none;
      font-size: .75rem;
      font-weight: 500;
      letter-spacing: .04em;
      white-space: nowrap;
    }
    #ipic-btn svg {
      flex-shrink: 0;
    }
    #ipic-btn .ipic-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${T.accent};
      box-shadow: 0 0 8px ${T.accent};
      animation: ipic-pulse 3s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes ipic-pulse {
      0%,100% { opacity: .6; transform: scale(1); }
      50%      { opacity: 1; transform: scale(1.2); }
    }

    /* ── toast ─────────────────────────────────────────────────────────── */
    #ipic-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      z-index: 999999;
      padding: 8px 16px;
      background: ${T.surface};
      color: ${T.text};
      font-size: .8rem;
      border: 1px solid ${T.border};
      border-radius: ${T.radius}px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      opacity: 0;
      pointer-events: none;
      white-space: pre-line;
      transition: opacity .2s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    #ipic-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    #ipic-toast.ok  { border-color: ${T.green}; color: ${T.green}; }
    #ipic-toast.err { border-color: ${T.red};   color: ${T.red}; }

    /* ── overlay ───────────────────────────────────────────────────────── */
    #ipic-overlay {
      position: fixed;
      inset: 0;
      z-index: 999998;
      background: rgba(0,0,0,.6);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── modal ─────────────────────────────────────────────────────────── */
    #ipic-modal {
      background: ${T.bg};
      border: 1px solid ${T.border};
      border-radius: ${T.radius + 2}px;
      width: min(680px, 94vw);
      max-height: 84vh;
      display: flex;
      flex-direction: column;
      animation: ipic-up .2s ease;
      overflow: hidden;
    }
    @keyframes ipic-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── header ────────────────────────────────────────────────────────── */
    #ipic-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${T.border};
    }
    #ipic-modal-brand {
      font-size: .7rem;
      font-weight: 600;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: ${T.muted};
    }
    #ipic-modal-close {
      background: none;
      border: none;
      color: ${T.muted};
      font-size: 16px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color .15s;
      line-height: 1;
    }
    #ipic-modal-close:hover { color: ${T.text}; }

    /* ── chips ─────────────────────────────────────────────────────────── */
    #ipic-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 12px 20px;
      border-bottom: 1px solid ${T.border};
    }
    .ipic-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: ${T.elevated};
      border: 1px solid ${T.border};
      border-radius: 20px;
      font-size: .72rem;
      font-weight: 500;
      color: ${T.muted};
      cursor: pointer;
      transition: all .15s ease;
      user-select: none;
      line-height: 1.4;
    }
    .ipic-chip:hover {
      border-color: ${T.accent};
      color: ${T.text};
    }
    .ipic-chip.on {
      background: ${T.accentLo};
      border-color: ${T.accent};
      color: ${T.text};
    }
    .ipic-chip .ipic-chip-check {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1.5px solid ${T.muted};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all .15s;
    }
    .ipic-chip.on .ipic-chip-check {
      background: ${T.accent};
      border-color: ${T.accent};
    }
    .ipic-chip .ipic-chip-count {
      opacity: .5;
      font-size: .65rem;
      margin-left: 2px;
    }

    /* ── preview ───────────────────────────────────────────────────────── */
    #ipic-preview {
      flex: 1;
      overflow-y: auto;
      background: ${T.surface};
      padding: 16px 20px;
      white-space: pre;
      line-height: 1.7;
      color: ${T.text};
      font-family: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
      font-size: .78rem;
      outline: none;
    }
    #ipic-preview::-webkit-scrollbar { width: 4px; }
    #ipic-preview::-webkit-scrollbar-track { background: transparent; }
    #ipic-preview::-webkit-scrollbar-thumb { background: ${T.borderHi}; border-radius: 4px; }

    .ipic-preview-sep {
      color: ${T.muted};
      font-weight: 400;
    }
    .ipic-preview-label {
      color: ${T.accent};
      font-weight: 600;
    }
    .ipic-preview-green  { color: ${T.green}; }
    .ipic-preview-red    { color: ${T.red}; }
    .ipic-preview-yellow { color: ${T.yellow}; }
    .ipic-preview-muted  { color: ${T.muted}; }

    /* ── footer ────────────────────────────────────────────────────────── */
    #ipic-modal-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-top: 1px solid ${T.border};
      flex-wrap: wrap;
    }
    #ipic-format-select {
      padding: 5px 10px;
      background: ${T.elevated};
      color: ${T.text};
      border: 1px solid ${T.border};
      border-radius: ${T.radiusSm}px;
      font-size: .75rem;
      font-weight: 500;
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }
    #ipic-format-select:focus { border-color: ${T.accent}; }
    .ipic-spacer { flex: 1; }
    .ipic-action-btn {
      padding: 6px 16px;
      border-radius: ${T.radiusSm}px;
      font-size: .75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
      border: 1px solid transparent;
      font-family: inherit;
    }
    #ipic-copy-btn {
      background: ${T.accent};
      color: ${T.bg};
      border-color: ${T.accent};
    }
    #ipic-copy-btn:hover { filter: brightness(1.15); }
    #ipic-copy-btn:disabled {
      opacity: .4;
      cursor: not-allowed;
      filter: none;
    }
    #ipic-close-btn {
      background: transparent;
      color: ${T.muted};
      border-color: ${T.border};
    }
    #ipic-close-btn:hover { color: ${T.text}; border-color: ${T.borderHi}; }
  `);

  // ─── Persistent state ─────────────────────────────────────────────────────
  const STORAGE_KEY_SEL = 'ipic-selected-sections';
  const STORAGE_KEY_FMT = 'ipic-format';

  const ALL_SECTIONS = [
    { id: 'program',     label: 'Program' },
    { id: 'bounty',      label: 'Bounty' },
    { id: 'stats',       label: 'Stats' },
    { id: 'response',    label: 'Response' },
    { id: 'assetsIn',    label: 'Assets (in)' },
    { id: 'assetsOos',   label: 'Assets (oos)' },
    { id: 'oosVulns',    label: 'OOS vulns' },
    { id: 'safeHarbour', label: 'Safe Harbour' },
  ];

  function defaultSelection() {
    return ALL_SECTIONS.map(s => s.id);
  }

  function loadSelection() {
    try { const v = JSON.parse(GM_getValue(STORAGE_KEY_SEL, '[]')); return Array.isArray(v) && v.length ? v : defaultSelection(); }
    catch (_) { return defaultSelection(); }
  }

  function saveSelection(ids) {
    try { GM_setValue(STORAGE_KEY_SEL, JSON.stringify(ids)); }
    catch (_) {}
  }

  function loadFormat() {
    try { const v = GM_getValue(STORAGE_KEY_FMT, 'plain'); return ['plain','json','csv','markdown'].includes(v) ? v : 'plain'; }
    catch (_) { return 'plain'; }
  }

  function saveFormat(f) {
    try { GM_setValue(STORAGE_KEY_FMT, f); }
    catch (_) {}
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg, type) {
    let el = document.getElementById('ipic-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ipic-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = type === 'ok' ? 'ok' : type === 'err' ? 'err' : '';
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ─── Section data extractors ──────────────────────────────────────────────

  function extractProgramInfo() {
    const data = { name: '', company: '', status: '', confidentiality: '', industry: '', url: location.href };

    // breadcrumbs → program name
    const bc = document.querySelector('.breadcrumbs');
    if (bc) {
      const parts = bc.querySelectorAll('span:not(.separator)');
      if (parts.length >= 2) {
        data.company = parts[0].textContent.trim();
        data.name = parts[parts.length - 1].textContent.trim();
      } else {
        data.name = bc.textContent.replace(/\//g, '').trim();
      }
    }

    // specific banner components (narrow, avoids hundreds of .label-container matches elsewhere)
    const statusLabel = document.querySelector('lib-program-status-label .copy');
    if (statusLabel) data.status = statusLabel.textContent.trim();

    const confLabel = document.querySelector('lib-program-confidentiality-label .copy');
    if (confLabel) data.confidentiality = confLabel.textContent.trim();

    const indLabel = document.querySelector('lib-industry-label .copy');
    if (indLabel) data.industry = indLabel.textContent.trim();

    return data;
  }

  function extractBountyRanges() {
    const table = document.querySelector('lib-bounty-table-detail');
    if (!table) return [];

    // parse column headers → severity names + CVSS scoring ranges
    const headers = [];
    const headerEl = table.querySelector('lib-bounty-table-header');
    if (headerEl) {
      headerEl.querySelectorAll('.column-header').forEach(ch => {
        const name = ch.querySelector('.label');
        const score = ch.querySelector('.scoring-range');
        if (name) headers.push({
          severity: name.textContent.trim(),
          scoring: score ? score.textContent.trim() : '',
        });
      });
    }

    // parse each row
    const rowEls = table.querySelectorAll('lib-bounty-table-row');
    const parsedRows = [];
    rowEls.forEach(el => {
      const tierLabel = el.querySelector('lib-bounty-tier-label .copy, lib-bounty-tier-label');
      const label = tierLabel ? tierLabel.textContent.trim() : '';
      if (!label) return;

      const currencyEl = el.querySelector('.row-label .currency');
      const rawCurrency = currencyEl ? currencyEl.textContent.trim() : '';
      const sym = rawCurrency.match(/[€$£¥]/);
      const currency = sym ? sym[0] : '€';

      // Try column-mapped extraction first
      const columns = el.querySelectorAll('.bounty-table-row-container.desktop-view > .column');
      let values = [];
      if (columns.length) {
        columns.forEach((col, i) => {
          const rc = col.querySelector('.range-container');
          if (!rc) return;
          const parts = rc.children;
          const min = parts[0] ? parts[0].textContent.trim() : '';
          const max = parts[1] ? parts[1].textContent.trim() : '';
          values.push({
            severity: headers[i] ? headers[i].severity : `col-${i}`,
            min, max,
          });
        });
      }

      // Fallback 1: direct .range-container children
      if (!values.length) {
        const ranges = el.querySelectorAll('.range-container');
        ranges.forEach(rc => {
          const parts = rc.children;
          const min = parts[0] ? parts[0].textContent.trim() : '';
          const max = parts[1] ? parts[1].textContent.trim() : '';
          values.push({ severity: '', min, max });
        });
      }

      // Fallback 2: raw text of .range-container (regex number extraction)
      if (!values.length) {
        const ranges = el.querySelectorAll('.range-container');
        ranges.forEach(rc => {
          const raw = rc.textContent.trim();
          const nums = raw.match(/[\d,.]+/g);
          if (nums) {
            values.push({ severity: '', min: nums[0] || '', max: nums[1] || '' });
          }
        });
      }

      parsedRows.push({ label, currency, values });
    });

    // if no rows but headers exist, return headers as fallback
    if (!parsedRows.length && headers.length) {
      return headers.map(h => ({
        label: h.severity,
        currency: '€',
        values: [{ severity: h.severity, min: '', max: '' }],
      }));
    }

    return parsedRows;
  }

  function extractStats() {
    const stats = { submissions: '', accepted: '', avgPayout: '', totalPayouts: '', firstResponse: '', triage: '', decide: '' };
    const containers = document.querySelectorAll('.section.stats-container');

    containers.forEach(container => {
      const header = container.querySelector('.side-section-header .title');
      if (!header) return;
      const title = header.textContent.trim().toLowerCase();

      container.querySelectorAll('.stat').forEach(stat => {
        const label = stat.querySelector('.stat-header');
        const value = stat.querySelector('.stat-detail');
        if (!label || !value) return;
        const l = label.textContent.trim().toLowerCase();
        const v = value.textContent.trim();

        if (title.includes('overall')) {
          if (l.includes('submissions received'))  stats.submissions = v;
          else if (l.includes('accepted submissions')) stats.accepted = v;
          else if (l.includes('average payout'))    stats.avgPayout = v;
          else if (l.includes('total payouts'))     stats.totalPayouts = v;
        } else if (title.includes('response')) {
          if (l.includes('first response'))  stats.firstResponse = v;
          else if (l.includes('triage'))     stats.triage = v;
          else if (l.includes('decide'))     stats.decide = v;
        }
      });
    });

    return stats;
  }

  function extractLeaderboard() {
    const researchers = [];
    const container = document.querySelector('.leaderboard-and-contributors-container');
    if (!container) return researchers;

    container.querySelectorAll('.researcher .researcher-name').forEach(el => {
      const name = el.textContent.trim();
      if (name) researchers.push(name);
    });

    return researchers;
  }

  function extractOosVulns() {
    const items = [];
    // Find the "Out of scope" detail box
    const detailBoxes = document.querySelectorAll('lib-researcher-program-detail-box');
    for (const box of detailBoxes) {
      const header = box.querySelector('.detail-header span');
      if (header && header.textContent.trim().toLowerCase().includes('out of scope')) {
        const marked = box.querySelector('lib-markdown-viewer .marked');
        if (marked) {
          const lis = marked.querySelectorAll('ul li');
          lis.forEach(li => {
            const text = li.textContent.trim();
            if (text) items.push(text);
          });
        }
        break;
      }
    }
    return items;
  }

  function extractSafeHarbour() {
    const el = document.querySelector('app-program-safe-harbour-detail .safe-harbour-applied');
    if (!el) return '';
    return el.textContent.trim();
  }

  // ─── Asset extraction (existing, improved) ────────────────────────────────
  function waitForAssets(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const nodes = document.querySelectorAll('lib-asset-detail');
        if (nodes.length > 0) return resolve(nodes);
        if (Date.now() - start > timeout) return reject(new Error('assets não encontrados'));
        setTimeout(check, 400);
      };
      check();
    });
  }

  function extractAssetName(node) {
    const span = node.querySelector('.asset-name span, .asset-name a');
    return span ? span.textContent.trim() : null;
  }

  function isOOS(node) {
    const tier = node.querySelector('.tier .copy');
    return tier && tier.textContent.trim().toLowerCase().includes('out of scope');
  }

  function getTier(node) {
    const tier = node.querySelector('.tier .copy');
    return tier ? tier.textContent.trim() : '';
  }

  function getType(node) {
    const type = node.querySelector('.type .copy');
    return type ? type.textContent.trim() : '';
  }

  async function collectAssets() {
    const nodes = await waitForAssets();
    const inScope = [], outOfScope = [];
    nodes.forEach(node => {
      const name = extractAssetName(node);
      if (!name) return;
      const entry = { name, tier: getTier(node), type: getType(node) };
      (isOOS(node) ? outOfScope : inScope).push(entry);
    });
    return { inScope, outOfScope };
  }

  // ─── Master collector ─────────────────────────────────────────────────────
  async function collectAll() {
    const [assets, program, bounty, stats, leaderboard, oosVulns, safeHarbour] = await Promise.all([
      collectAssets(),
      Promise.resolve(extractProgramInfo()),
      Promise.resolve(extractBountyRanges()),
      Promise.resolve(extractStats()),
      Promise.resolve(extractLeaderboard()),
      Promise.resolve(extractOosVulns()),
      Promise.resolve(extractSafeHarbour()),
    ]);

    return { program, bounty, stats, leaderboard, oosVulns, safeHarbour, assets };
  }

  // ─── Formatters ───────────────────────────────────────────────────────────
  function csvEscape(v) {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function formatSelected(data, selectedIds, format) {
    switch (format) {
      case 'json':     return formatJson(data, selectedIds);
      case 'csv':      return formatCsv(data, selectedIds);
      case 'markdown': return formatMarkdown(data, selectedIds);
      default:         return formatPlain(data, selectedIds);
    }
  }

  function formatPlain(data, sel) {
    const lines = [];
    const has = id => sel.includes(id);

    if (has('program')) {
      const p = data.program;
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push(`  Program:  ${p.company}${p.name && p.company !== p.name ? ` / ${p.name}` : ''}`);
      if (p.status)         lines.push(`  Status:   ${p.status}`);
      if (p.confidentiality) lines.push(`  Type:     ${p.confidentiality}`);
      if (p.industry)       lines.push(`  Sector:   ${p.industry}`);
      lines.push(`  URL:      ${p.url}`);
      lines.push('───────────────────────────────────────────────────────────────');
    }

    if (has('bounty') && data.bounty.length) {
      lines.push(`  BOUNTY RANGES`);
      const allSevs = [...new Set(data.bounty.flatMap(r => r.values.map(v => v.severity)))].filter(Boolean);
      const sevMaxLen = allSevs.length ? Math.max(...allSevs.map(s => s.length), 8) : 0;

      data.bounty.forEach(row => {
        lines.push(`    ${row.label}`);
        row.values.forEach(v => {
          if (!v.min && !v.max) return;
          if (v.severity && sevMaxLen) {
            const sev = v.severity.padEnd(sevMaxLen);
            lines.push(`      ${sev}  ${row.currency} ${v.min} - ${v.max}`);
          } else {
            lines.push(`      ${row.currency} ${v.min} - ${v.max}`);
          }
        });
      });
      lines.push('');
    }

    if (has('stats')) {
      const s = data.stats;
      lines.push(`  STATS`);
      if (s.submissions)  lines.push(`    submissions:   ${s.submissions}`);
      if (s.accepted)     lines.push(`    accepted:      ${s.accepted}`);
      if (s.avgPayout)    lines.push(`    avg payout:    ${s.avgPayout}`);
      if (s.totalPayouts) lines.push(`    total payouts: ${s.totalPayouts}`);
      if (s.firstResponse || s.triage || s.decide) {
        lines.push(`    response times:`);
        if (s.firstResponse) lines.push(`      first response: ${s.firstResponse}`);
        if (s.triage)        lines.push(`      triage:         ${s.triage}`);
        if (s.decide)        lines.push(`      decide:         ${s.decide}`);
      }
      lines.push('');
    }

    if (has('response')) {
      lines.push(`  RESPONSE TIMES`);
      const s = data.stats;
      if (s.firstResponse) lines.push(`    first response:  ${s.firstResponse}`);
      if (s.triage)        lines.push(`    triage:          ${s.triage}`);
      if (s.decide)        lines.push(`    decide:          ${s.decide}`);
      lines.push('');
    }

    if (has('assetsIn') && data.assets.inScope.length) {
      lines.push(`  ASSETS (IN-SCOPE)`);
      data.assets.inScope.forEach(a => {
        const type = a.type ? `  [${a.type}]` : '';
        lines.push(`    • ${a.name}${type}`);
      });
      lines.push('');
    }

    if (has('assetsOos') && data.assets.outOfScope.length) {
      lines.push(`  ASSETS (OUT-OF-SCOPE)`);
      data.assets.outOfScope.forEach(a => {
        const type = a.type ? `  [${a.type}]` : '';
        lines.push(`    • ${a.name}${type}`);
      });
      lines.push('');
    }

    if (has('oosVulns') && data.oosVulns.length) {
      lines.push(`  OUT-OF-SCOPE VULNERABILITIES`);
      data.oosVulns.forEach(v => lines.push(`    • ${v}`));
      lines.push('');
    }

    if (has('safeHarbour') && data.safeHarbour) {
      lines.push(`  SAFE HARBOUR`);
      lines.push(`    ${data.safeHarbour}`);
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  function formatMarkdown(data, sel) {
    const lines = [];
    const has = id => sel.includes(id);

    if (has('program')) {
      const p = data.program;
      lines.push(`## ${p.company}${p.name && p.company !== p.name ? ` / ${p.name}` : ''}`);
      if (p.status)         lines.push(`- **Status:** ${p.status}`);
      if (p.confidentiality) lines.push(`- **Type:** ${p.confidentiality}`);
      if (p.industry)       lines.push(`- **Sector:** ${p.industry}`);
      lines.push(`- **URL:** [${p.url}](${p.url})`);
      lines.push('');
    }

    if (has('bounty') && data.bounty.length) {
      lines.push('### Bounty Ranges');
      data.bounty.forEach(row => {
        lines.push(`**${row.label}**`);
        row.values.forEach(v => {
          if (!v.min && !v.max) return;
          if (v.severity) {
            lines.push(`- ${v.severity}: ${row.currency} ${v.min} - ${v.max}`);
          } else {
            lines.push(`- ${row.currency} ${v.min} - ${v.max}`);
          }
        });
      });
      lines.push('');
    }

    if (has('stats')) {
      const s = data.stats;
      lines.push('### Stats');
      if (s.submissions)  lines.push(`- **Submissions:** ${s.submissions}`);
      if (s.accepted)     lines.push(`- **Accepted:** ${s.accepted}`);
      if (s.avgPayout)    lines.push(`- **Avg Payout:** ${s.avgPayout}`);
      if (s.totalPayouts) lines.push(`- **Total Payouts:** ${s.totalPayouts}`);
      if (s.firstResponse || s.triage || s.decide) {
        lines.push('- **Response Times:**');
        if (s.firstResponse) lines.push(`  - First response: ${s.firstResponse}`);
        if (s.triage)        lines.push(`  - Triage: ${s.triage}`);
        if (s.decide)        lines.push(`  - Decide: ${s.decide}`);
      }
      lines.push('');
    }

    if (has('response')) {
      lines.push('### Response Times');
      const r = data.stats;
      if (r.firstResponse) lines.push(`- **First Response:** ${r.firstResponse}`);
      if (r.triage)        lines.push(`- **Triage:** ${r.triage}`);
      if (r.decide)        lines.push(`- **Decide:** ${r.decide}`);
      lines.push('');
    }

    if (has('assetsIn') && data.assets.inScope.length) {
      lines.push('### Assets (In-Scope)');
      data.assets.inScope.forEach(a => {
        const type = a.type ? ` [${a.type}]` : '';
        lines.push(`- \`${a.name}\`${type}`);
      });
      lines.push('');
    }

    if (has('assetsOos') && data.assets.outOfScope.length) {
      lines.push('### Assets (Out-of-Scope)');
      data.assets.outOfScope.forEach(a => {
        const type = a.type ? ` [${a.type}]` : '';
        lines.push(`- \`${a.name}\`${type}`);
      });
      lines.push('');
    }

    if (has('oosVulns') && data.oosVulns.length) {
      lines.push('### Out-of-Scope Vulnerabilities');
      data.oosVulns.forEach(v => lines.push(`- ${v}`));
      lines.push('');
    }

    if (has('safeHarbour') && data.safeHarbour) {
      lines.push('### Safe Harbour');
      lines.push(data.safeHarbour);
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  function formatJson(data, sel) {
    const obj = {};
    if (sel.includes('program'))     obj.program = data.program;
    if (sel.includes('bounty'))      obj.bounty = data.bounty;
    if (sel.includes('stats'))       obj.stats = data.stats;
    if (sel.includes('response'))    obj.responseTimes = { firstResponse: data.stats.firstResponse, triage: data.stats.triage, decide: data.stats.decide };
    if (sel.includes('assetsIn'))    obj.assetsInScope = data.assets.inScope;
    if (sel.includes('assetsOos'))   obj.assetsOutOfScope = data.assets.outOfScope;
    if (sel.includes('oosVulns'))    obj.outOfScopeVulnerabilities = data.oosVulns;
    if (sel.includes('safeHarbour')) obj.safeHarbour = data.safeHarbour;
    return JSON.stringify(obj, null, 2);
  }

  function formatCsv(data, sel) {
    const rows = [];
    if (sel.includes('assetsIn')) {
      rows.push(['name', 'type', 'tier', 'scope']);
      data.assets.inScope.forEach(a => rows.push([a.name, a.type, a.tier, 'in-scope']));
    }
    if (sel.includes('assetsOos')) {
      if (!rows.length) rows.push(['name', 'type', 'tier', 'scope']);
      data.assets.outOfScope.forEach(a => rows.push([a.name, a.type, a.tier, 'out-of-scope']));
    }
    if (sel.includes('bounty')) {
      rows.push(['category', 'severity', 'currency', 'min', 'max']);
      data.bounty.forEach(b => {
        b.values.forEach(v => rows.push([b.label, v.severity, b.currency, v.min, v.max]));
      });
    }
    if (sel.includes('oosVulns')) {
      rows.push(['out_of_scope_vulnerability']);
      data.oosVulns.forEach(v => rows.push([v]));
    }
    if (sel.includes('stats')) {
      rows.push(['stat', 'value']);
      const s = data.stats;
      if (s.submissions)  rows.push(['submissions', s.submissions]);
      if (s.accepted)     rows.push(['accepted', s.accepted]);
      if (s.avgPayout)    rows.push(['avg_payout', s.avgPayout]);
      if (s.totalPayouts) rows.push(['total_payouts', s.totalPayouts]);
    }
    if (rows.length === 0) return '';
    return rows.map(r => r.map(csvEscape).join(',')).join('\n');
  }

  // ─── Render helper (plain colorized preview) ──────────────────────────────
  function renderPreview(text) {
    return text
      .replace(/(Program|Status|Type|Sector|URL):/g, '<span class="ipic-preview-label">$1:</span>')
      .replace(/BOUNTY RANGES/g,  '<span class="ipic-preview-label">BOUNTY RANGES</span>')
      .replace(/STATS/g,          '<span class="ipic-preview-label">STATS</span>')
      .replace(/RESPONSE/g,       '<span class="ipic-preview-label">RESPONSE</span>')
      .replace(/IN-SCOPE/g,       '<span class="ipic-preview-green">IN-SCOPE</span>')
      .replace(/OUT-OF-SCOPE/g,   '<span class="ipic-preview-red">OUT-OF-SCOPE</span>')
      .replace(/SAFE HARBOUR/g,   '<span class="ipic-preview-label">SAFE HARBOUR</span>')
      .replace(/─+/g,             m => `<span class="ipic-preview-sep">${m}</span>`);
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  function showModal(data) {
    const existing = document.getElementById('ipic-overlay');
    if (existing) existing.remove();

    let selectedFormat = loadFormat();
    let selectedSections = loadSelection();

    // stats and response share the same data source — deduplicate on selection
    const overlay = document.createElement('div');
    overlay.id = 'ipic-overlay';
    overlay.innerHTML = `
      <div id="ipic-inner">
        <div id="ipic-modal">
          <div id="ipic-modal-header">
            <span id="ipic-modal-brand">program info</span>
            <button id="ipic-modal-close">✕</button>
          </div>
          <div id="ipic-chips"></div>
          <div id="ipic-preview"></div>
          <div id="ipic-modal-footer">
            <select id="ipic-format-select">
              <option value="plain">plain</option>
              <option value="markdown">markdown</option>
              <option value="json">json</option>
              <option value="csv">csv</option>
            </select>
            <span id="ipic-copy-count" style="font-size:.7rem;color:${T.muted};font-weight:500;"></span>
            <div class="ipic-spacer"></div>
            <button class="ipic-action-btn" id="ipic-close-btn">close</button>
            <button class="ipic-action-btn" id="ipic-copy-btn">copy selected</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const preview   = document.getElementById('ipic-preview');
    const chips     = document.getElementById('ipic-chips');
    const formatSel = document.getElementById('ipic-format-select');
    const copyBtn   = document.getElementById('ipic-copy-btn');
    const countSpan = document.getElementById('ipic-copy-count');

    const close = () => overlay.remove();
    document.getElementById('ipic-modal-close').addEventListener('click', close);
    document.getElementById('ipic-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    // add stats and response as mutually exclusive? No, keep separate

    function chipCount(id) {
      switch (id) {
        case 'assetsIn':  return data.assets.inScope.length;
        case 'assetsOos': return data.assets.outOfScope.length;
        case 'oosVulns':  return data.oosVulns.length;
        case 'bounty':    return data.bounty.reduce((s, r) => s + r.values.length, 0);
        default:          return 0;
      }
    }

    function renderChips() {
      chips.innerHTML = '';
      // select / deselect all
      const allBtn = document.createElement('div');
      allBtn.className = 'ipic-chip' + (selectedSections.length === ALL_SECTIONS.length ? ' on' : '');
      allBtn.style.borderStyle = 'dashed';
      allBtn.innerHTML = `<span class="ipic-chip-check">${selectedSections.length === ALL_SECTIONS.length ? '✓' : ''}</span> all`;
      allBtn.addEventListener('click', () => {
        selectedSections = selectedSections.length === ALL_SECTIONS.length ? [] : [...ALL_SECTIONS.map(s => s.id)];
        if (!selectedSections.length) selectedSections = [ALL_SECTIONS[0].id];
        saveSelection(selectedSections);
        renderChips();
        updatePreview();
      });
      chips.appendChild(allBtn);

      ALL_SECTIONS.forEach(s => {
        const count = chipCount(s.id);
        const chip = document.createElement('div');
        chip.className = 'ipic-chip' + (selectedSections.includes(s.id) ? ' on' : '');
        chip.setAttribute('data-id', s.id);
        chip.innerHTML = `
          <span class="ipic-chip-check">${selectedSections.includes(s.id) ? '✓' : ''}</span>
          ${s.label}
          ${count > 0 ? `<span class="ipic-chip-count">${count}</span>` : ''}
        `;
        chip.addEventListener('click', () => {
          const id = chip.getAttribute('data-id');
          const idx = selectedSections.indexOf(id);
          if (idx >= 0) {
            if (selectedSections.length <= 1) return; // keep at least one
            selectedSections.splice(idx, 1);
          } else {
            selectedSections.push(id);
          }
          saveSelection(selectedSections);
          renderChips();
          updatePreview();
        });
        chips.appendChild(chip);
      });
    }

    function updatePreview() {
      const text = formatSelected(data, selectedSections, selectedFormat);
      if (selectedFormat === 'plain') {
        preview.innerHTML = renderPreview(text);
      } else {
        preview.textContent = text;
      }
      const count = selectedSections.length;
      countSpan.textContent = `${count} section${count !== 1 ? 's' : ''}`;
      copyBtn.disabled = !text;
    }

    formatSel.value = selectedFormat;
    formatSel.addEventListener('change', () => {
      selectedFormat = formatSel.value;
      saveFormat(selectedFormat);
      updatePreview();
    });

    copyBtn.addEventListener('click', () => {
      const text = formatSelected(data, selectedSections, selectedFormat);
      if (!text) { showToast('nothing to copy', 'err'); return; }
      GM_setClipboard(text);
      const count = selectedSections.length;
      showToast(`copied — ${count} section${count !== 1 ? 's' : ''}`, 'ok');
      copyBtn.textContent = '✓ copied';
      setTimeout(() => { if (document.getElementById('ipic-copy-btn')) document.getElementById('ipic-copy-btn').textContent = 'copy selected'; }, 2000);
    });

    renderChips();
    updatePreview();
  }

  // ─── Button ───────────────────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('ipic-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ipic-btn';

    // Minimal dot + eye icon
    btn.innerHTML = `
      <div class="ipic-dot"></div>
      <span class="ipic-btn-label">program info</span>
    `;

    btn.addEventListener('click', async () => {
      btn.style.opacity = '.4';
      btn.style.pointerEvents = 'none';

      try {
        const data = await collectAll();
        const totalAssets = data.assets.inScope.length + data.assets.outOfScope.length;
        if (!totalAssets && !data.program.name) {
          showToast('no data found — page loaded?', 'err');
          return;
        }
        showModal(data);
      } catch (err) {
        showToast(`error: ${err.message}`, 'err');
      } finally {
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }
    });

    document.body.appendChild(btn);
  }

  // ─── Init (SPA-aware) ────────────────────────────────────────────────────
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectButton, 1200);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectButton, 1500);

})();
