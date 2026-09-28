// Alianças: parceiros multitarefa por trás dos projetos (ex.: Doma Marcas, registro de marca).
// Entram no mapa de dores do lead, nas entregas da proposta e nos projetos.
import { store } from '../store.js';
import { SERVICES, ALLIANCE_MODELS, LEAD_WON, LEAD_LOST } from '../config.js';
import { can, visibleProjects } from '../ops.js';
import { esc, icon, modal, money, empty } from '../util.js';
import { pageHead } from './components.js';
import { hbars, kpi, panel, dashboard } from '../charts.js';
import { igUrl, webUrl, leadName } from './leadkit.js';

const state = { dash: true };

// Onde cada aliança está sendo usada
export function allianceUsage(id) {
  const leads = store.where('leads', l => l.stage !== LEAD_LOST &&
    [...(l.pains || []), ...(l.proposal?.entregas || [])].some(x => x.alliance_id === id));
  const projects = visibleProjects().filter(p => (p.alliances || []).includes(id));
  const value = store.all('leads').flatMap(l => l.proposal?.entregas || []).filter(e => e.alliance_id === id).reduce((s, e) => s + Number(e.valor || 0), 0);
  return { leads, projects, value };
}

export default {
  title: () => 'Alianças',

  render() {
    const list = store.all('alliances').slice().sort((a, b) => (b.active !== false) - (a.active !== false) || a.name.localeCompare(b.name));
    const edit = can('leads');
    return `<div class="page">
      ${pageHead('Alianças', 'Parceiros que entram nos nossos projetos. Quando o cliente precisa, a gente aciona a aliança, e ela aparece na proposta.',
        edit ? `<button class="btn btn-primary" data-act="add">${icon('plus')} Nova aliança</button>` : '')}

      ${allyDashboard(list)}

      ${list.length ? `<div class="ally-grid">${list.map(a => allyCard(a, edit)).join('')}</div>`
        : empty('Nenhuma aliança ainda', 'Cadastre parceiros como registro de marca, fotografia, tráfego pago, impressão.', edit ? `<button class="btn btn-primary" data-act="add">${icon('plus')} Nova aliança</button>` : '')}
    </div>`;
  },

  actions: {
    toggleDash() { state.dash = !state.dash; store.emit({}); },
    add() { allyModal(); },
    edit(el) { allyModal(store.find('alliances', el.dataset.id)); },
  },
};

function logo(a, size = 48) {
  return a.logo_url ? `<span class="llogo" style="--s:${size}px;background-image:url('${esc(a.logo_url)}')"></span>`
    : `<span class="llogo llogo-mono llogo-ally" style="--s:${size}px">${icon('handshake', Math.round(size / 2))}</span>`;
}

function allyCard(a, edit) {
  const u = allianceUsage(a.id);
  return `<article class="ally-card ${a.active === false ? 'is-off' : ''}">
    <header>${logo(a)}<div><h3>${esc(a.name)}</h3><span class="tag">${esc(SERVICES[a.service]?.short || a.area || 'Parceiro')}</span>${a.active === false ? ' <span class="tag">Pausada</span>' : ''}</div>
      ${edit ? `<button class="icon-btn" data-act="edit" data-id="${esc(a.id)}" title="Editar">${icon('edit', 16)}</button>` : ''}</header>
    ${a.area ? `<p class="ally-area">${esc(a.area)}</p>` : ''}
    <dl class="dl dl-tight">
      ${a.model ? `<dt>Modelo</dt><dd>${esc(ALLIANCE_MODELS[a.model] || a.model)}</dd>` : ''}
      ${a.commission ? `<dt>Comissão</dt><dd>${esc(a.commission)}</dd>` : ''}
      ${a.contact_name ? `<dt>Contato</dt><dd>${esc(a.contact_name)}${a.contact_role ? ` · ${esc(a.contact_role)}` : ''}</dd>` : ''}
    </dl>
    ${a.how ? `<details class="ally-how"><summary>Como acionar</summary><p class="pre">${esc(a.how)}</p></details>` : ''}
    <div class="ally-use">
      <span>${icon('funnel', 14)} ${u.leads.length} lead${u.leads.length !== 1 ? 's' : ''}</span>
      <span>${icon('folder', 14)} ${u.projects.length} projeto${u.projects.length !== 1 ? 's' : ''}</span>
      ${u.value ? `<span>${money(u.value)} em propostas</span>` : ''}
    </div>
    ${u.leads.length ? `<div class="ally-links">${u.leads.slice(0, 4).map(l => `<a href="#/leads/${esc(l.id)}">${esc(leadName(l))}</a>`).join('')}</div>` : ''}
    <footer class="ally-contact">
      ${a.phone ? `<a class="lsoc" href="https://wa.me/55${esc(String(a.phone).replace(/\D/g, ''))}" target="_blank" rel="noopener" title="WhatsApp">${icon('bolt', 15)}</a>` : ''}
      ${a.email ? `<a class="lsoc" href="mailto:${esc(a.email)}" title="E-mail">${icon('note', 15)}</a>` : ''}
      ${a.website ? `<a class="lsoc" href="${esc(webUrl(a.website))}" target="_blank" rel="noopener" title="Site">${icon('globe', 15)}</a>` : ''}
      ${a.instagram ? `<a class="lsoc" href="${esc(igUrl(a.instagram))}" target="_blank" rel="noopener" title="Instagram">${icon('instagram', 15)}</a>` : ''}
    </footer>
  </article>`;
}

