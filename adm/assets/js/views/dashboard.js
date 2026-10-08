// "Hoje" — o que importa agora para quem está logado.
import { store } from '../store.js';
import { GOAL_METRICS, STAGES, XP, CARE_COLD_DAYS, stageDef } from '../config.js';
import { me, can, visibleProjects, myOpenTasks, toggleTask, metricActual, account, progressOf, clientLabel, tasksOf, contractSigned, briefingReady, receive, isMember, role } from '../ops.js';
import { xpOf, levelOf, statsOf, badgesOf } from '../game.js';
import { esc, icon, money, num, date, relDays, time, thisMonth, progressBar, pct, empty, today } from '../util.js';
import { projectCard, feedItem } from './components.js';
import { openTask } from './task.js';

export default {
  title: () => 'Hoje',

  render() {
    const u = me();
    const xp = xpOf(u.id);
    const lv = levelOf(xp);
    const st = statsOf(u.id);
    const badges = badgesOf(u.id);
    const monthXp = xpOf(u.id, { month: thisMonth() });
    const ops = operation();
    const tasks = ops.missions;
    const projects = visibleProjects().filter(p => p.status === 'ativo');
    const feed = store.all('xp_events').filter(x => x.kind !== 'lead_created')
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10);
    const events = store.where('events', e => e.start.slice(0, 10) >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return `<div class="page">
      <header class="hero-dash">
        <div>
          <div class="kicker">${esc(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
          <h1>${hello}, ${esc(u.name.split(' ')[0])}.</h1>
          <p class="page-sub">${tasks.length ? `Você tem <strong>${tasks.length}</strong> missõe${tasks.length > 1 ? 's' : ''} na operação. Cada uma vale XP.` : 'Operação em dia. Escolha uma etapa e puxe algo.'}</p>
        </div>
        <div class="level-card">
          <div class="level-ring" style="--p:${Math.round(lv.progress * 100)}">
            <span>${lv.n}</span>
          </div>
          <div class="level-info">
            <div class="level-name">${esc(lv.name)}</div>
            <div class="muted">${num(xp)} XP${lv.next ? ` · ${num(lv.ceil - xp)} para ${esc(lv.next)}` : ''}</div>
            <div class="level-chips">
              <span class="chip">${icon('bolt', 14)} ${num(monthXp)} XP no mês</span>
              <span class="chip">${icon('star', 14)} ${st.streak}d seguidos</span>
              <span class="chip">${icon('trophy', 14)} ${badges.filter(b => b.earned).length}/${badges.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div class="grid-dash">
        ${opsCard(ops)}

        <section class="card">
          <div class="card-head"><h2>Mural de vitórias</h2></div>
          ${feed.length ? `<ul class="feed">${feed.map(feedItem).join('')}</ul>` : empty('Ainda sem vitórias', 'Conclua a primeira tarefa.')}
        </section>

        ${can('metas') ? goalsCard() : ''}

        <section class="card">
          <div class="card-head"><h2>Próximos compromissos</h2><a href="#/agenda" class="link">Agenda ${icon('arrow', 14)}</a></div>
          ${events.length ? `<ul class="agenda-mini">${events.map(e => `
            <li><div class="am-date"><strong>${date(e.start, { day: '2-digit' })}</strong><span>${date(e.start, { month: 'short' })}</span></div>
            <div><div>${esc(e.title)}</div><small class="muted">${time(e.start)} · ${relDays(e.start)}</small></div></li>`).join('')}</ul>`
            : empty('Agenda livre')}
        </section>

        ${can('leads') ? leadsCard() : ''}

        <section class="card span-3">
          <div class="card-head"><h2>Projetos em andamento</h2><span class="muted">${projects.length} ativos</span></div>
          ${projects.length ? `<div class="stage-board">${stageBoard(projects)}</div>` : empty('Nenhum projeto ativo')}
        </section>

        <section class="span-3">
          <div class="pgrid">${projects.slice(0, 6).map(projectCard).join('')}</div>
        </section>
      </div>
    </div>`;
  },

  actions: {
    toggleTask(el) { const t = store.find('tasks', el.dataset.id); if (t) toggleTask(t); },
    receive(el) { const r = store.find('revenue', el.dataset.id); if (r) receive(r); },
    opsArea(el) { opsState.area = opsState.area === el.dataset.area ? 'todas' : el.dataset.area; store.emit({}); },
    openTask(el) { openTask(el.dataset.id); },
  },
};

