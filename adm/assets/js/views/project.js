// Página do projeto: barra de navegação no topo, capa, jornada das 9 etapas e as abas
// (visão geral com as etapas, briefing, moodboard, marca, notas, equipe, financeiro).
import { store, uid } from '../store.js';
import { STAGES, TRACKS, TRACK_ICONS, PROJECT_STATUS, PROJECT_ROLES, SERVICES, JOURNEYS, stagesFor } from '../config.js';
import {
  me, role, profile, progressOf, stagesOf, tasksOf, toggleTask, completeStage, reopenStage,
  canEditProject, seesMoney, isSocio, receive, projectKind, clientLabel, account, plannedEnd, paceOf, syncProjectRevenue,
} from '../ops.js';
import { award } from '../game.js';
import { esc, icon, avatar, modal, money, date, relDays, progressBar, empty, ago, toast, safeUrl } from '../util.js';
import { tabs } from './components.js';
import { openTask } from './task.js';
import { filesPanel, fileActions } from './files.js';
import { moodPanel, moodActions, wireMood, moodItems, journalSummary } from './moodboard.js';
import { briefingPanel, briefingActions, briefingFilled } from './briefing.js';
import { brandbookPanel, brandbookActions, wireBrandbook, brandProgress } from './brandbook.js';
import { KIND_CHIPS, trackChips, resolveClient, wireProjectForm } from './projects.js';

