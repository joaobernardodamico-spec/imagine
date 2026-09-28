// Pós-venda / relacionamento: carteira de clientes em kanban.
// Manutenção, relacionamento e clientes quentes disponíveis para um novo projeto.
import { store } from '../store.js';
import { CARE_STAGES, CARE_COLD_DAYS } from '../config.js';
import { me, profile, account } from '../ops.js';
import { esc, icon, avatar, money, relDays, modal, toast, today, thisMonth, inMonth } from '../util.js';
import { pageHead } from './components.js';
import { hbars, kpi, panel, dashboard } from '../charts.js';

const state = { dash: true, q: '' };

const daysSince = d => d ? Math.floor((Date.now() - new Date(String(d).slice(0, 10) + 'T12:00')) / 864e5) : null;
const accLogo = (a, size = 32) => {
  const url = a?.brand?.logo_url;
  return url ? `<span class="llogo" style="--s:${size}px;background-image:url('${esc(url)}')"></span>`
    : `<span class="llogo llogo-mono" style="--s:${size}px">${esc((a?.name || '?').charAt(0).toUpperCase())}</span>`;
};

export default {
  title: () => 'Pós-venda',

  render() {
    const rows = store.all('aftersales');
    const inCart = new Set(rows.map(r => r.account_id));
    const missing = store.where('accounts', a => a.kind === 'cliente' && !inCart.has(a.id)).length;
    return `<div class="page page-wide">
      ${pageHead('Pós-venda', 'A carteira de clientes depois da entrega: manutenção, relacionamento e quem está quente para o próximo projeto.',
        `${missing ? `<button class="btn btn-ghost" data-act="importAll">${icon('users')} Trazer ${missing} cliente${missing > 1 ? 's' : ''}</button>` : ''}
         <button class="btn btn-primary" data-act="add">${icon('plus')} Adicionar à carteira</button>`)}

      ${careDashboard(rows)}

      <div class="toolbar"><span></span>
        <label class="search">${icon('search', 16)}<input type="search" placeholder="Buscar cliente" value="${esc(state.q)}" data-input="search"></label>
      </div>

      <div class="kanban kanban-leads kanban-care" id="care">
        ${CARE_STAGES.map((s, i) => {
          const col = rows.filter(r => r.stage === s.key).sort((a, b) => (daysSince(b.last_contact) ?? 999) - (daysSince(a.last_contact) ?? 999));
          const total = col.reduce((sum, r) => sum + Number(r.value || 0), 0);
          return `<section class="kcol kcol-${s.key}" data-stage="${s.key}" style="--step:${i}">
            <header><div class="kcol-title"><strong>${esc(s.name)}</strong><span class="count">${col.length}</span><small>${money(total)}</small></div><p>${esc(s.desc)}</p></header>
            <div class="kcol-body">${col.map(card).join('') || '<div class="kcol-empty">Solte um cliente aqui</div>'}</div>
          </section>`;
        }).join('')}
      </div>
    </div>`;
  },

  after(root) {
    if (state.q) filter(root, state.q);
    const board = root.querySelector('#care');
    if (!board) return;
    board.querySelectorAll('.lcard').forEach(c => {
      c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
    });
    board.querySelectorAll('.kcol').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain');
        if (store.find('aftersales', id)) await store.update('aftersales', id, { stage: col.dataset.stage });
      });
    });
  },

  actions: {
    toggleDash() { state.dash = !state.dash; store.emit({}); },
    search(el) { state.q = el.value; filter(document.getElementById('view'), el.value); },
    add() { careModal(); },
    open(el) { careModal(store.find('aftersales', el.dataset.id)); },
    async quickMove(el, e) { e.stopPropagation(); await store.update('aftersales', el.dataset.id, { stage: el.value }); },
    async contact(el, e) {
      e.stopPropagation();
      const r = store.find('aftersales', el.dataset.id);
      const what = prompt('Como foi o contato? (opcional)');
      if (what === null) return;
      const line = `${today()} · ${what || 'contato feito'}`;
      await store.update('aftersales', r.id, {
        last_contact: today(), notes: [line, r.notes].filter(Boolean).join('\n'),
        stage: r.stage === 'adormecido' ? 'relacionamento' : r.stage,
      });
      toast('Contato registrado', { kind: 'success' });
    },
    async toLead(el, e) {
      e.stopPropagation();
      const r = store.find('aftersales', el.dataset.id);
      const a = account(r.account_id);
      const lead = await store.insert('leads', {
        name: a?.contact_name || 'Contato', company: a?.name || r.title, email: a?.contact_email || '', phone: a?.contact_phone || '',
        segment: a?.segment || '', instagram: a?.instagram || '', source: 'Relacionamento', stage: 'sql',
        value: r.value || 0, owner_id: r.owner_id || me().id, account_id: r.account_id, logo_url: a?.brand?.logo_url || '',
        notes: `Veio do pós-venda: ${r.title || ''}\n${r.notes || ''}`.trim(), pains: [], bant: {}, briefing: {}, proposal: {},
      });
      await store.update('aftersales', r.id, { lead_id: lead.id, stage: 'relacionamento', last_contact: today() });
      toast('Virou lead em SQL. Monte o mapa de dores e a proposta.', { kind: 'success' });
      location.hash = `#/leads/${lead.id}/dores`;
    },
    async importAll() {
      const inCart = new Set(store.all('aftersales').map(r => r.account_id));
      const accs = store.where('accounts', a => a.kind === 'cliente' && !inCart.has(a.id));
      await store.insertMany('aftersales', accs.map(a => ({
        account_id: a.id, title: 'Relacionamento', stage: 'relacionamento', value: 0, owner_id: me().id,
        last_contact: null, next_action: '', next_date: null, notes: '',
      })));
      toast(`${accs.length} clientes na carteira`, { kind: 'success' });
    },
  },
};