// ------------------------------------------------------------
// Minha operação: missões do dia por área, com o ícone de cada módulo e o XP em jogo
// Projetos só entram em produção com contrato assinado + briefing preenchido.
// ------------------------------------------------------------
const opsState = { area: 'todas' };
const AREAS = [
  { key: 'projetos', label: 'Projetos', icon: 'folder', mod: 'projetos' },
  { key: 'leads', label: 'Leads', icon: 'funnel', mod: 'leads' },
  { key: 'posvenda', label: 'Pós-venda', icon: 'heart', mod: 'posvenda' },
  { key: 'financeiro', label: 'Financeiro', icon: 'wallet', mod: 'financeiro' },
];
const DONE_KINDS = { projetos: ['task_done', 'stage_done', 'briefing_done', 'project_delivered'], leads: ['lead_advanced', 'lead_won', 'lead_created'], financeiro: ['revenue_received'] };

function operation() {
  const u = me();
  const t0 = today();
  const soon = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const mine = p => role() === 'socio' || isMember(p.id);
  const projects = visibleProjects().filter(p => p.status === 'ativo' && mine(p));

  const blocks = projects.map(p => {
    const pr = progressOf(p.id);
    const signed = contractSigned(p), brief = briefingReady(p);
    const missions = [];
    if (!signed) {
      const t = tasksOf(p.id).find(x => /contrato assinado/i.test(x.title) && !x.done);
      missions.push(t ? { kind: 'task', task: t, title: 'Registrar contrato assinado', xp: XP.task_done }
        : { kind: 'link', href: `#/projetos/${p.id}/visao`, title: 'Registrar contrato assinado', xp: XP.task_done });
    }
    if (!brief) missions.push({ kind: 'link', href: `#/projetos/${p.id}/briefing`, title: 'Completar o briefing', xp: XP.briefing_done });
    if (signed && brief && pr.current) {
      tasksOf(p.id, pr.current.key).filter(t => !t.done && (!t.assignee_id || t.assignee_id === u.id)).slice(0, 4)
        .forEach(t => missions.push({ kind: 'task', task: t, title: t.title, xp: XP.task_done }));
    }
    // Tarefas com a minha cara e prazo próximo, de qualquer etapa
    tasksOf(p.id).filter(t => !t.done && t.assignee_id === u.id && t.due_date && t.due_date <= soon(7) && !missions.some(m => m.task?.id === t.id))
      .forEach(t => missions.push({ kind: 'task', task: t, title: t.title, xp: XP.task_done }));
    const def = pr.current ? stageDef(pr.current.key, p.track) : null;
    return { p, signed, brief, def, missions };
  });

  const leads = can('leads') ? store.where('leads', l => !['venda', 'perdido'].includes(l.stage) && l.next_date && l.next_date <= soon(3))
    .sort((a, b) => a.next_date.localeCompare(b.next_date)).slice(0, 6) : [];
  const care = can('posvenda') ? store.where('aftersales', r => {
    const cold = !r.last_contact || (Date.now() - new Date(r.last_contact + 'T12:00')) / 864e5 > CARE_COLD_DAYS;
    return cold || (r.next_date && r.next_date <= soon(3));
  }).slice(0, 6) : [];
  const bills = can('financeiro') ? store.where('revenue', r => r.status !== 'recebido' && r.due_date && r.due_date <= soon(7))
    .sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 6) : [];

  const doneToday = area => store.where('xp_events', x => x.user_id === u.id && String(x.created_at).slice(0, 10) === t0 && (DONE_KINDS[area] || []).includes(x.kind));
  const counts = {
    projetos: blocks.reduce((s, b) => s + b.missions.length, 0), leads: leads.length, posvenda: care.length, financeiro: bills.length,
  };
  const missions = blocks.flatMap(b => b.missions);
  const xpOpen = missions.reduce((s, m) => s + (m.xp || 0), 0) + leads.length * XP.lead_advanced + bills.length * XP.revenue_received;
  const doneN = AREAS.reduce((s, a) => s + doneToday(a.key).length, 0);
  const xpToday = AREAS.reduce((s, a) => s + doneToday(a.key).reduce((x, ev) => x + (ev.amount || 0), 0), 0);
  return { blocks, leads, care, bills, counts, missions: [...missions, ...leads, ...care, ...bills], xpOpen, doneN, xpToday, doneToday };
}