export default {
  title: ({ id }) => store.find('projects', id)?.name || 'Projeto',

  render({ id, tab, sub }) {
    const p = store.find('projects', id);
    if (!p) return `<div class="page">${empty('Projeto não encontrado', '', '<a class="btn btn-primary" href="#/projetos">Voltar</a>')}</div>`;
    if (tab === 'rascunho') tab = 'moodboard';
    if (tab === 'arquivos') { tab = 'visao'; sub = null; }   // arquivos agora é um card fixo na visão geral
    if (tab === 'etapas') tab = 'visao';                      // etapas e visão geral são a mesma página
    const pr = progressOf(p.id);
    const edit = canEditProject(p);
    const nNotes = store.where('notes', n => n.project_id === p.id).length;
    const bf = briefingFilled(p);

    const TABS = [
      ['visao', 'Visão geral', null, 'home'], ['briefing', 'Briefing', `${bf.done}/${bf.total}`, 'brief'], ['moodboard', 'Moodboard', moodItems(p.id).length || null, 'image'],
      ['marca', 'Marca', `${brandProgress(p).pct}%`, 'brand'], ['notas', 'Notas', nNotes || null, 'note'], ['equipe', 'Equipe', null, 'users'],
      ...(seesMoney() ? [['financeiro', 'Financeiro', null, 'wallet']] : []),
    ];
    const selKey = tab === 'visao' ? (STAGES.some(s => s.key === sub) ? sub : pr.current?.key || 'entrega') : null;

    return `<div class="page page-project">
      <div class="ptop">
        <nav class="crumbs" aria-label="Caminho">
          <a href="#/projetos">${icon('folder', 16)} Projetos</a>${icon('chevR', 14)}<strong>${esc(p.name)}</strong>
        </nav>
        ${tabs(TABS, tab, `projetos/${p.id}`)}
      </div>
      ${tab === 'marca' && sub === 'manual' ? '' : header(p, pr, edit)}
      ${tab === 'visao' ? journey(p, pr, selKey) : ''}
      <div class="tab-panel">${panel(tab, sub, p, edit, selKey)}</div>
    </div>`;
  },

  after(root, { id, tab, sub }) {
    const p = store.find('projects', id);
    if (!p) return;
    if ((tab === 'moodboard' || tab === 'rascunho') && canEditProject(p)) wireMood(root, id);
    if (tab === 'marca') wireBrandbook(root, p, sub);
  },

  actions: {
    ...fileActions,
    ...moodActions,
    ...briefingActions,
    ...brandbookActions,

    // Lembretes: checklist rápido que não pode ser esquecido
    async addReminder(form, e, { id }) {
      const text = form.text.value.trim();
      if (!text) return;
      const p = store.find('projects', id);
      await store.update('projects', id, { reminders: [...(p.reminders || []), { id: uid(), text, done: false, by: me().id, at: new Date().toISOString() }] });
      setTimeout(() => document.querySelector('.rem-add input')?.focus(), 30);
    },
    async toggleReminder(el, e, { id }) {
      const p = store.find('projects', id);
      await store.update('projects', id, { reminders: (p.reminders || []).map(r => r.id === el.dataset.id ? { ...r, done: !r.done, done_by: r.done ? null : me().id } : r) });
    },
    async delReminder(el, e, { id }) {
      const p = store.find('projects', id);
      await store.update('projects', id, { reminders: (p.reminders || []).filter(r => r.id !== el.dataset.id) });
    },
    toggleDoneReminders() { showDoneRem = !showDoneRem; store.emit({}); },
    focusReminder() { document.querySelector('.rem-add input')?.focus(); },

    // Alianças acionadas no projeto
    async addAlliance(el, e, { id }) {
      if (!el.value) return;
      const p = store.find('projects', id);
      await store.update('projects', id, { alliances: [...new Set([...(p.alliances || []), el.value])] });
    },
    async removeAlliance(el, e, { id }) {
      const p = store.find('projects', id);
      await store.update('projects', id, { alliances: (p.alliances || []).filter(x => x !== el.dataset.id) });
    },

    toggleTask(el) { const t = store.find('tasks', el.dataset.id); if (t) toggleTask(t); },
    openTask(el) { openTask(el.dataset.id); },
    goStage(el, e, { id }) { history.replaceState(null, '', `#/projetos/${id}/visao/${el.dataset.key}`); window.dispatchEvent(new HashChangeEvent('hashchange')); },
    completeStage(el, e, { id }) { completeStage(id, el.dataset.key); },
    reopenStage(el, e, { id }) { if (confirm('Reabrir esta etapa?')) reopenStage(id, el.dataset.key); },

    async addTask(form, e, { id }) {
      const input = form.querySelector('input');
      const title = input.value.trim();
      if (!title) return;
      const key = form.dataset.key;
      const n = tasksOf(id, key).length;
      await store.insert('tasks', { project_id: id, stage_key: key, title, sort: n, done: false, assignee_id: me().id, due_date: null });
      const stage = stagesOf(id).find(s => s.key === key);
      if (stage?.status === 'concluida') await reopenStage(id, key);
      setTimeout(() => document.querySelector(`form[data-key="${key}"] input`)?.focus(), 30);
    },
    async deleteTask(el) {
      const t = store.find('tasks', el.dataset.id);
      if (confirm(`Excluir a tarefa "${t.title}"?`)) await store.remove('tasks', t.id);
    },

    async addNote(form, e, { id }) {
      const body = form.body.value.trim();
      if (!body) return;
      await store.insert('notes', { project_id: id, account_id: store.find('projects', id).account_id, body, author_id: me().id, pinned: false });
      await award(me().id, 'note_created', store.find('projects', id).name, null);
    },
    pinNote(el) { const n = store.find('notes', el.dataset.id); store.update('notes', n.id, { pinned: !n.pinned }); },
    async deleteNote(el) { if (confirm('Excluir esta nota?')) await store.remove('notes', el.dataset.id); },

    addMember(el, e, { id }) {
      const inProj = new Set(store.where('project_members', m => m.project_id === id).map(m => m.user_id));
      const people = store.all('profiles').filter(u => !inProj.has(u.id) && u.active !== false);
      if (!people.length) return toast('Todo mundo já está no projeto');
      modal({
        title: 'Adicionar integrantes',
        fields: [
          { name: 'users', label: 'Integrantes', type: 'multi', options: people.map(u => [u.id, u.name, avatar(u, 20)]) },
          { name: 'role', label: 'Função no projeto', type: 'select', options: Object.entries(PROJECT_ROLES), value: 'design' },
        ],
        async onSubmit(v) {
          if (!v.users.length) return;
          await store.insertMany('project_members', v.users.map(user_id => ({ project_id: id, user_id, role: v.role })));
        },
      });
    },
    memberRole(el) { store.update('project_members', el.dataset.id, { role: el.value }); },
    async removeMember(el) { if (confirm('Remover esta pessoa do projeto?')) await store.remove('project_members', el.dataset.id); },

    editProject(el, e, { id }) { editProjectModal(store.find('projects', id)); },
    receive(el) { receive(store.find('revenue', el.dataset.id)); },
  },
};

