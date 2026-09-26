// Metas: tudo calculado a partir do que acontece no Hub. Ninguém digita "realizado".
import { store } from '../store.js';
import { GOAL_METRICS, STAGES } from '../config.js';
import { isSocio, metricActual, npsScore, profile, account } from '../ops.js';
import { esc, icon, money, num, pct, modal, thisMonth, inMonth, progressBar, avatar, date, empty } from '../util.js';
import { pageHead } from './components.js';

const state = { month: thisMonth() };
const shift = (m, k) => { const d = new Date(m + '-15'); d.setMonth(d.getMonth() + k); return d.toISOString().slice(0, 7); };
const PERSONAL = ['vendas', 'leads', 'tarefas', 'etapas'];

export default {
  title: () => 'Metas',

  render() {
    const m = state.month;
    const goals = store.where('goals', g => g.period === m && !g.user_id);
    const pace = paceOf(m);
    const doneStages = store.where('stages', s => s.status === 'concluida' && inMonth(s.done_at, m))
      .sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
    const npsRows = store.where('nps', n => inMonth(n.created_at, m));

    return `<div class="page">
      ${pageHead('Metas', 'O realizado é calculado sozinho a partir de vendas, recebimentos, etapas e tarefas.',
        isSocio() ? `<button class="btn btn-primary" data-act="editGoals">${icon('target')} Definir metas do mês</button>` : '')}

      <div class="month-nav">
        <button class="icon-btn" data-act="month" data-k="-1" aria-label="Mês anterior">${icon('back')}</button>
        <strong>${esc(new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}</strong>
        <button class="icon-btn" data-act="month" data-k="1" aria-label="Próximo mês">${icon('arrow')}</button>
        ${m === thisMonth() ? `<span class="muted">${Math.round(pace * 100)}% do mês já passou</span>` : ''}
      </div>

      ${goals.length ? `<div class="goal-grid">${goals.map(g => goalCard(g, m, pace)).join('')}</div>`
        : empty('Sem metas para este mês', isSocio() ? 'Defina as metas e o Hub acompanha sozinho.' : 'Peça para um sócio definir.')}

      <div class="grid-2 mt-24">
        <section class="card">
          <div class="card-head"><h2>Etapas concluídas no mês</h2><span class="count-big">${doneStages.length}</span></div>
          <p class="muted">Cada etapa fechada é uma entrega. Nenhuma passa despercebida.</p>
          ${doneStages.length ? `<ul class="wins">${doneStages.slice(0, 14).map(s => {
            const p = store.find('projects', s.project_id);
            const def = STAGES.find(x => x.key === s.key);
            const u = profile(s.done_by);
            return p ? `<li><span class="win-n">${def.n}</span><div><strong>${esc(def.name)}</strong><a href="#/projetos/${esc(p.id)}">${esc(p.name)}</a></div>${avatar(u, 24)}<small class="muted">${date(s.done_at)}</small></li>` : '';
          }).join('')}</ul>` : '<p class="muted">Nenhuma ainda neste mês.</p>'}
        </section>

        <section class="card">
          <div class="card-head"><h2>NPS</h2><span class="count-big">${npsRows.length ? npsScore(npsRows) : '—'}</span></div>
          <p class="muted">Promotores (9–10) menos detratores (0–6). ${npsRows.length} resposta${npsRows.length !== 1 ? 's' : ''} no mês · histórico geral ${store.all('nps').length ? npsScore(store.all('nps')) : '—'}.</p>
          ${npsRows.length ? `<ul class="nps-list">${npsRows.map(n => `<li><span class="nps-score nps-${n.score >= 9 ? 'pro' : n.score >= 7 ? 'neu' : 'det'}">${n.score}</span><span><strong>${esc(account(n.account_id)?.name || '')}</strong> ${esc(n.comment || '')}</span></li>`).join('')}</ul>` : ''}
          <p class="fine">Registre respostas na aba NPS de cada cliente. Formulário público de NPS entra na próxima fase.</p>
        </section>
      </div>

      <section class="card mt-24">
        <div class="card-head"><h2>Metas individuais</h2>${isSocio() ? `<button class="btn btn-ghost btn-sm" data-act="editPersonal">${icon('edit', 16)} Definir</button>` : ''}</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Pessoa</th>${PERSONAL.map(k => `<th>${esc(GOAL_METRICS[k].label)}</th>`).join('')}</tr></thead>
          <tbody>${store.all('profiles').filter(p => p.active !== false).map(u => `<tr>
            <td><span class="person">${avatar(u, 26)}<span>${esc(u.name)}</span></span></td>
            ${PERSONAL.map(k => {
              const g = store.all('goals').find(x => x.period === m && x.user_id === u.id && x.metric === k);
              const act = metricActual(k, m, u.id);
              const fmt = GOAL_METRICS[k].money ? money : num;
              return `<td>${fmt(act)}${g ? ` <small class="muted">/ ${fmt(g.target)}</small>${progressBar(act, g.target, 'thin')}` : ''}</td>`;
            }).join('')}
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
    </div>`;
  },

  actions: {
    month(el) { state.month = shift(state.month, Number(el.dataset.k)); store.emit({}); },
    editGoals() {
      const m = state.month;
      const cur = k => store.all('goals').find(g => g.period === m && !g.user_id && g.metric === k)?.target;
      modal({
        title: `Metas · ${new Date(m + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        body: '<p class="muted modal-lead">Deixe em branco o que não quer acompanhar.</p>',
        fields: Object.entries(GOAL_METRICS).map(([k, v]) => ({ name: k, label: v.label + (v.money ? ' (R$)' : ''), type: 'number', value: cur(k) })),
        async onSubmit(v) { await saveGoals(m, null, v); },
      });
    },
    editPersonal() {
      const m = state.month;
      const people = store.all('profiles').filter(p => p.active !== false);
      modal({
        title: 'Metas individuais',
        fields: [
          { name: 'user_id', label: 'Pessoa', type: 'select', options: people.map(p => [p.id, p.name]) },
          ...PERSONAL.map(k => ({ name: k, label: GOAL_METRICS[k].label, type: 'number' })),
        ],
        async onSubmit(v) { const { user_id, ...rest } = v; await saveGoals(m, user_id, rest); },
      });
    },
  },
};

