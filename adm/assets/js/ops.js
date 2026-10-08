// Regras de negócio: permissões, projetos/etapas/tarefas, CRM, metas.
import { store } from './store.js';
import { ACCESS, STAGES, LEAD_STAGES, LEAD_WON, LEAD_LOST, stageTasksFor, stageDef, STAGE_DAYS, XP } from './config.js';
import { award, revoke } from './game.js';
import { celebrate, toast, inMonth, today } from './util.js';

// ------------------------------------------------------------
// Permissões (espelham o RLS do banco; aqui só controlam a interface)
// ------------------------------------------------------------
export const me = () => store.user;
export const role = () => store.user?.role;
export const can = mod => !!store.user && (ACCESS[mod] || []).includes(store.user.role);
export const isSocio = () => role() === 'socio';
export const seesMoney = () => ['socio', 'comercial'].includes(role());

export function isMember(projectId, userId = me()?.id) {
  return store.all('project_members').some(m => m.project_id === projectId && m.user_id === userId);
}

export function visibleProjects() {
  const all = store.all('projects');
  return role() === 'freela' ? all.filter(p => isMember(p.id)) : all;
}

export function canEditProject(p) {
  return ['socio', 'producao'].includes(role()) || isMember(p.id);
}

export const profile = id => store.find('profiles', id);
export const account = id => store.find('accounts', id);
// Todo projeto nasce na conta IMAGINE e tem um de dois tipos: cliente ou ecossistema.
// Ecossistema inclui os projetos internos da IMAGINE. Projetos antigos herdam o tipo e o nome da conta.
export const imagineAccount = () => store.all('accounts').find(a => a.kind === 'imagine') || null;
export function projectKind(p) {
  const k = p.kind || account(p.account_id)?.kind || 'cliente';
  return k === 'imagine' ? 'ecossistema' : k;
}
export function clientLabel(p) {
  if (p.client_name) return p.client_name;
  const a = account(p.account_id);
  return a && a.kind !== 'imagine' ? a.name : 'IMAGINE';
}

// ------------------------------------------------------------
// Projetos
// ------------------------------------------------------------
export function stagesOf(pid) {
  return store.where('stages', s => s.project_id === pid).sort((a, b) => a.n - b.n);
}

export function tasksOf(pid, stageKey = null) {
  return store.where('tasks', t => t.project_id === pid && (!stageKey || t.stage_key === stageKey))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));
}

export function progressOf(pid) {
  const stages = stagesOf(pid);
  const tasks = tasksOf(pid);
  const doneStages = stages.filter(s => s.status === 'concluida').length;
  const current = stages.find(s => s.status !== 'concluida') || null;
  const doneTasks = tasks.filter(t => t.done).length;
  return {
    stages, doneStages, totalStages: stages.length,
    current, currentDef: current ? stageDef(current.key, store.find('projects', pid)?.track) : null,
    doneTasks, totalTasks: tasks.length,
    pct: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : Math.round((doneStages / (stages.length || 9)) * 100),
  };
}

