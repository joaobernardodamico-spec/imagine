// Agenda: eventos do Hub + prazos de projetos/tarefas/follow-ups + Google Agenda.
import { store } from '../store.js';
import { me, visibleProjects, can } from '../ops.js';
import * as G from '../google.js';
import { esc, icon, modal, time, toast, today } from '../util.js';
import { pageHead } from './components.js';

const state = { start: mondayOf(new Date()), google: [], gKey: '', loading: false, show: { hub: true, prazos: true, google: true } };

function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const iso = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default {
  title: () => 'Agenda',

  render() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(state.start, i));
    const from = iso(days[0]), to = iso(days[6]);
    const items = collect(from, to);
    const gOk = G.configured(), gOn = G.connected();
    const label = `${days[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return `<div class="page page-wide">
      ${pageHead('Agenda', 'Reuniões, prazos de projeto, tarefas e follow-ups num calendário só.',
        `${gOn ? `<button class="btn btn-ghost" data-act="gDisconnect">${icon('google')} Google conectado</button>`
          : `<button class="btn btn-ghost" data-act="gConnect" ${gOk ? '' : 'title="Configure GOOGLE_CLIENT_ID"'}>${icon('google')} Conectar Google Agenda</button>`}
         <button class="btn btn-primary" data-act="newEvent">${icon('plus')} Evento</button>`)}

      ${!gOk ? `<div class="hint">${icon('google', 16)} Integração pronta, falta o Client ID do Google. Passo a passo no <code>adm/README.md</code>.</div>` : ''}

      <div class="month-nav">
        <button class="icon-btn" data-act="week" data-k="-7" aria-label="Semana anterior">${icon('back')}</button>
        <strong>${esc(label)}</strong>
        <button class="icon-btn" data-act="week" data-k="7" aria-label="Próxima semana">${icon('arrow')}</button>
        <button class="btn btn-ghost btn-sm" data-act="week" data-k="0">Hoje</button>
        <span class="spacer"></span>
        ${[['hub', 'Eventos'], ['prazos', 'Prazos'], ['google', 'Google']].map(([k, l]) =>
          `<label class="check chip-check ev-${k}"><input type="checkbox" data-change="toggleShow" data-k="${k}" ${state.show[k] ? 'checked' : ''}> ${l}</label>`).join('')}
        ${state.loading ? '<span class="muted">carregando Google…</span>' : ''}
      </div>

      <div class="week">
        ${days.map(d => {
          const k = iso(d);
          const list = items.filter(e => String(e.start).slice(0, 10) === k)
            .sort((a, b) => (a.allDay ? -1 : 0) - (b.allDay ? -1 : 0) || String(a.start).localeCompare(String(b.start)));
          return `<section class="day ${k === today() ? 'is-today' : ''}">
            <header><span>${esc(d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''))}</span><strong>${d.getDate()}</strong></header>
            <div class="day-body">${list.map(ev).join('') || '<span class="day-empty"></span>'}</div>
          </section>`;
        }).join('')}
      </div>
    </div>`;
  },

  after() {
    if (!G.connected() || !state.show.google) return;
    const from = iso(state.start), to = iso(addDays(state.start, 7));
    const key = from + to;
    if (state.gKey === key || state.loading) return;
    state.loading = true;
    G.listEvents(from + 'T00:00', to + 'T00:00')
      .then(items => { state.google = items; state.gKey = key; })
      .catch(err => {
        state.gKey = key; // não tenta de novo em loop; só ao trocar de semana ou reconectar
        toast(/403/.test(err.message)
          ? 'Google Agenda recusou (403): ative a Google Calendar API no projeto do Google Cloud.'
          : err.message, { kind: 'error', ms: 6000 });
      })
      .finally(() => { state.loading = false; store.emit({}); });
  },

  actions: {
    week(el) { const k = Number(el.dataset.k); state.start = k === 0 ? mondayOf(new Date()) : addDays(state.start, k); store.emit({}); },
    toggleShow(el) { state.show[el.dataset.k] = el.checked; store.emit({}); },
    async gConnect() {
      try { await G.connect(); state.gKey = ''; toast('Google Agenda conectado', { kind: 'success' }); store.emit({}); }
      catch (err) { toast(err.message, { kind: 'error' }); }
    },
    gDisconnect() { if (confirm('Desconectar o Google Agenda desta sessão?')) { G.disconnect(); state.google = []; state.gKey = ''; store.emit({}); } },
    newEvent() { eventModal(); },
    openEvent(el) { const e = store.find('events', el.dataset.id); if (e) eventModal(e); },
  },
};

function collect(from, to) {
  const inRange = d => d && String(d).slice(0, 10) >= from && String(d).slice(0, 10) <= to;
  const out = [];
  if (state.show.hub) store.where('events', e => inRange(e.start)).forEach(e => out.push({ ...e, source: 'hub' }));
  if (state.show.prazos) {
    visibleProjects().filter(p => p.status === 'ativo' && inRange(p.due_date))
      .forEach(p => out.push({ id: 'p' + p.id, title: `Entrega: ${p.name}`, start: p.due_date, allDay: true, source: 'prazo', href: `#/projetos/${p.id}` }));
    store.where('tasks', t => !t.done && t.assignee_id === me().id && inRange(t.due_date))
      .forEach(t => out.push({ id: 't' + t.id, title: t.title, start: t.due_date, allDay: true, source: 'tarefa', href: `#/projetos/${t.project_id}/etapas` }));
    if (can('crm')) store.where('leads', l => !['ganho', 'perdido'].includes(l.stage) && inRange(l.next_date))
      .forEach(l => out.push({ id: 'l' + l.id, title: `${l.next_action || 'Follow-up'} · ${l.company || l.name}`, start: l.next_date, allDay: true, source: 'lead', href: '#/crm' }));
  }
  // Evento criado pelo Hub e espelhado no Google aparece uma vez só (a versão do Hub)
  const mirrored = new Set(store.all('events').map(e => e.google_id).filter(Boolean));
  if (state.show.google) state.google.filter(e => !mirrored.has(e.id.replace(/^g-/, ''))).forEach(e => out.push(e));
  return out;
}

