// Página do projeto: visão, etapas (com checklist), briefing, marca, arquivos, notas, equipe, financeiro.
import { store } from '../store.js';
import { STAGES, TRACKS, PROJECT_STATUS, PROJECT_ROLES, ACCOUNT_KINDS } from '../config.js';
import {
  me, role, account, profile, progressOf, stagesOf, tasksOf, toggleTask, completeStage, reopenStage,
  saveBriefing, canEditProject, seesMoney, isSocio, receive,
} from '../ops.js';
import { award } from '../game.js';
import { esc, icon, avatar, modal, money, date, relDays, progressBar, empty, ago, toast } from '../util.js';
import { kindTag, tabs } from './components.js';
import { openTask } from './task.js';
import { brandPanel, brandActions } from './brand.js';
import { filesPanel, fileActions } from './files.js';
import { moodPanel, moodActions, wireMood, moodItems, journalSummary } from './moodboard.js';
import { uid } from '../store.js';
import { SERVICES } from '../config.js';

const open = {}; // etapa expandida por projeto

export const BRIEFING = [
  { key: 'objetivo',     label: 'Objetivo principal', hint: 'O que define sucesso, em uma frase.', big: true },
  { key: 'empresa',      label: 'Sobre a empresa', hint: 'História, momento atual, tamanho.' },
  { key: 'publico',      label: 'Público', hint: 'Quem compra, quem usa, o que valoriza.' },
  { key: 'problema',     label: 'Problema / oportunidade', hint: 'Por que este projeto existe agora.' },
  { key: 'diferenciais', label: 'Diferenciais', hint: 'Por que escolhem esta marca.' },
  { key: 'concorrentes', label: 'Concorrentes e similares', hint: 'Diretos, indiretos e inspirações.' },
  { key: 'tom',          label: 'Personalidade e tom', hint: 'Se a marca fosse uma pessoa…' },
  { key: 'referencias',  label: 'Referências que gosta', hint: 'Links, marcas, estilos.' },
  { key: 'nao_quer',     label: 'O que não quer', hint: 'Cores, estilos, clichês a evitar.' },
  { key: 'entregaveis',  label: 'Entregáveis', hint: 'Lista do que será entregue.' },
  { key: 'restricoes',   label: 'Obrigatórios e restrições', hint: 'O que precisa ficar, limites técnicos.' },
  { key: 'prazo',        label: 'Prazo', hint: 'Datas-chave e lançamento.' },
  { key: 'investimento', label: 'Investimento', hint: 'Faixa aprovada.' },
  { key: 'sucesso',      label: 'Como medir sucesso', hint: 'Números ou sinais concretos.' },
];

