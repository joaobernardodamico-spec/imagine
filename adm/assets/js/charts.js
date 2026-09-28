// Gráficos leves (HTML/SVG puro) para os painéis de cada seção.
// Uma série por gráfico, cor única (--viz-1); rampa ordinal (--viz-o0..4) só para etapas de funil.
// Todo elemento com data-tip ganha tooltip no hover (título) + data-tip-sub (linha de apoio).
import { esc } from './util.js';

// ------------------------------------------------------------
// Tooltip único para a página inteira
// ------------------------------------------------------------
if (!window.__vizTips) {
  window.__vizTips = true;
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  const place = e => {
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) { tip.classList.remove('show'); return; }
    tip.innerHTML = `<strong>${esc(el.dataset.tip)}</strong>${el.dataset.tipSub ? `<span>${esc(el.dataset.tipSub)}</span>` : ''}`;
    tip.classList.add('show');
    place(e);
  });
  document.addEventListener('mousemove', e => { if (tip.classList.contains('show')) place(e); });
  document.addEventListener('scroll', () => tip.classList.remove('show'), true);
}

const tipAttrs = (title, sub) => `data-tip="${esc(title)}"${sub ? ` data-tip-sub="${esc(sub)}"` : ''}`;

// ------------------------------------------------------------
// Barras horizontais: rows = [{ label, value, sub? }]
// ------------------------------------------------------------
export function hbars(rows, { fmt = v => String(v), empty = 'Sem dados ainda.', ordinal = false } = {}) {
  const max = Math.max(0, ...rows.map(r => Number(r.value) || 0));
  if (!max) return `<p class="viz-empty">${esc(empty)}</p>`;
  return `<ul class="viz-hbars">${rows.map((r, i) => {
    const w = Number(r.value) ? Math.max(1.5, Number(r.value) / max * 100) : 0;
    return `<li ${tipAttrs(r.label, [fmt(r.value), r.sub].filter(Boolean).join(' · '))}>
      <span class="viz-lab">${esc(r.label)}</span>
      <span class="viz-track"><span class="viz-bar" style="width:${w}%;${ordinal ? `background:var(--viz-o${Math.min(i, 4)})` : ''}"></span></span>
      <span class="viz-val">${esc(fmt(r.value))}</span>
    </li>`;
  }).join('')}</ul>`;
}

// ------------------------------------------------------------
// Funil: steps = [{ label, count, sub? }] — mostra a taxa de passagem entre etapas
// ------------------------------------------------------------
export function funnel(steps) {
  const max = Math.max(0, ...steps.map(s => s.count));
  if (!max) return '<p class="viz-empty">O funil aparece quando houver leads.</p>';
  return `<ol class="viz-funnel">${steps.map((s, i) => {
    const prev = steps[i - 1];
    const rate = prev && prev.count ? Math.round((s.count / prev.count) * 100) : null;
    return `<li ${tipAttrs(s.label, `${s.count} leads${rate !== null ? ` · ${rate}% da etapa anterior` : ''}${s.sub ? ` · ${s.sub}` : ''}`)}>
      <span class="viz-lab">${esc(s.label)}</span>
      <span class="viz-track"><span class="viz-bar" style="width:${Math.max(1.5, s.count / max * 100)}%;background:var(--viz-o${Math.min(i, 4)})"></span></span>
      <span class="viz-val">${s.count}${rate !== null ? `<small>${rate}%</small>` : ''}</span>
    </li>`;
  }).join('')}</ol>`;
}

// ------------------------------------------------------------
// Linha: points = [{ label, value }] — crosshair + tooltip por ponto
// ------------------------------------------------------------
export function line(points, { fmt = v => String(v), axisFmt = fmt } = {}) {
  if (!points.length || points.every(p => !p.value)) return '<p class="viz-empty">Sem movimento no período.</p>';
  const W = 560, H = 170, L = 56, R = 12, T = 12, B = 26;
  const max = niceMax(Math.max(...points.map(p => p.value)));
  const x = i => L + (points.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (points.length - 1));
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const step = (W - L - R) / Math.max(1, points.length - 1);
  return `<svg class="viz-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(points.map(p => `${p.label}: ${fmt(p.value)}`).join('; '))}">
    ${ticks.map(t => `<line class="viz-grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="viz-axis" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${esc(axisFmt(t))}</text>`).join('')}
    <polyline class="viz-path" points="${points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}"/>
    ${points.map((p, i) => `<g class="viz-pt" ${tipAttrs(p.label, fmt(p.value))}>
      <rect x="${x(i) - step / 2}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent"/>
      <line class="viz-cross" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H - B}"/>
      <circle cx="${x(i)}" cy="${y(p.value)}" r="4"/>
      <text class="viz-axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>
    </g>`).join('')}
  </svg>`;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

// ------------------------------------------------------------
// KPI com variação: delta > 0 é bom quando good === 'up'
// ------------------------------------------------------------
export function kpi(label, value, { delta = null, deltaText = '', good = 'up', sub = '' } = {}) {
  let d = '';
  if (delta !== null && delta !== 0) {
    const ok = (delta > 0) === (good === 'up');
    d = `<span class="kpi-delta ${ok ? 'up' : 'down'}">${delta > 0 ? '▲' : '▼'} ${esc(deltaText)}</span>`;
  }
  return `<div class="kpi"><div class="stat-label">${esc(label)}</div><div class="kpi-value">${value}</div>${d}${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
}

// Bloco do painel (card com título)
export function panel(title, body, { hint = '', span = 1 } = {}) {
  return `<section class="dash-card ${span > 1 ? 'span-2' : ''}"><header><h3>${esc(title)}</h3>${hint ? `<small>${esc(hint)}</small>` : ''}</header>${body}</section>`;
}

// Painel recolhível no topo das seções. open/onToggle controlados pela view.
export function dashboard({ open, act = 'toggleDash', kpis = '', cards = '' }) {
  return `<section class="dash ${open ? 'open' : ''}">
    <div class="dash-kpis">${kpis}</div>
    <button class="dash-toggle" data-act="${act}" aria-expanded="${open}">${open ? 'Recolher painel' : 'Ver painel completo'}</button>
    ${open ? `<div class="dash-grid">${cards}</div>` : ''}
  </section>`;
}

// Últimos n meses 'YYYY-MM' (do mais antigo ao atual)
export function lastMonths(n = 6) {
  const out = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
export const monthLabel = m => new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
export const shortMoney = v => v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;
