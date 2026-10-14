// Elementarios Arena — motor de recrutamento (loja, economia, estoque, triplas, Éter, Vira).

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const G = { rng: Math.random };
let UID = 1;
const pick = arr => arr[Math.floor(G.rng() * arr.length)];
const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(G.rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// ───────────────────────────── instâncias
function makeMinion(cardId, golden = false) {
  const c = CARD_BY_ID[cardId];
  const m = golden ? 2 : 1;
  return { uid: UID++, id: c.id, name: c.name, realm: c.realm, tribe: c.tribe, tier: c.tier,
    atk: c.atk * m, hp: c.hp * m, kw: [...c.kw], golden, noPool: false };
}
function makeSpellItem(spellId) { return { uid: UID++, spell: spellId }; }
const isSpell = it => !!it.spell;
const cardOf = m => CARD_BY_ID[m.id];

// ───────────────────────────── partida
function newGame(heroId, seed = Date.now() % 1e9) {
  G.seed = seed;
  G.rng = mulberry32(seed);
  G.round = 0;
  G.log = [];
  G.replays = [];
  G.over = false;
  G.pool = {};
  CARDS.forEach(c => { G.pool[c.id] = COPIES_BY_TIER[c.tier]; });

  const botStyles = shuffle(['tempo', 'eco', 'tribo', 'reino', 'tempo', 'tribo', 'reino']);
  const botNames = ['Ignis', 'Maré', 'Zéfiro', 'Raiz', 'Cinza', 'Bruma', 'Rocha'];
  const heroes = HEROES.map(h => h.id);
  G.players = [];
  G.players.push(makePlayer(0, 'Você', true, heroId));
  for (let i = 1; i < CONFIG.players; i++) {
    const p = makePlayer(i, botNames[i - 1], false, pick(heroes));
    p.style = botStyles[i - 1];
    p.favTribe = pick(Object.keys(TRIBES).filter(t => TRIBES[t].tier <= 5));
    p.favRealm = pick(REALM_ORDER);
    G.players.push(p);
  }
  G.human = G.players[0];
}

function makePlayer(id, name, isHuman, heroId) {
  return { id, name, isHuman, hero: heroId, hp: CONFIG.heroHp, alive: true, placement: null,
    tier: 1, upgradeCost: UPGRADE_COST[2], gold: 0, treasury: 0, lastInterest: 0,
    ether: { fogo: 0, agua: 0, ar: 0, terra: 0 },
    board: [], hand: [], shop: [], spellShop: [],
    freeRerolls: 0, pinsUsed: 0, firstBuyDone: false, heroUsed: false, terraPlayed: 0, spellDiscountRound: 0,
    stats: { bought: 0, sold: 0, burned: 0, spells: 0, triples: 0, rerolls: 0, goldSpent: 0, ups: 0 },
    roundStats: null,
    networth: [], lastOpp: null, lastResult: null, wishlist: new Set(), ghostBoard: [] };
}

const alivePlayers = () => G.players.filter(p => p.alive);
const hasHero = (p, id) => p.hero === id;

function log(p, kind, text) {
  if (!p.isHuman) return;
  G.log.push({ round: G.round, kind, text, gold: p.gold, ether: { ...p.ether }, treasury: p.treasury });
}

// ───────────────────────────── vira / manilha
function revealVira() {
  const rank = 1 + Math.floor(G.rng() * 13);
  G.vira = { tribe: TRIBE_BY_RANK[rank], realm: pick(REALM_ORDER) };
  G.manilha = TRIBE_BY_RANK[(rank % 13) + 1];
}

// ───────────────────────────── rodada
function startRound() {
  G.round++;
  revealVira();
  for (const p of alivePlayers()) {
    if (G.round > 1 && p.tier < 7) p.upgradeCost = Math.max(0, p.upgradeCost - 1);
    const base = Math.min(CONFIG.maxGold, CONFIG.startGold + G.round - 1);
    const goblins = p.board.some(m => m.tribe === 'goblin');
    const interest = Math.min(CONFIG.treasuryMaxInterest, Math.floor(p.treasury / CONFIG.treasuryStep)) * (goblins ? 2 : 1);
    p.lastInterest = interest;
    p.gold = base + p.treasury + interest;
    p.treasury = 0;
    p.pinsUsed = 0; p.firstBuyDone = false; p.heroUsed = false; p.spellDiscountRound = 0;
    p.roundStats = { bought: 0, sold: 0, burned: 0, spells: 0, rerolls: 0, goldStart: p.gold };
    rollShop(p, true);
    log(p, 'round', `Rodada ${G.round} · Vira: ${TRIBES[G.vira.tribe].name} de ${REALMS[G.vira.realm].name} → Manilha: ${TRIBES[G.manilha].name}` +
      (interest ? ` · juros do Tesouro +${interest}💰` : ''));
    for (const m of [...p.board]) fireHook(p, m, 'startRecruit');
  }
}

// ───────────────────────────── estoque e loja
function shopWeight(p, cardId) {
  const c = CARD_BY_ID[cardId];
  if (c.tier > p.tier) return 0;
  const late = p.tier >= 5 && c.tier <= 2 ? CONFIG.lowTierWeightLate : 1;
  return G.pool[cardId] * late;
}

function drawFromPool(p, filter) {
  const ids = CARDS.filter(c => (!filter || filter(c))).map(c => c.id);
  let total = 0;
  const ws = ids.map(id => { const w = shopWeight(p, id); total += w; return w; });
  if (total <= 0) return null;
  let r = G.rng() * total;
  for (let i = 0; i < ids.length; i++) { r -= ws[i]; if (r <= 0) { G.pool[ids[i]]--; return ids[i]; } }
  const last = ids[ids.length - 1]; G.pool[last]--; return last;
}

function returnToPool(cardId, n = 1) { G.pool[cardId] = Math.min(COPIES_BY_TIER[CARD_BY_ID[cardId].tier], G.pool[cardId] + n); }

function rollShop(p, newRound = false) {
  const kept = [];
  for (const s of p.shop) {
    if (s.pinned) { if (newRound) s.pinned = false; kept.push(s); }
    else returnToPool(s.id);
  }
  p.shop = kept;
  const slots = SHOP_SLOTS_BY_TIER[p.tier];
  if (p.shop.length < slots && TRIBES[G.manilha].tier <= p.tier && !p.shop.some(s => CARD_BY_ID[s.id].tribe === G.manilha)) {
    const id = drawFromPool(p, c => c.tribe === G.manilha);
    if (id) p.shop.push({ uid: UID++, id, pinned: false, manilha: true });
  }
  while (p.shop.length < slots) {
    const id = drawFromPool(p);
    if (!id) break;
    p.shop.push({ uid: UID++, id, pinned: false });
  }
  p.spellShop = [{ uid: UID++, mago: true }, { uid: UID++, spell: pick(SPELLS).id }];
}

function minionCost(p, cardId) {
  let cost = CONFIG.minionCost;
  if (CONFIG.highTierCost && CARD_BY_ID[cardId].tier >= 6) cost = 3;
  const contested = G.players.some(o => o !== p && o.alive && [...o.board, ...o.hand].some(m => m.id === cardId));
  if (contested) cost += 1;
  if (hasHero(p, 'h-agua') && !p.firstBuyDone) cost -= 1;
  return Math.max(0, cost);
}
function isContested(p, cardId) {
  return G.players.some(o => o !== p && o.alive && [...o.board, ...o.hand].some(m => m.id === cardId));
}

function spend(p, n) { p.gold -= n; p.stats.goldSpent += n; }

// ───────────────────────────── ações do jogador
const ACTIONS = {
  reroll(p, free = false) {
    if (!free && p.freeRerolls > 0) { p.freeRerolls--; free = true; }
    if (!free) { if (p.gold < CONFIG.rerollCost) return false; spend(p, CONFIG.rerollCost); }
    rollShop(p);
    p.stats.rerolls++; p.roundStats.rerolls++;
    log(p, 'reroll', free ? 'Renovou a loja (grátis)' : 'Renovou a loja (1💰)');
    return true;
  },

  upgrade(p) {
    if (p.tier >= 7 || p.gold < p.upgradeCost) return false;
    spend(p, p.upgradeCost);
    p.tier++;
    p.upgradeCost = p.tier < 7 ? UPGRADE_COST[p.tier + 1] : 0;
    p.stats.ups++;
    log(p, 'upgrade', `Subiu a Taverna para o nível ${p.tier}`);
    return true;
  },

  buy(p, shopUid) {
    const i = p.shop.findIndex(s => s.uid === shopUid);
    if (i < 0 || p.hand.length >= CONFIG.handSize) return false;
    const s = p.shop[i];
    const cost = minionCost(p, s.id);
    if (p.gold < cost) return false;
    spend(p, cost);
    p.firstBuyDone = true;
    p.shop.splice(i, 1);
    const m = makeMinion(s.id);
    p.hand.push(m);
    p.stats.bought++; p.roundStats.bought++;
    log(p, 'buy', `Comprou ${m.name} (${TRIBES[m.tribe].name} de ${REALMS[m.realm].name}) por ${cost}💰`);
    return m;
  },

  pin(p, shopUid) {
    const s = p.shop.find(x => x.uid === shopUid);
    if (!s) return false;
    if (s.pinned) { s.pinned = false; return true; }
    const cost = p.pinsUsed === 0 ? 0 : 1;
    if (p.gold < cost) return false;
    if (cost) spend(p, cost);
    p.pinsUsed++;
    s.pinned = true;
    log(p, 'pin', `Fixou ${CARD_BY_ID[s.id].name}${cost ? ' (1💰)' : ' (grátis)'}`);
    return true;
  },

  burnShop(p, shopUid) {
    const i = p.shop.findIndex(s => s.uid === shopUid);
    if (i < 0 || p.gold < CONFIG.shopBurnCost) return false;
    spend(p, CONFIG.shopBurnCost);
    const s = p.shop.splice(i, 1)[0];
    returnToPool(s.id);
    const c = CARD_BY_ID[s.id];
    p.ether[c.realm] += 1;
    afterBurn(p, c.realm);
    log(p, 'burn', `Queimou ${c.name} da loja (+1 Éter ${REALMS[c.realm].icon})`);
    return true;
  },

  play(p, handUid, index = p.board.length) {
    const i = p.hand.findIndex(m => m.uid === handUid);
    if (i < 0) return false;
    const m = p.hand[i];
    if (isSpell(m)) return false;
    // Magnetizar: funde ao Golem mais à direita
    if (m.kw.includes('magnetic')) {
      const target = [...p.board].reverse().find(b => b.tribe === 'golem');
      if (target) {
        p.hand.splice(i, 1);
        target.atk += m.atk; target.hp += m.hp;
        m.kw.filter(k => k !== 'magnetic').forEach(k => { if (!target.kw.includes(k)) target.kw.push(k); });
        if (!m.noPool) returnToPool(m.id, m.golden ? 3 : 1);
        log(p, 'play', `Magnetizou ${m.name} em ${target.name} (+${m.atk}/+${m.hp})`);
        return true;
      }
    }
    if (p.board.length >= CONFIG.boardSize) return false;
    p.hand.splice(i, 1);
    p.board.splice(Math.min(index, p.board.length), 0, m);
    log(p, 'play', `Jogou ${m.name}`);
    if (cardOf(m).battlecry) fireHook(p, m, 'battlecry');
    if (m.realm === 'terra' && hasHero(p, 'h-terra')) {
      p.terraPlayed++;
      if (p.terraPlayed % 3 === 0 && p.hand.length < CONFIG.handSize) {
        p.hand.push(makeSpellItem('ascensao'));
        log(p, 'hero', 'Feiticeiro da Terra: ganhou Ascensão');
      }
    }
    return true;
  },

  move(p, uid, toIndex) {
    const i = p.board.findIndex(m => m.uid === uid);
    if (i < 0) return false;
    const [m] = p.board.splice(i, 1);
    p.board.splice(Math.min(toIndex, p.board.length), 0, m);
    return true;
  },

  sell(p, uid) {
    const from = p.board.some(m => m.uid === uid) ? p.board : p.hand;
    const i = from.findIndex(m => m.uid === uid);
    if (i < 0 || isSpell(from[i])) return false;
    const m = from.splice(i, 1)[0];
    const value = SELL_VALUE_BY_TIER[m.tier] + (m.golden ? 1 : 0);
    p.gold += value;
    if (!m.noPool) returnToPool(m.id, m.golden ? 3 : 1);
    p.stats.sold++; p.roundStats.sold++;
    log(p, 'sell', `Vendeu ${m.name}${m.golden ? ' (dourado)' : ''} por ${value}💰`);
    if (cardOf(m).onSell) fireHook(p, m, 'onSell');
    return true;
  },

  burn(p, uid) {
    const from = p.board.some(m => m.uid === uid) ? p.board : p.hand;
    const i = from.findIndex(m => m.uid === uid);
    if (i < 0) return false;
    const m = from.splice(i, 1)[0];
    if (isSpell(m)) { // queimar feitiço devolve 1 Éter do reino principal
      const s = SPELL_BY_ID[m.spell]; const r = Object.keys(s.cost)[0];
      p.ether[r] += 1; log(p, 'burn', `Queimou o feitiço ${s.name} (+1 Éter ${REALMS[r].icon})`); return true;
    }
    const gain = m.golden ? 3 : 1;
    p.ether[m.realm] += gain;
    if (!m.noPool) returnToPool(m.id, m.golden ? 3 : 1);
    afterBurn(p, m.realm);
    log(p, 'burn', `Queimou ${m.name} (+${gain} Éter ${REALMS[m.realm].icon})`);
    return true;
  },

  buyMago(p) {
    const s = p.spellShop.find(x => x.mago);
    if (!s || p.gold < MAGO_COST || p.hand.length >= CONFIG.handSize) return false;
    spend(p, MAGO_COST);
    p.spellShop = p.spellShop.filter(x => x !== s);
    const sp = pick(SPELLS);
    p.hand.push(makeSpellItem(sp.id));
    p.spellDiscountRound++;
    log(p, 'mago', `Chamou o Mago: ganhou ${sp.name} e −1 Éter nos feitiços nesta rodada`);
    return true;
  },

  buySpell(p, uid) {
    const s = p.spellShop.find(x => x.uid === uid && x.spell);
    if (!s || p.hand.length >= CONFIG.handSize) return false;
    const cost = spellCost(p, s.spell);
    if (!canPayEther(p, cost)) return false;
    payEther(p, cost);
    p.spellShop = p.spellShop.filter(x => x !== s);
    p.hand.push(makeSpellItem(s.spell));
    log(p, 'spellbuy', `Comprou o feitiço ${SPELL_BY_ID[s.spell].name} (${etherText(cost)})`);
    return true;
  },

  cast(p, handUid, targetUid) {
    const i = p.hand.findIndex(x => x.uid === handUid);
    if (i < 0 || !isSpell(p.hand[i])) return false;
    const sp = SPELL_BY_ID[p.hand[i].spell];
    let target = null;
    if (sp.target) {
      target = p.board.find(m => m.uid === targetUid);
      if (!target) return false;
      if (sp.maxTier && target.tier > sp.maxTier) return false;
      if (sp.needsNonGolden && target.golden) return false;
      if (sp.id === 'mare' && p.hand.length >= CONFIG.handSize + 1) return false;
    }
    p.hand.splice(i, 1);
    sp.cast(recruitCtx(p, target), target);
    p.stats.spells++; p.roundStats.spells++;
    log(p, 'spell', `Conjurou ${sp.name}${target ? ' em ' + target.name : ''}`);
    for (const m of [...p.board]) if (cardOf(m).onSpell) fireHook(p, m, 'onSpell');
    return true;
  },

  heroPower(p) {
    if (p.heroUsed) return false;
    if (hasHero(p, 'h-fogo')) {
      if (p.gold < 1 || !p.shop.length) return false;
      spend(p, 1);
      const s = pick(p.shop); p.shop = p.shop.filter(x => x !== s); returnToPool(s.id);
      const c = CARD_BY_ID[s.id];
      p.ether[c.realm] += 1; p.ether.fogo += 2;
      afterBurn(p, c.realm);
      log(p, 'hero', `Poder: queimou ${c.name} (+1 Éter ${REALMS[c.realm].icon}, +2 Éter 🔥)`);
    } else if (hasHero(p, 'h-ar')) {
      ACTIONS.reroll(p, true);
      log(p, 'hero', 'Poder: renovação grátis');
    } else return false;
    p.heroUsed = true;
    return true;
  },

  fuse(p, cardId) {
    const all = [...p.board, ...p.hand].filter(m => !isSpell(m) && m.id === cardId && !m.golden);
    if (all.length < 3) return false;
    const three = all.slice(0, 3);
    const base = CARD_BY_ID[cardId];
    let extraA = 0, extraH = 0;
    const kws = new Set(base.kw);
    three.forEach(m => { extraA += m.atk - base.atk; extraH += m.hp - base.hp; m.kw.forEach(k => kws.add(k)); });
    const boardIdx = p.board.findIndex(m => three.includes(m));
    p.board = p.board.filter(m => !three.includes(m));
    p.hand = p.hand.filter(m => !three.includes(m));
    const g = makeMinion(cardId, true);
    g.atk += Math.max(0, extraA); g.hp += Math.max(0, extraH); g.kw = [...kws];
    if (boardIdx >= 0) p.board.splice(boardIdx, 0, g); else p.hand.push(g);
    p.stats.triples++;
    log(p, 'triple', `Fundiu 3× ${base.name} → ${base.name} DOURADO`);
    return discoverOptions(p);
  },

  discover(p, cardId) {
    G.pool[cardId]--;
    const m = makeMinion(cardId);
    if (p.hand.length < CONFIG.handSize) p.hand.push(m); else { returnToPool(cardId); }
    log(p, 'discover', `Descobriu ${m.name}`);
    return true;
  },
};

function discoverOptions(p) {
  const tier = Math.min(7, p.tier + 1);
  const opts = shuffle(CARDS.filter(c => c.tier === tier && G.pool[c.id] > 0).map(c => c.id)).slice(0, 3);
  return opts;
}

function triplesAvailable(p) {
  const counts = {};
  [...p.board, ...p.hand].forEach(m => { if (!isSpell(m) && !m.golden) counts[m.id] = (counts[m.id] || 0) + 1; });
  return Object.keys(counts).filter(id => counts[id] >= 3);
}

// ───────────────────────────── queimar
function realmCount(p, realm) { return p.board.filter(m => m.realm === realm).length; }

function afterBurn(p, realm) {
  p.stats.burned++; if (p.roundStats) p.roundStats.burned++;
  for (const m of [...p.board]) if (cardOf(m).onBurn) fireHook(p, m, 'onBurn');
}

// ───────────────────────────── formações: mãos de poker
// Recebe cartas com { tribe, realm } (fichas sem tribo não contam). Devolve a melhor mão de 5.
function evaluatePoker(cards) {
  const real = cards.filter(m => m.tribe && TRIBES[m.tribe]);
  const rankOf = m => TRIBES[m.tribe].rank;
  const result = (id, used) => ({ hand: POKER_HANDS.find(h => h.id === id), cards: used });
  if (!real.length) return result('carta', []);

  // sequência: aceita Ás baixo (A-2-3-4-5) e Ás alto (10-J-Q-K-A)
  function straightIn(list) {
    const byRank = {};
    list.forEach(m => { const r = rankOf(m); (byRank[r] = byRank[r] || []).push(m); if (r === 1) (byRank[14] = byRank[14] || []).push(m); });
    for (let top = 14; top >= 5; top--) {
      const seq = [];
      for (let r = top; r > top - 5; r--) { if (!byRank[r]) break; seq.push(byRank[r][0]); }
      if (seq.length === 5) return { cards: seq, top };
    }
    return null;
  }

  const bySuit = {};
  real.forEach(m => { (bySuit[m.realm] = bySuit[m.realm] || []).push(m); });
  for (const s of Object.keys(bySuit)) {
    if (bySuit[s].length < 5) continue;
    const st = straightIn(bySuit[s]);
    if (st) return result(st.top === 14 ? 'royal' : 'sflush', st.cards);
  }
  const groups = {};
  real.forEach(m => { (groups[rankOf(m)] = groups[rankOf(m)] || []).push(m); });
  const g = Object.values(groups).sort((a, b) => b.length - a.length || rankOf(b[0]) - rankOf(a[0]));
  if (g[0].length >= 4) return result('quadra', g[0].slice(0, 4));
  if (g[0].length >= 3 && g[1] && g[1].length >= 2) return result('full', [...g[0].slice(0, 3), ...g[1].slice(0, 2)]);
  const flushSuit = Object.keys(bySuit).find(s => bySuit[s].length >= 5);
  if (flushSuit) return result('flush', bySuit[flushSuit].sort((a, b) => rankOf(b) - rankOf(a)).slice(0, 5));
  const st = straightIn(real);
  if (st) return result('sequencia', st.cards);
  if (g[0].length >= 3) return result('trinca', g[0].slice(0, 3));
  if (g[0].length >= 2 && g[1] && g[1].length >= 2) return result('doispares', [...g[0].slice(0, 2), ...g[1].slice(0, 2)]);
  if (g[0].length >= 2) return result('par', g[0].slice(0, 2));
  return result('carta', []);
}

// O que falta para as próximas mãos (dica do Grimório)
function pokerOuts(cards) {
  const real = cards.filter(m => m.tribe);
  const tips = [];
  const groups = {}, suits = {};
  real.forEach(m => { const r = TRIBES[m.tribe].rank; groups[r] = (groups[r] || 0) + 1; suits[m.realm] = (suits[m.realm] || 0) + 1; });
  const name = r => TRIBES[TRIBE_BY_RANK[r]].name;
  Object.entries(suits).forEach(([s, n]) => { if (n >= 3 && n < 5) tips.push(`Flush de ${REALMS[s].name}: falta${5 - n > 1 ? 'm' : ''} ${5 - n}`); });
  Object.entries(groups).forEach(([r, n]) => { if (n === 3) tips.push(`Quadra de ${name(+r)}: falta 1`); if (n === 2) tips.push(`Trinca de ${name(+r)}: falta 1`); });
  const ranks = new Set(Object.keys(groups).map(Number)); if (ranks.has(1)) ranks.add(14);
  let best = null;
  for (let top = 14; top >= 5; top--) {
    const miss = []; for (let r = top; r > top - 5; r--) if (!ranks.has(r)) miss.push(r === 14 ? 1 : r);
    if (miss.length > 0 && miss.length <= 2 && (!best || miss.length < best.miss.length)) best = { top, miss };
  }
  if (best) tips.push(`Sequência: falta${best.miss.length > 1 ? 'm' : ''} ${best.miss.map(name).join(' e ')}`);
  return tips.slice(0, 4);
}

// ───────────────────────────── Éter
function spellCost(p, spellId) {
  const cost = { ...SPELL_BY_ID[spellId].cost };
  if (cost[G.vira.realm]) cost[G.vira.realm]--; // reino do Vira barateia
  let disc = p.spellDiscountRound + p.board.reduce((s, m) => s + (cardOf(m).spellDiscount ? (m.golden ? 2 : 1) : 0), 0);
  while (disc > 0) {
    const k = Object.keys(cost).sort((a, b) => cost[b] - cost[a])[0];
    if (!k || cost[k] <= 0) break;
    cost[k]--; disc--;
  }
  Object.keys(cost).forEach(k => { if (cost[k] <= 0) delete cost[k]; });
  return cost;
}
const canPayEther = (p, cost) => Object.entries(cost).every(([r, n]) => p.ether[r] >= n);
const payEther = (p, cost) => Object.entries(cost).forEach(([r, n]) => { p.ether[r] -= n; });
const etherText = cost => Object.entries(cost).map(([r, n]) => `${n}${REALMS[r].icon}`).join(' ') || 'grátis';

// ───────────────────────────── hooks de recrutamento
function royalMult(p, kind) {
  let mult = 1;
  p.board.forEach(m => { if (cardOf(m).royal === kind) mult = Math.max(mult, m.golden ? 3 : 2); });
  return mult;
}

function fireHook(p, m, hook) {
  const fn = cardOf(m)[hook];
  if (!fn) return;
  let times = m.golden ? 2 : 1;
  if (hook === 'battlecry') times *= royalMult(p, 'battlecry');
  if (hook === 'endTurn') times *= royalMult(p, 'endTurn');
  for (let i = 0; i < times; i++) fn(recruitCtx(p, m));
}

function recruitCtx(p, self) {
  const others = (realm, tribe) => p.board.filter(m => m !== self && (!realm || m.realm === realm) && (!tribe || m.tribe === tribe));
  const ctx = {
    buff(m, a, h) { if (m) { m.atk += a; m.hp += h; } },
    buffSelf(a, h) { ctx.buff(self, a, h); },
    buffRandom(a, h) { const o = others(); if (o.length) ctx.buff(pick(o), a, h); },
    buffAll(a, h, realm, tribe) { others(realm, tribe).forEach(m => ctx.buff(m, a, h)); },
    giveKeyword(m, k) { if (m && !m.kw.includes(k)) m.kw.push(k); },
    giveKeywordRandom(k) { const o = others().filter(m => !m.kw.includes(k)); if (o.length) ctx.giveKeyword(pick(o), k); },
    gainGold(n) { p.gold += n; },
    gainEther(r, n) { p.ether[r] += n; },
    gainTreasury(n) { p.treasury += n; },
    freeRerolls(n) { p.freeRerolls += n; },
    rerollFree() { rollShop(p); },
    burnRandomShop() {
      const s = p.shop.filter(x => !x.pinned); if (!s.length) return;
      const t = pick(s); p.shop = p.shop.filter(x => x !== t); returnToPool(t.id);
      const c = CARD_BY_ID[t.id]; p.ether[c.realm] += 1; afterBurn(p, c.realm);
      log(p, 'burn', `${self ? self.name : 'Efeito'} queimou ${c.name} da loja (+1 Éter ${REALMS[c.realm].icon})`);
    },
    burnStrongestShopAbsorb() {
      const s = p.shop.filter(x => !x.pinned); if (!s.length || !self) return;
      const t = s.reduce((a, b) => (CARD_BY_ID[b.id].atk + CARD_BY_ID[b.id].hp > CARD_BY_ID[a.id].atk + CARD_BY_ID[a.id].hp ? b : a));
      p.shop = p.shop.filter(x => x !== t); returnToPool(t.id);
      const c = CARD_BY_ID[t.id]; self.atk += c.atk; self.hp += c.hp;
      p.ether[c.realm] += 1; afterBurn(p, c.realm);
      log(p, 'burn', `${self.name} queimou ${c.name} e absorveu +${c.atk}/+${c.hp}`);
    },
    copyToHand(m) { if (p.hand.length < CONFIG.handSize) { const c = makeMinion(m.id); c.noPool = true; p.hand.push(c); } },
    makeGolden(m) { m.golden = true; m.atk += cardOf(m).atk; m.hp += cardOf(m).hp; },
    setRealm(m, r) { m.realm = r; },
    viraRealm() { return G.vira.realm; },
    // efeitos só de combate viram no-op no recrutamento
    damageRandomEnemy() {}, damageAllEnemies() {}, summon() {},
  };
  return ctx;
}

// ───────────────────────────── fim do turno
function endTurn(p) {
  for (const m of [...p.board]) fireHook(p, m, 'endTurn');
  if (p.gold > 0) { p.treasury += p.gold; log(p, 'treasury', `Guardou ${p.gold}💰 no Tesouro`); p.gold = 0; }
}

function networth(p) {
  const items = [...p.board, ...p.hand].filter(m => !isSpell(m));
  return p.gold + p.treasury + items.reduce((s, m) => s + SELL_VALUE_BY_TIER[m.tier] + (m.golden ? 1 : 0), 0) +
    Object.values(p.ether).reduce((a, b) => a + b, 0);
}

// ───────────────────────────── probabilidades (Deck Tracker)
function shopOdds(p, cardId) {
  const c = CARD_BY_ID[cardId];
  if (c.tier > p.tier || G.pool[cardId] <= 0) return 0;
  const pinned = p.shop.filter(s => s.pinned).length;
  const manilhaOn = TRIBES[G.manilha].tier <= p.tier;
  const slots = Math.max(0, SHOP_SLOTS_BY_TIER[p.tier] - pinned - (manilhaOn ? 1 : 0));
  let W = 0;
  CARDS.forEach(x => { W += shopWeight(p, x.id); });
  const w = shopWeight(p, cardId);
  let miss = W > 0 ? Math.pow(1 - w / W, slots) : 1;
  if (manilhaOn && c.tribe === G.manilha) {
    const mw = CARDS.filter(x => x.tribe === G.manilha).reduce((s, x) => s + G.pool[x.id], 0);
    if (mw > 0) miss *= 1 - G.pool[cardId] / mw;
  }
  return 1 - miss;
}

// ───────────────────────────── combate entre jogadores
function pairPlayers() {
  const alive = shuffle(alivePlayers());
  for (let t = 0; t < 8; t++) {
    const bad = alive.some((p, i) => i % 2 === 0 && alive[i + 1] && alive[i + 1].id === p.lastOpp);
    if (!bad) break;
    shuffle(alive);
  }
  const pairs = [];
  for (let i = 0; i < alive.length; i += 2) {
    if (alive[i + 1]) pairs.push([alive[i], alive[i + 1]]);
    else {
      const dead = G.players.filter(p => !p.alive && p.ghostBoard.length);
      const src = dead.length ? pick(dead) : pick(alive.filter(p => p !== alive[i]));
      pairs.push([alive[i], { ghost: true, name: `Fantasma de ${src.name}`, board: src.alive ? src.board : src.ghostBoard, tier: src.tier, id: src.id }]);
    }
  }
  return pairs;
}

function resolveCombats() {
  const results = [];
  const pairs = pairPlayers();
  for (const [a, b] of pairs) {
    const record = a.isHuman || b.isHuman;
    const sim = simulateCombat(a.board, b.board, { record, seed: Math.floor(G.rng() * 1e9), sideA: a, sideB: b });
    let dmg = 0, loser = null, winner = null;
    if (sim.winner === 'A') { winner = a; loser = b; dmg = a.tier + sim.survivors.reduce((s, m) => s + m.tier, 0); }
    else if (sim.winner === 'B') { winner = b; loser = a; dmg = b.tier + sim.survivors.reduce((s, m) => s + m.tier, 0); }
    if (G.round <= CONFIG.earlyDamageRounds) dmg = Math.min(dmg, CONFIG.earlyDamageCap);
    if (loser && !loser.ghost) loser.hp -= dmg;
    [a, b].forEach(p => { if (p.ghost) return; const o = p === a ? b : a; p.lastOpp = o.id; p.lastResult = sim.winner === 'tie' ? 'empate' : (p === winner ? 'vitória' : 'derrota'); });
    const res = { a, b, sim, dmg, winner, loser, round: G.round };
    if (record) {
      G.replays.push({ round: G.round, you: a.isHuman ? 'A' : 'B', aName: a.name, bName: b.name, frames: sim.frames,
        result: sim.winner === 'tie' ? 'empate' : ((winner && winner.isHuman) ? 'vitória' : 'derrota'), dmg });
      results.human = res;
    }
    results.push(res);
  }
  // eliminações
  const dying = alivePlayers().filter(p => p.hp <= 0).sort((x, y) => x.hp - y.hp);
  // quem morre nesta rodada fica atrás dos vivos (o com menos vida, mais atrás)
  let place = alivePlayers().length;
  dying.forEach(p => {
    p.alive = false; p.placement = place--;
    p.ghostBoard = p.board.map(m => ({ ...m, kw: [...m.kw] }));
  });
  G.players.forEach(p => p.networth.push(p.alive || dying.includes(p) ? networth(p) : null));
  if (alivePlayers().length === 1) alivePlayers()[0].placement = 1;
  if (!G.human.alive || alivePlayers().length <= 1) G.over = true;
  return results;
}
