// Projetos — separados de forma explícita em Clientes, Ecossistema e IMAGINE.
import { store } from '../store.js';
import { ACCOUNT_KINDS, TRACKS } from '../config.js';
import { visibleProjects, projectKind, createProject, role, seesMoney, account } from '../ops.js';
import { esc, icon, modal, empty, today } from '../util.js';
import { projectCard, pageHead } from './components.js';

const state = { kind: 'todos', status: 'ativo', q: '' };

const KIND_ORDER = ['cliente', 'ecossistema', 'imagine'];

export default {
  title: () => 'Projetos',

  render(params) {
    if (params.sub && (KIND_ORDER.includes(params.sub) || params.sub === 'todos')) state.kind = params.sub;
    const all = visibleProjects();
    const byStatus = all.filter(p => state.status === 'todos' || p.status === state.status);
    const count = k => byStatus.filter(p => projectKind(p) === k).length;
    const canCreate = role() !== 'freela';

    return `<div class="page">
      ${pageHead('Projetos', 'Tudo o que a IMAGINE está construindo, separado pelo que cada coisa é.',
        canCreate ? `<button class="btn btn-primary" data-act="newProject">${icon('plus')} Novo projeto</button>` : '')}

      ${ecoMap(byStatus)}

      <div class="toolbar">
        <div class="seg">
          ${[['todos', 'Todos', byStatus.length], ...KIND_ORDER.map(k => [k, ACCOUNT_KINDS[k].label, count(k)])].map(([k, l, c]) =>
            `<a href="#/projetos/${k}" class="seg-btn ${state.kind === k ? 'active' : ''}">${esc(l)} <span class="count">${c}</span></a>`).join('')}
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
    status(el) { state.status = el.value; store.emit({}); },
    search(el) { state.q = el.value; filterCards(document.getElementById('view'), el.value); },
  },
};

function ecoMap(projects) {
  const n = k => projects.filter(p => projectKind(p) === k).length;
  const visible = new Set(visibleProjects().map(p => p.account_id));
  const accs = k => store.where('accounts', a => a.kind === k && (role() !== 'freela' || visible.has(a.id)));
  return `<section class="eco-map" aria-label="Mapa do ecossistema">
    <div class="eco-core">
      <span class="kicker">Núcleo</span>
      <img src="assets/img/simbolo.png" alt="" class="eco-symbol">
      <strong>IMAGINE Concept</strong>
      <small>Estúdio · processos · marca-mãe</small>
    </div>
    <div class="eco-branches">
      ${KIND_ORDER.map(k => `
        <a href="#/projetos/${k}" class="eco-branch eco-${k} ${state.kind === k ? 'active' : ''}">
          <div class="eco-branch-head"><span class="tag tag-${k}">${ACCOUNT_KINDS[k].label}</span><strong>${n(k)}</strong></div>
          <p>${esc(ACCOUNT_KINDS[k].desc)}</p>
          <div class="eco-names">${accs(k).slice(0, 6).map(a => `<span>${esc(a.name)}</span>`).join('')}${accs(k).length > 6 ? `<span>+${accs(k).length - 6}</span>` : ''}</div>
        </a>`).join('')}
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

// Reutilizado em Contas e CRM
export function newProjectModal(prefill = {}) {
  const accounts = store.all('accounts').slice().sort((a, b) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name));
  if (!accounts.length) return modal({ title: 'Crie uma conta primeiro', body: '<p>Todo projeto pertence a uma conta (cliente, marca do ecossistema ou IMAGINE).</p>' });
  const team = store.all('profiles').filter(p => p.active !== false);
  modal({
    title: 'Novo projeto',
    body: `<p class="muted modal-lead">O projeto nasce com as 9 etapas do processo IMAGINE e um checklist por trilha. Dá pra editar tudo depois.</p>`,
    fields: [
      { name: 'account_id', label: 'Conta', type: 'select', required: true, value: prefill.account_id,
        options: accounts.map(a => [a.id, `${ACCOUNT_KINDS[a.kind].label} · ${a.name}`]) },
      { name: 'name', label: 'Nome do projeto', required: true, value: prefill.name, placeholder: 'Ex.: Rebranding Café Aurora' },
      { name: 'track', label: 'Trilha', type: 'select', options: Object.entries(TRACKS), value: prefill.track || 'branding',
        help: 'Define o checklist de cada etapa.' },
      { name: 'objective', label: 'Objetivo principal', value: prefill.objective, placeholder: 'Uma frase que define o sucesso', full: true },
      { name: 'start_date', label: 'Início', type: 'date', value: today() },
      { name: 'due_date', label: 'Prazo de entrega', type: 'date' },
      ...(seesMoney() ? [
        { name: 'value', label: 'Valor do projeto (R$)', type: 'money', value: prefill.value },
        { name: 'split_revenue', label: 'Financeiro', type: 'checkbox', checkLabel: 'Lançar 50% entrada + 50% entrega', value: true },
      ] : []),
      { name: 'cover_color', label: 'Cor do projeto', type: 'color', value: account(prefill.account_id)?.brand?.colors?.[0]?.hex || '#12328C' },
      { name: 'cover_url', label: 'Foto de capa', type: 'image', help: 'Opcional. Uma imagem que mostre o projeto.' },
      { name: 'member', label: 'Adicionar pessoa', type: 'select', options: [['', '—'], ...team.map(u => [u.id, u.name])] },
    ],
    submit: 'Criar projeto',
    async onSubmit(v) {
      const p = await createProject({ ...v, members: v.member ? [v.member] : [] });
      location.hash = `#/projetos/${p.id}`;
    },
  });
}