// ------------------------------------------------------------
// Cabeçalho: capa ao lado, nome, objetivo e progresso
// ------------------------------------------------------------
function header(p, pr, edit) {
  const kind = projectKind(p);
  const late = p.status === 'ativo' && p.due_date && p.due_date < new Date().toISOString().slice(0, 10);
  return `<header class="phead card" style="--cover:${esc(p.cover_color || 'var(--accent)')}">
    <div class="phead-cover ${p.cover_url ? 'has' : ''}" ${p.cover_url ? `style="background-image:url('${esc(p.cover_url)}')"` : ''}>
      ${p.cover_url ? '' : `<span>${esc(p.name.trim().charAt(0).toUpperCase())}</span>`}
      ${edit ? `<button class="phead-cover-edit" data-act="editProject" title="Trocar ou ajustar a capa">${icon('crop', 14)}</button>` : ''}
    </div>
    <div class="phead-main">
      <div class="row gap-8 wrap">
        <span class="pill pill-${esc(kind)}"><i></i>${esc(clientLabel(p))}</span>
        <span class="pill">${icon(TRACK_ICONS[p.track] || 'folder', 13)}${esc(TRACKS[p.track] || p.track)}</span>
        <span class="pill pill-status-${esc(p.status)}"><i></i>${esc(PROJECT_STATUS[p.status])}</span>
        <span class="pill pill-due ${late ? 'late-pill' : ''}">${icon('calendar', 13)}${p.due_date ? `Entrega ${date(p.due_date, { day: '2-digit', month: 'short', year: 'numeric' })} · ${relDays(p.due_date)}` : 'Sem prazo'}</span>
        ${edit ? `<button class="pill pill-edit" data-act="editProject">${icon('edit', 13)}Editar</button>` : ''}
      </div>
      <h1>${esc(p.name)}</h1>
      ${p.objective ? `<p class="phead-obj">${esc(p.objective)}</p>` : (edit ? `<button class="link" data-act="editProject">${icon('plus', 14)} Definir objetivo principal</button>` : '')}
    </div>
    ${nextCard(p, pr, edit)}
  </header>`;
}

function ring(pct) {
  const r = 34, c = 2 * Math.PI * r;
  return `<div class="ring" role="img" aria-label="${pct}% concluído">
    <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="ring-bg"/><circle cx="40" cy="40" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg>
    <span>${pct}<small>%</small></span>
  </div>`;
}

// ------------------------------------------------------------
// Jornada: as 9 etapas em linha. Cada uma abre a própria caixa.
// ------------------------------------------------------------
function journey(p, pr, selKey) {
  const pace = paceOf(p);
  const fmt = d => date(d, { day: '2-digit', month: 'short' });
  return `<section class="journey card">
    <div class="jmain">
    <div class="journey-head"><h2>Jornada do projeto</h2>${JOURNEYS[p.track]?.label ? `<span class="pill pill-journey">${icon(TRACK_ICONS[p.track] || 'folder', 13)}${esc(JOURNEYS[p.track].label)}</span>` : ''}</div>
    <ol class="jsteps">${stagesFor(p.track).map(def => {
      const s = pr.stages.find(x => x.key === def.key);
      const st = s?.status || 'pendente';
      const t = tasksOf(p.id, def.key);
      const plan = plannedEnd(p, def.n);
      const late = st !== 'concluida' && plan && plan < new Date().toISOString().slice(0, 10);
      return `<li class="jstep jstep-${st} ${def.key === selKey ? 'sel' : ''}">
        <a href="#/projetos/${esc(p.id)}/visao/${def.key}" title="${esc(def.why)}" data-act="goStage" data-key="${def.key}">
          <span class="jdot">${st === 'concluida' ? icon('check', 16) : def.n}</span>
          <span class="jname">${esc(def.name)}</span>
          <small>${t.filter(x => x.done).length}/${t.length}</small>
          ${st === 'concluida' && s.done_at ? `<em class="jdate done">${icon('check', 11)} ${fmt(s.done_at)}</em>`
            : plan ? `<em class="jdate ${late ? 'late' : ''}" title="Previsto: 3 dias por etapa a partir do início">${fmt(plan)}</em>` : ''}
        </a>
      </li>`;
    }).join('')}</ol>
    </div>
    <div class="jprog">
      <div class="jprog-top">
        ${ring(pr.pct)}
        <div class="jprog-nums"><strong>${pr.doneTasks}<small> de ${pr.totalTasks}</small></strong><span>tarefas</span><em>${pr.doneStages} de 9 etapas</em></div>
      </div>
      <div class="jpace jpace-${pace.kind}">
        <span class="jdue">${icon('calendar', 13)} ${p.due_date ? `Entrega ${date(p.due_date, { day: '2-digit', month: 'short' })} · ${relDays(p.due_date)}` : 'Sem prazo de entrega'}</span>
        <p>${esc(pace.text)}</p>
      </div>
    </div>
  </section>`;
}

