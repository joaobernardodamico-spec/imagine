// Projetos — separados de forma explícita em Clientes, Ecossistema e IMAGINE.
import { store } from '../store.js';
import { ACCOUNT_KINDS, TRACKS, TRACK_ICONS, OBJECTIVE_PRESETS, STAGES, MAIN_SERVICES } from '../config.js';
import { visibleProjects, projectKind, createProject, role, seesMoney, account, progressOf, imagineAccount, me, clientLabel } from '../ops.js';
import { esc, icon, modal, empty, today, money, thisMonth, inMonth, avatar } from '../util.js';
import { projectCard, pageHead } from './components.js';
import { hbars, kpi } from '../charts.js';

const state = { kind: 'todos', service: 'todos', status: 'ativo', q: '', open: {} };
const MAIN = MAIN_SERVICES.map(s => s.key);
const serviceOf = p => (MAIN.includes(p.track) ? p.track : 'outros');

const KIND_ORDER = ['cliente', 'ecossistema'];

export default {
  title: () => 'Projetos',

  render(params) {
    if (params.sub && (KIND_ORDER.includes(params.sub) || params.sub === 'todos')) state.kind = params.sub;
    const all = visibleProjects();
    const byStatusAll = all.filter(p => state.status === 'todos' || p.status === state.status);
    const byStatus = byStatusAll.filter(p => state.service === 'todos' || serviceOf(p) === state.service);
    const count = k => byStatus.filter(p => projectKind(p) === k).length;
    const canCreate = role() !== 'freela';

    return `<div class="page">
      ${pageHead('Projetos', 'Tudo o que a IMAGINE está construindo, separado pelo que cada coisa é.',
        canCreate ? `<button class="btn btn-primary" data-act="newProject">${icon('plus')} Novo projeto</button>` : '')}

      ${ecoMap(byStatus)}

      ${servicesStrip(byStatusAll)}

      ${projectsDashboard(all)}

      <div class="toolbar">
        <div class="row gap-8 wrap">
        <div class="seg">
          ${[['todos', 'Todos', byStatus.length], ...KIND_ORDER.map(k => [k, ACCOUNT_KINDS[k].label, count(k)])].map(([k, l, c]) =>
            `<button type="button" class="seg-btn ${state.kind === k ? 'active' : ''}" data-act="kind" data-kind="${k}">${esc(l)} <span class="count">${c}</span></button>`).join('')}
        </div>
        <div class="seg seg-svc" aria-label="Serviço">
          ${[['todos', 'Todos os serviços', null, byStatusAll.length], ...MAIN_SERVICES.map(s => [s.key, s.short, TRACK_ICONS[s.key], byStatusAll.filter(p => serviceOf(p) === s.key).length]),
            ...(byStatusAll.some(p => serviceOf(p) === 'outros') ? [['outros', 'Outros', 'layers', byStatusAll.filter(p => serviceOf(p) === 'outros').length]] : [])]
            .map(([k, l, ic, c]) => `<button type="button" class="seg-btn ${state.service === k ? 'active' : ''}" data-act="service" data-service="${k}">${ic ? icon(ic, 15) : ''}${esc(l)} <span class="count">${c}</span></button>`).join('')}
        </div>
        </div>
        <div class="row gap-8">
          <label class="search">${icon('search', 16)}<input type="search" placeholder="Buscar projeto ou conta" value="${esc(state.q)}" data-input="search"></label>
          <select data-change="status" aria-label="Status">
            ${[['ativo', 'Em andamento'], ['entregue', 'Entregues'], ['pausado', 'Pausados'], ['todos', 'Todos os status']].map(([v, l]) =>
              `<option value="${v}" ${state.status === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>

      ${(state.kind === 'todos' ? KIND_ORDER : [state.kind]).map(k => section(k, byStatus.filter(p => projectKind(p) === k))).join('')}
    </div>`;
  },

  after(root) { if (state.q) filterCards(root, state.q); },

  actions: {
    newProject() { newProjectModal(); },
    service(el) { state.service = state.service === el.dataset.service && el.dataset.service !== 'todos' ? 'todos' : el.dataset.service; store.emit({}); },
    kind(el) { state.kind = state.kind === el.dataset.kind && el.dataset.kind !== 'todos' ? 'todos' : el.dataset.kind; store.emit({}); },
    togglePanel(el) { state.open[el.dataset.key] = !state.open[el.dataset.key]; store.emit({}); },
    status(el) { state.status = el.value; store.emit({}); },
    search(el) { state.q = el.value; filterCards(document.getElementById('view'), el.value); },
  },
};

function projectsDashboard(all) {
  const m = thisMonth();
  const act = all.filter(p => p.status === 'ativo');
  const delivered = all.filter(p => p.status === 'entregue' && inMonth(p.delivered_at, m));
  const late = act.filter(p => p.due_date && p.due_date < today());
  const rem = act.reduce((s, p) => s + (p.reminders || []).filter(r => !r.done).length, 0);
  const kpis = [
    kpi('Em andamento', act.length, { sub: late.length ? `${late.length} atrasado${late.length > 1 ? 's' : ''}` : 'nenhum atrasado', delta: late.length ? -late.length : null, deltaText: late.length ? 'atenção aos prazos' : '' }),
    kpi('Entregues no mês', delivered.length),
    ...(seesMoney() ? [kpi('Valor em produção', money(act.reduce((s, p) => s + Number(p.value || 0), 0)), { sub: 'soma dos projetos ativos' })] : []),
    kpi('Lembretes pendentes', rem, { sub: 'nos projetos ativos' }),
  ].join('');
  const where = STAGES.map(s => ({ label: `${s.n}. ${s.name}`, value: act.filter(p => progressOf(p.id).current?.key === s.key).length }));
  const byTrack = Object.entries(TRACKS).map(([k, l]) => ({ label: l, value: act.filter(p => p.track === k).length })).filter(r => r.value);
  const byKind = KIND_ORDER.map(k => ({ label: ACCOUNT_KINDS[k].label, value: act.filter(p => projectKind(p) === k).length }));
  const drop = (key, title, sub, body) => `<section class="drop ${state.open[key] ? 'open' : ''}">
    <button class="drop-head" data-act="togglePanel" data-key="${key}" aria-expanded="${!!state.open[key]}">
      <span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>${icon('chevD', 18)}
    </button>
    ${state.open[key] ? `<div class="drop-body">${body}</div>` : ''}
  </section>`;
  const top = (rows) => rows.filter(r => r.value).sort((a, b) => b.value - a.value)[0];
  return `<section class="dash">
    <div class="dash-kpis">${kpis}</div>
    <div class="drops">
      ${drop('onde', 'Onde os projetos estão', top(where) ? `Mais em ${top(where).label}` : 'Nenhum projeto ativo', hbars(where, { fmt: v => `${v}`, empty: 'Nenhum projeto ativo.' }))}
      ${drop('trilha', 'Por serviço', byTrack.map(r => `${r.label} ${r.value}`).join(' · ') || 'Sem projetos', hbars(byTrack, { fmt: v => `${v}` }))}
      ${drop('tipo', 'Por tipo', byKind.map(r => `${r.label} ${r.value}`).join(' · '), hbars(byKind, { fmt: v => `${v}` }))}
    </div>
  </section>`;
}

// Os 3 serviços da IMAGINE, logo abaixo do núcleo: quantos projetos, quais, e filtro em um clique
function servicesStrip(projects) {
  return `<section class="svc-strip" aria-label="Serviços">${MAIN_SERVICES.map(s => {
    const list = projects.filter(p => serviceOf(p) === s.key);
    return `<button type="button" class="svc-card svc-${s.key} ${state.service === s.key ? 'active' : ''}" data-act="service" data-service="${s.key}">
      <span class="svc-ic">${icon(TRACK_ICONS[s.key], 22)}</span>
      <span class="svc-txt"><small>Serviço</small><strong>${esc(s.label)}</strong><em>${esc(s.desc)}</em>
        <span class="svc-names">${list.slice(0, 3).map(p => `<i>${esc(p.name)}</i>`).join('')}${list.length > 3 ? `<i>+${list.length - 3}</i>` : ''}${list.length ? '' : '<i class="muted">Nenhum projeto agora</i>'}</span></span>
      <b class="svc-n">${list.length}</b>
    </button>`;
  }).join('')}</section>`;
}

function ecoMap(projects) {
  const n = k => projects.filter(p => projectKind(p) === k).length;
  const visible = new Set(visibleProjects().map(p => p.account_id));
  const accs = k => {
    const fromProjects = projects.filter(p => projectKind(p) === k).map(clientLabel);
    const fromAccounts = k === 'ecossistema' ? store.where('accounts', a => ['ecossistema', 'imagine'].includes(a.kind) && (role() !== 'freela' || visible.has(a.id))).map(a => a.name) : [];
    return [...new Set([...fromProjects, ...fromAccounts])].map(name => ({ name }));
  };
  return `<section class="eco-map" aria-label="Mapa do ecossistema">
    <div class="eco-core">
      <span class="kicker">Núcleo</span>
      <img src="assets/img/simbolo.png" alt="" class="eco-symbol">
      <strong>IMAGINE Concept</strong>
      <small>Estúdio · processos · marca-mãe</small>
    </div>
    <div class="eco-branches">
      ${KIND_ORDER.map(k => `
        <button type="button" class="eco-branch eco-${k} ${state.kind === k ? 'active' : ''}" data-act="kind" data-kind="${k}">
          <div class="eco-branch-head"><span class="tag tag-${k}">${ACCOUNT_KINDS[k].label}</span><strong>${n(k)}</strong></div>
          <p>${esc(ACCOUNT_KINDS[k].desc)}</p>
          <div class="eco-names">${accs(k).slice(0, 8).map(a => `<span>${esc(a.name)}</span>`).join('')}${accs(k).length > 8 ? `<span>+${accs(k).length - 8}</span>` : ''}</div>
        </button>`).join('')}
    </div>
  </section>`;
}

function section(kind, list) {
  const meta = ACCOUNT_KINDS[kind];
  return `<section class="kind-section">
    <header class="kind-head">
      <span class="tag tag-${kind}">${esc(meta.label)}</span>
      <p>${esc(meta.desc)}</p>
    </header>
    ${list.length ? `<div class="pgrid">${list.map(projectCard).join('')}</div>` : empty('Nada por aqui', 'Nenhum projeto neste filtro.')}
  </section>`;
}

function filterCards(root, q) {
  const s = q.trim().toLowerCase();
  root.querySelectorAll('.pcard').forEach(c => { c.style.display = !s || c.textContent.toLowerCase().includes(s) ? '' : 'none'; });
}

// ------------------------------------------------------------
// Campos compartilhados entre "Novo projeto" e "Editar projeto"
// Todo projeto é da IMAGINE; "Cliente / marca" só diz para quem (ou para qual marca) ele é.
// ------------------------------------------------------------
export const KIND_CHIPS = [['cliente', 'Cliente', 'building'], ['ecossistema', 'Ecossistema (inclui interno)', 'sparkle']];
export const trackChips = () => [...MAIN_SERVICES.map(s => [s.key, s.short, TRACK_ICONS[s.key]]),
  ...Object.entries(TRACKS).filter(([k]) => !MAIN_SERVICES.some(s => s.key === k)).map(([k, l]) => [k, l, TRACK_ICONS[k]])];
const otherAccounts = () => store.all('accounts').filter(a => a.kind !== 'imagine').sort((a, b) => a.name.localeCompare(b.name));

// Liga o nome digitado a uma conta existente (mantém Contas e CRM conectados)
export function resolveClient(v, fallbackAccount = null) {
  const name = (v.client_name || '').trim();
  const match = name && otherAccounts().find(a => a.name.toLowerCase() === name.toLowerCase());
  return {
    client_name: name,
    kind: v.kind || match?.kind || 'cliente',
    account_id: match?.id || fallbackAccount || imagineAccount()?.id || null,
  };
}

// Objetivos prontos do serviço escolhido, logo acima do campo de objetivo
export function wireProjectForm(root) {
  const form = root.querySelector('form');
  const obj = form.elements.objective;
  if (obj) {
    const box = document.createElement('div');
    box.className = 'obj-presets';
    obj.before(box);
    const paint = () => {
      const track = form.querySelector('input[name=track]:checked')?.value || 'branding';
      box.innerHTML = (OBJECTIVE_PRESETS[track] || []).map(([lvl, text]) =>
        `<button type="button" class="obj-preset ${obj.value === text ? 'on' : ''}" data-text="${esc(text)}"><small>${esc(lvl)}</small>${esc(text)}</button>`).join('');
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('.obj-preset');
      if (!b) return;
      obj.value = b.dataset.text; paint();
    });
    obj.addEventListener('input', paint);
    form.querySelectorAll('input[name=track]').forEach(r => r.addEventListener('change', paint));
    paint();
  }
  // Ao escolher uma conta conhecida, o tipo acompanha
  const cn = form.elements.client_name;
  cn?.addEventListener('change', () => {
    const a = otherAccounts().find(x => x.name.toLowerCase() === cn.value.trim().toLowerCase());
    const r = a && form.querySelector(`input[name=kind][value="${a.kind}"]`);
    if (r) r.checked = true;
  });
}

const peopleOptions = (exclude = []) => store.all('profiles')
  .filter(u => u.active !== false && !exclude.includes(u.id))
  .map(u => [u.id, u.name, avatar(u, 20)]);

// Reutilizado em Contas e CRM
export function newProjectModal(prefill = {}) {
  const pre = account(prefill.account_id);
  const preClient = pre && pre.kind !== 'imagine' ? pre.name : '';
  modal({
    title: 'Novo projeto',
    wide: true,
    body: `<p class="muted modal-lead">O projeto nasce com as 9 etapas do processo IMAGINE e o checklist do serviço escolhido. Dá pra editar tudo depois.</p>`,
    fields: [
      { name: 'name', label: 'Nome do projeto', required: true, value: prefill.name, placeholder: 'Ex.: GALD', full: true },
      { name: 'client_name', label: 'Cliente / marca', value: preClient, placeholder: 'Ex.: Dona Frida, Elementarios…', list: otherAccounts().map(a => a.name),
        help: 'Opcional. Se for uma conta cadastrada, o projeto fica ligado a ela.' },
      { name: 'kind', label: 'Tipo', type: 'chips', value: pre?.kind === 'imagine' ? 'ecossistema' : pre?.kind || 'cliente', options: KIND_CHIPS },
      { name: 'track', label: 'Serviço', type: 'chips', options: trackChips(), value: prefill.track || 'branding', full: true,
        help: 'Define o checklist de cada etapa.' },
      { name: 'objective', label: 'Objetivo principal', type: 'textarea', rows: 2, value: prefill.objective,
        placeholder: 'Escolha um dos objetivos acima ou escreva o seu, em uma frase.' },
      { name: 'start_date', label: 'Início', type: 'date', value: today() },
      { name: 'due_date', label: 'Prazo de entrega', type: 'date' },
      ...(seesMoney() ? [
        { name: 'value', label: 'Valor do projeto (R$)', type: 'money', value: prefill.value },
        { name: 'split_revenue', label: 'Financeiro', type: 'checkbox', checkLabel: 'Prever 50% na entrada + 50% na entrega', value: true,
          help: 'As parcelas ficam "a receber", como no contrato. Só entram no caixa quando você marcar como recebido.' },
      ] : []),
      { name: 'cover_url', label: 'Foto de capa', type: 'image', crop: 1.6, help: 'Opcional. Depois de escolher, arraste e use o zoom para enquadrar.' },
      { name: 'cover_color', label: 'Cor do projeto', type: 'color', value: pre?.brand?.colors?.[0]?.hex || '#1D5CF0' },
      { name: 'members', label: 'Integrantes', type: 'multi', options: peopleOptions([me().id]), help: 'Você entra como líder do projeto.' },
    ],
    submit: 'Criar projeto',
    onOpen: wireProjectForm,
    async onSubmit(v) {
      const p = await createProject({ ...v, ...resolveClient(v, prefill.account_id), alliances: prefill.alliances || [] });
      location.hash = `#/projetos/${p.id}`;
    },
  });
}

export { peopleOptions };

