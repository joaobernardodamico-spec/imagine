// Contas: quem é cliente, o que é ecossistema, o que é a própria IMAGINE.
import { store } from '../store.js';
import { ACCOUNT_KINDS } from '../config.js';
import { role, seesMoney, isSocio, visibleProjects, npsScore } from '../ops.js';
import { esc, icon, modal, money, empty, safeUrl, thisMonth, inMonth } from '../util.js';
import { kpi } from '../charts.js';
import { pageHead, projectCard, kindTag, tabs } from './components.js';
import { brandPanel, brandActions } from './brand.js';
import { filesPanel, fileActions } from './files.js';
import { newProjectModal } from './projects.js';

const ORDER = ['cliente', 'ecossistema', 'imagine'];

export default {
  title: p => (p.id ? store.find('accounts', p.id)?.name : 'Contas') || 'Contas',

  render(params) {
    return params.id ? detail(params) : list();
  },

  actions: {
    ...brandActions,
    ...fileActions,
    newAccount(el) { accountModal({ kind: el.dataset.kind || 'cliente' }); },
    editAccount(el) { accountModal(store.find('accounts', el.dataset.id)); },
    newProject(el) { newProjectModal({ account_id: el.dataset.id }); },
    addNps(el) {
      const a = store.find('accounts', el.dataset.id);
      modal({
        title: `NPS · ${a.name}`,
        body: '<p class="muted modal-lead">De 0 a 10, quanto recomendaria a IMAGINE para um amigo?</p>',
        fields: [
          { name: 'score', label: 'Nota (0–10)', type: 'number', required: true },
          { name: 'comment', label: 'Comentário', type: 'textarea' },
        ],
        async onSubmit(v) { await store.insert('nps', { account_id: a.id, project_id: null, score: Math.max(0, Math.min(10, v.score)), comment: v.comment || '' }); },
      });
    },
  },
};

function list() {
  const canCreate = role() !== 'freela';
  const projects = visibleProjects();
  return `<div class="page">
    ${pageHead('Contas', 'Cada projeto pertence a uma conta. A conta guarda contato, manual de marca e arquivos que valem para todos os projetos dela.',
      canCreate ? `<button class="btn btn-primary" data-act="newAccount">${icon('plus')} Nova conta</button>` : '')}
    ${accountsKpis(projects)}
    ${ORDER.map(k => {
      const accs = store.where('accounts', a => a.kind === k).sort((a, b) => a.name.localeCompare(b.name));
      return `<section class="kind-section">
        <header class="kind-head">
          <span class="tag tag-${k}">${ACCOUNT_KINDS[k].label}</span>
          <p>${esc(ACCOUNT_KINDS[k].desc)}</p>
          ${canCreate && k !== 'imagine' ? `<button class="btn btn-ghost btn-sm" data-act="newAccount" data-kind="${k}">${icon('plus', 16)} ${k === 'cliente' ? 'Cliente' : 'Marca'}</button>` : ''}
        </header>
        ${accs.length ? `<div class="acc-grid">${accs.map(a => {
          const ps = projects.filter(p => p.account_id === a.id);
          const act = ps.filter(p => p.status === 'ativo').length;
          const colors = a.brand?.colors || [];
          return `<a class="acc-card acc-${k}" href="#/contas/${esc(a.id)}">
            <div class="acc-colors">${colors.slice(0, 4).map(c => `<span style="background:${esc(c.hex)}"></span>`).join('') || '<span></span>'}</div>
            <strong>${esc(a.name)}</strong>
            <small class="muted">${esc(a.segment || '')}</small>
            <div class="acc-foot"><span>${ps.length} projeto${ps.length !== 1 ? 's' : ''}${act ? ` · ${act} ativo${act > 1 ? 's' : ''}` : ''}</span>${icon('arrow', 14)}</div>
          </a>`;
        }).join('')}</div>` : empty('Nenhuma conta aqui ainda')}
      </section>`;
    }).join('')}
  </div>`;
}