function allyDashboard(list) {
  const active = list.filter(a => a.active !== false);
  const usage = list.map(a => ({ a, ...allianceUsage(a.id) }));
  const projects = new Set(usage.flatMap(u => u.projects.map(p => p.id)));
  const wonWith = store.where('leads', l => l.stage === LEAD_WON && (l.proposal?.entregas || []).some(e => e.alliance_id)).length;
  const kpis = [
    kpi('Alianças ativas', active.length, { sub: `${new Set(active.map(a => a.service)).size} serviços cobertos` }),
    kpi('Leads com aliança', new Set(usage.flatMap(u => u.leads.map(l => l.id))).size, { sub: 'no mapa de dores ou na proposta' }),
    kpi('Projetos com aliança', projects.size),
    kpi('Valor acionado', money(usage.reduce((s, u) => s + u.value, 0)), { sub: `${wonWith} vendas com aliança` }),
  ].join('');
  const cards = [
    panel('Mais acionadas', hbars(usage.map(u => ({ label: u.a.name, value: u.leads.length + u.projects.length, sub: `${u.leads.length} leads · ${u.projects.length} projetos` })).filter(r => r.value).sort((a, b) => b.value - a.value),
      { fmt: v => `${v}`, empty: 'Nenhuma aliança acionada ainda. Ligue as dores às alianças na ficha do lead.' })),
    panel('Valor em propostas', hbars(usage.map(u => ({ label: u.a.name, value: u.value })).filter(r => r.value).sort((a, b) => b.value - a.value),
      { fmt: money, empty: 'Sem valores nas entregas com aliança ainda.' })),
  ].join('');
  return dashboard({ open: state.dash, kpis, cards });
}

function allyModal(a = {}) {
  const isNew = !a.id;
  modal({
    title: isNew ? 'Nova aliança' : a.name,
    wide: true,
    fields: [
      { section: 'Parceiro' },
      { name: 'logo_url', label: 'Logo', type: 'image', value: a.logo_url || '' },
      { name: 'name', label: 'Nome', required: true, value: a.name, placeholder: 'Ex.: Doma Marcas' },
      { name: 'service', label: 'Serviço principal', type: 'select', value: a.service || 'registro', options: Object.entries(SERVICES).map(([k, s]) => [k, s.label]),
        help: 'Dores com este serviço sugerem esta aliança automaticamente.' },
      { name: 'area', label: 'O que fazem', value: a.area, full: true, placeholder: 'Ex.: Registro de marcas e patentes no INPI' },
      { name: 'model', label: 'Modelo', type: 'select', value: a.model || 'indicacao', options: Object.entries(ALLIANCE_MODELS) },
      { name: 'commission', label: 'Comissão / repasse', value: a.commission, placeholder: 'Ex.: 10% ou R$ 200 por registro' },
      { section: 'Contato' },
      { name: 'contact_name', label: 'Pessoa', value: a.contact_name },
      { name: 'contact_role', label: 'Cargo', value: a.contact_role },
      { name: 'email', label: 'E-mail', type: 'email', value: a.email },
      { name: 'phone', label: 'WhatsApp', value: a.phone },
      { name: 'website', label: 'Site', value: a.website, prefix: 'globe' },
      { name: 'instagram', label: 'Instagram', value: a.instagram, prefix: 'instagram' },
      { section: 'Como acionar', hint: 'Receita de bolo: o passo a passo para qualquer pessoa da equipe acionar a parceria.' },
      { name: 'how', label: 'Passo a passo', type: 'textarea', rows: 5, value: a.how, placeholder: '1. Identificar a dor no lead\n2. Incluir a entrega na proposta\n3. Enviar ao parceiro: …\n4. Acompanhar no projeto' },
      { name: 'notes', label: 'Notas', type: 'textarea', value: a.notes },
      { name: 'active', label: 'Status', type: 'checkbox', checkLabel: 'Aliança ativa', value: a.active !== false },
    ],
    danger: isNew ? null : { label: 'Excluir aliança', confirm: `Excluir ${a.name}? Ela sai das dores e propostas onde aparece.`, onClick: () => store.remove('alliances', a.id) },
    async onSubmit(v) {
      if (isNew) await store.insert('alliances', v);
      else await store.update('alliances', a.id, v);
    },
  });
}
