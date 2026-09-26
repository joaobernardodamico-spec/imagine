// Ranking: quem está vendendo bem, quem está produzindo bem.
import { store } from '../store.js';
import { LEVELS, ROLES } from '../config.js';
import { me } from '../ops.js';
import { leaderboard, levelOf, xpOf, badgesOf, salesOf, deliveriesOf, statsOf } from '../game.js';
import { esc, icon, avatar, money, num, thisMonth } from '../util.js';
import { pageHead, feedItem } from './components.js';

const state = { area: 'geral', period: 'mes' };

export default {
  title: () => 'Ranking',

  render() {
    const month = state.period === 'mes' ? thisMonth() : null;
    const area = state.area === 'geral' ? null : state.area;
    const board = leaderboard({ month, area });
    const top = board.slice(0, 3);
    const u = me();
    const lv = levelOf(xpOf(u.id));
    const badges = badgesOf(u.id);
    const st = statsOf(u.id);
    const myFeed = store.where('xp_events', x => x.user_id === u.id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);

    return `<div class="page">
      ${pageHead('Ranking', 'XP vem de trabalho real: tarefas, etapas, entregas, vendas e recebimentos.')}

      <div class="toolbar">
        <div class="seg">${[['geral', 'Geral'], ['vendas', 'Vendas'], ['producao', 'Produção']].map(([k, l]) =>
          `<button class="seg-btn ${state.area === k ? 'active' : ''}" data-act="area" data-k="${k}">${l}</button>`).join('')}</div>
        <div class="seg">${[['mes', 'Este mês'], ['sempre', 'Desde sempre']].map(([k, l]) =>
          `<button class="seg-btn ${state.period === k ? 'active' : ''}" data-act="period" data-k="${k}">${l}</button>`).join('')}</div>
      </div>

      <section class="podium">
        ${[1, 0, 2].map(i => top[i] ? `<div class="pod pod-${i + 1}">
          ${avatar(top[i].profile, i === 0 ? 64 : 48)}
          <strong>${esc(top[i].profile.name.split(' ')[0])}</strong>
          <span>${num(top[i].xp)} XP</span>
          <div class="pod-block">${i + 1}</div>
        </div>` : '<div class="pod pod-empty"></div>').join('')}
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Classificação</h2></div>
          <ol class="board">${board.map((r, i) => {
            const L = levelOf(r.total);
            return `<li class="${r.profile.id === u.id ? 'me' : ''}">
              <span class="pos">${i + 1}</span>
              ${avatar(r.profile, 32)}
              <div class="board-who"><strong>${esc(r.profile.name)}</strong><small>${esc(ROLES[r.profile.role]?.label)} · Nv ${L.n} ${esc(L.name)}</small></div>
              <div class="board-extra">
                ${state.area !== 'producao' ? `<small>${money(salesOf(r.profile.id))} vendidos</small>` : ''}
                ${state.area !== 'vendas' ? `<small>${deliveriesOf(r.profile.id)} tarefas no mês</small>` : ''}
              </div>
              <b>${num(r.xp)}</b>
            </li>`;
          }).join('')}</ol>
        </section>

        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Seu nível</h2><span class="muted">${num(lv.xp)} XP</span></div>
            <ol class="ladder">${LEVELS.map((L, i) => `<li class="${i + 1 < lv.n ? 'past' : i + 1 === lv.n ? 'cur' : ''}"><span>${i + 1}</span><strong>${esc(L.name)}</strong><small>${num(L.min)} XP</small></li>`).join('')}</ol>
          </section>
          <section class="card">
            <div class="card-head"><h2>Conquistas</h2><span class="muted">${badges.filter(b => b.earned).length}/${badges.length}</span></div>
            <div class="badges">${badges.map(b => `<div class="badge ${b.earned ? 'earned' : ''}" title="${esc(b.desc)}">${icon(b.earned ? 'trophy' : 'star', 22)}<strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></div>`).join('')}</div>
            <p class="fine">${st.tasks} tarefas · ${st.stages} etapas · ${st.delivered} entregas · ${st.wins} vendas · ${st.streak} dias seguidos</p>
          </section>
          <section class="card">
            <div class="card-head"><h2>Seu histórico</h2></div>
            <ul class="feed">${myFeed.map(feedItem).join('')}</ul>
          </section>
        </div>
      </div>
    </div>`;
  },

  actions: {
    area(el) { state.area = el.dataset.k; store.emit({}); },
    period(el) { state.period = el.dataset.k; store.emit({}); },
  },
};
