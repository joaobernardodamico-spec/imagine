// Dados iniciais do modo demo: só o que é real. Some assim que o Supabase for configurado.
import { STAGES, stageTasksFor, XP } from './config.js';

let n = 0;
const id = p => `${p}-${(++n).toString(36)}`;
const day = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString();
const month = (offset = 0) => {
  const d = new Date(); d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().slice(0, 7);
};
const emptyBrand = () => ({ colors: [], fonts: [], tone: '', essence: '', dos: '', donts: '', logo_url: '', manual_url: '' });

export function seed() {
  n = 0;
  const profiles = [
    { id: 'u-joao', name: 'João Bernardo', email: 'joao@imagineconcept.com.br', role: 'socio', title: 'CEO · Direção criativa', color: '#12328C', active: true, created_at: ts(-120) },
  ];

  const accounts = [
    { id: 'a-imagine', kind: 'imagine', name: 'IMAGINE Concept', segment: 'Estúdio de design e tecnologia', website: 'https://www.imagineconcept.com.br',
      brand: { ...emptyBrand(), colors: [{ name: 'Navy', hex: '#12328C' }, { name: 'Azul claro', hex: '#3B96EA' }, { name: 'Sky', hex: '#59C6FE' }, { name: 'Cream', hex: '#F0EEE9' }],
        fonts: [{ role: 'Títulos', name: 'Sora' }, { role: 'Texto', name: 'Helvetica Neue' }] } },
    { id: 'a-elem', kind: 'ecossistema', name: 'Elementarios', segment: 'Card game', brand: emptyBrand() },
    { id: 'a-traj', kind: 'ecossistema', name: 'Trajetória', segment: 'SaaS · orientação vocacional', website: 'https://www.suatrajetoria.com.br', brand: emptyBrand() },
    { id: 'a-tekno', kind: 'ecossistema', name: 'Tekno Sapiens', segment: 'Marca de roupas', brand: emptyBrand() },
    { id: 'a-outdoor', kind: 'cliente', name: 'Outdoor Mídia', segment: 'Mídia exterior', brand: emptyBrand() },
  ].map(a => ({ links: [], notes: '', contact_name: '', contact_email: '', contact_phone: '', instagram: '', created_at: ts(-60), ...a }));

  // Outdoor Mídia: tudo feito menos as missões finais de entrega
  const pid = 'p-outdoor';
  const projects = [{
    id: pid, account_id: 'a-outdoor', name: 'Site Outdoor Mídia', track: 'web', status: 'ativo',
    objective: '', start_date: day(-80), due_date: null, value: 10000, briefing: {}, briefing_done: false,
    cover_color: '#3B96EA', created_by: 'u-joao', created_at: ts(-80),
  }];
  const stages = [];
  const tasks = [];
  const OPEN = ['PDF de apresentação do site', 'PDF de apresentação comercial', 'Passar o financeiro do Firebase para eles'];
  STAGES.forEach(s => {
    const last = s.key === 'entrega';
    stages.push({ id: id('s'), project_id: pid, key: s.key, n: s.n, status: last ? 'andamento' : 'concluida',
      done_at: last ? null : ts(-70 + s.n * 7), done_by: last ? null : 'u-joao', created_at: ts(-80) });
    const titles = last ? OPEN : stageTasksFor(s, 'web');
    titles.forEach((title, j) => tasks.push({
      id: id('t'), project_id: pid, stage_key: s.key, title, sort: j,
      done: !last, done_at: last ? null : ts(-70 + s.n * 7), done_by: last ? null : 'u-joao',
      assignee_id: 'u-joao', due_date: null, description: '', links: [], checklist: [], activity: [], created_at: ts(-80),
    }));
  });
  const project_members = [{ id: id('m'), project_id: pid, user_id: 'u-joao', role: 'lider', created_at: ts(-80) }];

  const revenue = [
    { id: id('r'), project_id: pid, account_id: 'a-outdoor', description: 'Site Outdoor Mídia', amount: 10000, kind: 'projeto',
      status: 'recebido', due_date: day(0), paid_at: day(0), owner_id: 'u-joao', created_at: ts(0) },
  ];

  const m = month(0);
  const goals = [
    { metric: 'faturamento', target: 10000 },
    { metric: 'projetos', target: 2 },
    { metric: 'entregas', target: 2 },
    { metric: 'leads', target: 10 },
    { metric: 'clientes', target: 2 },
  ].map(g => ({ id: id('g'), period: m, user_id: null, created_at: ts(0), ...g }));

  const xp_events = [];
  tasks.filter(t => t.done).forEach(t => xp_events.push({ id: id('x'), user_id: 'u-joao', amount: XP.task_done, kind: 'task_done', label: t.title, ref_id: t.id, created_at: t.done_at }));
  stages.filter(s => s.status === 'concluida').forEach(s => xp_events.push({ id: id('x'), user_id: 'u-joao', amount: XP.stage_done, kind: 'stage_done', label: 'Etapa concluída · Site Outdoor Mídia', ref_id: s.id, created_at: s.done_at }));
  xp_events.push({ id: id('x'), user_id: 'u-joao', amount: XP.revenue_received, kind: 'revenue_received', label: 'Site Outdoor Mídia', ref_id: revenue[0].id, created_at: ts(0) });

  return {
    profiles, accounts, projects, project_members, stages, tasks,
    notes: [], files: [], leads: [], revenue, goals, events: [], xp_events, nps: [],
  };
}