function filter(root, q) {
  const s = q.trim().toLowerCase();
  root.querySelectorAll('.lcard').forEach(el => { el.hidden = !!s && !el.textContent.toLowerCase().includes(s); });
}

function card(r) {
  const a = account(r.account_id);
  const days = daysSince(r.last_contact);
  const cold = days === null || days > CARE_COLD_DAYS;
  const late = r.next_date && r.next_date < today();
  return `<article class="lcard" draggable="true" data-id="${esc(r.id)}" data-act="open">
    <div class="lcard-top">${accLogo(a, 34)}<div class="lcard-id"><strong class="lcard-name">${esc(a?.name || r.title || 'Cliente')}</strong>
      <small class="muted">${esc(r.title || '')}</small></div>${avatar(profile(r.owner_id), 22)}</div>
    ${Number(r.value) ? `<div class="lcard-value">${money(r.value)}<small class="muted"> ${r.stage === 'manutencao' ? '/mês' : 'potencial'}</small></div>` : ''}
    <div class="lcard-next ${cold ? 'late' : ''}">${icon('heart', 14)} ${days === null ? 'Sem contato registrado' : `Último contato ${days === 0 ? 'hoje' : `há ${days}d`}`}</div>
    ${r.next_action ? `<div class="lcard-next ${late ? 'late' : ''}">${icon('calendar', 14)} ${esc(r.next_action)}${r.next_date ? ` · ${relDays(r.next_date)}` : ''}</div>` : ''}
    <div class="row gap-8 wrap">
      <button class="btn btn-ghost btn-sm" data-act="contact" data-id="${esc(r.id)}">${icon('check', 14)} Contato feito</button>
      ${r.stage === 'quente' ? (r.lead_id && store.find('leads', r.lead_id)
        ? `<a class="lcard-link" href="#/leads/${esc(r.lead_id)}">${icon('funnel', 14)} Ver lead</a>`
        : `<button class="btn btn-primary btn-sm" data-act="toLead" data-id="${esc(r.id)}">${icon('funnel', 14)} Virar lead</button>`) : ''}
    </div>
    <select class="mini lcard-move" data-change="quickMove" data-id="${esc(r.id)}" aria-label="Mover para">
      ${CARE_STAGES.map(s => `<option value="${s.key}" ${s.key === r.stage ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
    </select>
  </article>`;
}

function careDashboard(rows) {
  const m = thisMonth();
  const hot = rows.filter(r => r.stage === 'quente');
  const cold = rows.filter(r => { const d = daysSince(r.last_contact); return d === null || d > CARE_COLD_DAYS; });
  const recurring = store.where('revenue', r => r.kind === 'recorrente' && inMonth(r.due_date || r.paid_at, m)).reduce((s, r) => s + Number(r.amount || 0), 0);
  const contacted = rows.filter(r => inMonth(r.last_contact, m)).length;
  const kpis = [
    kpi('Clientes na carteira', rows.length, { sub: `${rows.filter(r => r.stage === 'manutencao').length} em manutenção` }),
    kpi('Oportunidades quentes', hot.length, { sub: money(hot.reduce((s, r) => s + Number(r.value || 0), 0)) + ' em potencial' }),
    kpi(`Sem contato há ${CARE_COLD_DAYS}+ dias`, cold.length, { sub: cold.length ? 'Priorize esses' : 'Carteira em dia' }),
    kpi('Recorrente no mês', money(recurring), { sub: 'lançamentos recorrentes do financeiro' }),
    kpi('Contatos no mês', contacted, { sub: rows.length ? `${Math.round(contacted / rows.length * 100)}% da carteira` : '' }),
  ].join('');
  const byStage = CARE_STAGES.map(s => ({ label: s.name, value: rows.filter(r => r.stage === s.key).length }));
  const coldList = cold.slice(0, 6).map(r => {
    const a = account(r.account_id); const d = daysSince(r.last_contact);
    return { label: a?.name || r.title || 'Cliente', value: d ?? 0, sub: d === null ? 'nunca registrado' : '' };
  }).sort((a, b) => b.value - a.value);
  const cards = [
    panel('Carteira por etapa', hbars(byStage, { fmt: v => `${v}`, ordinal: true })),
    panel('Quem está esfriando', coldList.length ? hbars(coldList, { fmt: v => v ? `${v} dias` : 'sem registro' }) : '<p class="viz-empty">Todo mundo com contato recente.</p>', { hint: 'Dias desde o último contato' }),
  ].join('');
  return dashboard({ open: state.dash, kpis, cards });
}

function careModal(r = {}) {
  const isNew = !r.id;
  const accs = store.where('accounts', a => a.kind === 'cliente').sort((a, b) => a.name.localeCompare(b.name));
  if (!accs.length) return modal({ title: 'Nenhum cliente ainda', body: '<p>A carteira é feita de contas de cliente. Feche uma venda em Leads ou crie uma conta em Contas.</p>' });
  const team = store.all('profiles').filter(p => ['socio', 'comercial'].includes(p.role));
  modal({
    title: isNew ? 'Adicionar à carteira' : account(r.account_id)?.name || 'Cliente',
    fields: [
      { name: 'account_id', label: 'Cliente', type: 'select', required: true, value: r.account_id, options: accs.map(a => [a.id, a.name]) },
      { name: 'title', label: 'O que acompanhamos', value: r.title, placeholder: 'Ex.: Manutenção do site, Pós-rebranding' },
      { name: 'stage', label: 'Etapa', type: 'select', value: r.stage || 'implementacao', options: CARE_STAGES.map(s => [s.key, s.name]) },
      { name: 'value', label: 'Valor (mensal ou potencial)', type: 'money', value: r.value },
      { name: 'owner_id', label: 'Responsável', type: 'select', value: r.owner_id || me().id, options: team.map(u => [u.id, u.name]) },
      { name: 'last_contact', label: 'Último contato', type: 'date', value: r.last_contact },
      { name: 'next_action', label: 'Próximo passo', value: r.next_action, placeholder: 'Ex.: Mandar case / oferecer social media' },
      { name: 'next_date', label: 'Quando', type: 'date', value: r.next_date },
      { name: 'notes', label: 'Histórico e notas', type: 'textarea', rows: 5, value: r.notes },
    ],
    danger: isNew ? null : { label: 'Tirar da carteira', confirm: 'Tirar este cliente da carteira?', onClick: () => store.remove('aftersales', r.id) },
    async onSubmit(v) {
      if (isNew) await store.insert('aftersales', v);
      else await store.update('aftersales', r.id, v);
    },
  });
}
