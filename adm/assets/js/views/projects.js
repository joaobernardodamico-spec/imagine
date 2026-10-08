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

    const clients = byStatusAll.filter(p => projectKind(p) === 'cliente');
    const shown = clients.filter(p => state.service === 'todos' || serviceOf(p) === state.service);
    const svc = MAIN_SERVICES.find(s => s.key === state.service);

    return `<div class="page">
      <header class="page-head proj-top">
        <div>
          <h1>Projetos</h1>
          <p class="page-sub">Tudo o que a IMAGINE está construindo.</p>
        </div>
        <div class="proj-top-right">
          ${projectsDashboard(all)}
          ${canCreate ? `<button class="btn btn-primary" data-act="newProject">${icon('plus')} Novo projeto</button>` : ''}
        </div>
      </header>

      ${ecoMap(byStatusAll)}

      <section class="proj-list">
        <header class="proj-list-head">
          <div>
            <span class="kicker">${svc ? 'Serviço' : 'Clientes'}</span>
            <h2>${svc ? esc(svc.label) : 'Todos os projetos de clientes'} <span class="count">${shown.length}</span></h2>
          </div>
          <div class="row gap-8 wrap">
            ${svc ? `<button class="btn btn-ghost btn-sm" data-act="service" data-service="todos">${icon('x', 14)} Ver todos</button>` : ''}
            <label class="search">${icon('search', 16)}<input type="search" placeholder="Buscar projeto" value="${esc(state.q)}" data-input="search"></label>
            <select data-change="status" aria-label="Status">
              ${[['ativo', 'Em andamento'], ['entregue', 'Entregues'], ['pausado', 'Pausados'], ['todos', 'Todos os status']].map(([v, l]) =>
                `<option value="${v}" ${state.status === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </header>
        ${shown.length ? `<div class="pgrid">${shown.map(projectCard).join('')}</div>` : empty('Nada por aqui', svc ? 'Nenhum projeto deste serviço agora.' : 'Nenhum projeto de cliente neste status.')}
      </section>
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
  return `<div class="proj-kpis">${kpis}</div>`;
}

function ecoMap(projects) {
  const clients = projects.filter(p => projectKind(p) === 'cliente');
  const eco = projects.filter(p => projectKind(p) === 'ecossistema');
  return `<section class="eco-map eco-map-v2" aria-label="Mapa da IMAGINE">
    <div class="eco-core">
      <span class="kicker">Núcleo</span>
      <img src="assets/img/simbolo.png" alt="" class="eco-symbol">
      <strong>IMAGINE Concept</strong>
      <small>Estúdio · processos · marca-mãe</small>
    </div>
    <div class="eco-col eco-col-clients">
      <div class="eco-col-head"><span class="tag tag-cliente">Cliente</span><strong>${clients.length}</strong></div>
      <div class="svc-strip">${MAIN_SERVICES.map(s => {
        const list = clients.filter(p => serviceOf(p) === s.key);
        return `<button type="button" class="svc-card svc-${s.key} ${state.service === s.key ? 'active' : ''}" data-act="service" data-service="${s.key}" aria-pressed="${state.service === s.key}">
          <span class="svc-ic">${icon(TRACK_ICONS[s.key], 20)}</span>
          <span class="svc-txt"><strong>${esc(s.label)}</strong><em>${list.length ? list.slice(0, 2).map(p => esc(p.name)).join(' · ') + (list.length > 2 ? ` +${list.length - 2}` : '') : 'Nenhum projeto agora'}</em></span>
          <b class="svc-n">${list.length}</b>
        </button>`;
      }).join('')}</div>
    </div>
    <div class="eco-col eco-col-eco">
      <div class="eco-col-head"><span class="tag tag-ecossistema">Ecossistema</span><strong>${eco.length}</strong></div>
      ${eco.length ? `<div class="eco-projects">${eco.map(p => {
        const pr = progressOf(p.id);
        return `<a class="eco-proj" href="#/projetos/${esc(p.id)}" style="--cover:${esc(p.cover_color || 'var(--accent)')}">
          <span class="eco-proj-cover" ${p.cover_url ? `style="background-image:url('${esc(p.cover_url)}')"` : ''}>${p.cover_url ? '' : esc(p.name.trim().charAt(0).toUpperCase())}</span>
          <span class="eco-proj-txt"><strong>${esc(p.name)}</strong><small>${pr.currentDef ? `${pr.currentDef.n}. ${esc(pr.currentDef.name)}` : 'Entregue'} · ${pr.pct}%</small></span>
          ${icon('chevR', 16)}
        </a>`;
      }).join('')}</div>` : `<p class="eco-empty">Marcas próprias e projetos internos da IMAGINE aparecem aqui.</p>`}
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