export async function createProject(v) {
  const p = await store.insert('projects', {
    account_id: v.account_id || imagineAccount()?.id || null, name: v.name, track: v.track || 'branding', status: 'ativo',
    client_name: v.client_name || '', kind: v.kind || 'cliente', brand: {},
    objective: v.objective || '', start_date: v.start_date || today(), due_date: v.due_date || null,
    value: v.value || 0, briefing: v.objective ? { objetivo: v.objective } : {}, briefing_done: false,
    cover_color: v.cover_color || null, cover_url: v.cover_url || null, created_by: me().id,
    alliances: v.alliances || [], reminders: v.reminders || [],
  });
  await store.insertMany('stages', STAGES.map((s, i) => ({
    project_id: p.id, key: s.key, n: s.n, status: i === 0 ? 'andamento' : 'pendente', done_at: null, done_by: null,
  })));
  const tasks = [];
  STAGES.forEach(s => stageTasksFor(s, p.track).forEach((title, j) =>
    tasks.push({ project_id: p.id, stage_key: s.key, title, sort: j, done: false, assignee_id: null, due_date: null })));
  await store.insertMany('tasks', tasks);
  const team = new Set([me().id, ...(v.members || [])]);
  await store.insertMany('project_members', [...team].map(uid => ({
    project_id: p.id, user_id: uid, role: uid === me().id ? 'lider' : 'design',
  })));
  if (v.split_revenue && v.value > 0) {
    const half = Math.round(v.value / 2);
    await store.insertMany('revenue', [
      { project_id: p.id, account_id: p.account_id, description: `${p.name} · entrada 50%`, amount: half, kind: 'projeto', status: 'previsto', due_date: p.start_date, owner_id: me().id },
      { project_id: p.id, account_id: p.account_id, description: `${p.name} · entrega 50%`, amount: v.value - half, kind: 'projeto', status: 'previsto', due_date: p.due_date || p.start_date, owner_id: me().id },
    ]);
  }
  toast('Projeto criado com as 9 etapas do processo IMAGINE');
  return p;
}

// ------------------------------------------------------------
// Plano e ritmo: cada etapa leva STAGE_DAYS dias a partir do início
// ------------------------------------------------------------
const dayMs = 864e5;
const asDate = d => new Date(String(d).slice(0, 10) + 'T12:00');
const short = iso => asDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

export function plannedEnd(p, n) {
  if (!p.start_date) return null;
  const d = asDate(p.start_date);
  d.setDate(d.getDate() + n * STAGE_DAYS);
  return d.toISOString().slice(0, 10);
}

// Compara a etapa atual com o plano: no ritmo, adiantado ou atrasado
export function paceOf(p) {
  const pr = progressOf(p.id);
  if (p.status === 'entregue' || !pr.current) return { kind: 'ok', text: 'Projeto entregue.' };
  if (!p.start_date) return { kind: 'muted', text: 'Defina a data de início para ver o ritmo.' };
  const today = asDate(new Date().toISOString());
  const end = plannedEnd(p, pr.current.n);
  const late = Math.round((today - asDate(end)) / dayMs);          // > 0: a etapa atual já devia ter fechado
  const ahead = Math.round((asDate(end) - today) / dayMs) - STAGE_DAYS; // > 0: começou a etapa antes do previsto
  const left = p.due_date ? Math.round((asDate(p.due_date) - today) / dayMs) : null;
  const stageTxt = `Etapa ${pr.current.n} prevista até ${short(end)}`;
  if (left !== null && left < 0) return { kind: 'bad', text: `A entrega passou há ${-left} dia${left === -1 ? '' : 's'}. ${stageTxt}.` };
  if (late > 0) return { kind: 'bad', text: `${late} dia${late > 1 ? 's' : ''} atrás do plano. ${stageTxt}.` };
  if (ahead > 0) return { kind: 'ok', text: `Adiantado ${ahead} dia${ahead > 1 ? 's' : ''}. ${stageTxt}.` };
  return { kind: 'ok', text: `No ritmo. ${stageTxt}.` };
}

// Projeto em produção = contrato assinado + briefing preenchido
export function contractSigned(p) {
  return store.where('tasks', t => t.project_id === p.id && t.done && /contrato assinado/i.test(t.title)).length > 0
    || store.where('files', f => f.project_id === p.id && f.kind === 'contrato').length > 0;
}
export function briefingReady(p) {
  if (p.briefing_done) return true;
  const b = p.briefing || {};
  return Object.keys(b).filter(k => /^q/.test(k) && String(b[k] || '').trim()).length >= 30;
}

export async function toggleTask(task) {
  const done = !task.done;
  const now = new Date().toISOString();
  const patch = { done, done_at: done ? now : null, done_by: done ? me().id : null };
  // Atividade só registra a conclusão (edições não entram por enquanto)
  if (done) patch.activity = [...(task.activity || []), { type: 'done', user_id: me().id, at: now }];
  await store.update('tasks', task.id, patch);
  if (done) {
    const xp = await award(me().id, 'task_done', task.title, task.id);
    toast(`Tarefa concluída: ${task.title}`, { kind: 'success', xp });
  } else {
    await revoke('task_done', task.id);
  }
  await syncStage(task.project_id, task.stage_key);
}