function ev(e) {
  const t = e.allDay ? '' : `<small>${time(e.start)}</small>`;
  const cls = `ev ev-${e.source}`;
  if (e.source === 'hub') return `<button class="${cls}" data-act="openEvent" data-id="${esc(e.id)}">${t}<span>${esc(e.title)}</span></button>`;
  if (e.source === 'google') return `<a class="${cls}" href="${esc(e.url)}" target="_blank" rel="noopener">${t}<span>${esc(e.title)}</span></a>`;
  return `<a class="${cls}" href="${esc(e.href)}">${t}<span>${esc(e.title)}</span></a>`;
}

function eventModal(e = {}) {
  const isNew = !e.id;
  const d = today();
  modal({
    title: isNew ? 'Novo evento' : 'Evento',
    fields: [
      { name: 'title', label: 'Título', required: true, value: e.title, full: true },
      { name: 'start', label: 'Início', type: 'datetime-local', required: true, value: e.start || `${d}T10:00` },
      { name: 'end', label: 'Fim', type: 'datetime-local', value: e.end || `${d}T11:00` },
      { name: 'kind', label: 'Tipo', type: 'select', value: e.kind || 'reuniao', options: [['reuniao', 'Reunião com cliente'], ['comercial', 'Comercial'], ['interno', 'Interno'], ['entrega', 'Entrega']] },
      { name: 'project_id', label: 'Projeto', type: 'select', value: e.project_id, options: [['', '—'], ...visibleProjects().map(p => [p.id, p.name])] },
      ...(isNew && G.connected() ? [{ name: 'to_google', label: 'Google', type: 'checkbox', checkLabel: 'Criar também no Google Agenda', value: true }] : []),
    ],
    danger: isNew ? null : { label: 'Excluir', confirm: 'Excluir este evento?', onClick: async () => { if (e.google_id && G.connected()) { try { await G.deleteEvent(e.google_id); state.gKey = ''; } catch (err) { toast(err.message, { kind: 'error' }); } } await store.remove('events', e.id); } },
    async onSubmit(v) {
      const { to_google, ...rest } = v;
      if (!rest.end) rest.end = rest.start;
      if (!isNew) return store.update('events', e.id, rest);
      const ev = await store.insert('events', { ...rest, created_by: me().id });
      if (to_google) {
        try { const g = await G.createEvent({ title: rest.title, start: rest.start, end: rest.end }); if (g?.id) await store.update('events', ev.id, { google_id: g.id }); state.gKey = ''; toast('Criado no Google Agenda também', { kind: 'success' }); }
        catch (err) { toast(err.message, { kind: 'error' }); }
      }
    },
  });
}
