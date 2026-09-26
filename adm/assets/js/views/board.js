// Painel — carga de trabalho do time e onde cada projeto está (inspirado no "Box" do ClickUp).
import { store } from '../store.js';
import { STAGES } from '../config.js';
import { visibleProjects, progressOf } from '../ops.js';
import { esc, icon, avatar, relDays, num, empty } from '../util.js';
import { pageHead, statTile } from './components.js';
import { openTask } from './task.js';

const open = new Set(); // grupos expandidos: `${userId}:${grupo}`

export default {
  title: () => 'Painel',

  render() {
    const projects = visibleProjects().filter(p => p.status === 'ativo');
    const pids = new Set(projects.map(p => p.id));
    const tasks = store.where('tasks', t => pids.has(t.project_id));
    const todayS = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const openT = tasks.filter(t => !t.done);
    const late = openT.filter(t => t.due_date && t.due_date < todayS);
    const doneWeek = tasks.filter(t => t.done && t.done_at && t.done_at >= weekAgo);

    const people = store.all('profiles').filter(u => u.active !== false)
      .map(u => ({ u, mine: tasks.filter(t => t.assignee_id === u.id) }))
      .filter(x => x.mine.length)
      .sort((a, b) => b.mine.filter(t => !t.done).length - a.mine.filter(t => !t.done).length);
    const loose = openT.filter(t => !t.assignee_id);

    return `<div class="page">
      ${pageHead('Painel', 'Quem está com o quê e onde cada projeto está. Só projetos em andamento.')}

      <div class="stats">
        ${statTile('Projetos ativos', num(projects.length))}
        ${statTile('Tarefas abertas', num(openT.length), loose.length ? `${loose.length} sem responsável` : '')}
        ${statTile('Feitas em 7 dias', num(doneWeek.length))}
        ${statTile('Atrasadas', num(late.length), late.length ? 'Priorize estas' : 'Nada atrasado')}
      </div>

      <div class="box-grid">
        <section class="card box-workload">
          <div class="card-head"><h2>Carga de trabalho</h2><span class="muted">abertas / total</span></div>
          ${people.length ? workload(people) : empty('Ninguém com tarefas', 'Atribua tarefas nas etapas dos projetos.')}
        </section>

        <section class="card box-stages">
          <div class="card-head"><h2>Projetos por etapa</h2><a href="#/projetos" class="link">Projetos ${icon('arrow', 14)}</a></div>
          ${projects.length ? stageBars(projects) : empty('Nenhum projeto ativo')}
        </section>

        ${people.map(x => personCard(x.u, x.mine, todayS)).join('')}
        ${loose.length ? personCard(null, loose, todayS) : ''}
      </div>
    </div>`;
  },

  actions: {
    toggleGroup(el) { const k = el.dataset.key; open.has(k) ? open.delete(k) : open.add(k); store.emit({}); },
    openTask(el) { openTask(el.dataset.id); },
  },
};

function workload(people) {
  const max = Math.max(...people.map(x => x.mine.length), 1);
  return `<div class="wl">${people.map(({ u, mine }) => {
    const o = mine.filter(t => !t.done).length;
    return `<div class="wl-col" title="${esc(u.name)}: ${o} abertas de ${mine.length}">
      <div class="wl-track" style="height:${Math.round(mine.length / max * 100)}%"><span style="height:${mine.length ? Math.round(o / mine.length * 100) : 0}%"></span></div>
      <small>${o}</small>
      ${avatar(u, 30)}
    </div>`;
  }).join('')}</div>`;
}

function stageBars(projects) {
  const cur = projects.map(p => progressOf(p.id).currentDef?.key || 'entregue');
  const max = Math.max(...STAGES.map(s => cur.filter(k => k === s.key).length), 1);
  return `<ul class="sbars">${STAGES.map(s => {
    const n = cur.filter(k => k === s.key).length;
    return `<li class="${n ? '' : 'zero'}"><span class="sbars-n">${s.n}</span><span class="sbars-name">${esc(s.name)}</span>
      <span class="sbars-track"><span style="width:${n / max * 100}%"></span></span><strong>${n}</strong></li>`;
  }).join('')}</ul>`;
}

function personCard(u, mine, todayS) {
  const id = u?.id || 'none';
  const done = mine.filter(t => t.done);
  const openT = mine.filter(t => !t.done);
  const pctDone = mine.length ? Math.round(done.length / mine.length * 100) : 0;
  const inWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const groups = [
    ['late', 'Atrasadas', openT.filter(t => t.due_date && t.due_date < todayS)],
    ['week', 'Próximos 7 dias', openT.filter(t => t.due_date && t.due_date >= todayS && t.due_date <= inWeek)],
    ['later', 'Depois / sem prazo', openT.filter(t => !t.due_date || t.due_date > inWeek)],
  ];
  // Barra por projeto, na cor de cada projeto
  const byProj = {};
  openT.forEach(t => { byProj[t.project_id] = (byProj[t.project_id] || 0) + 1; });

  return `<section class="card pbox">
    <header class="pbox-head">
      ${u ? avatar(u, 40) : `<span class="avatar pbox-none" style="--s:40px">?</span>`}
      <div><strong>${esc(u?.name || 'Sem responsável')}</strong><small class="muted">${esc(u?.title || 'Tarefas abertas sem dono')}</small></div>
    </header>
    <div class="pbox-nums">
      <div><strong>${openT.length}</strong><small>Abertas</small></div>
      <div><strong>${done.length}</strong><small>Feitas</small></div>
      ${u ? `<div class="donut" style="--p:${pctDone}"><span>${pctDone}%</span></div>` : ''}
    </div>
    <div class="pbox-bar">${Object.entries(byProj).map(([pid, n]) => {
      const p = store.find('projects', pid);
      return `<span style="flex:${n};background:${esc(p?.cover_color || 'var(--navy)')}" title="${esc(p?.name || '')}: ${n}"></span>`;
    }).join('') || '<span class="empty-bar"></span>'}</div>
    ${groups.map(([k, label, list]) => {
      const key = `${id}:${k}`;
      const isOpen = open.has(key) && list.length;
      return `<div class="pbox-group g-${k} ${list.length ? '' : 'zero'}">
        <button class="pbox-gh" data-act="toggleGroup" data-key="${esc(key)}" ${list.length ? '' : 'disabled'} aria-expanded="${!!isOpen}">
          <span class="chev ${isOpen ? 'open' : ''}">›</span> ${label} <span class="muted">(${list.length})</span>
        </button>
        ${isOpen ? `<ul>${list.map(t => {
          const p = store.find('projects', t.project_id);
          return `<li><button class="pbox-task" data-act="openTask" data-id="${esc(t.id)}"><span>${esc(t.title)}</span><small>${esc(p?.name || '')}${t.due_date ? ` · ${relDays(t.due_date)}` : ''}</small></button></li>`;
        }).join('')}</ul>` : ''}
      </div>`;
    }).join('')}
  </section>`;
}