// Fecha ou reabre a etapa conforme as tarefas
async function syncStage(pid, key) {
  const stage = stagesOf(pid).find(s => s.key === key);
  if (!stage) return;
  const tasks = tasksOf(pid, key);
  const allDone = tasks.length > 0 && tasks.every(t => t.done);
  if (allDone && stage.status !== 'concluida') await completeStage(pid, key);
  if (!allDone && stage.status === 'concluida') {
    await store.update('stages', stage.id, { status: 'andamento', done_at: null, done_by: null });
    await revoke('stage_done', stage.id);
  }
}

export async function completeStage(pid, key) {
  const stages = stagesOf(pid);
  const stage = stages.find(s => s.key === key);
  const project = store.find('projects', pid);
  const def = stageDef(key, project.track);
  await store.update('stages', stage.id, { status: 'concluida', done_at: new Date().toISOString(), done_by: me().id });
  const xp = await award(me().id, 'stage_done', `${def.name} · ${project.name}`, stage.id);
  const next = stages.find(s => s.n > stage.n && s.status === 'pendente');
  if (next) await store.update('stages', next.id, { status: 'andamento' });

  if (stages.every(s => s.status === 'concluida')) {
    await store.update('projects', pid, { status: 'entregue', delivered_at: new Date().toISOString() });
    const xp2 = await award(me().id, 'project_delivered', project.name, pid);
    celebrate('Projeto entregue!', project.name, xp + xp2, 'Entrega final');
  } else {
    celebrate(`${def.n}. ${def.name}`, next ? `Próxima: ${stageDef(next.key, project.track).name}` : project.name, xp);
  }
}

export async function reopenStage(pid, key) {
  const stage = stagesOf(pid).find(s => s.key === key);
  await store.update('stages', stage.id, { status: 'andamento', done_at: null, done_by: null });
  await revoke('stage_done', stage.id);
  const p = store.find('projects', pid);
  if (p.status === 'entregue') { await store.update('projects', pid, { status: 'ativo', delivered_at: null }); await revoke('project_delivered', pid); }
}

export async function saveBriefing(p, briefing, markDone) {
  const wasDone = p.briefing_done;
  await store.update('projects', p.id, { briefing, briefing_done: !!markDone, objective: briefing.objetivo || p.objective });
  if (markDone && !wasDone) {
    const xp = await award(me().id, 'briefing_done', p.name, p.id);
    toast('Briefing completo. Direcionador pronto.', { kind: 'success', xp });
    const t = tasksOf(p.id, 'briefing').find(t => /briefing no hub/i.test(t.title) && !t.done);
    if (t) await toggleTask(t);
  } else toast('Briefing salvo');
}

export function myOpenTasks(userId = me()?.id) {
  const ids = new Set(visibleProjects().filter(p => p.status === 'ativo').map(p => p.id));
  return store.where('tasks', t => !t.done && ids.has(t.project_id) && t.assignee_id === userId)
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
}

// ------------------------------------------------------------
// Leads
// ------------------------------------------------------------

export async function moveLead(lead, stage) {
  if (lead.stage === stage) return;
  const from = LEAD_STAGES.findIndex(s => s.key === lead.stage);
  const to = LEAD_STAGES.findIndex(s => s.key === stage);
  const patch = { stage };
  if (stage === LEAD_WON) patch.won_at = new Date().toISOString();
  if (lead.stage === LEAD_WON && stage !== LEAD_WON) { patch.won_at = null; await revoke('lead_won', lead.id); }
  await store.update('leads', lead.id, patch);
  const owner = lead.owner_id || me().id;
  if (stage === LEAD_WON) {
    const xp = await award(owner, 'lead_won', `Venda: ${lead.company || lead.name}`, lead.id);
    celebrate('Venda fechada!', lead.company || lead.name, xp, 'Novo cliente');
    return 'won';
  }
  if (to > from && stage !== LEAD_LOST) {
    const xp = await award(owner, 'lead_advanced', `${lead.company || lead.name} → ${LEAD_STAGES[to].name}`, lead.id + ':' + stage);
    toast(`${lead.company || lead.name} avançou para ${LEAD_STAGES[to].name}`, { kind: 'success', xp });
  }
}

