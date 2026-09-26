// Janela da tarefa (estilo Trello, enxuta): responsável, data, descrição, links, checklist,
// comentários e atividade. A atividade só registra quando a tarefa é concluída.
import { store, uid } from '../store.js';
import { STAGES } from '../config.js';
import { me, profile, toggleTask, canEditProject } from '../ops.js';
import { esc, icon, avatar, date, ago, safeUrl, progressBar } from '../util.js';

let openId = null;
const root = () => document.getElementById('modal');

export function openTask(id) {
  openId = id;
  paint();
  root().classList.add('show');
}

function close() {
  openId = null;
  root().classList.remove('show');
  root().innerHTML = '';
}

// Mantém a janela atualizada quando os dados mudam (ex.: concluir a tarefa)
store.on(() => { if (openId) queueMicrotask(paint); });

function paint() {
  const t = store.find('tasks', openId);
  if (!t) return close();
  const p = store.find('projects', t.project_id);
  const def = STAGES.find(s => s.key === t.stage_key);
  const edit = p && canEditProject(p);
  const team = store.all('profiles').filter(u => u.active !== false);
  const list = t.checklist || [];
  const doneItems = list.filter(i => i.done).length;
  const feed = [...(t.activity || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const focus = document.activeElement?.dataset?.keep;

  root().innerHTML = `
    <div class="modal-backdrop" data-tk="close"></div>
    <div class="modal-card tk ${t.done ? 'tk-done' : ''}" role="dialog" aria-label="${esc(t.title)}">
      <header class="tk-head">
        <span class="tag">${def ? `${def.n}. ${esc(def.name)}` : ''}</span>
        <span class="muted tk-proj">${esc(p?.name || '')}</span>
        <button class="icon-btn" data-tk="close" aria-label="Fechar">${icon('x')}</button>
      </header>
      <div class="tk-body">
        <div class="tk-main">
          <div class="tk-title-row">
            <button class="checkbox ${t.done ? 'on' : ''}" data-tk="toggle" aria-label="${t.done ? 'Reabrir' : 'Concluir'}" ${edit ? '' : 'disabled'}>${icon('check', 14)}</button>
            <input class="tk-title" data-tk-change="title" data-keep="title" value="${esc(t.title)}" ${edit ? '' : 'readonly'} aria-label="Título">
          </div>

          <div class="tk-meta">
            <label><span>Responsável</span>
              <select data-tk-change="assignee" ${edit ? '' : 'disabled'}><option value="">Sem dono</option>
              ${team.map(u => `<option value="${esc(u.id)}" ${u.id === t.assignee_id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
            <label><span>Data</span><input type="date" value="${esc(t.due_date || '')}" data-tk-change="due" ${edit ? '' : 'disabled'}></label>
          </div>

          <section class="tk-sec">
            <h3>${icon('note', 16)} Descrição</h3>
            <textarea rows="3" data-tk-change="desc" data-keep="desc" placeholder="O que precisa ser feito, contexto, critérios…" ${edit ? '' : 'readonly'}>${esc(t.description || '')}</textarea>
          </section>

          <section class="tk-sec">
            <h3>${icon('link', 16)} Links úteis</h3>
            ${(t.links || []).length ? `<ul class="link-list">${t.links.map((l, i) => `<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${icon('link', 14)} <span>${esc(l.label || l.url)}</span></a>${edit ? `<button class="icon-btn" data-tk="rmLink" data-i="${i}" title="Remover">${icon('x', 14)}</button>` : ''}</li>`).join('')}</ul>` : ''}
            ${edit ? `<form class="tk-add" data-tk-form="link">
              <input name="label" placeholder="Nome (ex.: Figma)">
              <input name="url" placeholder="https://…" data-keep="url">
              <button class="btn btn-ghost btn-sm" type="submit">${icon('plus', 14)}</button>
            </form>` : ''}
          </section>

          <section class="tk-sec">
            <div class="row between"><h3>${icon('check', 16)} Checklist</h3>${list.length ? `<span class="muted">${Math.round(doneItems / list.length * 100)}%</span>` : ''}</div>
            ${list.length ? progressBar(doneItems, list.length) : ''}
            <ul class="tk-check">${list.map((it, i) => `<li class="${it.done ? 'done' : ''}">
              <label><input type="checkbox" data-tk-change="item" data-i="${i}" ${it.done ? 'checked' : ''} ${edit ? '' : 'disabled'}> <span>${esc(it.text)}</span></label>
              ${edit ? `<button class="icon-btn" data-tk="rmItem" data-i="${i}" title="Remover">${icon('x', 14)}</button>` : ''}</li>`).join('')}</ul>
            ${edit ? `<form class="tk-add" data-tk-form="item"><input name="text" placeholder="Adicionar um item" data-keep="item"><button class="btn btn-ghost btn-sm" type="submit">${icon('plus', 14)}</button></form>` : ''}
          </section>
        </div>

        <aside class="tk-side">
          <h3>${icon('note', 16)} Comentários e atividade</h3>
          <form class="tk-comment" data-tk-form="comment"><textarea name="text" rows="2" placeholder="Escrever um comentário…" data-keep="comment"></textarea><button class="btn btn-primary btn-sm" type="submit">Comentar</button></form>
          <ul class="tk-feed">${feed.map(a => {
            const u = profile(a.user_id);
            return `<li>${avatar(u, 28)}<div><p><strong>${esc(u?.name || 'Alguém')}</strong> ${a.type === 'done' ? 'concluiu esta tarefa' : ''}</p>
              ${a.type === 'comment' ? `<div class="tk-bubble">${esc(a.text).replace(/\n/g, '<br>')}</div>` : ''}
              <small>${esc(date(a.at, { day: 'numeric', month: 'short', year: 'numeric' }))} · ${ago(a.at)}</small></div></li>`;
          }).join('') || '<li class="muted">Nada ainda. A atividade aparece quando a tarefa é concluída.</li>'}</ul>
        </aside>
      </div>
    </div>`;

  if (focus) root().querySelector(`[data-keep="${focus}"]`)?.focus();
}

const save = patch => store.update('tasks', openId, patch);
const cur = () => store.find('tasks', openId);

document.addEventListener('click', e => {
  const el = e.target.closest('[data-tk]');
  if (!el || !openId) return;
  const t = cur();
  switch (el.dataset.tk) {
    case 'close': return close();
    case 'toggle': return toggleTask(t);
    case 'rmLink': return save({ links: t.links.filter((_, i) => i !== +el.dataset.i) });
    case 'rmItem': return save({ checklist: t.checklist.filter((_, i) => i !== +el.dataset.i) });
  }
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-tk-change]');
  if (!el || !openId) return;
  const t = cur();
  switch (el.dataset.tkChange) {
    case 'title': if (el.value.trim()) save({ title: el.value.trim() }); break;
    case 'assignee': save({ assignee_id: el.value || null }); break;
    case 'due': save({ due_date: el.value || null }); break;
    case 'desc': save({ description: el.value }); break;
    case 'item': save({ checklist: t.checklist.map((it, i) => i === +el.dataset.i ? { ...it, done: el.checked } : it) }); break;
  }
});

document.addEventListener('submit', e => {
  const form = e.target.closest('[data-tk-form]');
  if (!form || !openId) return;
  e.preventDefault();
  const t = cur();
  const v = k => form.elements[k]?.value.trim();
  if (form.dataset.tkForm === 'link' && v('url')) save({ links: [...(t.links || []), { label: v('label') || v('url'), url: v('url') }] });
  if (form.dataset.tkForm === 'item' && v('text')) save({ checklist: [...(t.checklist || []), { id: uid(), text: v('text'), done: false }] });
  if (form.dataset.tkForm === 'comment' && v('text')) save({ activity: [...(t.activity || []), { type: 'comment', user_id: me().id, text: v('text'), at: new Date().toISOString() }] });
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && openId) close(); });
