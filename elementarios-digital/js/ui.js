// Elementarios Arena — interface (Taverna de Cristal).

const $ = s => document.querySelector(s);
const app = $('#app');
const UI = { tab: 'estoque', fTier: 'meu', fRealm: null, fTribe: null, onlyWish: false, targeting: null,
  timer: 0, timerMax: 30, timerOn: true, interval: null, speed: 1, drag: null, phase: 'menu', grim: false };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const realmVar = r => `var(--${r})`;
const pctClass = v => (v >= 0.3 ? 'hi' : v >= 0.1 ? 'mid' : 'lo');
const pctText = v => (v >= 0.995 ? '99%' : v < 0.005 ? '0%' : Math.round(v * 100) + '%');

// ───────────────────────────── ícones (desenhados, sem emoji)
const ICON = {
  fogo: c => `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 1.5c.8 3.6 4.9 5.5 4.9 10.6a4.9 4.9 0 0 1-9.8 0c0-2.6 1.4-3.9 2-6 .9 1.1 1.6 2.3 1.9 3.9.9-2.8 1.3-5.2 1-8.5zM12 22.5c-3.9 0-7-2.8-7-6.6 0-1.5.4-2.7 1-3.8-.1 3.2 2.1 6.4 6 6.4s6.1-3.2 6-6.4c.6 1.1 1 2.3 1 3.8 0 3.8-3.1 6.6-7 6.6z"/></svg>`,
  agua: c => `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 1.8C8.2 7.6 5.2 11 5.2 15.2a6.8 6.8 0 0 0 13.6 0C18.8 11 15.8 7.6 12 1.8zm-3.4 13.5c0 1.9 1.3 3.3 3 3.6.4.1.6.4.5.8-.1.3-.4.5-.8.4-2.4-.4-4.1-2.4-4.1-4.8 0-.4.3-.6.7-.6.4 0 .7.2.7.6z"/></svg>`,
  ar: c => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"><path d="M3 8.5h10.5a3 3 0 1 0-3-3M3 12.5h15.5a3 3 0 1 1-3 3M3 16.5h7"/></svg>`,
  terra: c => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"><path d="M12 2.5l8.5 9.5-8.5 9.5L3.5 12z"/><path d="M12 7l4.2 5L12 17l-4.2-5z" fill="${c}"/></svg>`,
  eter: c => `<svg viewBox="0 0 24 24" fill="${c}"><path d="M12 0l1.6 8.4L20.5 3.5l-4.9 6.9L24 12l-8.4 1.6 4.9 6.9-6.9-4.9L12 24l-1.6-8.4-6.9 4.9 4.9-6.9L0 12l8.4-1.6L3.5 3.5l6.9 4.9z"/><circle cx="12" cy="12" r="3.2" fill="#04100e"/><circle cx="12" cy="12" r="1.5"/></svg>`,
  coin: () => `<svg viewBox="0 0 24 24"><defs><radialGradient id="gc" cx="35%" cy="30%"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#f1c35a"/><stop offset="1" stop-color="#8a5c0c"/></radialGradient></defs><circle cx="12" cy="12" r="10" fill="url(#gc)" stroke="#6b4a0c"/><path d="M12 6.5l1.5 4h4.2l-3.4 2.5 1.3 4.1L12 14.6 8.4 17.1l1.3-4.1L6.3 10.5h4.2z" fill="#a8781c" opacity=".8"/></svg>`,
  heart: () => `<svg viewBox="0 0 24 24"><defs><linearGradient id="hc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb3bd"/><stop offset=".5" stop-color="#ff5468"/><stop offset="1" stop-color="#7a0c1e"/></linearGradient></defs><path d="M12 21.5L3.2 12.4A5.3 5.3 0 0 1 12 5.6a5.3 5.3 0 0 1 8.8 6.8z" fill="url(#hc)" stroke="#3a0610"/><path d="M7 9.5l2.5-1.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/></svg>`,
  vault: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#f1c35a" stroke-width="1.8"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V4h8v2"/><circle cx="12" cy="15" r="2" fill="#f1c35a"/></svg>`,
  book: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/><path d="M12 6l1 2.5 2.5 1-2.5 1L12 13l-1-2.5-2.5-1 2.5-1z" fill="currentColor"/></svg>`,
  grim: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18M7 8h4M7 12h4M7 16h4"/></svg>`,
  sound: on => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`,
  pause: on => (on ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>` : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>`),
  pin: () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 2l7 7-2 1-4 4 .5 5-1.5 1.5-4.5-4.5L4 22l-1-1 5.5-6.5L4 10l1.5-1.5 5 .5 4-4z"/></svg>`,
  reroll: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 11a8 8 0 0 0-14.5-4.5L3 9M4 13a8 8 0 0 0 14.5 4.5L21 15"/><path d="M3 4v5h5M21 20v-5h-5"/></svg>`,
  up: () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 9h-4v5H9v-5H5z"/><path d="M8 18h8l-1 4H9z" opacity=".6"/></svg>`,
  sell: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#f1c35a" stroke-width="1.8"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>`,
  burn: () => `<svg viewBox="0 0 24 24" fill="#ff8a4a"><path d="M12 1.5c.8 3.6 4.9 5.5 4.9 10.6a4.9 4.9 0 0 1-9.8 0c0-2.6 1.4-3.9 2-6 .9 1.1 1.6 2.3 1.9 3.9.9-2.8 1.3-5.2 1-8.5z"/><path d="M5 20h14" stroke="#ff8a4a" stroke-width="2"/></svg>`,
  sigil: () => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="28"/><circle cx="32" cy="32" r="20" stroke-dasharray="3 4"/><path d="M32 6l7 26-7 26-7-26z"/><path d="M6 32l26-7 26 7-26 7z"/><circle cx="32" cy="32" r="4" fill="currentColor"/></svg>`,
  kw: {
    taunt: '<svg viewBox="0 0 24 24" fill="#cfe9e4"><path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff0aa" stroke-width="2.4"><circle cx="12" cy="12" r="8"/></svg>',
    windfury: '<svg viewBox="0 0 24 24" fill="none" stroke="#9fe8ff" stroke-width="2.4" stroke-linecap="round"><path d="M3 9h11a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3"/></svg>',
    reborn: '<svg viewBox="0 0 24 24" fill="none" stroke="#b9ffcf" stroke-width="2.4" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/></svg>',
    poison: '<svg viewBox="0 0 24 24" fill="#9dff7a"><path d="M12 2C8 8 6 11 6 14.5a6 6 0 0 0 12 0C18 11 16 8 12 2z"/></svg>',
    magnetic: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff9ab0" stroke-width="2.6"><path d="M6 3v9a6 6 0 0 0 12 0V3"/></svg>',
  },
};
const RELIC = {
  adaga: () => `<svg viewBox="0 0 64 64"><defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#cfd8dc"/><stop offset="1" stop-color="#ff6a3d"/></linearGradient></defs>
    <path d="M44 6l6 6-24 24-6-6z" fill="url(#rb)" stroke="#3a1a0a"/><path d="M44 6l6 6-14 14" stroke="#fff" stroke-width="1" opacity=".7" fill="none"/>
    <path d="M16 30l18 18-4 4-18-18z" fill="#7a3b12" stroke="#2a1205"/><path d="M14 44l6 6-8 8-6-6z" fill="#3a1a0a" stroke="#ff6a3d"/><circle cx="25" cy="39" r="3" fill="#ff6a3d"/></svg>`,
  anel: () => `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="16" fill="none" stroke="#e8c26a" stroke-width="6"/><ellipse cx="32" cy="40" rx="18" ry="16" fill="none" stroke="#8a6a1c" stroke-width="1"/>
    <path d="M22 22l10-14 10 14-10 8z" fill="#4aa8ff" stroke="#bfe3ff"/><path d="M27 21l5-8 5 8" fill="none" stroke="#fff" opacity=".7"/></svg>`,
  relogio: () => `<svg viewBox="0 0 64 64"><rect x="27" y="2" width="10" height="8" rx="2" fill="#e8c26a"/><circle cx="32" cy="36" r="24" fill="#1b1404" stroke="#e8c26a" stroke-width="4"/>
    <circle cx="32" cy="36" r="19" fill="#0c0a02" stroke="#ffd257" stroke-dasharray="2 6"/>
    <g class="hand-m"><line x1="32" y1="36" x2="32" y2="20" stroke="#ffd257" stroke-width="3" stroke-linecap="round"/></g>
    <g class="hand-h"><line x1="32" y1="36" x2="42" y2="36" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g><circle cx="32" cy="36" r="3" fill="#ffd257"/></svg>`,
  amuleto: c => `<svg viewBox="0 0 64 64"><path d="M12 6 Q32 26 52 6" fill="none" stroke="#8a6a1c" stroke-width="2"/><path d="M32 18l18 18-18 22-18-22z" fill="#123b1c" stroke="#56e07a" stroke-width="3"/>
    ${[0, 1, 2].map(i => `<circle cx="${24 + i * 8}" cy="38" r="3" fill="${i < c ? '#56e07a' : '#1d4a28'}" ${i < c ? 'style="filter:drop-shadow(0 0 4px #56e07a)"' : ''}/>`).join('')}</svg>`,
};
const rIcon = r => (REALMS[r] ? `<i class="sym sym-${r}" title="${REALMS[r].name}"></i>` : (r === 'eter' ? ICON.eter('var(--eter)') : ''));
const rankLabel = tribe => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[TRIBES[tribe].rank] || String(TRIBES[tribe].rank));
// cartinha em miniatura (valor + naipe) usada no poker
const chip = (rank, realm, cls = '') => `<span class="chip ${cls}" style="--realm:var(--${realm})"><b>${rank}</b>${rIcon(realm)}</span>`;
const chipOf = m => chip(rankLabel(m.tribe), m.realm);
const POKER_EXAMPLE = {
  par: [['A', 'fogo'], ['A', 'agua']],
  doispares: [['A', 'fogo'], ['A', 'ar'], ['K', 'agua'], ['K', 'terra']],
  trinca: [['7', 'fogo'], ['7', 'agua'], ['7', 'terra']],
  sequencia: [['5', 'ar'], ['6', 'fogo'], ['7', 'terra'], ['8', 'agua'], ['9', 'fogo']],
  flush: [['2', 'fogo'], ['5', 'fogo'], ['8', 'fogo'], ['J', 'fogo'], ['K', 'fogo']],
  full: [['Q', 'agua'], ['Q', 'ar'], ['Q', 'terra'], ['4', 'fogo'], ['4', 'agua']],
  quadra: [['9', 'fogo'], ['9', 'agua'], ['9', 'ar'], ['9', 'terra']],
  sflush: [['4', 'agua'], ['5', 'agua'], ['6', 'agua'], ['7', 'agua'], ['8', 'agua']],
  royal: [['10', 'terra'], ['J', 'terra'], ['Q', 'terra'], ['K', 'terra'], ['A', 'terra']],
};
const pokerExample = id => `<span class="chips">${(POKER_EXAMPLE[id] || []).map(([r, rl]) => chip(r, rl)).join('')}</span>`;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 1700);
}

// ───────────────────────────── cartas
function minionCard(m, zone, extra = {}) {
  const c = CARD_BY_ID[m.id];
  const kws = (m.kw instanceof Set ? [...m.kw] : m.kw || []);
  const classes = ['card', zone, extra.sm ? 'sm' : '', m.golden ? 'golden' : '', kws.includes('shield') ? 'shield' : '', kws.includes('taunt') ? 'taunt' : '',
    m.tribe === G.manilha && zone !== 'disc' ? 'manilha' : '', extra.cls || ''].join(' ');
  const mult = m.golden ? 2 : 1;
  const baseA = c ? c.atk * mult : m.atk, baseH = c ? c.hp * mult : m.hp;
  const tier = '<div class="tier">' + '<i></i>'.repeat(m.tier || 1) + '</div>';
  const kwIcons = kws.map(k => (ICON.kw[k] ? `<i title="${KEYWORDS[k].name}">${ICON.kw[k]}</i>` : '')).join('');
  const sv = SELL_VALUE_BY_TIER[m.tier] + (m.golden ? 1 : 0);
  let acts = '';
  if (zone === 'hand') acts = `<div class="acts"><button data-act="play" data-uid="${m.uid}">Jogar</button><button class="b-sell" data-act="sell" data-uid="${m.uid}">Vender +${sv}</button><button class="b-burn" data-act="burn" data-uid="${m.uid}">Queimar +${m.golden ? 3 : 1} Éter</button></div>`;
  if (zone === 'board' && !UI.targeting) acts = `<div class="acts"><div class="mv"><button data-act="left" data-uid="${m.uid}" title="Mover para a esquerda">◀</button><button data-act="right" data-uid="${m.uid}" title="Mover para a direita">▶</button></div><button class="b-sell" data-act="sell" data-uid="${m.uid}">Vender +${sv}</button><button class="b-burn" data-act="burn" data-uid="${m.uid}">Queimar +${m.golden ? 3 : 1} Éter</button></div>`;
  const dmg = extra.dmg ? `<div class="dmg">-${extra.dmg}</div>` : '';
  const draggable = (zone === 'board' || zone === 'hand') ? 'draggable="true"' : '';
  const act = extra.act ? `data-act="${extra.act}"` : '';
  const key = extra.key || (zone === 'shop' ? 's' : zone === 'combat' ? 'c' : 'm') + m.uid;
  return `<div class="${classes}" style="--realm:${realmVar(m.realm)};background-image:url('${c ? c.art : ''}')" data-card="${m.id || ''}" data-golden="${m.golden ? 1 : 0}"
    data-uid="${m.uid || ''}" data-key="${key}" data-zone="${zone}" data-realm="${m.realm}" data-tribe="${m.tribe || ''}" ${draggable} ${act}>
    <div class="shine"></div>${tier}<div class="rl">${rIcon(m.realm)}</div>
    ${c && c.dividend ? '<div class="div" title="Dividendos">+$</div>' : ''}
    <div class="kw">${kwIcons}</div>
    ${m.tribe === G.manilha && zone !== 'disc' ? '<div class="flame"></div>' : ''}
    ${m.tribe ? `<div class="rk">${rankLabel(m.tribe)}</div>` : ''}<div class="nm">${esc(m.name)}${m.golden ? ' ✦' : ''}</div>
    <div class="atk ${m.atk > baseA ? 'buffed' : ''}">${m.atk}</div><div class="hp ${m.hp < baseH ? 'hurt' : m.hp > baseH ? 'buffed' : ''}">${Math.max(0, m.hp)}</div>${acts}${dmg}${extra.after || ''}</div>`;
}

function shopCard(p, s) {
  const c = CARD_BY_ID[s.id];
  const cost = minionCost(p, s.id);
  const contested = isContested(p, s.id);
  const m = { ...c, uid: s.uid, golden: false };
  const cls = [p.wishlist.has(s.id) ? 'wish' : '', s.pinned ? 'pinned' : ''].join(' ');
  return minionCard(m, 'shop', { cls, act: 'buy', after:
    `<div class="cost ${contested ? 'up' : ''}" title="${contested ? 'Disputada: outro jogador tem cópias (+1)' : ''}">${ICON.coin()}${cost}</div>
     <button class="pin ${s.pinned ? 'on' : ''}" data-act="pin" data-uid="${s.uid}" title="Fixar na loja (1ª grátis por rodada)">${ICON.pin()}</button>
     <div class="acts"><button data-act="buy" data-uid="${s.uid}">Comprar</button><button class="b-burn" data-act="burnshop" data-uid="${s.uid}">Queimar · 1 ouro</button></div>` });
}

function spellCard(p, item, zone) {
  if (item.mago) {
    return `<div class="card mago shop" style="--realm:var(--eter)" data-act="mago" data-mago="1" data-key="p${item.uid}" data-zone="spellshop" data-realm="eter">
      <div class="shine"></div><div class="cost">${ICON.coin()}${MAGO_COST}</div><div class="rk">✦</div><div class="nm">Mago</div></div>`;
  }
  const sp = SPELL_BY_ID[item.spell];
  const cost = zone === 'shop' ? `<div class="cost eth">${etherIcons(spellCost(p, sp.id))}</div>` : '';
  const act = zone === 'shop' ? 'spellbuy' : 'cast';
  return `<div class="card spell ${zone}" data-act="${act}" data-uid="${item.uid}" data-spell="${sp.id}" data-key="${zone === 'shop' ? 'p' : 'm'}${item.uid}" data-zone="${zone}" data-realm="eter" ${zone === 'hand' ? 'draggable="true"' : ''}>
    <div class="shine"></div>${cost}<div class="sig">${ICON.sigil()}</div><div class="nm">${esc(sp.name)}</div></div>`;
}
const etherIcons = cost => Object.entries(cost).map(([r, n]) => `${n}<span style="display:inline-block;width:12px;height:12px">${rIcon(r)}</span>`).join(' ') || 'grátis';

// ───────────────────────────── tela principal
function render() {
  if (UI.phase !== 'recruit') return;
  document.body.dataset.mesa = G.vira.realm;
  const p = G.human;
  const hero = HEROES.find(h => h.id === p.hero);
  const canHero = !p.heroUsed && hero.kind === 'ativo' && p.gold >= hero.cost;
  const triples = triplesAvailable(p);
  const viraCard = CARDS.find(c => c.tribe === G.vira.tribe && c.realm === G.vira.realm);
  const shopSlots = SHOP_SLOTS_BY_TIER[p.tier];
  if (UI.targeting && !p.hand.some(x => x.uid === UI.targeting)) UI.targeting = null;
  const income = Math.min(CONFIG.maxGold, CONFIG.startGold + G.round - 1);
  const circ = 2 * Math.PI * 20;
  const frac = UI.timerMax ? UI.timer / UI.timerMax : 1;

  app.innerHTML = `
  <div class="game">
    <header class="hud">
      <img class="logo" src="assets/ui/logo.svg" alt="Elementarios"><img class="logo-e" src="assets/ui/monograma.webp" alt="Elementarios">
      <div class="res">
        <div class="round-plate"><small>RODADA</small><b>${G.round}</b></div>
        <div class="gem hp" id="hud-hp" title="Vida do Feiticeiro">${ICON.heart()}${p.hp}</div>
        <div class="gem gold" id="hud-gold" title="Ouro desta rodada">${ICON.coin()}${p.gold}<small>/ ${income}</small></div>
        <div class="gem gold" id="hud-treasury" title="Tesouro: o ouro que sobra rende +1 a cada 3 (máx +3), dobrado com Goblin no tabuleiro">${ICON.vault()}${p.treasury}${p.lastInterest ? `<small>+${p.lastInterest} juros</small>` : ''}</div>
        ${REALM_ORDER.map(r => `<div class="gem eth" id="hud-ether-${r}" title="Éter de ${REALMS[r].name}" style="color:${realmVar(r)}">${rIcon(r)}<span style="color:var(--ink)">${p.ether[r]}</span></div>`).join('')}
      </div>
      <div class="hud-right">
        <button class="btn icon" data-act="livro" title="Livro da Partida">${ICON.book()}</button>
        <button class="btn icon ${UI.grim ? 'on' : ''}" data-act="grim" title="Grimório (G)">${ICON.grim()}</button>
        <button class="btn icon" data-act="sound" title="Som">${ICON.sound(!SFX.muted)}</button>
        <button class="btn icon" data-act="timer" title="Pausar o tempo">${ICON.pause(UI.timerOn)}</button>
        <div class="timer ${UI.timer <= 10 && UI.timerOn ? 'low' : ''}"><svg viewBox="0 0 46 46"><circle class="bg" cx="23" cy="23" r="20"/><circle class="fg" cx="23" cy="23" r="20" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - frac)}"/></svg><span>${UI.timerOn ? UI.timer : '∞'}</span></div>
        <button class="btn cast" data-act="end">Lutar<kbd>E</kbd></button>
      </div>
    </header>
    <div class="main ${UI.grim ? '' : 'nogrim'}">
      <aside class="table"><div class="tbl">${opponentsHTML()}</div>
        <div class="relic-dock ${hero.kind === 'ativo' ? (canHero ? 'ready' : 'spent') : ''}" style="--rc:${realmVar(hero.realm)}" ${hero.kind === 'ativo' ? 'data-act="hero"' : ''} title="${esc(hero.relicName)}: ${esc(hero.text)}">
          <div class="relic r-${hero.relic}" id="relic">${RELIC[hero.relic](p.terraPlayed % 3)}</div>
          <div class="relic-t"><b>${esc(hero.relicName)}</b>${hero.kind === 'ativo' ? (p.heroUsed ? 'usada nesta rodada' : 'clique para usar · ' + hero.cost + ' ouro') : hero.kind === 'carregável' ? (p.terraPlayed % 3) + '/3 cargas' : 'efeito passivo'}</div>
        </div>
      </aside>
      <section class="stage">
        <div class="topline">
          <div class="vira pane">
            <div class="mini" style="background-image:url('${viraCard.art}');color:${realmVar(G.vira.realm)};border-color:${realmVar(G.vira.realm)}"></div>
            <div class="t">Vira <b>${TRIBES[G.vira.tribe].name} de ${REALMS[G.vira.realm].name}</b><br>
              Manilha <em>${TRIBES[G.manilha].name}</em> · +${CONFIG.manilhaBuff}/+${CONFIG.manilhaBuff} e vaga garantida · feitiços de ${REALMS[G.vira.realm].name} −1 Éter</div>
          </div>
          <div class="heroplate pane">
            <div class="medal" style="--rc:${realmVar(hero.realm)}">${rIcon(hero.realm)}</div>
            <div class="t"><b>${esc(hero.name)}</b>${esc(hero.relicName)}</div>
            ${hero.kind === 'ativo' ? `<button class="btn sm" data-act="hero" ${canHero ? '' : 'disabled'}>Poder · ${hero.cost}</button>` : ''}
          </div>
        </div>

        <div class="counter-head">
          <div class="label" style="flex:1">Taverna · Nível ${p.tier}</div>
          <div class="tiers" title="Nível da Taverna">${[1, 2, 3, 4, 5, 6, 7].map(t => `<i class="${t <= p.tier ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn sm" data-act="reroll">${ICON.reroll().replace('<svg', '<svg width="13" height="13" style="vertical-align:-2px;margin-right:5px"')}Renovar · ${p.freeRerolls ? 'grátis' : CONFIG.rerollCost}<kbd>R</kbd></button>
          <button class="btn sm gold" id="btn-up" data-act="upgrade" ${p.tier >= 7 ? 'disabled' : ''}>${ICON.up().replace('<svg', '<svg width="13" height="13" style="vertical-align:-2px;margin-right:5px"')}Nível ${Math.min(7, p.tier + 1)} · ${p.upgradeCost}<kbd>U</kbd></button>
        </div>
        <div class="counter">
          <div class="shoprow">${p.shop.map(s => shopCard(p, s)).join('')}${'<div class="slot-empty"></div>'.repeat(Math.max(0, shopSlots - p.shop.length))}</div>
          <div class="spells">${p.spellShop.map(s => spellCard(p, s, 'shop')).join('')}</div>
        </div>

        ${UI.targeting ? `<div class="target-hint">Escolha um lacaio para <b>${esc(SPELL_BY_ID[p.hand.find(x => x.uid === UI.targeting).spell].name)}</b><button class="btn sm" data-act="cancel">Cancelar · Esc</button></div>` : ''}
        ${triples.length ? `<div class="fusebar"><span class="label" style="color:var(--gold)">Tripla pronta</span>${triples.map(id => `<button class="btn sm gold" data-act="fuse" data-id="${id}">Fundir ${esc(CARD_BY_ID[id].name)}</button>`).join('')}<span class="note" style="margin:0">pode segurar e fundir quando quiser</span></div>` : ''}

        <div class="label c">Arena · ${p.board.length}/${CONFIG.boardSize} · <span class="pokerbadge" data-act="tab" data-tab="reinos" title="Formação de poker da arena">${evaluatePoker(p.board).hand.name}</span></div>
        <div class="arena" data-drop="board">${p.board.length ? (() => { const inHand = new Set(evaluatePoker(p.board).cards.map(x => x.uid)); return p.board.map(m => minionCard(m, 'board', UI.targeting ? { cls: 'targetable', act: 'target' } : { cls: inHand.has(m.uid) ? 'inpoker' : '' })); })().join('') : '<span class="hint">Arraste cartas da mão para a arena</span>'}</div>

        <div class="handwrap">
          <div class="portal sell" data-drop="sell">${ICON.sell()}Vender<br>ouro</div>
          <div class="hand" data-drop="hand">${p.hand.map(m => (isSpell(m) ? spellCard(p, m, 'hand') : minionCard(m, 'hand', { act: 'play' }))).join('') || '<span class="note">Mão vazia</span>'}</div>
          <div class="portal burn" data-drop="burn">${ICON.burn()}Queimar<br>Éter</div>
        </div>
      </section>
      ${UI.grim ? `<aside class="grim pane"><button class="grim-x" data-act="grim" title="Fechar">✕</button>${trackerHTML()}</aside>` : `<button class="grim-tab" data-act="grim" title="Abrir o Grimório (G)">${ICON.grim()}<span>Grimório</span></button>`}
    </div>
  </div>`;
}

function opponentsHTML() {
  const list = [...G.players].sort((a, b) => (b.alive - a.alive) || (b.hp - a.hp));
  return `<div class="label">Mesa</div>` + list.map(o => {
    const hero = HEROES.find(h => h.id === o.hero);
    return `<div class="opp ${o.isHuman ? 'you' : ''} ${o.alive ? '' : 'dead'}">
      <div class="medal" style="--rc:${realmVar(hero.realm)}">${rIcon(hero.realm)}<span class="lv"><span>${o.tier}</span></span></div>
      <div><div class="nm">${esc(o.name)}</div><div class="meta">${o.alive ? (o.lastResult || 'aguardando') + (!o.isHuman ? ' · ' + o.board.length + ' cartas' : '') : o.placement + 'º lugar'}</div></div>
      <span class="hpv">${o.alive ? o.hp : '✝'}</span><span class="hpmini">${o.alive ? o.hp : '✝'}</span>
      <div class="bar"><i style="width:${Math.max(0, o.hp) / CONFIG.heroHp * 100}%"></i></div>
    </div>`;
  }).join('');
}

// ───────────────────────────── Grimório (Deck Tracker)
function trackerHTML() {
  const tabs = [['estoque', 'Estoque'], ['reinos', 'Poker'], ['acoes', 'Ações'], ['patrimonio', 'Tesouro']];
  return `<div class="tabs">${tabs.map(([k, n]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>
    <div class="tpanel">${({ estoque: stockHTML, reinos: synergyHTML, acoes: actionsHTML, patrimonio: worthHTML })[UI.tab]()}</div>`;
}

function stockHTML() {
  const p = G.human;
  const fb = (act, val, cur, label) => `<button class="${cur === val ? 'on' : ''}" data-act="${act}" data-val="${val ?? ''}">${label}</button>`;
  let cards = CARDS.filter(c => (!UI.fRealm || c.realm === UI.fRealm) && (!UI.fTribe || c.tribe === UI.fTribe) && (!UI.onlyWish || p.wishlist.has(c.id)));
  if (UI.fTier === 'meu') cards = cards.filter(c => c.tier <= p.tier);
  const wish = [...p.wishlist].map(id => shopOdds(p, id));
  const wishAny = wish.length ? 1 - wish.reduce((a, v) => a * (1 - v), 1) : 0;
  const owned = {};
  [...p.board, ...p.hand].forEach(m => { if (!isSpell(m) && !m.golden) owned[m.id] = (owned[m.id] || 0) + 1; });
  const near = Object.keys(owned).filter(id => owned[id] === 2);

  let html = `<div class="filters">${fb('ftier', 'meu', UI.fTier, 'Meu nível')}${fb('ftier', 'todos', UI.fTier, 'Todos')}
    <button class="${UI.onlyWish ? 'on' : ''}" data-act="fwish">★ Desejos</button></div>
    <div class="filters">${fb('frealm', null, UI.fRealm, 'Reinos')}${REALM_ORDER.map(r => fb('frealm', r, UI.fRealm, rIcon(r) + REALMS[r].name)).join('')}</div>
    <div class="filters">${fb('ftribe', null, UI.fTribe, 'Todas as tribos')}</div>
    <div class="fhead">Disponíveis na sua Taverna</div>
    <div class="filters">${Object.keys(TRIBES).filter(t => TRIBES[t].tier <= p.tier).map(t => fb('ftribe', t, UI.fTribe, `<b class="rkb">${rankLabel(t)}</b>${TRIBES[t].name}`)).join('')}</div>
    <div class="fhead">Bloqueadas · sobem com a Taverna</div>
    <div class="filters locked">${Object.keys(TRIBES).filter(t => TRIBES[t].tier > p.tier).map(t => fb('ftribe', t, UI.fTribe, `<b class="rkb">${rankLabel(t)}</b>${TRIBES[t].name}<small>nv ${TRIBES[t].tier}</small>`)).join('') || '<span class="note">Nenhuma: Taverna no máximo.</span>'}</div>`;
  if (p.wishlist.size) html += `<div class="bonus on"><span>★ Ver um desejo na próxima renovação</span><b class="pct ${pctClass(wishAny)}">${pctText(wishAny)}</b></div>`;
  near.forEach(id => {
    const o = shopOdds(p, id);
    html += `<div class="bonus on"><span>✦ Tripla de ${esc(CARD_BY_ID[id].name)} · falta 1 · em 5 renovações</span><b class="pct ${pctClass(o)}">${pctText(o)} · ${pctText(1 - Math.pow(1 - o, 5))}</b></div>`;
  });
  for (let t = 1; t <= 7; t++) {
    const tc = cards.filter(c => c.tier === t);
    if (!tc.length) continue;
    html += `<div class="tierhead">NÍVEL ${t} · ${COPIES_BY_TIER[t]} CÓPIAS</div>`;
    html += tc.map(c => {
      const left = G.pool[c.id], total = COPIES_BY_TIER[t];
      const o = shopOdds(p, c.id);
      const locked = t > p.tier;
      return `<div class="trow ${locked ? 'locked' : ''}" style="--realm:${realmVar(c.realm)}" data-card="${c.id}">
        <button class="star ${p.wishlist.has(c.id) ? 'on' : ''}" data-act="wish" data-id="${c.id}" title="Lista de desejos">★</button>
        ${rIcon(c.realm)}
        <span class="nm">${esc(c.name)} <small>${TRIBES[c.tribe].name}${owned[c.id] ? ' · tem ' + owned[c.id] : ''}</small></span>
        <span class="stock" title="${left}/${total} no estoque"><i style="width:${left / total * 100}%"></i></span>
        <span class="pct ${locked ? 'lo' : pctClass(o)}">${locked ? `${left}/${total}` : pctText(o)}</span>
      </div>`;
    }).join('');
  }
  html += `<p class="note">% = chance de a carta aparecer na próxima renovação, com o estoque compartilhado ao vivo, as vagas livres e a Manilha. Barra = cópias restantes na mesa.</p>`;
  return html;
}

function synergyHTML() {
  const p = G.human;
  const ph = evaluatePoker(p.board);
  const used = new Set(ph.cards.map(m => m.uid));
  let html = `<div class="label">Formação na arena</div><div style="height:8px"></div>
    <div class="bonus on" style="flex-direction:column;align-items:flex-start"><span style="font:700 20px var(--display);color:var(--teal)">${ph.hand.name}</span>
    <span class="note" style="margin:0">${ph.hand.text}</span>
    ${ph.cards.length ? `<span class="chips">${ph.cards.map(chipOf).join('')}</span>` : ''}</div>`;
  const outs = pokerOuts([...p.board, ...p.hand.filter(m => !isSpell(m))]);
  if (outs.length) html += `<div class="note" style="margin:4px 0 0">Contando a mão também:</div>` + outs.map(o => `<div class="bonus"><span>${o}</span></div>`).join('');
  html += `<div style="height:10px"></div><div class="label">Mãos de poker</div><p class="note" style="margin-top:4px">Valor = número da carta (A a K) · naipe = símbolo do reino. A melhor mão de 5 cartas da arena vale no início de cada combate. Sequência aceita Ás baixo (Ás-2-3-4-5) e alto (10-J-Q-K-Ás).</p>` +
    [...POKER_HANDS].reverse().filter(h => h.rank > 0).map(h => `<div class="phand ${h.id === ph.hand.id ? 'on' : ''}"><div class="ph-top"><b>${h.name}</b>${pokerExample(h.id)}</div><span class="note">${h.text}</span></div>`).join('');
  html += `<div class="note">Flush ativa o poder do reino: ${REALM_ORDER.map(r => `${REALMS[r].name}, ${REALM_POWER[r]}`).join('; ')}.</div>`;
  html += `<div style="height:10px"></div><div class="label">Reações na arena</div><div style="height:8px"></div>`;
  const usedR = new Set(); let found = 0;
  for (let i = 0; i + 1 < p.board.length; i++) {
    const l = p.board[i], r = p.board[i + 1];
    if (usedR.has(i) || usedR.has(i + 1) || l.realm === r.realm) continue;
    const re = REACTIONS[[l.realm, r.realm].sort().join('|')];
    if (!re) continue;
    usedR.add(i); usedR.add(i + 1); found++;
    html += `<div class="bonus on"><span><b>${re.name}</b> · ${esc(l.name)} + ${esc(r.name)}</span></div><div class="note" style="margin:-2px 0 6px 8px">${re.text}</div>`;
  }
  if (!found) html += `<p class="note">Cartas de reinos diferentes lado a lado reagem no início do combate.</p>`;
  html += `<div style="height:10px"></div><div class="label">Ciclo elemental</div><p class="note">Fogo → Água → Ar → Terra → Fogo. Quem vem antes no ciclo causa +1 de dano contra o seguinte.</p>`;
  return html;
}

function actionsHTML() {
  const p = G.human, rs = p.roundStats, st = p.stats;
  const row = (k, a, b) => `<div class="kv"><span>${k}</span><b>${a}</b><b style="color:var(--mute)">${b}</b></div>`;
  const KI = { buy: '◆', sell: '$', burn: '✦', spell: '✧', spellbuy: '✧', mago: '✧', triple: '★', upgrade: '▲', combat: '⚔', reroll: '↻', pin: '•', play: '▸', discover: '◇', hero: '◎', treasury: '$' };
  return `<div class="kv" style="color:var(--mute)"><span></span><span>rodada</span><span>partida</span></div>
    ${row('Ouro no início', rs.goldStart, '—')}
    ${row('Compras', rs.bought, st.bought)}${row('Vendas', rs.sold, st.sold)}${row('Queimas', rs.burned, st.burned)}
    ${row('Feitiços', rs.spells, st.spells)}${row('Renovações', rs.rerolls, st.rerolls)}${row('Triplas', '—', st.triples)}
    ${row('Ouro gasto', '—', st.goldSpent)}
    <div style="height:10px"></div><div class="label">Últimas ações</div>
    ${G.log.slice(-14).reverse().map(l => `<div class="logrow"><span><span class="k">${KI[l.kind] || '·'}</span>${esc(l.text)}</span></div>`).join('')}`;
}

function worthHTML() {
  const p = G.human;
  const items = [...p.board, ...p.hand].filter(m => !isSpell(m));
  const boardVal = items.reduce((s, m) => s + SELL_VALUE_BY_TIER[m.tier] + (m.golden ? 1 : 0), 0);
  const eth = Object.values(p.ether).reduce((a, b) => a + b, 0);
  return `<div class="kv"><span>Caixa</span><b>${p.gold}</b></div>
    <div class="kv"><span>Tesouro</span><b>${p.treasury}</b></div>
    <div class="kv"><span>Valor de venda das cartas</span><b>${boardVal}</b></div>
    <div class="kv"><span>Éter</span><b>${eth}</b></div>
    <div class="kv"><span><b>Patrimônio</b></span><b style="color:var(--gold)">${networth(p)}</b></div>
    <p class="note">Ouro que sobra vai pro Tesouro e rende +1 a cada 3 (máx +3/rodada). Com Goblin na arena, os juros dobram.</p>
    <div style="height:8px"></div><div class="label">Curva da mesa</div><div style="height:6px"></div>${worthChart(290, 180)}`;
}

function worthChart(w, h) {
  const series = G.players.map(p => p.networth);
  const n = Math.max(2, ...series.map(s => s.length));
  const max = Math.max(5, ...series.flat().filter(v => v != null));
  const x = i => 24 + (i / (n - 1)) * (w - 34), y = v => h - 18 - (v / max) * (h - 30);
  const colors = ['#43f0d0', '#ff6a3d', '#4aa8ff', '#ffd257', '#56e07a', '#ff8fb1', '#b69cff', '#c9d6d3'];
  const lines = G.players.map((p, idx) => {
    const pts = p.networth.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(' ');
    return pts ? `<polyline points="${pts}" fill="none" stroke="${colors[idx]}" stroke-width="${p.isHuman ? 3 : 1.3}" opacity="${p.isHuman ? 1 : .55}" ${p.isHuman ? 'style="filter:drop-shadow(0 0 4px #43f0d0)"' : ''}/>` : '';
  }).join('');
  const legend = G.players.map((p, i) => `<span style="color:${colors[i]};font-size:11px;margin-right:9px">● ${esc(p.name)}</span>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="background:rgba(2,10,9,.6);border:1px solid var(--line);border-radius:3px">
    <text x="4" y="12" fill="#84b0a8" font-size="9">${max}</text><text x="4" y="${h - 18}" fill="#84b0a8" font-size="9">0</text>
    <line x1="24" y1="${h - 18}" x2="${w - 10}" y2="${h - 18}" stroke="rgba(67,240,208,.2)"/>${lines}
    <text x="${w - 10}" y="${h - 4}" fill="#84b0a8" font-size="9" text-anchor="end">rodada ${n - 1 || 1}</text></svg><div style="margin-top:6px">${legend}</div>`;
}

// ───────────────────────────── fluxo
function menu() {
  UI.phase = 'menu';
  document.body.classList.add('menu');
  delete document.body.dataset.mesa;
  app.innerHTML = `<div class="splash"><div>
    <img class="biglogo" src="assets/ui/logo.svg" alt="Elementarios">
    <div class="tag">ARENA · PROTÓTIPO</div>
    <div class="box pane" style="max-width:1000px;text-align:left"><h2>Escolha seu Feiticeiro</h2>
      <div class="sub">Heróis provisórios. 8 Feiticeiros, Taverna de 1 a 7, o último de pé vence.</div>
      <div class="choices">${HEROES.map(h => `<div class="hero" style="--rc:${realmVar(h.realm)}" data-act="hero-pick" data-id="${h.id}">
        <div class="crest relic r-${h.relic}">${RELIC[h.relic](3)}</div><div class="k">${h.kind} · ${esc(h.relicName)}</div><h3>${esc(h.name)}</h3><p>${esc(h.text)}</p></div>`).join('')}</div>
    </div></div></div>`;
}

function beginGame(heroId) {
  SFX.unlock();
  SFX.ambient(true);
  document.body.classList.remove('menu');
  newGame(heroId);
  nextRound();
}

function nextRound() {
  startRound();
  for (const b of alivePlayers()) if (!b.isHuman) botTurn(b);
  UI.phase = 'recruit';
  UI.targeting = null;
  UI.timerMax = Math.min(CONFIG.timerMax, CONFIG.timerBase + CONFIG.timerPerRound * (G.round - 1));
  startTimer(UI.timerMax);
  render();
  SFX.round();
  const r = $('.round-plate');
  if (r) { const rr = r.getBoundingClientRect(); FX.floatText(innerWidth / 2, innerHeight * 0.45, `Rodada ${G.round}`, 'big'); }
  FX.transition(new Map(), { kind: 'reroll' });
}

function startTimer(s) {
  UI.timer = s;
  clearInterval(UI.interval);
  UI.interval = setInterval(() => {
    if (!UI.timerOn || UI.phase !== 'recruit' || !$('#modal').hidden) return;
    UI.timer--;
    const el = document.querySelector('.timer');
    if (el) {
      el.querySelector('span').textContent = UI.timer;
      const circ = 2 * Math.PI * 20;
      el.querySelector('.fg').setAttribute('stroke-dashoffset', circ * (1 - UI.timer / UI.timerMax));
      el.classList.toggle('low', UI.timer <= 10);
    }
    if (UI.timer <= 5 && UI.timer > 0) SFX.tick();
    if (UI.timer <= 0) endHumanTurn();
  }, 1000);
}

function endHumanTurn() {
  if (UI.phase !== 'recruit') return;
  clearInterval(UI.interval);
  UI.phase = 'combat';
  closeModal();
  const p = G.human;
  if (p.gold > 0) { const g = $('#hud-gold'); if (g) FX.flyTo(g.getBoundingClientRect(), '#hud-treasury', { count: Math.min(6, p.gold), kind: 'coin' }); }
  for (const pl of alivePlayers()) endTurn(pl);
  const results = resolveCombats();
  const res = results.human;
  if (res) {
    const you = res.a.isHuman ? res.a : res.b, opp = res.a.isHuman ? res.b : res.a;
    G.log.push({ round: G.round, kind: 'combat', text: `Combate contra ${opp.name}: ${you.lastResult || 'empate'}${res.loser === you ? ` (−${res.dmg} vida)` : res.winner === you ? ` (causou ${res.dmg})` : ''}`,
      gold: 0, ether: { ...you.ether }, treasury: you.treasury });
    setTimeout(() => playReplay(G.replays[G.replays.length - 1], () => (G.over ? gameOver() : nextRound())), 350);
  } else {
    G.over ? gameOver() : nextRound();
  }
}

// ───────────────────────────── replay de combate animado
function playReplay(rep, onDone, fromLivro = false) {
  const el = document.createElement('div');
  el.className = 'combat-view';
  document.body.appendChild(el);
  document.body.classList.add('in-combat');
  FX.resetVideos();
  let i = 0, paused = false, done = false, t = null;
  const youKey = rep.you, oppKey = youKey === 'A' ? 'B' : 'A';
  const youName = youKey === 'A' ? rep.aName : rep.bName, oppName = youKey === 'A' ? rep.bName : rep.aName;
  const phs = { A: evaluatePoker(rep.frames[0].A), B: evaluatePoker(rep.frames[0].B) };

  function frameHTML(f, final) {
    const hl = f.hl || {};
    const row = arr => arr.map(m => {
      let cls = '';
      if (hl.def === m.cuid) cls = 'hl-def';
      else if (hl.src === m.cuid || hl.src2 === m.cuid) cls = 'hl-src';
      return minionCard({ ...m, uid: m.cuid }, 'combat', { cls });
    }).join('') || '<span class="note">—</span>';
    const res = rep.result === 'vitória' ? 'win' : rep.result === 'derrota' ? 'lose' : 'tie';
    const pk = (key, who) => { const ph = phs[key]; return `<div class="pk ${ph.hand.rank ? '' : 'none'}"><small>${who}</small><b>${ph.hand.name}</b>${ph.cards.length ? `<span class="chips">${ph.cards.map(chipOf).join('')}</span>` : ''}</div>`; };
    return `<div class="pokerside">${pk(oppKey, esc(oppName))}${pk(youKey, 'Você')}</div>
      <div class="title">RODADA ${rep.round} · COMBATE</div>
      <div class="side-name">${esc(oppName)}</div>
      <div class="crow far">${row(f[oppKey])}</div>
      <div class="mid"><div class="cnote">${final ? `<span class="banner ${res}">${rep.result.toUpperCase()}</span>${rep.dmg && rep.result !== 'empate' ? `<div class="note" style="font-size:14px;margin-top:8px">${rep.result === 'vitória' ? 'causou' : 'sofreu'} ${rep.dmg} de dano</div>` : ''}` : esc(f.note)}</div></div>
      <div class="crow near">${row(f[youKey])}</div>
      <div class="side-name">${esc(youName)}</div>
      <div class="ctrl">
        ${[1, 2, 4].map(s => `<button class="btn sm ${UI.speed === s ? 'gold' : ''}" data-sp="${s}">${s}×</button>`).join('')}
        <button class="btn sm" data-c="pause">${paused ? 'Continuar' : 'Pausar'}</button>
        <button class="btn sm" data-c="prev">◂ passo</button><button class="btn sm" data-c="next">passo ▸</button>
        ${final ? `<button class="btn cast" data-c="close">${fromLivro ? 'Fechar' : (G.over ? 'Resultado' : 'Próxima rodada')}</button>` : '<button class="btn sm" data-c="skip">Pular ⏭</button>'}
      </div>`;
  }

  function draw(animate) {
    const prevRects = new Map();
    el.querySelectorAll('.card[data-key]').forEach(c => prevRects.set(c.dataset.key, { rect: c.getBoundingClientRect(), realm: c.dataset.realm, shield: c.classList.contains('shield') }));
    const f = rep.frames[i];
    el.innerHTML = frameHTML(f, done);
    if (!animate) return;
    const hl = f.hl || {};
    const now = new Map();
    el.querySelectorAll('.card[data-key]').forEach(c => now.set(c.dataset.key, c));
    // mortos estilhaçam, invocados surgem
    prevRects.forEach((b, k) => { if (!now.has(k)) { FX.shatter(b.rect, FX.REALM_HEX[b.realm] || '#43f0d0'); SFX.death(); } });
    now.forEach((c, k) => {
      const b = prevRects.get(k);
      if (!b && i > 0) { c.animate([{ transform: 'scale(.3) translateY(20px)', opacity: 0, filter: 'brightness(3)' }, { transform: 'none', opacity: 1, filter: 'brightness(1)' }], { duration: 420 / UI.speed, easing: 'cubic-bezier(.2,.9,.3,1.2)' }); SFX.summon(); }
      else if (b) {
        const r = c.getBoundingClientRect(), dx = b.rect.left - r.left;
        if (Math.abs(dx) > 2) c.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 300 / UI.speed, easing: 'ease-out' });
        if (b.shield && !c.classList.contains('shield')) { FX.burst(c, '#fff0aa'); SFX.shield(); }
      }
    });
    if (hl.atk && now.get('c' + hl.atk) && now.get('c' + hl.def)) {
      const a = now.get('c' + hl.atk), d = now.get('c' + hl.def);
      SFX.swing();
      FX.attack(a, d, UI.speed, () => {
        SFX.hit();
        if (hl.dmgD) d.insertAdjacentHTML('beforeend', `<div class="dmg">-${hl.dmgD}</div>`);
        if (hl.dmgA) a.insertAdjacentHTML('beforeend', `<div class="dmg">-${hl.dmgA}</div>`);
      });
    } else if (hl.src) {
      const s = now.get('c' + hl.src);
      if (s) { FX.burst(s, FX.REALM_HEX[s.dataset.realm] || '#b69cff'); }
      if (/Vapor|Incêndio|Magma|Tempestade|Florescer|Areia|Éter/.test(f.note)) SFX.reaction(); else SFX.spell();
    } else if (/Reação do Éter/.test(f.note)) { SFX.reaction(); }
    if (hl.poker) { (hl.pokerCards || []).forEach(cu => { const c = now.get('c' + cu); if (c) FX.burst(c, '#43f0d0'); }); const nm = (POKER_HANDS.find(h => h.id === hl.poker) || {}).name; FX.floatText(innerWidth / 2, hl.side === youKey ? innerHeight * 0.66 : innerHeight * 0.3, nm, 'big'); SFX.triple(); }
    if (done) {
      if (rep.result === 'vitória') { SFX.win(); FX.particles(innerWidth / 2, innerHeight / 2, { color: '#43f0d0', count: 40, spread: 260, size: 6, shape: 'shard', dur: 1200 }); }
      else if (rep.result === 'derrota') SFX.lose();
    }
  }

  const delayFor = f => ((f.hl && f.hl.poker) ? 1400 : (f.hl && f.hl.atk) ? 900 : f.note && f.note.includes('morre') ? 620 : 700) / UI.speed;
  function step() {
    if (paused) return;
    if (i < rep.frames.length - 1) { i++; if (i === rep.frames.length - 1) done = true; draw(true); t = setTimeout(step, delayFor(rep.frames[i]) + FX.takePending()); }
    else if (!fromLivro) t = setTimeout(() => { if (document.body.contains(el) && !paused) close(); }, 3000);
  }
  function close() { clearTimeout(t); el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).onfinish = () => { el.remove(); document.body.classList.remove('in-combat'); onDone && onDone(); }; }
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    SFX.click();
    if (b.dataset.sp) { UI.speed = +b.dataset.sp; draw(false); return; }
    const c = b.dataset.c;
    if (c === 'close') return close();
    if (c === 'skip') { clearTimeout(t); i = rep.frames.length - 1; done = true; draw(true); return; }
    if (c === 'pause') { paused = !paused; clearTimeout(t); draw(false); if (!paused) step(); return; }
    if (c === 'next' || c === 'prev') { paused = true; clearTimeout(t); i = Math.max(0, Math.min(rep.frames.length - 1, i + (c === 'next' ? 1 : -1))); done = i === rep.frames.length - 1; draw(c === 'next'); }
  });
  draw(false);
  t = setTimeout(step, 800 / UI.speed);
}