function panel(tab, sub, p, edit, selKey) {
  switch (tab) {
    case 'moodboard': return moodPanel(p, edit);
    case 'briefing': return briefingPanel(p, edit, sub);
    case 'marca': return brandbookPanel(p, edit, sub);
    case 'notas': return notesPanel(p);
    case 'equipe': return teamPanel(p);
    case 'financeiro': return seesMoney() ? financePanel(p) : '';
    default: return stagesPanel(p, edit, selKey);
  }
}

// ------------------------------------------------------------
// Próximo passo + lembretes (coluna lateral)
// ------------------------------------------------------------
let showDoneRem = false;
function nextCard(p, pr, edit) {
  const def = pr.currentDef;
  const nx = def?.next || {};
  const list = p.reminders || [];
  const open = list.filter(r => !r.done);
  const done = list.filter(r => r.done);
  const shown = [...open, ...(showDoneRem ? done : [])];
  return `<section class="next-card">
    <div class="kicker">${def ? `Próximo passo · ${def.n}. ${esc(def.name)}` : 'Projeto entregue'}</div>
    <h3>${def ? esc((nx.title || def.name).replace('{name}', p.name)) : 'Até o próximo projeto!'}</h3>
    <p>${def ? esc(nx.text || def.why) : 'As 9 etapas foram concluídas.'}</p>
    ${def ? (nx.cta ? `<a class="btn btn-primary btn-sm" href="#/projetos/${esc(p.id)}/${esc(nx.cta[0])}">${esc(nx.cta[1])} ${icon('arrow', 14)}</a>` : '')
      : `<a class="btn btn-primary btn-sm" href="#/projetos/${esc(p.id)}/marca/manual">${icon('book', 15)} Manual completo</a>`}
    <div class="nx-rem">
      <div class="nx-rem-head">${icon('bell', 14)}<span>Lembretes</span>${open.length ? `<b>${open.length}</b>` : ''}
        ${done.length ? `<button data-act="toggleDoneReminders">${showDoneRem ? 'Esconder' : 'Ver'} ${done.length} feito${done.length > 1 ? 's' : ''}</button>` : ''}</div>
      ${shown.length ? `<ul class="nx-rem-list">${shown.map(r => `<li class="${r.done ? 'done' : ''}">
        <button class="checkbox" data-act="toggleReminder" data-id="${esc(r.id)}" aria-label="${r.done ? 'Desmarcar' : 'Concluir'}" ${edit ? '' : 'disabled'}>${icon('check', 12)}</button>
        <span>${esc(r.text)}</span>
        ${edit ? `<button class="icon-btn" data-act="delReminder" data-id="${esc(r.id)}" title="Excluir">${icon('x', 12)}</button>` : ''}</li>`).join('')}</ul>` : ''}
      ${edit ? `<form class="rem-add" data-submit="addReminder"><input name="text" placeholder="+ Novo lembrete (Enter)" aria-label="Novo lembrete"></form>` : ''}
    </div>
    <span class="next-cloud" aria-hidden="true"></span>
  </section>`;
}

