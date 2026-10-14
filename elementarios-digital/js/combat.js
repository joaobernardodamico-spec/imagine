// Elementarios Arena — combate automático determinístico (com semente).
// Gera "frames" (fotografias do tabuleiro) para o replay quando record = true.

function simulateCombat(boardA, boardB, opts = {}) {
  const rng = mulberry32(opts.seed || 1);
  const rpick = arr => arr[Math.floor(rng() * arr.length)];
  const frames = [];
  let cuid = 1;

  const clone = (m, side) => ({ cuid: cuid++, id: m.id, name: m.name, realm: m.realm, tribe: m.tribe, tier: m.tier,
    atk: m.atk, hp: m.hp, kw: new Set(m.kw), golden: m.golden, side, token: !!m.token });
  const S = { A: boardA.map(m => clone(m, 'A')), B: boardB.map(m => clone(m, 'B')) };
  const other = s => (s === 'A' ? 'B' : 'A');

  function snap(note, hl = {}) {
    if (!opts.record) return;
    const dump = arr => arr.map(m => ({ cuid: m.cuid, id: m.id, name: m.name, realm: m.realm, tribe: m.tribe, tier: m.tier,
      atk: m.atk, hp: m.hp, kw: [...m.kw], golden: m.golden, token: m.token }));
    frames.push({ A: dump(S.A), B: dump(S.B), note, hl });
  }

  // ── contexto de efeitos em combate
  function ctxFor(self, side) {
    const allies = (realm, tribe) => S[side].filter(m => m !== self && m.hp > 0 && (!realm || m.realm === realm) && (!tribe || m.tribe === tribe));
    const ctx = {
      buff(m, a, h) { if (m) { m.atk += a; m.hp += h; } },
      buffSelf(a, h) { if (self.hp > 0) ctx.buff(self, a, h); },
      buffRandom(a, h) { const o = allies(); if (o.length) ctx.buff(rpick(o), a, h); },
      buffAll(a, h, realm, tribe) { allies(realm, tribe).forEach(m => ctx.buff(m, a, h)); },
      giveKeyword(m, k) { if (m) m.kw.add(k); },
      giveKeywordRandom(k) { const o = allies().filter(m => !m.kw.has(k)); if (o.length) rpick(o).kw.add(k); },
      damageRandomEnemy(n) { const e = S[other(side)].filter(m => m.hp > 0); if (e.length) { const t = rpick(e); dealDamage(t, n); snap(`${self.name} causa ${n} em ${t.name}`, { def: t.cuid, src: self.cuid }); } },
      damageAllEnemies(n) { S[other(side)].filter(m => m.hp > 0).forEach(t => dealDamage(t, n)); snap(`${self.name} causa ${n} em todos os inimigos`, { src: self.cuid }); },
      summon(spec) { summonAt(side, self._deathIndex ?? S[side].length, spec); },
      // efeitos de recrutamento viram no-op no combate
      gainGold() {}, gainEther() {}, gainTreasury() {}, freeRerolls() {}, rerollFree() {}, burnRandomShop() {}, burnStrongestShopAbsorb() {},
    };
    return ctx;
  }

  function summonAt(side, index, spec) {
    if (S[side].length >= CONFIG.boardSize) return null;
    const m = { cuid: cuid++, id: spec.id || null, name: spec.name, realm: spec.realm, tribe: spec.tribe || null, tier: spec.tier || 1,
      atk: spec.atk, hp: spec.hp, kw: new Set(spec.kw || []), golden: !!spec.golden, side, token: !spec.id };
    S[side].splice(Math.min(index, S[side].length), 0, m);
    return m;
  }

  function dealDamage(m, n, poison = false) {
    if (n <= 0 || m.hp <= 0) return;
    if (m.kw.has('shield')) { m.kw.delete('shield'); return; }
    m.hp -= n;
    if (poison) m.hp = Math.min(m.hp, 0);
  }

  const paladinMult = side => {
    let mult = 1;
    S[side].forEach(m => { if (m.hp > 0 && m.id && CARD_BY_ID[m.id].royal === 'deathrattle') mult = Math.max(mult, m.golden ? 3 : 2); });
    return mult;
  };

  function resolveDeaths() {
    for (let guard = 0; guard < 20; guard++) {
      // remove todos os mortos dos dois lados de uma vez, depois resolve os efeitos em ordem
      const dead = [];
      for (const side of ['A', 'B']) {
        for (let i = 0; i < S[side].length; i++) if (S[side][i].hp <= 0) dead.push({ m: S[side][i], side, i: i - dead.filter(d => d.side === side).length });
        S[side] = S[side].filter(m => m.hp > 0);
      }
      if (!dead.length) return;
      snap(`${dead.map(d => d.m.name).join(' e ')} ${dead.length > 1 ? 'morreram' : 'morreu'}`);
      for (const { m, side, i } of dead) {
        m._deathIndex = i;
        const card = m.id ? CARD_BY_ID[m.id] : null;
        if (card && card.deathrattle) {
          const times = (m.golden ? 2 : 1) * paladinMult(side);
          for (let t = 0; t < times; t++) card.deathrattle(ctxFor(m, side));
          snap(`Último Suspiro de ${m.name}${times > 1 ? ` (${times}×)` : ''}`);
        }
        if (m.kw.has('reborn')) {
          const r = summonAt(side, i, { id: m.id, name: m.name, realm: m.realm, tribe: m.tribe, tier: m.tier, atk: card ? card.atk * (m.golden ? 2 : 1) : m.atk, hp: 1,
            kw: [...m.kw].filter(k => k !== 'reborn' && k !== 'shield'), golden: m.golden });
          if (r) snap(`${m.name} renasceu`, { src: r.cuid });
        }
      }
    }
  }

  const cycleBonus = (from, to) => (REALM_ORDER.indexOf(from) + 1) % 4 === REALM_ORDER.indexOf(to) ? 1 : 0;

  // ── início do combate
  const pokerHand = { A: null, B: null };
  snap('Início do combate');
  for (const side of ['A', 'B']) {
    const arr = S[side];
    // Manilha
    arr.filter(m => m.tribe === G.manilha).forEach(m => { m.atk += CONFIG.manilhaBuff; m.hp += CONFIG.manilhaBuff; });
    // formação: melhor mão de poker da arena
    const ph = evaluatePoker(arr);
    pokerHand[side] = ph.hand;
    if (ph.hand.rank > 0) {
      const h = ph.hand;
      const targets = h.scope === 'all' ? arr : ph.cards;
      targets.forEach(m => { m.atk += h.atk; m.hp += h.hp; });
      if (h.kw) (h.kwAll ? targets : targets.slice(0, 1)).forEach(m => m.kw.add(h.kw));
      if (h.kw2) targets.forEach(m => m.kw.add(h.kw2));
      if (h.realmPower) {
        const realm = ph.cards[0].realm;
        arr.filter(m => m.realm === realm).forEach(m => {
          if (realm === 'fogo') m.atk += 3;
          if (realm === 'agua') m.kw.add('shield');
          if (realm === 'ar') m.kw.add('windfury');
          if (realm === 'terra') { m.hp += 4; m.kw.add('reborn'); }
        });
      }
      snap(`${side === 'A' ? (opts.sideA && opts.sideA.name) : (opts.sideB && opts.sideB.name)}: ${h.name}!`, { poker: h.id, pokerCards: ph.cards.map(m => m.cuid), side });
    }
    // Reis e outros efeitos de início de combate
    [...arr].forEach(m => { const c = m.id && CARD_BY_ID[m.id]; if (c && c.startCombat) for (let t = 0; t < (m.golden ? 2 : 1); t++) c.startCombat(ctxFor(m, side)); });
  }
  snap('Manilha, formações e Reis aplicados');

  // ── Reações elementais (esquerda → direita, cada carta reage uma vez)
  const reactionLog = [];
  for (const side of ['A', 'B']) {
    const arr = S[side];
    // Reação do Éter: 4 reinos diferentes em sequência
    for (let i = 0; i + 3 < arr.length; i++) {
      const set = new Set(arr.slice(i, i + 4).map(m => m.realm));
      if (set.size === 4) { arr.forEach(m => { m.atk += 2; m.hp += 2; }); reactionLog.push(`${side === 'A' ? '' : ''}Reação do Éter ✦`); snap('✦ Reação do Éter: todos +2/+2', { side }); break; }
    }
    const used = new Set();
    for (let i = 0; i + 1 < arr.length; i++) {
      const l = arr[i], r = arr[i + 1];
      if (used.has(l) || used.has(r) || l.realm === r.realm) continue;
      const key = [l.realm, r.realm].sort().join('|');
      const re = REACTIONS[key];
      if (!re) continue;
      used.add(l); used.add(r);
      const enemies = S[other(side)];
      switch (re.name) {
        case 'Vapor': l.kw.add('shield'); r.kw.add('shield'); break;
        case 'Incêndio': enemies.forEach(e => dealDamage(e, 2)); break;
        case 'Magma': l.atk += 3; r.atk += 3; break;
        case 'Tempestade': l.kw.add('windfury'); break;
        case 'Florescer': [l, r].forEach(m => { m.hp += 4; m.kw.add('reborn'); }); break;
        case 'Areia': if (enemies[0]) enemies[0].atk = Math.max(0, enemies[0].atk - 3); break;
      }
      snap(`${re.icon} ${re.name}: ${l.name} + ${r.name}`, { src: l.cuid, src2: r.cuid });
    }
  }
  resolveDeaths();

  // ── quem começa
  const airFirst = s => !!(pokerHand[s] && pokerHand[s].first);
  let turn;
  if (airFirst('A') !== airFirst('B')) turn = airFirst('A') ? 'A' : 'B';
  else if (S.A.length !== S.B.length) turn = S.A.length > S.B.length ? 'A' : 'B';
  else turn = rng() < 0.5 ? 'A' : 'B';

  const next = { A: 0, B: 0 };
  let steps = 0;
  while (S.A.length && S.B.length && steps++ < 300) {
    const side = turn, foe = other(side);
    const arr = S[side];
    if (!arr.some(m => m.atk > 0)) { turn = foe; if (!S[foe].some(m => m.atk > 0)) break; continue; }
    if (next[side] >= arr.length) next[side] = 0;
    let idx = next[side], tries = 0;
    while (arr[idx].atk <= 0 && tries++ < arr.length) idx = (idx + 1) % arr.length;
    const attacker = arr[idx];
    const swings = attacker.kw.has('windfury') ? 2 : 1;
    for (let sw = 0; sw < swings; sw++) {
      if (attacker.hp <= 0 || !S[foe].length) break;
      const taunts = S[foe].filter(m => m.kw.has('taunt'));
      const target = rpick(taunts.length ? taunts : S[foe]);
      const card = attacker.id && CARD_BY_ID[attacker.id];
      if (card && card.rally) {
        for (let t = 0; t < (attacker.golden ? 2 : 1); t++) card.rally(ctxFor(attacker, side));
        snap(`Conclamar: ${attacker.name}`, { src: attacker.cuid });
      }
      if (target.hp <= 0) { resolveDeaths(); continue; }
      const dA = attacker.atk + cycleBonus(attacker.realm, target.realm);
      const dT = target.atk + cycleBonus(target.realm, attacker.realm);
      dealDamage(target, dA, attacker.kw.has('poison'));
      dealDamage(attacker, dT, target.kw.has('poison'));
      snap(`${attacker.name} ataca ${target.name}`, { atk: attacker.cuid, def: target.cuid, dmgA: dT, dmgD: dA });
      resolveDeaths();
    }
    // avança o ponteiro: se o atacante sobreviveu, passa para o próximo
    const pos = S[side].indexOf(attacker);
    next[side] = pos >= 0 ? pos + 1 : idx;
    turn = foe;
  }

  const winner = S.A.length && !S.B.length ? 'A' : S.B.length && !S.A.length ? 'B' : 'tie';
  const survivors = winner === 'A' ? S.A : winner === 'B' ? S.B : [];
  snap(winner === 'tie' ? 'Empate' : `Vitória de ${winner === 'A' ? (opts.sideA && opts.sideA.name) : (opts.sideB && opts.sideB.name)}`);
  return { winner, survivors, frames, pokerHand };
}