function opsCard(o) {
  const total = Object.values(o.counts).reduce((a, b) => a + b, 0);
  const areas = AREAS.filter(a => can(a.mod));
  const show = k => opsState.area === 'todas' || opsState.area === k;
  const xp = n => `<span class="xp-chip">+${n}</span>`;
  const mission = m => m.kind === 'task'
    ? `<li class="mission"><button class="checkbox" data-act="toggleTask" data-id="${esc(m.task.id)}" aria-label="Concluir">${icon('check', 13)}</button>
        <button class="mission-title" data-act="openTask" data-id="${esc(m.task.id)}">${esc(m.title)}</button>
        ${m.task.due_date ? `<span class="due ${m.task.due_date < today() ? 'late' : ''}">${relDays(m.task.due_date)}</span>` : ''}${xp(m.xp)}</li>`
    : `<li class="mission"><span class="mission-dot">${icon('arrow', 13)}</span><a class="mission-title" href="${m.href}">${esc(m.title)}</a>${xp(m.xp)}</li>`;
  const head = a => {
    const d = o.doneToday(a.key).length, n = o.counts[a.key];
    return `<header class="area-head"><span class="area-ic">${icon(a.icon, 17)}</span><strong>${a.label}</strong>
      <span class="muted">${n} aberta${n === 1 ? '' : 's'}${d ? ` · ${d} feita${d > 1 ? 's' : ''} hoje` : ''}</span>
      <a class="link" href="#/${a.key}">${icon('arrow', 14)}</a></header>`;
  };
  const projBlock = b => `<div class="opj">
    <div class="opj-head">
      <a href="#/projetos/${esc(b.p.id)}"><strong>${esc(b.p.name)}</strong><small>${esc(clientLabel(b.p))}${b.def ? ` · ${b.def.n}. ${esc(b.def.name)}` : ''}</small></a>
      <span class="opj-flag ${b.signed ? 'ok' : ''}">${icon(b.signed ? 'check' : 'file', 12)} Contrato</span>
      <span class="opj-flag ${b.brief ? 'ok' : ''}">${icon(b.brief ? 'check' : 'brief', 12)} Briefing</span>
    </div>
    ${b.missions.length ? `<ul class="missions">${b.missions.map(mission).join('')}</ul>` : `<p class="opj-clear">${icon('check', 13)} Sem pendências suas aqui.</p>`}
  </div>`;

  const sections = {
    projetos: o.blocks.length ? o.blocks.map(projBlock).join('') : '<p class="muted">Nenhum projeto ativo seu.</p>',
    leads: o.leads.length ? `<ul class="missions">${o.leads.map(l => `<li class="mission"><span class="mission-dot ${l.next_date < today() ? 'late' : ''}">${icon('calendar', 13)}</span>
      <a class="mission-title" href="#/leads/${esc(l.id)}">${esc(l.next_action || 'Follow-up')} · <span class="muted">${esc(l.company || l.name)}</span></a>
      <span class="due ${l.next_date < today() ? 'late' : ''}">${relDays(l.next_date)}</span>${xp(XP.lead_advanced)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum follow-up para os próximos dias.</p>',
    posvenda: o.care.length ? `<ul class="missions">${o.care.map(r => `<li class="mission"><span class="mission-dot">${icon('heart', 13)}</span>
      <a class="mission-title" href="#/posvenda">${esc(r.next_action || 'Retomar contato')} · <span class="muted">${esc(account(r.account_id)?.name || r.title || '')}</span></a>
      <span class="due">${r.last_contact ? `último ${relDays(r.last_contact)}` : 'sem contato'}</span></li>`).join('')}</ul>` : '<p class="muted">Carteira em dia.</p>',
    financeiro: o.bills.length ? `<ul class="missions">${o.bills.map(r => `<li class="mission"><span class="mission-dot ${r.due_date < today() ? 'late' : ''}">${icon('wallet', 13)}</span>
      <span class="mission-title">${esc(r.description)} · <strong>${money(r.amount)}</strong></span>
      <span class="due ${r.due_date < today() ? 'late' : ''}">${relDays(r.due_date)}</span>
      <button class="btn btn-ghost btn-sm" data-act="receive" data-id="${esc(r.id)}">Recebido</button>${xp(XP.revenue_received)}</li>`).join('')}</ul>` : '<p class="muted">Nada a cobrar nos próximos 7 dias.</p>',
  };

  const pctDone = o.doneN + total ? Math.round((o.doneN / (o.doneN + total)) * 100) : 100;
  return `<section class="card span-2 ops">
    <div class="ops-top">
      <div><h2>Minha operação</h2><p class="muted">${total} missõe${total === 1 ? '' : 's'} abertas · até <strong>+${o.xpOpen} XP</strong> em jogo${o.xpToday ? ` · <span class="ok">+${o.xpToday} XP hoje</span>` : ''}</p></div>
      <div class="ops-meter" title="Missões de hoje"><span>${o.doneN}/${o.doneN + total}</span>${progressBar(pctDone, 100)}</div>
    </div>
    <div class="ops-areas">${areas.map(a => `<button class="ops-area ${opsState.area === a.key ? 'on' : ''}" data-act="opsArea" data-area="${a.key}">
      ${icon(a.icon, 16)}<span>${a.label}</span><b>${o.counts[a.key]}</b></button>`).join('')}</div>
    ${areas.filter(a => show(a.key)).map(a => `<div class="area">${head(a)}${sections[a.key]}</div>`).join('')}
  </section>`;
}

function taskRow(t) {
  const p = store.find('projects', t.project_id);
  const def = STAGES.find(s => s.key === t.stage_key);
  const late = t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
  return `<li class="task ${t.done ? 'done' : ''}">
    <button class="checkbox" data-act="toggleTask" data-id="${esc(t.id)}" aria-label="Concluir">${icon('check', 14)}</button>
    <div class="task-body">
      <button class="task-title task-open" data-act="openTask" data-id="${esc(t.id)}">${esc(t.title)}${(t.checklist || []).length ? ` <small class="muted">${t.checklist.filter(i => i.done).length}/${t.checklist.length}</small>` : ""}</button>
      <a class="task-meta" href="#/projetos/${esc(p.id)}/visao/${esc(t.stage_key)}">${esc(p.name)} · ${def?.n}. ${esc(def?.name)}</a>
    </div>
    ${t.due_date ? `<span class="due ${late ? 'late' : ''}">${relDays(t.due_date)}</span>` : ''}
  </li>`;
}

function goalsCard() {
  const m = thisMonth();
  const goals = store.where('goals', g => g.period === m && !g.user_id).slice(0, 5);
  return `<section class="card">
    <div class="card-head"><h2>Metas do mês</h2><a href="#/metas" class="link">Todas ${icon('arrow', 14)}</a></div>
    ${goals.length ? `<ul class="goal-mini">${goals.map(g => {
      const meta = GOAL_METRICS[g.metric];
      const act = metricActual(g.metric, m);
      const fmt = meta?.money ? money : num;
      const p = pct(act, g.target);
      return `<li class="${p >= 100 ? 'hit' : ''}"><div class="row between"><span>${esc(meta?.label || g.metric)}</span><strong>${fmt(act)} <small class="muted">/ ${fmt(g.target)}</small></strong></div>${progressBar(act, g.target)}</li>`;
    }).join('')}</ul>` : empty('Sem metas definidas', '', '<a class="btn btn-ghost" href="#/metas">Definir metas</a>')}
  </section>`;
}

function leadsCard() {
  const leads = store.where('leads', l => !['venda', 'perdido'].includes(l.stage) && l.next_date)
    .sort((a, b) => a.next_date.localeCompare(b.next_date)).slice(0, 5);
  return `<section class="card">
    <div class="card-head"><h2>Próximos passos comerciais</h2><a href="#/leads" class="link">Leads ${icon('arrow', 14)}</a></div>
    ${leads.length ? `<ul class="agenda-mini">${leads.map(l => `
      <li><div class="am-date"><strong>${date(l.next_date, { day: '2-digit' })}</strong><span>${date(l.next_date, { month: 'short' })}</span></div>
      <div><div>${esc(l.company || l.name)} <span class="muted">· ${money(l.value)}</span></div><small class="muted">${esc(l.next_action || '')}</small></div></li>`).join('')}</ul>`
      : empty('Sem follow-ups agendados')}
  </section>`;
}

// Quadro de "onde cada projeto está" no processo de 9 etapas
function stageBoard(projects) {
  return `<table class="sb-table">
    <thead><tr><th>Projeto</th>${STAGES.map(s => `<th title="${esc(s.name)}"><span>${s.n}</span><em>${esc(s.name)}</em></th>`).join('')}</tr></thead>
    <tbody>${projects.map(p => {
      const pr = progressOf(p.id);
      return `<tr><td><a href="#/projetos/${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(clientLabel(p))}</small></a></td>
        ${STAGES.map(s => {
          const st = pr.stages.find(x => x.key === s.key)?.status || 'pendente';
          return `<td class="sb-cell sb-${st}" title="${esc(stageDef(s.key, p.track).name)}"><span></span></td>`;
        }).join('')}</tr>`;
    }).join('')}</tbody>
  </table>`;
}