// ------------------------------------------------------------
// Visão geral
// ------------------------------------------------------------
function quickCard(p) {
  const bf = briefingFilled(p);
  const bp = brandProgress(p);
  const nMood = moodItems(p.id).length;
  const files = store.where('files', f => f.project_id === p.id);
  const drive = files.find(f => f.kind === 'drive');
  const row = (href, ic, title, sub, bar = '', ext = false) => `<a class="qrow" href="${href}" ${ext ? 'target="_blank" rel="noopener"' : ''}>
    <span class="qic">${icon(ic, 18)}</span><span class="qtxt"><strong>${title}</strong><small>${sub}</small>${bar}</span>${icon(ext ? 'link' : 'chevR', 15)}</a>`;
  return `<section class="card quick">
    <div class="quick-grid">
      ${drive ? row(esc(safeUrl(drive.url)), 'folder', 'Drive', esc(drive.label || 'Pasta do cliente'), '', true)
        : `<button class="qrow" data-act="addFile" data-kind="drive" data-project="${esc(p.id)}" data-account="${esc(p.account_id || '')}"><span class="qic">${icon('folder', 18)}</span><span class="qtxt"><strong>Drive</strong><small>Adicionar pasta</small></span>${icon('plus', 15)}</button>`}
      ${row(`#/projetos/${esc(p.id)}/briefing`, 'brief', 'Briefing', p.briefing_done ? 'Completo' : `${bf.done} de ${bf.total}`, progressBar(bf.done, bf.total))}
      ${row(`#/projetos/${esc(p.id)}/marca`, 'brand', 'Marca', `${bp.done} de ${bp.total} seções`, progressBar(bp.done, bp.total))}
      ${row(`#/projetos/${esc(p.id)}/moodboard`, 'image', 'Moodboard', `${nMood} imagem${nMood === 1 ? '' : 'ns'}`)}
    </div>
    <details class="quick-files">
      <summary>${icon('file', 15)} Arquivos e links (${files.length})</summary>
      ${filesPanel({ project_id: p.id, account_id: p.account_id, compact: true })}
    </details>
  </section>`;
}

function extraCards(p, edit) {
  const pinned = store.where('notes', n => n.project_id === p.id && n.pinned);
  const team = store.where('project_members', m => m.project_id === p.id);
  return `<section class="card">
      <div class="card-head"><h2>Integrantes</h2><a class="link" href="#/projetos/${esc(p.id)}/equipe">Equipe ${icon('arrow', 14)}</a></div>
      <div class="team-inline">${team.map(m => { const u = profile(m.user_id); return u ? `<span class="person">${avatar(u, 30)}<span>${esc(u.name.split(' ')[0])}<small>${esc(PROJECT_ROLES[m.role] || m.role)}</small></span></span>` : ''; }).join('')}</div>
    </section>
    ${alliancesCard(p)}
    ${pinned.length ? `<section class="card"><div class="card-head"><h2>Notas fixadas</h2></div>${pinned.map(n => `<blockquote class="note-pin">${esc(n.body)}</blockquote>`).join('')}</section>` : ''}`;
}

function alliancesCard(p) {
  const ids = p.alliances || [];
  const all = store.all('alliances');
  const inP = ids.map(id => all.find(a => a.id === id)).filter(Boolean);
  const rest = all.filter(a => a.active !== false && !ids.includes(a.id));
  const edit = canEditProject(p);
  if (!inP.length && !rest.length) return '';
  return `<section class="card">
    <div class="card-head"><h2>Alianças no projeto</h2><a class="link" href="#/aliancas">Alianças ${icon('arrow', 14)}</a></div>
    ${inP.length ? `<ul class="ally-mini">${inP.map(a => `<li>${icon('handshake', 16)}<span><strong>${esc(a.name)}</strong><small class="muted">${esc(SERVICES[a.service]?.short || a.area || '')}${a.contact_name ? ` · ${esc(a.contact_name)}` : ''}</small></span>
      ${edit ? `<button class="icon-btn" data-act="removeAlliance" data-id="${esc(a.id)}" title="Tirar do projeto">${icon('x', 14)}</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Nenhuma aliança acionada.</p>'}
    ${edit && rest.length ? `<select class="mt-12" data-change="addAlliance" aria-label="Acionar aliança"><option value="">+ Acionar aliança…</option>${rest.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select>` : ''}
  </section>`;
}

// ------------------------------------------------------------
// Etapas: a etapa escolhida na jornada abre na própria caixa
// ------------------------------------------------------------
function stagesPanel(p, edit, key) {
  const pr = progressOf(p.id);
  const all = stagesFor(p.track);
  const def = all.find(s => s.key === key) || all[0];
  const s = pr.stages.find(x => x.key === def.key);
  const st = s?.status || 'pendente';
  const tasks = tasksOf(p.id, def.key);
  const d = tasks.filter(t => t.done).length;
  const idx = all.indexOf(def);
  const prev = all[idx - 1], next = all[idx + 1];
  const cta = def.next?.cta;

  return `<div class="side-layout">
    <section class="card stage-card stage-${st}">
      <header class="sc-head">
        <span class="sc-n">${st === 'concluida' ? icon('check', 22) : def.n}</span>
        <div class="sc-title"><h2>${esc(def.name)}</h2><p class="muted">${esc(def.why)}</p></div>
        <div class="sc-prog"><span>${st === 'concluida' ? `Concluída ${date(s.done_at)}` : `${d} de ${tasks.length}`}</span>${progressBar(d, tasks.length || 1)}</div>
      </header>
      <ul class="sc-tasks">${tasks.map(t => taskRow(t, edit)).join('') || '<li class="muted sc-empty">Sem tarefas nesta etapa.</li>'}</ul>
      ${edit ? `<form class="add-task" data-submit="addTask" data-key="${def.key}">
        <input placeholder="+ Nova tarefa nesta etapa (Enter)" aria-label="Nova tarefa">
      </form>` : ''}
      <div class="journal">
        <div class="row between gap-8 wrap">
          <span class="field-label">${icon('text', 15)} Diário da etapa</span>
          ${edit ? `<button class="btn btn-ghost btn-sm" data-act="journal" data-key="${def.key}">${icon('edit', 14)} ${s?.journal && Object.values(s.journal).some(Boolean) ? 'Editar' : 'Escrever'}</button>` : ''}
        </div>
        ${journalSummary(s) || '<p class="fine">O que foi feito, decisão e por quê, referências, próximo passo.</p>'}
      </div>
      <footer class="sc-foot">
        <span class="fine">${icon('file', 14)} Entregável: ${esc(def.output)}</span>
        <div class="row gap-8 wrap">
          ${cta ? `<a class="btn btn-ghost btn-sm" href="#/projetos/${esc(p.id)}/${esc(cta[0])}">${esc(cta[1])}</a>` : ''}
          ${edit ? (st === 'concluida'
            ? `<button class="btn btn-ghost btn-sm" data-act="reopenStage" data-key="${def.key}">Reabrir etapa</button>`
            : `<button class="btn btn-primary btn-sm" data-act="completeStage" data-key="${def.key}">${icon('check', 15)} Concluir etapa</button>`) : ''}
        </div>
      </footer>
      <nav class="sc-nav">
        ${prev ? `<a href="#/projetos/${esc(p.id)}/visao/${prev.key}">${icon('chevL', 15)} ${prev.n}. ${esc(prev.name)}</a>` : '<span></span>'}
        ${next ? `<a href="#/projetos/${esc(p.id)}/visao/${next.key}">${next.n}. ${esc(next.name)} ${icon('chevR', 15)}</a>` : ''}
      </nav>
    </section>
    <aside class="stack">
      ${quickCard(p)}
      ${extraCards(p, edit)}
    </aside>
  </div>`;
}

function taskRow(t, edit = true) {
  const late = !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
  const who = profile(t.assignee_id);
  const cl = t.checklist || [];
  const meta = [
    t.done && t.done_by ? `feito por ${esc(profile(t.done_by)?.name?.split(' ')[0] || '')} · ${date(t.done_at)}` : '',
    !t.done && t.due_date ? `<span class="${late ? 'late' : ''}">${icon('calendar', 12)} ${relDays(t.due_date)}</span>` : '',
  ].filter(Boolean).join(' · ');
  return `<li class="task ${t.done ? 'done' : ''}">
    <button class="checkbox" data-act="toggleTask" data-id="${esc(t.id)}" aria-label="${t.done ? 'Desmarcar' : 'Concluir'}" ${edit ? '' : 'disabled'}>${icon('check', 14)}</button>
    <button class="task-body" data-act="openTask" data-id="${esc(t.id)}">
      <span class="task-title">${esc(t.title)}</span>
      ${meta ? `<small class="task-sub">${meta}</small>` : ''}
    </button>
    ${who ? avatar(who, 24) : ''}
    ${cl.length ? `<span class="task-cl" title="Checklist">${icon('file', 14)} ${cl.filter(i => i.done).length}/${cl.length}</span>` : ''}
    ${edit ? `<button class="icon-btn task-del" data-act="deleteTask" data-id="${esc(t.id)}" title="Excluir">${icon('trash', 15)}</button>` : ''}
    <button class="icon-btn" data-act="openTask" data-id="${esc(t.id)}" aria-label="Abrir tarefa">${icon('chevR', 16)}</button>
  </li>`;
}

// ------------------------------------------------------------
function notesPanel(p) {
  const notes = store.where('notes', n => n.project_id === p.id)
    .sort((a, b) => (b.pinned - a.pinned) || String(b.created_at).localeCompare(String(a.created_at)));
  return `<div class="notes">
    <form class="note-new card" data-submit="addNote">
      <textarea name="body" rows="3" placeholder="Anotação, decisão de reunião, feedback do cliente…"></textarea>
      <button class="btn btn-primary" type="submit">${icon('plus', 16)} Anotar</button>
    </form>
    ${notes.length ? `<ul class="note-list">${notes.map(n => {
      const u = profile(n.author_id);
      const mine = n.author_id === me().id || isSocio();
      return `<li class="note card ${n.pinned ? 'pinned' : ''}">
        <div class="note-meta">${avatar(u, 24)} <strong>${esc(u?.name || '')}</strong> <small class="muted">${ago(n.created_at)}</small>
          <span class="spacer"></span>
          <button class="icon-btn ${n.pinned ? 'on' : ''}" data-act="pinNote" data-id="${esc(n.id)}" title="${n.pinned ? 'Desafixar' : 'Fixar'}">${icon('pin', 16)}</button>
          ${mine ? `<button class="icon-btn" data-act="deleteNote" data-id="${esc(n.id)}" title="Excluir">${icon('trash', 16)}</button>` : ''}
        </div>
        <p>${esc(n.body).replace(/\n/g, '<br>')}</p>
      </li>`;
    }).join('')}</ul>` : empty('Sem anotações', 'Registre decisões e feedbacks para ninguém depender da memória.')}
  </div>`;
}

function teamPanel(p) {
  const members = store.where('project_members', m => m.project_id === p.id);
  const manage = ['socio', 'producao'].includes(role());
  return `<section class="card">
    <div class="card-head"><h2>Integrantes do projeto</h2>${manage ? `<button class="btn btn-ghost btn-sm" data-act="addMember">${icon('plus', 16)} Adicionar</button>` : ''}</div>
    <p class="muted">Freelas só enxergam os projetos em que estão escalados.</p>
    <ul class="member-list">${members.map(m => {
      const u = profile(m.user_id);
      if (!u) return '';
      const done = store.where('tasks', t => t.project_id === p.id && t.done && t.done_by === u.id).length;
      const openT = store.where('tasks', t => t.project_id === p.id && !t.done && t.assignee_id === u.id).length;
      return `<li>${avatar(u, 36)}<div><strong>${esc(u.name)}</strong><small class="muted">${done} feitas · ${openT} abertas</small></div>
        <select class="mini" data-change="memberRole" data-id="${esc(m.id)}" ${manage ? '' : 'disabled'}>${Object.entries(PROJECT_ROLES).map(([k, l]) => `<option value="${k}" ${k === m.role ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${manage ? `<button class="icon-btn" data-act="removeMember" data-id="${esc(m.id)}" title="Remover">${icon('x', 16)}</button>` : ''}</li>`;
    }).join('')}</ul>
  </section>`;
}

function financePanel(p) {
  const rows = store.where('revenue', r => r.project_id === p.id).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const rec = rows.filter(r => r.status === 'recebido').reduce((s, r) => s + Number(r.amount), 0);
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  return `<section class="card">
    <div class="card-head"><h2>Financeiro do projeto</h2><a class="link" href="#/financeiro">Financeiro geral ${icon('arrow', 14)}</a></div>
    <div class="row gap-24 wrap mb-16"><div><small class="muted">Valor</small><div class="h3">${money(p.value)}</div></div>
    <div><small class="muted">Recebido</small><div class="h3 ok">${money(rec)}</div></div>
    <div><small class="muted">A receber</small><div class="h3">${money(total - rec)}</div></div></div>
    ${progressBar(rec, total || 1)}
    <p class="fine">Parcelas "previstas" seguem o contrato. Só contam no caixa quando o cliente paga e você marca como recebido.</p>
    ${rows.length ? `<div class="table-wrap"><table class="table mt-16"><thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.description)}</td><td>${date(r.due_date)}</td><td>${money(r.amount)}</td>
      <td><span class="tag tag-rev-${esc(r.status)}">${r.status === 'recebido' ? 'Recebido' : 'Previsto'}</span></td>
      <td>${r.status !== 'recebido' ? `<button class="btn btn-ghost btn-sm" data-act="receive" data-id="${esc(r.id)}">Marcar recebido</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="muted mt-16">Nenhuma parcela lançada.</p>'}
  </section>`;
}

function editProjectModal(p) {
  modal({
    title: 'Editar projeto',
    wide: true,
    fields: [
      { name: 'name', label: 'Nome do projeto', required: true, value: p.name },
      { name: 'status', label: 'Status', type: 'select', value: p.status, options: Object.entries(PROJECT_STATUS) },
      { name: 'client_name', label: 'Cliente / marca', value: clientLabel(p) === 'IMAGINE' ? '' : clientLabel(p),
        list: store.all('accounts').filter(a => a.kind !== 'imagine').map(a => a.name) },
      { name: 'kind', label: 'Tipo', type: 'chips', value: projectKind(p), options: KIND_CHIPS },
      { name: 'track', label: 'Serviço', type: 'chips', value: p.track, options: trackChips(), full: true, help: 'Trocar o serviço não muda as tarefas que já existem.' },
      { name: 'objective', label: 'Objetivo principal', type: 'textarea', rows: 2, value: p.objective },
      { name: 'start_date', label: 'Início', type: 'date', value: p.start_date },
      { name: 'due_date', label: 'Prazo', type: 'date', value: p.due_date },
      ...(seesMoney() ? [{ name: 'value', label: 'Valor (R$)', type: 'money', value: p.value }] : []),
      { name: 'cover_color', label: 'Cor do projeto', type: 'color', value: p.cover_color || '#1D5CF0' },
      { name: 'cover_url', label: 'Foto de capa', type: 'image', crop: 1.6, value: p.cover_url || '', help: 'Use "Ajustar imagem" para reenquadrar.' },
    ],
    onOpen: wireProjectForm,
    danger: isSocio() ? { label: 'Excluir projeto', confirm: `Excluir "${p.name}" com todas as etapas, tarefas e notas?`, onClick: () => deleteProject(p) } : null,
    async onSubmit(v) {
      const keep = account(p.account_id)?.kind !== 'imagine' && clientLabel(p) === v.client_name ? p.account_id : null;
      await store.update('projects', p.id, { ...v, ...resolveClient(v, keep) });
      await syncProjectRevenue(p.id);
    },
  });
}

async function deleteProject(p) {
  for (const t of ['tasks', 'stages', 'notes', 'files', 'project_members', 'moodboard', 'brand_assets']) {
    for (const r of store.where(t, x => x.project_id === p.id)) await store.remove(t, r.id);
  }
  await store.remove('projects', p.id);
  location.hash = '#/projetos';
}