export async function leadToAccount(lead) {
  if (lead.account_id && account(lead.account_id)) return account(lead.account_id);
  const a = await store.insert('accounts', {
    kind: 'cliente', name: lead.company || lead.name, segment: lead.segment || '', contact_name: lead.name,
    contact_email: lead.email || '', contact_phone: lead.phone || '', instagram: lead.instagram || '', links: [],
    website: lead.website || '',
    notes: [lead.razao_social ? `Razão social: ${lead.razao_social}` : '', lead.cnpj ? `CNPJ: ${lead.cnpj}` : '', lead.linkedin ? `LinkedIn: ${lead.linkedin}` : '', lead.notes || ''].filter(Boolean).join('\n'),
    brand: { colors: [], fonts: [], tone: '', essence: '', dos: '', donts: '', logo_url: lead.logo_url || '', manual_url: '' },
  });
  await store.update('leads', lead.id, { account_id: a.id });
  // Cliente novo entra na carteira de pós-venda
  await store.insert('aftersales', {
    account_id: a.id, lead_id: lead.id, title: 'Projeto em implementação', stage: 'implementacao',
    value: 0, owner_id: lead.owner_id || me().id, last_contact: today(), next_action: '', next_date: null, notes: '',
  }).catch(err => console.warn('pós-venda:', err.message));
  return a;
}

// ------------------------------------------------------------
// Financeiro
// ------------------------------------------------------------
export async function receive(r) {
  await store.update('revenue', r.id, { status: 'recebido', paid_at: today() });
  const xp = await award(r.owner_id || me().id, 'revenue_received', r.description, r.id);
  toast(`Recebido: ${r.description}`, { kind: 'success', xp });
}

// ------------------------------------------------------------
// Metas — o realizado é calculado automaticamente
// ------------------------------------------------------------
export function metricActual(metric, month, userId = null) {
  const byUser = (row, field) => !userId || row[field] === userId;
  switch (metric) {
    case 'faturamento':
      return store.where('revenue', r => r.status === 'recebido' && inMonth(r.paid_at, month) && byUser(r, 'owner_id')).reduce((s, r) => s + Number(r.amount || 0), 0);
    case 'vendas':
      return store.where('leads', l => l.stage === LEAD_WON && inMonth(l.won_at, month) && byUser(l, 'owner_id')).reduce((s, l) => s + Number(l.value || 0), 0);
    case 'leads':
      return store.where('leads', l => inMonth(l.created_at, month) && byUser(l, 'owner_id')).length;
    case 'clientes':
      return store.where('accounts', a => a.kind === 'cliente' && inMonth(a.created_at, month)).length;
    case 'projetos':
      return store.where('projects', p => p.status === 'ativo').length;
    case 'entregas':
      return store.where('projects', p => p.status === 'entregue' && inMonth(p.delivered_at, month)).length;
    case 'etapas':
      return store.where('stages', s => s.status === 'concluida' && inMonth(s.done_at, month) && byUser(s, 'done_by')).length;
    case 'tarefas':
      return store.where('tasks', t => t.done && inMonth(t.done_at, month) && byUser(t, 'done_by')).length;
    case 'nps':
      return npsScore(store.where('nps', n => inMonth(n.created_at, month)));
    default: return 0;
  }
}

export function npsScore(rows) {
  if (!rows.length) return 0;
  const pro = rows.filter(r => r.score >= 9).length;
  const det = rows.filter(r => r.score <= 6).length;
  return Math.round(((pro - det) / rows.length) * 100);
}

export { XP };