// ───────────────────────────── Livro da Partida / fim
function openModal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

function livro(tab = 'tempo') {
  const p = G.human;
  let body = '';
  if (tab === 'tempo') {
    body = G.log.map(l => l.kind === 'round'
      ? `<div class="logrow round"><span>${esc(l.text)}</span><span class="res">${l.gold} ouro · Tesouro ${l.treasury}</span></div>`
      : `<div class="logrow"><span>${esc(l.text)}</span><span class="res">${l.gold} ouro · ${REALM_ORDER.map(r => l.ether[r] + ' ' + REALMS[r].name[0]).join(' ')}</span></div>`).join('') || '<p class="note">Nada ainda.</p>';
  } else if (tab === 'combates') {
    body = G.replays.map((r, i) => `<div class="logrow"><span>Rodada ${r.round}: ${esc(r.aName)} × ${esc(r.bName)} · <b>${r.result}</b>${r.dmg ? ` (${r.dmg} de dano)` : ''}</span>
      <button class="btn sm" data-act="replay" data-i="${i}">Rever ▸</button></div>`).join('') || '<p class="note">Nenhum combate ainda.</p>';
  } else {
    const st = p.stats;
    body = `<div class="grid2"><div>
      <div class="kv"><span>Colocação</span><b>${p.placement ? p.placement + 'º' : 'em jogo'}</b></div>
      <div class="kv"><span>Rodadas</span><b>${G.round}</b></div>
      <div class="kv"><span>Ouro gasto</span><b>${st.goldSpent}</b></div>
      <div class="kv"><span>Compras / vendas / queimas</span><b>${st.bought} / ${st.sold} / ${st.burned}</b></div>
      <div class="kv"><span>Feitiços conjurados</span><b>${st.spells}</b></div>
      <div class="kv"><span>Triplas</span><b>${st.triples}</b></div>
      <div class="kv"><span>Renovações</span><b>${st.rerolls}</b></div>
      <div class="kv"><span>Subidas de Taverna</span><b>${st.ups} (nível ${p.tier})</b></div>
      <div class="kv"><span>Giro (vendas ÷ compras)</span><b>${st.bought ? Math.round(st.sold / st.bought * 100) : 0}%</b></div>
      </div><div><div class="label">Curva de patrimônio</div><div style="height:8px"></div>${worthChart(420, 220)}</div></div>`;
  }
  const tabs = [['tempo', 'Linha do tempo'], ['combates', 'Combates'], ['raiox', 'Raio-X']];
  openModal(`<div class="box pane"><div style="display:flex;align-items:center;gap:12px"><h2>Livro da Partida</h2><div style="flex:1"></div><button class="btn sm" data-act="close-modal">Fechar</button></div>
    <div class="sub">Tudo o que aconteceu, carta a carta · semente ${G.seed}</div>
    <div class="tabs" style="margin-bottom:10px">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="livro-tab" data-tab="${k}">${n}</button>`).join('')}</div>${body}</div>`);
}

function gameOver() {
  UI.phase = 'over';
  clearInterval(UI.interval);
  const p = G.human;
  const place = p.placement || 1;
  app.innerHTML = `<div class="splash"><div class="box pane" style="max-width:900px">
    <h2 style="font-size:40px;text-align:center">${place === 1 ? 'Vitória' : `${place}º lugar`}</h2>
    <div class="sub" style="text-align:center">${place === 1 ? 'Último Feiticeiro de pé.' : place <= 4 ? 'Top 4. Boa leitura de mesa.' : 'Eliminado. Abra o Livro e veja onde a partida virou.'} · ${G.round} rodadas</div>
    ${worthChart(820, 240)}
    <div style="display:flex;gap:10px;justify-content:center;margin-top:18px">
      <button class="btn" data-act="livro">Abrir o Livro da Partida</button>
      <button class="btn cast" data-act="again">Nova partida</button>
    </div></div></div>`;
  if (place <= 4) { SFX.win(); FX.particles(innerWidth / 2, innerHeight / 3, { color: '#f1c35a', count: 60, spread: 400, size: 7, shape: 'shard', dur: 1600 }); } else SFX.lose();
}

function showDiscover(opts) {
  if (!opts || !opts.length) { render(); return; }
  openModal(`<div class="box pane" data-locked="1" style="max-width:600px;text-align:center"><h2>Descoberta</h2><div class="sub">Escolha uma carta de nível ${CARD_BY_ID[opts[0]].tier}.</div>
    <div class="choices" style="padding:14px 0">${opts.map(id => minionCard({ ...CARD_BY_ID[id], uid: 0, golden: false }, 'disc', { act: 'discover', key: 'd' + id })).join('')}</div></div>`);
}

// ───────────────────────────── ações com animação
function doAction(fn, failMsg, fx = {}) {
  const before = FX.snapshot();
  const r = fn();
  if (!r) { SFX.error(); toast(failMsg); return r; }
  render();
  FX.transition(before, fx);
  if (fx.sound) SFX[fx.sound]();
  return r;
}
const keyRect = key => { const e = document.querySelector(`[data-key="${key}"]`); return e ? e.getBoundingClientRect() : null; };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const p = G.human;
  const uid = +el.dataset.uid;
  e.stopPropagation();
  switch (act) {
    case 'hero-pick': SFX.unlock(); SFX.upgrade(); return beginGame(el.dataset.id);
    case 'again': closeModal(); return menu();
    case 'livro': SFX.click(); return livro();
    case 'livro-tab': SFX.click(); return livro(el.dataset.tab);
    case 'close-modal': closeModal(); return render();
    case 'replay': { const rep = G.replays[+el.dataset.i]; closeModal(); return playReplay(rep, () => livro('combates'), true); }
    case 'discover': { const id = el.dataset.card; const before = FX.snapshot(); ACTIONS.discover(p, id); closeModal(); render(); FX.transition(before, {}); SFX.buy(); return; }
    case 'sound': { const m = SFX.toggle(); if (!m) SFX.click(); return render(); }
  }
  if (UI.phase !== 'recruit') return;
  switch (act) {
    case 'end': SFX.click(); return endHumanTurn();
    case 'timer': UI.timerOn = !UI.timerOn; SFX.click(); return render();
    case 'grim': UI.grim = !UI.grim; SFX.click(); return render();
    case 'tab': UI.tab = el.dataset.tab; SFX.click(); return render();
    case 'ftier': UI.fTier = el.dataset.val; return render();
    case 'frealm': UI.fRealm = el.dataset.val || null; return render();
    case 'ftribe': UI.fTribe = el.dataset.val || null; return render();
    case 'fwish': UI.onlyWish = !UI.onlyWish; return render();
    case 'wish': { const id = el.dataset.id; p.wishlist.has(id) ? p.wishlist.delete(id) : p.wishlist.add(id); SFX.pin(); return render(); }
    case 'reroll': return doAction(() => ACTIONS.reroll(p), 'Ouro insuficiente para renovar', { kind: 'reroll', sound: 'reroll' });
    case 'upgrade': {
      const r = doAction(() => ACTIONS.upgrade(p), 'Ouro insuficiente para subir', { sound: 'upgrade' });
      if (r) { const t = $('.tiers'); if (t) FX.burst(t, '#43f0d0', true); FX.floatText(innerWidth / 2, innerHeight * 0.4, `Taverna ${p.tier}`, 'big'); }
      return;
    }
    case 'hero': {
      const hero = HEROES.find(h => h.id === p.hero);
      const shopBefore = new Map(p.shop.map(s => [s.uid, keyRect('s' + s.uid)]));
      const relicEl = $('#relic');
      const before = FX.snapshot();
      const ok = ACTIONS.heroPower(p);
      if (!ok) { SFX.error(); return toast('Relíquia indisponível'); }
      const cut = [...shopBefore.keys()].find(u => !p.shop.some(s => s.uid === u));
      FX.relicFx(hero.relic, relicEl, cut ? shopBefore.get(cut) : null);
      if (hero.relic === 'adaga') {
        SFX.swing();
        setTimeout(() => { render(); FX.transition(before, { kind: 'burn' }); SFX.burn(); }, 380);
      } else { render(); FX.transition(before, { kind: 'reroll' }); SFX.reroll(); SFX.upgrade(); }
      return;
    }
    case 'buy': {
      const ringOn = hasHero(p, 'h-agua') && !p.firstBuyDone;
      const su = uid || +el.closest('.card').dataset.uid;
      const fromRect = keyRect('s' + su);
      const r = doAction(() => ACTIONS.buy(p, su), p.hand.length >= CONFIG.handSize ? 'Mão cheia' : 'Ouro insuficiente', { kind: 'buy', fromRect, fromKey: 's' + su, sound: 'buy' });
      if (r && ringOn) FX.relicFx('anel', $('#relic'));
      if (r && fromRect) { const g = $('#hud-gold'); if (g) FX.flyTo(g.getBoundingClientRect(), `[data-key="m${r.uid}"]`, { count: 2, kind: 'coin' }); SFX.coin(); }
      return;
    }
    case 'pin': return doAction(() => ACTIONS.pin(p, uid), 'Ouro insuficiente para fixar', { sound: 'pin' });
    case 'burnshop': return doAction(() => ACTIONS.burnShop(p, uid), 'Queimar da loja custa 1 ouro', { kind: 'burn', sound: 'burn' });
    case 'play': {
      const r = doAction(() => ACTIONS.play(p, uid), 'Arena cheia', { kind: 'play', key: 'm' + uid, sound: 'play' });
      const m = r && p.board.find(x => x.uid === uid);
      if (m && m.realm === 'terra' && hasHero(p, 'h-terra')) {
        FX.relicFx('amuleto', $('#relic'));
        if (p.terraPlayed % 3 === 0) { SFX.triple(); FX.floatText(innerWidth / 2, innerHeight * 0.45, 'Ascensão!', 'big'); }
      }
      return;
    }
    case 'sell': return doAction(() => ACTIONS.sell(p, uid), 'Não deu para vender', { kind: 'sell', sound: 'sell' });
    case 'burn': return doAction(() => ACTIONS.burn(p, uid), 'Não deu para queimar', { kind: 'burn', sound: 'burn' });
    case 'mago': {
      const fromRect = keyRect(el.dataset.key);
      return doAction(() => ACTIONS.buyMago(p), p.hand.length >= CONFIG.handSize ? 'Mão cheia' : `O Mago custa ${MAGO_COST} ouro`, { kind: 'buy', fromRect, fromKey: el.dataset.key, sound: 'spell' });
    }
    case 'spellbuy': {
      const fromRect = keyRect('p' + uid);
      return doAction(() => ACTIONS.buySpell(p, uid), 'Éter insuficiente', { kind: 'buy', fromRect, fromKey: 'p' + uid, sound: 'spell' });
    }
    case 'cast': {
      const it = p.hand.find(x => x.uid === uid);
      const sp = SPELL_BY_ID[it.spell];
      if (sp.target) { if (!p.board.length) { SFX.error(); return toast('Precisa de um lacaio na arena'); } UI.targeting = uid; SFX.spell(); return render(); }
      const r = doAction(() => ACTIONS.cast(p, uid), 'Não deu para conjurar', { sound: 'spell' });
      if (r) { const a = $('.arena'); if (a) FX.burst(a, '#b69cff'); }
      return;
    }
    case 'target': {
      const spellUid = UI.targeting; UI.targeting = null;
      const ok = doAction(() => ACTIONS.cast(p, spellUid, uid), 'Alvo inválido para esse feitiço', { sound: 'spell' });
      UI.targeting = null; render();
      if (ok) { const c = document.querySelector(`[data-key="m${uid}"]`); if (c) FX.burst(c, '#b69cff', true); }
      return;
    }
    case 'cancel': UI.targeting = null; return render();
    case 'left': case 'right': {
      const i = p.board.findIndex(m => m.uid === uid);
      const to = act === 'left' ? i - 1 : i + 1;
      if (i < 0 || to < 0 || to >= p.board.length) return;
      return doAction(() => ACTIONS.move(p, uid, to), '', { sound: 'click' });
    }
    case 'fuse': {
      const opts = doAction(() => ACTIONS.fuse(p, el.dataset.id), 'Não deu para fundir', { kind: 'fuse', sound: 'triple' });
      FX.floatText(innerWidth / 2, innerHeight * 0.42, 'TRIPLA!', 'gold big');
      return setTimeout(() => showDiscover(opts), 1300);
    }
  }
});

document.addEventListener('keydown', e => {
  if (UI.phase !== 'recruit' || !$('#modal').hidden) return;
  const p = G.human;
  const k = e.key.toLowerCase();
  if (k === 'r') doAction(() => ACTIONS.reroll(p), 'Ouro insuficiente para renovar', { kind: 'reroll', sound: 'reroll' });
  else if (k === 'u') { const b = $('#btn-up'); if (b) b.click(); }
  else if (k === 'e') endHumanTurn();
  else if (k === 'g') { UI.grim = !UI.grim; render(); }
  else if (e.key === 'Escape' && UI.targeting) { UI.targeting = null; render(); }
});

// ───────────────────────────── arrastar e soltar
document.addEventListener('dragstart', e => {
  const c = e.target.closest('.card[draggable="true"]');
  if (!c) return;
  UI.drag = { uid: +c.dataset.uid, zone: c.dataset.zone };
  c.classList.add('dragging');
  document.body.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', c.dataset.uid);
  $('#tip').hidden = true;
  SFX.click();
});
document.addEventListener('dragend', () => { UI.drag = null; document.body.classList.remove('dragging'); document.querySelectorAll('.over,.drop-ok,.dragging').forEach(x => x.classList.remove('over', 'drop-ok', 'dragging')); });
document.addEventListener('dragover', e => {
  if (!UI.drag) return;
  const z = e.target.closest('[data-drop]');
  if (!z) return;
  e.preventDefault();
  document.querySelectorAll('.over,.drop-ok').forEach(x => x.classList.remove('over', 'drop-ok'));
  z.classList.add(z.classList.contains('portal') ? 'over' : 'drop-ok');
});
document.addEventListener('drop', e => {
  if (!UI.drag || UI.phase !== 'recruit') return;
  const z = e.target.closest('[data-drop]');
  if (!z) return;
  e.preventDefault();
  document.body.classList.remove('dragging');
  const p = G.human, { uid, zone } = UI.drag, kind = z.dataset.drop;
  UI.drag = null;
  if (kind === 'sell') return doAction(() => ACTIONS.sell(p, uid), 'Não deu para vender', { kind: 'sell', sound: 'sell' });
  if (kind === 'burn') return doAction(() => ACTIONS.burn(p, uid), 'Não deu para queimar', { kind: 'burn', sound: 'burn' });
  if (kind === 'board') {
    const overCard = e.target.closest('.card[data-zone="board"]');
    let idx = p.board.length;
    if (overCard) {
      idx = p.board.findIndex(m => m.uid === +overCard.dataset.uid);
      const rect = overCard.getBoundingClientRect();
      if (e.clientX > rect.left + rect.width / 2) idx++;
    }
    if (zone === 'hand') return doAction(() => ACTIONS.play(p, uid, idx), 'Arena cheia', { kind: 'play', key: 'm' + uid, sound: 'play' });
    if (zone === 'board') {
      const from = p.board.findIndex(m => m.uid === uid);
      if (from < idx) idx--;
      return doAction(() => ACTIONS.move(p, uid, idx), '', { sound: 'click' });
    }
  }
  render();
});

// ───────────────────────────── dica flutuante
document.addEventListener('mouseover', e => {
  const tip = $('#tip');
  const el = e.target.closest('[data-card],[data-spell],[data-mago]');
  if (!el || UI.drag || (!el.dataset.card && !el.dataset.spell && !el.dataset.mago)) { tip.hidden = true; return; }
  let html = '';
  if (el.dataset.mago) html = `<b>Mago</b><div class="m">Coringa · ${MAGO_COST} ouro</div>Ganha um feitiço aleatório e −1 Éter em todos os feitiços nesta rodada.`;
  else if (el.dataset.spell) { const s = SPELL_BY_ID[el.dataset.spell]; html = `<b>${esc(s.name)}</b><div class="m">Feitiço · custo base ${etherText(s.cost)}</div>${esc(s.text)}`; }
  else {
    const c = CARD_BY_ID[el.dataset.card]; if (!c) { tip.hidden = true; return; }
    const g = el.dataset.golden === '1';
    html = `<b>${esc(c.name)}${g ? ' ✦' : ''}</b><div class="m">${TRIBES[c.tribe].name} de ${REALMS[c.realm].name} · Nível ${c.tier} · base ${c.atk}/${c.hp}</div>${esc(c.text)}
      ${g ? '<div class="m" style="margin-top:4px">Dourado: atributos ×2, efeito dispara 2×.</div>' : ''}
      ${c.tribe === G.manilha ? '<div class="m" style="margin-top:4px;color:#43f0d0">Manilha desta rodada: +2/+2 no combate.</div>' : ''}
      ${G.human ? `<div class="m" style="margin-top:4px">Estoque ${G.pool[c.id]}/${COPIES_BY_TIER[c.tier]} · aparece ${pctText(shopOdds(G.human, c.id))}</div>` : ''}`;
  }
  tip.innerHTML = html; tip.hidden = false;
  const r = el.getBoundingClientRect();
  const left = r.right + 10 + 270 > innerWidth ? r.left - 280 : r.right + 10;
  tip.style.left = Math.max(8, left) + 'px';
  tip.style.top = Math.max(8, Math.min(innerHeight - 170, r.top)) + 'px';
});

$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal' && !$('#modal').querySelector('[data-locked]')) { closeModal(); render(); }
});

Scene.init();
menu();

// atalho de teste: ?teste=goblin começa com o Sneack (Goblin de Terra) na arena
if (new URLSearchParams(location.search).get('teste') === 'goblin') {
  beginGame('h-terra');
  const p = G.human;
  p.board = [makeMinion('terra-goblin'), makeMinion('fogo-bobo'), makeMinion('agua-goblin')];
  p.board[0].atk = 6; p.board[0].hp = 9; // reforçado para atacar mais de uma vez
  render();
  toast('Teste: Sneack na arena. Clique em LUTAR');
}

// ───────────────────────────── toque (celular): 1º toque mostra as ações, 2º executa
const isTouch = window.matchMedia('(hover: none)').matches;
document.addEventListener('click', e => {
  if (!isTouch) return;
  const card = e.target.closest('.card');
  if (!card || e.target.closest('button') || card.classList.contains('sel') || UI.targeting) {
    if (!card) document.querySelectorAll('.card.sel').forEach(c => c.classList.remove('sel'));
    return;
  }
  if (!card.querySelector('.acts') && card.dataset.zone !== 'shop') return;
  e.stopPropagation(); e.preventDefault();
  document.querySelectorAll('.card.sel').forEach(c => c.classList.remove('sel'));
  card.classList.add('sel');
}, true);
