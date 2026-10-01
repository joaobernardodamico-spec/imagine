// Peças reutilizadas entre telas.
import { store } from '../store.js';
import { STAGES, ACCOUNT_KINDS, TRACKS, TRACK_ICONS, PROJECT_STATUS } from '../config.js';
import { progressOf, account, profile, seesMoney, projectKind, clientLabel } from '../ops.js';
import { esc, icon, avatar, money, date, relDays, progressBar } from '../util.js';

export function kindTag(kind) {
  return `<span class="tag tag-${esc(kind)}">${esc(ACCOUNT_KINDS[kind]?.label || kind)}</span>`;
}

export function stageDots(pid, { labels = false } = {}) {
  const pr = progressOf(pid);
  return `<div class="dots ${labels ? 'with-labels' : ''}">${STAGES.map(def => {
    const s = pr.stages.find(x => x.key === def.key);
    const st = s?.status || 'pendente';
    return `<span class="dot dot-${st}" title="${def.n}. ${esc(def.name)}${st === 'concluida' ? ' ✓' : ''}">${labels ? `<i>${def.n}</i>` : ''}</span>`;
  }).join('')}</div>`;
}

export function projectCard(p) {
  const pr = progressOf(p.id);
  const team = store.where('project_members', m => m.project_id === p.id).map(m => profile(m.user_id)).filter(Boolean);
  const late = p.due_date && p.status === 'ativo' && p.due_date < new Date().toISOString().slice(0, 10);
  return `
  <a class="pcard ${p.cover_url ? 'has-cover' : ''}" href="#/projetos/${esc(p.id)}" style="--cover:${esc(p.cover_color || 'var(--navy)')}">
    <div class="pcard-cover" ${p.cover_url ? `style="background-image:url('${esc(p.cover_url)}')"` : ''}>
      ${p.cover_url ? '' : `<span class="pcard-mono">${esc(p.name.trim().charAt(0).toUpperCase())}</span>`}
    </div>
    <div class="pcard-top">
      ${kindTag(projectKind(p))}
      <span class="pcard-track">${icon(TRACK_ICONS[p.track] || 'folder', 13)}${esc(TRACKS[p.track] || p.track)}</span>
      ${p.status !== 'ativo' ? `<span class="tag tag-status-${esc(p.status)}">${esc(PROJECT_STATUS[p.status])}</span>` : ''}
    </div>
    <div class="pcard-account">${esc(clientLabel(p))}</div>
    <h3 class="pcard-name">${esc(p.name)}</h3>
    ${stageDots(p.id)}
    <div class="pcard-stage">
      ${pr.current ? `<span>Etapa ${pr.currentDef.n} · <strong>${esc(pr.currentDef.name)}</strong></span>` : '<span><strong>Entregue</strong></span>'}
      <span>${pr.pct}%</span>
    </div>
    ${progressBar(pr.pct)}
    <div class="pcard-foot">
      <div class="avatars">${team.slice(0, 4).map(u => avatar(u, 24)).join('')}</div>
      <span class="${late ? 'late' : 'muted'}">${p.due_date ? `${icon('calendar', 14)} ${date(p.due_date)} · ${relDays(p.due_date)}` : ''}</span>
      ${seesMoney() && p.value ? `<span class="muted">${money(p.value)}</span>` : ''}
    </div>
  </a>`;
}

export function pageHead(title, sub = '', actions = '', kicker = '') {
  return `<header class="page-head">
    <div>
      ${kicker ? `<div class="kicker">${kicker}</div>` : ''}
      <h1>${title}</h1>
      ${sub ? `<p class="page-sub">${sub}</p>` : ''}
    </div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}
  </header>`;
}

export function statTile(label, value, sub = '', extra = '') {
  return `<div class="stat"><div class="stat-label">${esc(label)}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}${extra}</div>`;
}

export function tabs(items, active, base) {
  return `<nav class="tabs" role="tablist">${items.map(([key, label, count]) =>
    `<a role="tab" href="#/${base}/${esc(key)}" class="tab ${key === active ? 'active' : ''}" aria-selected="${key === active}">${esc(label)}${count != null ? ` <span class="count">${count}</span>` : ''}</a>`).join('')}</nav>`;
}

export const XP_KIND_LABEL = {
  task_done: 'concluiu a tarefa',
  stage_done: 'fechou a etapa',
  project_delivered: 'entregou o projeto',
  briefing_done: 'completou o briefing de',
  lead_created: 'cadastrou o lead',
  lead_advanced: 'avançou',
  lead_won: 'fechou a',
  revenue_received: 'recebeu',
  note_created: 'anotou em',
};

export function feedItem(x) {
  const u = profile(x.user_id);
  const big = ['stage_done', 'project_delivered', 'lead_won'].includes(x.kind);
  return `<li class="feed-item ${big ? 'feed-big' : ''} feed-${esc(x.kind)}">
    ${avatar(u, big ? 34 : 26)}
    <div class="feed-text">
      <span><strong>${esc(u?.name?.split(' ')[0] || 'Alguém')}</strong> ${esc(XP_KIND_LABEL[x.kind] || '')} <em>${esc(x.label)}</em></span>
      <small>${new Date(x.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</small>
    </div>
    <span class="xp-chip">+${x.amount}</span>
  </li>`;
}