function accountsKpis(projects) {
  const clients = store.where('accounts', a => a.kind === 'cliente');
  const activeIds = new Set(projects.filter(p => p.status === 'ativo').map(p => p.account_id));
  const m = thisMonth();
  const nps = store.all('nps');
  return `<div class="dash"><div class="dash-kpis">
    ${kpi('Clientes', clients.length, { sub: `${clients.filter(a => inMonth(a.created_at, m)).length} novos no mês` })}
    ${kpi('Com projeto ativo', clients.filter(a => activeIds.has(a.id)).length, { sub: `${clients.filter(a => !activeIds.has(a.id)).length} sem projeto agora` })}
    ${kpi('Marcas do ecossistema', store.where('accounts', a => a.kind === 'ecossistema').length)}
    ${seesMoney() ? kpi('NPS', nps.length ? npsScore(nps) : '—', { sub: `${nps.length} respostas` }) : ''}
  </div></div>`;
}

function detail({ id, tab }) {
  const a = store.find('accounts', id);
  if (!a) return `<div class="page">${empty('Conta não encontrada', '', '<a class="btn btn-primary" href="#/contas">Voltar</a>')}</div>`;
  const projects = visibleProjects().filter(p => p.account_id === a.id);
  const edit = role() !== 'freela';
  const T = [['marca', 'Manual de marca'], ['projetos', 'Projetos', projects.length], ['arquivos', 'Arquivos'], ['contato', 'Contato'],
    ...(seesMoney() && a.kind === 'cliente' ? [['financeiro', 'Financeiro'], ['nps', 'NPS']] : [])];

  let body = '';
  if (tab === 'projetos') {
    body = `${edit ? `<div class="row end mb-16"><button class="btn btn-primary" data-act="newProject" data-id="${esc(a.id)}">${icon('plus')} Novo projeto</button></div>` : ''}
      ${projects.length ? `<div class="pgrid">${projects.map(projectCard).join('')}</div>` : empty('Sem projetos')}`;
  } else if (tab === 'arquivos') {
    body = `<p class="muted mb-16">Arquivos da conta (valem para todos os projetos). Arquivos de um projeto específico ficam dentro do projeto.</p>${filesPanel({ account_id: a.id })}`;
  } else if (tab === 'contato') {
    body = `<section class="card"><dl class="dl">
      ${[['Contato', a.contact_name], ['E-mail', a.contact_email && `<a href="mailto:${esc(a.contact_email)}">${esc(a.contact_email)}</a>`, true],
        ['Telefone', a.contact_phone && `<a href="https://wa.me/55${esc(String(a.contact_phone).replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(a.contact_phone)}</a>`, true],
        ['Site', a.website && `<a href="${esc(safeUrl(a.website))}" target="_blank" rel="noopener">${esc(a.website)}</a>`, true],
        ['Instagram', a.instagram], ['Segmento', a.segment], ['Observações', a.notes]]
        .map(([k, v, raw]) => `<dt>${k}</dt><dd>${v ? (raw ? v : esc(v)) : '<span class="muted">—</span>'}</dd>`).join('')}
    </dl>${edit ? `<button class="btn btn-ghost btn-sm mt-16" data-act="editAccount" data-id="${esc(a.id)}">${icon('edit', 16)} Editar dados</button>` : ''}</section>`;
  } else if (tab === 'financeiro' && seesMoney()) {
    const rows = store.where('revenue', r => r.account_id === a.id);
    const rec = rows.filter(r => r.status === 'recebido').reduce((s, r) => s + Number(r.amount), 0);
    const prev = rows.filter(r => r.status !== 'recebido').reduce((s, r) => s + Number(r.amount), 0);
    const mrr = rows.filter(r => r.kind === 'recorrente').reduce((s, r) => Math.max(s, Number(r.amount)), 0);
    body = `<div class="stats">
      <div class="stat"><div class="stat-label">Recebido (total)</div><div class="stat-value">${money(rec)}</div></div>
      <div class="stat"><div class="stat-label">A receber</div><div class="stat-value">${money(prev)}</div></div>
      <div class="stat"><div class="stat-label">Recorrência</div><div class="stat-value">${mrr ? money(mrr) + '<small>/mês</small>' : '—'}</div></div>
    </div><p class="mt-16"><a class="link" href="#/financeiro">Abrir financeiro ${icon('arrow', 14)}</a></p>`;
  } else if (tab === 'nps' && seesMoney()) {
    const rows = store.where('nps', n => n.account_id === a.id);
    body = `<section class="card"><div class="card-head"><h2>NPS · ${rows.length ? npsScore(rows) : '—'}</h2>
      <button class="btn btn-ghost btn-sm" data-act="addNps" data-id="${esc(a.id)}">${icon('plus', 16)} Registrar resposta</button></div>
      ${rows.length ? `<ul class="nps-list">${rows.map(n => `<li><span class="nps-score nps-${n.score >= 9 ? 'pro' : n.score >= 7 ? 'neu' : 'det'}">${n.score}</span><span>${esc(n.comment || '—')}</span></li>`).join('')}</ul>` : '<p class="muted">Sem respostas ainda.</p>'}
    </section>`;
  } else {
    body = brandPanel(a, { editable: edit });
  }

  return `<div class="page">
    <a href="#/contas" class="back">${icon('back', 16)} Contas</a>
    <header class="acc-head">
      <div>
        ${kindTag(a.kind)}
        <h1>${esc(a.name)}</h1>
        <p class="page-sub">${esc(a.segment || ACCOUNT_KINDS[a.kind].desc)}</p>
      </div>
      ${edit ? `<button class="btn btn-ghost" data-act="editAccount" data-id="${esc(a.id)}">${icon('edit', 16)} Editar conta</button>` : ''}
    </header>
    ${tabs(T, tab, `contas/${a.id}`)}
    <div class="tab-panel">${body}</div>
  </div>`;
}

function accountModal(a = {}) {
  const isNew = !a.id;
  modal({
    title: isNew ? 'Nova conta' : `Editar · ${a.name}`,
    body: isNew ? '<p class="muted modal-lead"><strong>Cliente</strong> paga a IMAGINE. <strong>Ecossistema</strong> é marca própria que vive em paralelo. <strong>IMAGINE</strong> é a operação interna.</p>' : '',
    fields: [
      { name: 'kind', label: 'Tipo', type: 'select', value: a.kind || 'cliente', options: Object.entries(ACCOUNT_KINDS).map(([k, v]) => [k, v.label]) },
      { name: 'name', label: 'Nome', required: true, value: a.name },
      { name: 'segment', label: 'Segmento', value: a.segment, placeholder: 'Ex.: Cafeteria de especialidade' },
      { name: 'contact_name', label: 'Pessoa de contato', value: a.contact_name },
      { name: 'contact_email', label: 'E-mail', type: 'email', value: a.contact_email },
      { name: 'contact_phone', label: 'Telefone / WhatsApp', value: a.contact_phone },
      { name: 'website', label: 'Site', value: a.website },
      { name: 'instagram', label: 'Instagram', value: a.instagram },
      { name: 'notes', label: 'Observações', type: 'textarea', value: a.notes },
    ],
    danger: !isNew && isSocio() ? {
      label: 'Excluir conta',
      confirm: 'Excluir a conta? Projetos ligados a ela ficam sem conta.',
      onClick: async () => { await store.remove('accounts', a.id); location.hash = '#/contas'; },
    } : null,
    async onSubmit(v) {
      if (isNew) {
        const rec = await store.insert('accounts', { ...v, links: [], brand: { colors: [], fonts: [], tone: '', essence: '', dos: '', donts: '', logo_url: '', manual_url: '' } });
        location.hash = `#/contas/${rec.id}`;
      } else await store.update('accounts', a.id, v);
    },
  });
}