export default {
  title: ({ id }) => store.find('projects', id)?.name || 'Projeto',

  render({ id, tab }) {
    const p = store.find('projects', id);
    if (!p) return `<div class="page">${empty('Projeto não encontrado', '', '<a class="btn btn-primary" href="#/projetos">Voltar</a>')}</div>`;
    const a = account(p.account_id);
    const pr = progressOf(p.id);
    const edit = canEditProject(p);
    const nNotes = store.where('notes', n => n.project_id === p.id).length;
    const nFiles = store.where('files', f => f.project_id === p.id).length;

    const TABS = [
      ['visao', 'Visão geral'], ['etapas', 'Etapas', `${pr.doneStages}/9`], ['rascunho', 'Rascunho', moodItems(p.id).length || null], ['briefing', 'Briefing'],
      ['marca', 'Marca'], ['arquivos', 'Arquivos', nFiles], ['notas', 'Notas', nNotes], ['equipe', 'Equipe'],
      ...(seesMoney() ? [['financeiro', 'Financeiro']] : []),
    ];

    return `<div class="page">
      <a href="#/projetos" class="back">${icon('back', 16)} Projetos</a>
      <header class="proj-head" style="--cover:${esc(p.cover_color || 'var(--navy)')}">
        <div class="proj-head-main">
          <div class="row gap-8 wrap">
            ${kindTag(a?.kind || 'cliente')}
            <span class="tag">${esc(TRACKS[p.track] || p.track)}</span>
            <span class="tag tag-status-${esc(p.status)}">${esc(PROJECT_STATUS[p.status])}</span>
          </div>
          <a class="proj-account" href="#/contas/${esc(a?.id)}">${esc(a?.name || '')}</a>
          <h1>${esc(p.name)}</h1>
          ${p.objective ? `<p class="proj-objective"><span>Objetivo</span>${esc(p.objective)}</p>` : ''}
        </div>
        <div class="proj-head-side">
          <div class="big-pct">${pr.pct}<small>%</small></div>
          <div class="muted">${pr.doneTasks}/${pr.totalTasks} tarefas · ${pr.doneStages}/9 etapas</div>
          <div class="muted">${p.due_date ? `Entrega ${date(p.due_date, { day: '2-digit', month: 'short', year: 'numeric' })} · ${relDays(p.due_date)}` : 'Sem prazo'}</div>
          ${edit ? `<button class="btn btn-ghost btn-sm" data-act="editProject">${icon('edit', 16)} Editar</button>` : ''}
        </div>
      </header>

      ${reminders(p, edit)}
      ${pipeline(p, pr)}
      ${tabs(TABS, tab, `projetos/${p.id}`)}
      <div class="tab-panel">${panel(tab, p, a, edit)}</div>
    </div>`;
  },

  after(root, { id, tab }) {
    if (tab === 'rascunho' && canEditProject(store.find('projects', id) || {})) wireMood(root, id);
  },

  actions: {
    ...brandActions,
    ...fileActions,
    ...moodActions,

    // Lembretes: checklist rápido que aparece ao abrir o projeto
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
    openStage(el, e, { id }) {
      const key = el.dataset.key;
      if (el.tagName === 'A') { open[id] = key; location.hash = el.getAttribute('href'); store.emit({}); return; }
      const current = open[id] === undefined ? progressOf(id).current?.key : open[id];
      open[id] = current === key ? null : key;
      store.emit({});
    },
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
    taskAssignee(el) { store.update('tasks', el.dataset.id, { assignee_id: el.value || null }); },
    taskDue(el) { store.update('tasks', el.dataset.id, { due_date: el.value || null }); },
    async deleteTask(el) {
      const t = store.find('tasks', el.dataset.id);
      if (confirm(`Excluir a tarefa "${t.title}"?`)) await store.remove('tasks', t.id);
    },

    async saveBriefing(form, e, { id }) {
      const p = store.find('projects', id);
      const data = Object.fromEntries(BRIEFING.map(f => [f.key, form.elements[f.key].value.trim()]));
      const done = e.submitter?.dataset.done === '1' || p.briefing_done;
      await saveBriefing(p, data, done);
    },
    printBriefing() { window.print(); },

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
        title: 'Adicionar à equipe do projeto',
        fields: [
          { name: 'user_id', label: 'Pessoa', type: 'select', options: people.map(u => [u.id, u.name]) },
          { name: 'role', label: 'Função no projeto', type: 'select', options: Object.entries(PROJECT_ROLES), value: 'design' },
        ],
        async onSubmit(v) { await store.insert('project_members', { project_id: id, ...v }); },
      });
    },
    memberRole(el) { store.update('project_members', el.dataset.id, { role: el.value }); },
    async removeMember(el) { if (confirm('Remover esta pessoa do projeto?')) await store.remove('project_members', el.dataset.id); },

    editProject(el, e, { id }) { editProjectModal(store.find('projects', id)); },
    receive(el) { receive(store.find('revenue', el.dataset.id)); },
  },
};

