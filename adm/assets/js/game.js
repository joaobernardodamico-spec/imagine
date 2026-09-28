// Gamificação: XP, níveis, conquistas, streaks e rankings.
import { store } from './store.js';
import { XP, LEVELS, BADGES } from './config.js';
import { thisMonth, inMonth } from './util.js';

const SALES_KINDS = new Set(['lead_created', 'lead_advanced', 'lead_won', 'revenue_received']);

export async function award(userId, kind, label, refId = null) {
  const amount = XP[kind] || 0;
  if (!amount || !userId) return 0;
  await store.insert('xp_events', { user_id: userId, amount, kind, label, ref_id: refId });
  return amount;
}

// Remove XP quando algo é desfeito (ex.: desmarcar tarefa)
export async function revoke(kind, refId) {
  const ev = store.all('xp_events').find(x => x.kind === kind && x.ref_id === refId);
  if (!ev) return;
  try { await store.remove('xp_events', ev.id); }
  catch (err) { console.warn('XP não removido (sem permissão):', err.message); }
}

export function xpOf(userId, { month = null, area = null } = {}) {
  return store.all('xp_events')
    .filter(x => x.user_id === userId)
    .filter(x => !month || inMonth(x.created_at, month))
    .filter(x => !area || (area === 'vendas' ? SALES_KINDS.has(x.kind) : !SALES_KINDS.has(x.kind)))
    .reduce((s, x) => s + x.amount, 0);
}

export function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i], next = LEVELS[i + 1];
  return {
    n: i + 1, name: cur.name, xp,
    floor: cur.min, ceil: next ? next.min : cur.min,
    next: next ? next.name : null,
    progress: next ? (xp - cur.min) / (next.min - cur.min) : 1,
  };
}

export function statsOf(userId) {
  const ev = store.all('xp_events').filter(x => x.user_id === userId);
  const count = k => ev.filter(x => x.kind === k).length;
  return {
    tasks: count('task_done'),
    stages: count('stage_done'),
    delivered: count('project_delivered'),
    wins: count('lead_won'),
    briefings: count('briefing_done'),
    streak: streakOf(ev),
  };
}

function streakOf(events) {
  const days = new Set(events.map(e => String(e.created_at).slice(0, 10)));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1); // ainda dá tempo hoje
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function badgesOf(userId) {
  const s = statsOf(userId);
  return BADGES.map(b => ({ ...b, earned: b.test(s) }));
}

export function leaderboard({ month = thisMonth(), area = null } = {}) {
  return store.all('profiles')
    .filter(p => p.active !== false)
    .map(p => ({ profile: p, xp: xpOf(p.id, { month, area }), total: xpOf(p.id) }))
    .sort((a, b) => b.xp - a.xp);
}

export function salesOf(userId, month = thisMonth()) {
  return store.all('leads')
    .filter(l => l.owner_id === userId && l.stage === 'venda' && inMonth(l.won_at, month))
    .reduce((s, l) => s + (Number(l.value) || 0), 0);
}

export function deliveriesOf(userId, month = thisMonth()) {
  return store.all('tasks').filter(t => t.done && t.done_by === userId && inMonth(t.done_at, month)).length;
}