function paceOf(m) {
  if (m !== thisMonth()) return m < thisMonth() ? 1 : 0;
  const d = new Date();
  return d.getDate() / new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function goalCard(g, m, pace) {
  const meta = GOAL_METRICS[g.metric] || { label: g.metric };
  const act = metricActual(g.metric, m);
  const fmt = meta.money ? money : num;
  const p = pct(act, g.target);
  const expected = g.target * pace;
  const status = p >= 100 ? 'hit' : act >= expected ? 'on' : 'off';
  const label = { hit: 'Batida', on: 'No ritmo', off: 'Abaixo do ritmo' }[status];
  return `<div class="goal goal-${status}">
    <div class="row between"><span class="goal-label">${esc(meta.label)}</span><span class="goal-status">${label}</span></div>
    <div class="goal-value">${fmt(act)}</div>
    <div class="muted">de ${fmt(g.target)} · ${p}%</div>
    <div class="goal-bar">${progressBar(act, g.target)}<i style="left:${Math.min(100, pace * 100)}%" title="Onde deveria estar hoje"></i></div>
  </div>`;
}

async function saveGoals(period, user_id, values) {
  for (const [metric, target] of Object.entries(values)) {
    const existing = store.all('goals').find(g => g.period === period && (g.user_id || null) === (user_id || null) && g.metric === metric);
    if (target == null || target === '') { if (existing) await store.remove('goals', existing.id); continue; }
    if (existing) await store.update('goals', existing.id, { target });
    else await store.insert('goals', { period, user_id, metric, target });
  }
}