// ------------------------------------------------------------
function pipeline(p, pr) {
  return `<ol class="pipeline">${STAGES.map(def => {
    const s = pr.stages.find(x => x.key === def.key);
    const st = s?.status || 'pendente';
    const t = tasksOf(p.id, def.key);
    const d = t.filter(x => x.done).length;
    return `<li class="pipe pipe-${st}">
      <a href="#/projetos/${esc(p.id)}/etapas" data-act="openStage" data-key="${def.key}">
        <span class="pipe-n">${st === 'concluida' ? icon('check', 14) : def.n}</span>
        <span class="pipe-name">${esc(def.name)}</span>
        <span class="pipe-count">${d}/${t.length}</span>
      </a>
    </li>`;
  }).join('')}</ol>`;
}

function panel(tab, p, a, edit) {
  switch (tab) {
    case 'etapas': return stagesPanel(p, edit);
    case 'rascunho': return moodPanel(p, edit);
    case 'briefing': return briefingPanel(p, edit);
    case 'marca': return a ? `${brandPanel(a, { editable: edit })}<p class="fine">O manual pertence à conta <a href="#/contas/${esc(a.id)}">${esc(a.name)}</a> e é compartilhado entre todos os projetos dela.</p>` : '';
    case 'arquivos': return filesPanel({ project_id: p.id, account_id: p.account_id });
    case 'notas': return notesPanel(p);
    case 'equipe': return teamPanel(p);
    case 'financeiro': return seesMoney() ? financePanel(p) : '';
    default: return overview(p, a);
  }
}

function overview(p, a) {
  const pr = progressOf(p.id);
  const cur = pr.current;
  const curTasks = cur ? tasksOf(p.id, cur.key) : [];
  const pinned = store.where('notes', n => n.project_id === p.id && n.pinned);
  const team = store.where('project_members', m => m.project_id === p.id);
  const bFilled = BRIEFING.filter(f => (p.briefing || {})[f.key]).length;
  return `<div class="grid-2">
    <section class="card">
      <div class="card-head"><h2>${cur ? `Agora: ${pr.currentDef.n}. ${esc(pr.currentDef.name)}` : 'Projeto entregue'}</h2>
      <a class="link" href="#/projetos/${esc(p.id)}/etapas">Todas as etapas ${icon('arrow', 14)}</a></div>
      ${cur ? `<p class="muted">${esc(pr.currentDef.why)}</p>
        <ul class="task-list">${curTasks.map(t => taskRow(t, p, true)).join('')}</ul>
        <p class="fine">Entregável da etapa: ${esc(pr.currentDef.output)}</p>` : '<p>Todas as 9 etapas foram concluídas.</p>'}
    </section>
    <div class="stack">
      <section class="card">
        <div class="card-head"><h2>Acesso rápido</h2><a class="link" href="#/projetos/${esc(p.id)}/arquivos">Arquivos ${icon('arrow', 14)}</a></div>
        ${filesPanel({ project_id: p.id, account_id: p.account_id, compact: true })}
      </section>
      <section class="card">
        <div class="card-head"><h2>Briefing</h2><span class="${p.briefing_done ? 'ok' : 'muted'}">${p.briefing_done ? 'Completo' : `${bFilled}/${BRIEFING.length} campos`}</span></div>
        ${progressBar(bFilled, BRIEFING.length)}
        <a class="btn btn-ghost btn-sm mt-12" href="#/projetos/${esc(p.id)}/briefing">${icon('brief', 16)} Abrir briefing</a>
      </section>
      <section class="card">
        <div class="card-head"><h2>Equipe</h2></div>
        <div class="team-inline">${team.map(m => { const u = profile(m.user_id); return u ? `<span class="person">${avatar(u, 28)}<span>${esc(u.name.split(' ')[0])}<small>${esc(PROJECT_ROLES[m.role] || m.role)}</small></span></span>` : ''; }).join('')}</div>
      </section>
      ${alliancesCard(p)}
      ${pinned.length ? `<section class="card"><div class="card-head"><h2>Notas fixadas</h2></div>${pinned.map(n => `<blockquote class="note-pin">${esc(n.body)}</blockquote>`).join('')}</section>` : ''}
    </div>
  </div>`;
}

