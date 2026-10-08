// Financeiro simplificado: receita por projeto + recorrente, previsto x recebido.
import { store } from '../store.js';
import { ACCOUNT_KINDS } from '../config.js';
import { me, account, receive, revenueToProject } from '../ops.js';
import { esc, icon, money, date, modal, today, thisMonth, inMonth, empty } from '../util.js';
import { pageHead, statTile } from './components.js';

const state = { month: thisMonth(), status: 'todos', kind: 'todos' };

const monthLabel = m => new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
const shift = (m, k) => { const d = new Date(m + '-15'); d.setMonth(d.getMonth() + k); return d.toISOString().slice(0, 7); };
const monthOf = r => (r.status === 'recebido' ? r.paid_at : r.due_date) || r.due_date;

export default {
  title: () => 'Financeiro',

  render() {
    const all = store.all('revenue');
    const m = state.month;
    const t = today();
    const received = all.filter(r => r.status === 'recebido' && inMonth(r.paid_at, m));
    const expected = all.filter(r => r.status !== 'recebido' && inMonth(r.due_date, m));
    const overdue = all.filter(r => r.status !== 'recebido' && r.due_date && r.due_date < t);
    const openAll = all.filter(r => r.status !== 'recebido');
    const mrr = all.filter(r => r.kind === 'recorrente' && inMonth(r.due_date, m)).reduce((s, r) => s + Number(r.amount), 0);
    const sum = rows => rows.reduce((s, r) => s + Number(r.amount || 0), 0);

    const rows = all
      .filter(r => inMonth(monthOf(r), m))
      .filter(r => state.status === 'todos' || (state.status === 'atrasado' ? r.status !== 'recebido' && r.due_date < t : r.status === state.status))
      .filter(r => state.kind === 'todos' || r.kind === state.kind)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

    return `<div class="page">
      ${pageHead('Financeiro', 'Receita por projeto e recorrente. O que entrou, o que vai entrar e o que atrasou.',
        `<button class="btn btn-primary" data-act="newRevenue">${icon('plus')} Lançar receita</button>`)}

      <div class="month-nav">
        <button class="icon-btn" data-act="month" data-k="-1" aria-label="Mês anterior">${icon('back')}</button>
        <strong>${esc(new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}</strong>
        <button class="icon-btn" data-act="month" data-k="1" aria-label="Próximo mês">${icon('arrow')}</button>
        ${m !== thisMonth() ? `<button class="btn btn-ghost btn-sm" data-act="month" data-k="0">Hoje</button>` : ''}
      </div>

      <div class="stats">
        ${statTile('Recebido no mês', money(sum(received)), `${received.length} lançamentos`)}
        ${statTile('Previsto no mês', money(sum(expected)), `${expected.length} a receber`)}
        ${statTile('Recorrente no mês', money(mrr), 'fees e manutenções')}
        ${statTile('Em atraso', `<span class="${overdue.length ? 'late' : ''}">${money(sum(overdue))}</span>`, `${overdue.length} parcelas · total em aberto ${money(sum(openAll))}`)}
      </div>

      <section class="card">
        <div class="card-head"><h2>Últimos meses e próximos</h2>
          <div class="legend"><span class="lg lg-rec"></span>Recebido <span class="lg lg-prev"></span>Previsto</div></div>
        ${chart(all)}
      </section>

      <section class="card">
        <div class="card-head"><h2>Lançamentos do mês</h2>
          <div class="row gap-8">
            <select data-change="status" aria-label="Status">${[['todos', 'Todos'], ['recebido', 'Recebidos'], ['previsto', 'Previstos'], ['atrasado', 'Atrasados']].map(([v, l]) => `<option value="${v}" ${state.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <select data-change="kind" aria-label="Tipo">${[['todos', 'Todos os tipos'], ['projeto', 'Projeto'], ['recorrente', 'Recorrente']].map(([v, l]) => `<option value="${v}" ${state.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>
        </div>
        ${rows.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Descrição</th><th>Conta</th><th>Tipo</th><th>Vencimento</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map(r => {
            const a = account(r.account_id);
            const late = r.status !== 'recebido' && r.due_date && r.due_date < t;
            return `<tr>
              <td>${r.project_id ? `<a href="#/projetos/${esc(r.project_id)}/financeiro">${esc(r.description)}</a>` : esc(r.description)}</td>
              <td>${a ? `<a href="#/contas/${esc(a.id)}">${esc(a.name)}</a>` : '—'}</td>
              <td><span class="tag">${r.kind === 'recorrente' ? 'Recorrente' : 'Projeto'}</span></td>
              <td class="${late ? 'late' : ''}">${date(r.due_date)}</td>
              <td class="num"><strong>${money(r.amount)}</strong></td>
              <td><span class="tag tag-rev-${late ? 'atrasado' : esc(r.status)}">${r.status === 'recebido' ? `Recebido ${date(r.paid_at)}` : late ? 'Atrasado' : 'Previsto'}</span></td>
              <td class="row gap-4 end">
                ${r.status !== 'recebido' ? `<button class="btn btn-ghost btn-sm" data-act="receive" data-id="${esc(r.id)}">${icon('check', 14)} Recebido</button>` : ''}
                <button class="icon-btn" data-act="editRevenue" data-id="${esc(r.id)}" title="Editar">${icon('edit', 16)}</button>
              </td></tr>`;
          }).join('')}</tbody></table></div>` : empty('Nada lançado neste filtro')}
      </section>
    </div>`;
  },

  actions: {
    month(el) { const k = Number(el.dataset.k); state.month = k === 0 ? thisMonth() : shift(state.month, k); store.emit({}); },
    status(el) { state.status = el.value; store.emit({}); },
    kind(el) { state.kind = el.value; store.emit({}); },
    receive(el) { receive(store.find('revenue', el.dataset.id)); },
    newRevenue() { revenueModal(); },
    editRevenue(el) { revenueModal(store.find('revenue', el.dataset.id)); },
  },
};

function chart(all) {
  const months = Array.from({ length: 9 }, (_, i) => shift(thisMonth(), i - 5));
  const data = months.map(m => ({
    m,
    rec: all.filter(r => r.status === 'recebido' && inMonth(r.paid_at, m)).reduce((s, r) => s + Number(r.amount), 0),
    prev: all.filter(r => r.status !== 'recebido' && inMonth(r.due_date, m)).reduce((s, r) => s + Number(r.amount), 0),
  }));
  const max = Math.max(1, ...data.map(d => d.rec + d.prev));
  return `<div class="bars">${data.map(d => `
    <div class="bar-col ${d.m === thisMonth() ? 'now' : ''} ${d.m === state.month ? 'sel' : ''}" title="${monthLabel(d.m)} · recebido ${money(d.rec)} · previsto ${money(d.prev)}">
      <div class="bar-stack">
        <span class="b-prev" style="height:${(d.prev / max) * 100}%"></span>
        <span class="b-rec" style="height:${(d.rec / max) * 100}%"></span>
      </div>
      <small>${esc(monthLabel(d.m))}</small>
      <b>${d.rec + d.prev ? money(d.rec + d.prev).replace('R$', '').trim() : ''}</b>
    </div>`).join('')}</div>`;
}

function revenueModal(r = {}) {
  const isNew = !r.id;
  const accounts = store.all('accounts');
  const projects = store.all('projects');
  modal({
    title: isNew ? 'Lançar receita' : 'Editar lançamento',
    fields: [
      { name: 'description', label: 'Descrição', required: true, value: r.description, full: true, placeholder: 'Ex.: Site · entrada 50%' },
      { name: 'account_id', label: 'Conta', type: 'select', value: r.account_id, options: [['', '—'], ...accounts.map(a => [a.id, `${ACCOUNT_KINDS[a.kind].label} · ${a.name}`])] },
      { name: 'project_id', label: 'Projeto', type: 'select', value: r.project_id, options: [['', 'Sem projeto (recorrente/avulso)'], ...projects.map(p => [p.id, p.name])] },
      { name: 'amount', label: 'Valor (R$)', type: 'money', required: true, value: r.amount },
      { name: 'kind', label: 'Tipo', type: 'select', value: r.kind || 'projeto', options: [['projeto', 'Projeto'], ['recorrente', 'Recorrente (mensal)']] },
      { name: 'due_date', label: 'Vencimento', type: 'date', required: true, value: r.due_date || today() },
      { name: 'status', label: 'Status', type: 'select', value: r.status || 'previsto', options: [['previsto', 'Previsto'], ['recebido', 'Recebido']] },
      ...(isNew ? [{ name: 'months', label: 'Repetir por (meses)', type: 'number', value: 1, help: 'Para recorrente: gera um lançamento por mês.' }] : []),
    ],
    danger: isNew ? null : { label: 'Excluir', confirm: 'Excluir este lançamento?', onClick: () => store.remove('revenue', r.id) },
    // projeto ligado ao lançamento acompanha o valor
    async onSubmit(v) {
      const { months = 1, ...rest } = v;
      if (!rest.account_id && rest.project_id) rest.account_id = store.find('projects', rest.project_id)?.account_id || null;
      if (rest.status === 'recebido') rest.paid_at = r.paid_at || today();
      else rest.paid_at = null;
      if (!isNew) { await store.update('revenue', r.id, rest); return revenueToProject(rest.project_id); }
      const n = Math.max(1, Math.min(36, Number(months) || 1));
      await store.insertMany('revenue', Array.from({ length: n }, (_, i) => {
        const d = new Date(rest.due_date + 'T12:00'); d.setMonth(d.getMonth() + i);
        return { ...rest, due_date: d.toISOString().slice(0, 10), status: i === 0 ? rest.status : 'previsto', paid_at: i === 0 ? rest.paid_at : null, owner_id: me().id };
      }));
      await revenueToProject(rest.project_id);
    },
  });
}
