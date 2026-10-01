// "Hoje" — o que importa agora para quem está logado.
import { store } from '../store.js';
import { GOAL_METRICS, STAGES } from '../config.js';
import { me, can, visibleProjects, myOpenTasks, toggleTask, metricActual, account, progressOf, clientLabel } from '../ops.js';
import { xpOf, levelOf, statsOf, badgesOf } from '../game.js';
import { esc, icon, money, num, date, relDays, time, thisMonth, progressBar, pct, empty } from '../util.js';
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
    const tasks = myOpenTasks().slice(0, 8);
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
          <p class="page-sub">${tasks.length ? `Você tem <strong>${tasks.length}</strong> tarefa${tasks.length > 1 ? 's' : ''} aberta${tasks.length > 1 ? 's' : ''}. Cada uma conta.` : 'Nenhuma tarefa atribuída a você. Escolha uma etapa e puxe algo.'}</p>
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
        <section class="card span-2">
          <div class="card-head"><h2>Minhas tarefas</h2><a href="#/projetos" class="link">Ver projetos ${icon('arrow', 14)}</a></div>
          ${tasks.length ? `<ul class="task-list">${tasks.map(taskRow).join('')}</ul>` : empty('Tudo limpo', 'Nada atribuído a você agora.')}
        </section>

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
    openTask(el) { openTask(el.dataset.id); },
  },
};

function taskRow(t) {
  const p = store.find('projects', t.project_id);
  const def = STAGES.find(s => s.key === t.stage_key);
  const late = t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
  return `<li class="task ${t.done ? 'done' : ''}">
    <button class="checkbox" data-act="toggleTask" data-id="${esc(t.id)}" aria-label="Concluir">${icon('check', 14)}</button>
    <div class="task-body">
      <button class="task-title task-open" data-act="openTask" data-id="${esc(t.id)}">${esc(t.title)}${(t.checklist || []).length ? ` <small class="muted">${t.checklist.filter(i => i.done).length}/${t.checklist.length}</small>` : ""}</button>
      <a class="task-meta" href="#/projetos/${esc(p.id)}/etapas">${esc(p.name)} · ${def?.n}. ${esc(def?.name)}</a>
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
          return `<td class="sb-cell sb-${st}"><span></span></td>`;
        }).join('')}</tr>`;
    }).join('')}</tbody>
  </table>`;
}