// Lembretes no topo do projeto: o que não pode ser esquecido
let showDoneRem = false;
function reminders(p, edit) {
  const list = p.reminders || [];
  const open = list.filter(r => !r.done);
  const done = list.filter(r => r.done);
  if (!list.length && !edit) return '';
  return `<section class="reminders ${open.length ? 'has-open' : ''}">
    <div class="rem-head">${icon('bell', 16)}<strong>Lembretes</strong><span class="count">${open.length}</span>
      ${done.length ? `<button class="link" data-act="toggleDoneReminders">${showDoneRem ? 'Esconder' : 'Ver'} ${done.length} feito${done.length > 1 ? 's' : ''}</button>` : ''}</div>
    <ul class="rem-list">${[...open, ...(showDoneRem ? done : [])].map(r => `<li class="${r.done ? 'done' : ''}">
      <button class="checkbox" data-act="toggleReminder" data-id="${esc(r.id)}" aria-label="${r.done ? 'Desmarcar' : 'Concluir'}" ${edit ? '' : 'disabled'}>${icon('check', 14)}</button>
      <span>${esc(r.text)}</span>
      ${edit ? `<button class="icon-btn" data-act="delReminder" data-id="${esc(r.id)}" title="Excluir">${icon('x', 14)}</button>` : ''}
    </li>`).join('')}</ul>
    ${edit ? `<form class="rem-add" data-submit="addReminder"><input name="text" placeholder="Novo lembrete (Enter): pedir acessos, enviar contrato, confirmar fonte…" aria-label="Novo lembrete"></form>` : ''}
  </section>`;
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

function stagesPanel(p, edit) {
  const pr = progressOf(p.id);
  const openKey = open[p.id] === undefined ? pr.current?.key : open[p.id];
  const team = store.all('profiles');
  return `<div class="stages">${STAGES.map(def => {
    const s = pr.stages.find(x => x.key === def.key);
    const st = s?.status || 'pendente';
    const tasks = tasksOf(p.id, def.key);
    const d = tasks.filter(t => t.done).length;
    const isOpen = openKey === def.key;
    return `<section class="stage stage-${st} ${isOpen ? 'open' : ''}">
      <button class="stage-head" data-act="openStage" data-key="${def.key}" aria-expanded="${isOpen}">
        <span class="stage-n">${st === 'concluida' ? icon('check', 16) : def.n}</span>
        <span class="stage-title"><strong>${esc(def.name)}</strong><small>${esc(def.why)}</small></span>
        <span class="stage-meta">${st === 'concluida' ? `Concluída ${date(s.done_at)}` : `${d}/${tasks.length}`}</span>
      </button>
      ${isOpen ? `<div class="stage-body">
        ${progressBar(d, tasks.length || 1)}
        <ul class="task-list">${tasks.map(t => taskRow(t, p, false, team, edit)).join('') || '<li class="muted">Sem tarefas nesta etapa.</li>'}</ul>
        ${edit ? `<form class="add-task" data-submit="addTask" data-key="${def.key}">
          <input placeholder="Nova tarefa nesta etapa (Enter para adicionar)" aria-label="Nova tarefa">
          <button class="btn btn-ghost btn-sm" type="submit">${icon('plus', 16)}</button>
        </form>` : ''}
        <div class="journal">
          <div class="row between gap-8 wrap">
            <span class="field-label">${icon('text', 14)} Diário da etapa</span>
            <div class="row gap-8">
              ${['pesquisa', 'conceito'].includes(def.key) ? `<a class="btn btn-ghost btn-sm" href="#/projetos/${esc(p.id)}/rascunho">${icon('image', 14)} Rascunho (${moodItems(p.id).length})</a>` : ''}
              ${edit ? `<button class="btn btn-ghost btn-sm" data-act="journal" data-key="${def.key}">${icon('edit', 14)} ${s?.journal && Object.values(s.journal).some(Boolean) ? 'Editar' : 'Escrever'}</button>` : ''}
            </div>
          </div>
          ${journalSummary(s) || '<p class="fine">O que foi feito, decisão e por quê, referências, próximo passo.</p>'}
        </div>
        <div class="stage-foot">
          <span class="fine">Entregável: ${esc(def.output)}</span>
          ${edit ? (st === 'concluida'
            ? `<button class="btn btn-ghost btn-sm" data-act="reopenStage" data-key="${def.key}">Reabrir etapa</button>`
            : `<button class="btn btn-primary btn-sm" data-act="completeStage" data-key="${def.key}">${icon('check', 16)} Concluir etapa</button>`) : ''}
        </div>
      </div>` : ''}
    </section>`;
  }).join('')}</div>`;
}

function taskRow(t, p, compact, team = [], edit = true) {
  const late = !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
  const who = profile(t.assignee_id);
  return `<li class="task ${t.done ? 'done' : ''}">
    <button class="checkbox" data-act="toggleTask" data-id="${esc(t.id)}" aria-label="${t.done ? 'Desmarcar' : 'Concluir'}" ${edit ? '' : 'disabled'}>${icon('check', 14)}</button>
    <div class="task-body"><button class="task-title task-open" data-act="openTask" data-id="${esc(t.id)}">${esc(t.title)}${(t.checklist || []).length ? ` <small class="muted">${t.checklist.filter(i => i.done).length}/${t.checklist.length}</small>` : ""}</button>
      ${t.done && t.done_by ? `<small class="muted">feito por ${esc(profile(t.done_by)?.name?.split(' ')[0] || '')} · ${date(t.done_at)}</small>` : ''}
    </div>
    ${compact
      ? `${who ? avatar(who, 22) : ''}${t.due_date && !t.done ? `<span class="due ${late ? 'late' : ''}">${relDays(t.due_date)}</span>` : ''}`
      : `<select class="mini" data-change="taskAssignee" data-id="${esc(t.id)}" aria-label="Responsável" ${edit ? '' : 'disabled'}>
          <option value="">Sem dono</option>${team.map(u => `<option value="${esc(u.id)}" ${u.id === t.assignee_id ? 'selected' : ''}>${esc(u.name.split(' ')[0])}</option>`).join('')}
        </select>
        <input class="mini ${late ? 'late' : ''}" type="date" value="${esc(t.due_date || '')}" data-change="taskDue" data-id="${esc(t.id)}" aria-label="Prazo" ${edit ? '' : 'disabled'}>
        ${edit ? `<button class="icon-btn" data-act="deleteTask" data-id="${esc(t.id)}" title="Excluir">${icon('trash', 16)}</button>` : ''}`}
  </li>`;
}

function briefingPanel(p, edit) {
  const b = p.briefing || {};
  const filled = BRIEFING.filter(f => b[f.key]).length;
  return `<form class="briefing" data-submit="saveBriefing">
    <div class="briefing-head">
      <div>
        <div class="kicker">Direcionador</div>
        <h2>Briefing · ${esc(p.name)}</h2>
        <p class="muted">Todas as decisões do projeto voltam aqui. ${filled}/${BRIEFING.length} campos preenchidos${p.briefing_done ? ' · <strong class="ok">marcado como completo</strong>' : ''}.</p>
      </div>
      <div class="row gap-8 no-print">
        <button type="button" class="btn btn-ghost" data-act="printBriefing">${icon('file', 16)} Imprimir / PDF</button>
      </div>
    </div>
    ${progressBar(filled, BRIEFING.length)}
    <div class="briefing-grid">
      ${BRIEFING.map(f => `<div class="bfield ${f.big ? 'big' : ''}">
        <label for="b-${f.key}">${esc(f.label)}</label>
        <small>${esc(f.hint)}</small>
        <textarea id="b-${f.key}" name="${f.key}" rows="${f.big ? 2 : 3}" ${edit ? '' : 'readonly'}>${esc(b[f.key] || '')}</textarea>
      </div>`).join('')}
    </div>
    ${edit ? `<div class="briefing-foot no-print">
      <button class="btn btn-ghost" type="submit">Salvar</button>
      ${p.briefing_done ? '' : `<button class="btn btn-primary" type="submit" data-done="1">${icon('check', 16)} Salvar e marcar como completo</button>`}
    </div>` : ''}
  </form>`;
}

function notesPanel(p) {
  const notes = store.where('notes', n => n.project_id === p.id)
    .sort((a, b) => (b.pinned - a.pinned) || String(b.created_at).localeCompare(String(a.created_at)));
  return `<div class="notes">
    <form class="note-new" data-submit="addNote">
      <textarea name="body" rows="3" placeholder="Anotação, decisão de reunião, feedback do cliente…"></textarea>
      <button class="btn btn-primary" type="submit">${icon('plus', 16)} Anotar</button>
    </form>
    ${notes.length ? `<ul class="note-list">${notes.map(n => {
      const u = profile(n.author_id);
      const mine = n.author_id === me().id || isSocio();
      return `<li class="note ${n.pinned ? 'pinned' : ''}">
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
    <div class="card-head"><h2>Equipe do projeto</h2>${manage ? `<button class="btn btn-ghost btn-sm" data-act="addMember">${icon('plus', 16)} Adicionar</button>` : ''}</div>
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
    ${rows.length ? `<table class="table mt-16"><thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.description)}</td><td>${date(r.due_date)}</td><td>${money(r.amount)}</td>
      <td><span class="tag tag-rev-${esc(r.status)}">${r.status === 'recebido' ? 'Recebido' : 'Previsto'}</span></td>
      <td>${r.status !== 'recebido' ? `<button class="btn btn-ghost btn-sm" data-act="receive" data-id="${esc(r.id)}">Marcar recebido</button>` : ''}</td></tr>`).join('')}
    </tbody></table>` : '<p class="muted mt-16">Nenhuma parcela lançada.</p>'}
  </section>`;
}

function editProjectModal(p) {
  modal({
    title: 'Editar projeto',
    fields: [
      { name: 'name', label: 'Nome', required: true, value: p.name },
      { name: 'account_id', label: 'Conta', type: 'select', value: p.account_id,
        options: store.all('accounts').map(a => [a.id, `${ACCOUNT_KINDS[a.kind].label} · ${a.name}`]) },
      { name: 'status', label: 'Status', type: 'select', value: p.status, options: Object.entries(PROJECT_STATUS) },
      { name: 'track', label: 'Trilha', type: 'select', value: p.track, options: Object.entries(TRACKS) },
      { name: 'objective', label: 'Objetivo principal', value: p.objective, full: true },
      { name: 'start_date', label: 'Início', type: 'date', value: p.start_date },
      { name: 'due_date', label: 'Prazo', type: 'date', value: p.due_date },
      ...(seesMoney() ? [{ name: 'value', label: 'Valor (R$)', type: 'money', value: p.value }] : []),
      { name: 'cover_color', label: 'Cor', type: 'color', value: p.cover_color || '#12328C' },
      { name: 'cover_url', label: 'Foto de capa', type: 'image', value: p.cover_url || '', help: 'Aparece no card do projeto. A foto é reduzida automaticamente.' },
    ],
    danger: isSocio() ? { label: 'Excluir projeto', confirm: `Excluir "${p.name}" com todas as etapas, tarefas e notas?`, onClick: () => deleteProject(p) } : null,
    async onSubmit(v) { await store.update('projects', p.id, v); },
  });
}

async function deleteProject(p) {
  for (const t of ['tasks', 'stages', 'notes', 'files', 'project_members']) {
    for (const r of store.where(t, x => x.project_id === p.id)) await store.remove(t, r.id);
  }
  await store.remove('projects', p.id);
  location.hash = '#/projetos';
}
