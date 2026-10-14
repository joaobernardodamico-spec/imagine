// Elementarios Arena — bots. Usam exatamente as mesmas ações do jogador.
// Estilos: tempo (mesa forte cedo), eco (Tesouro e Taverna), tribo (caça uma tribo), reino (caça um reino).

const TIER_SCHEDULE = { tempo: [0, 0, 3, 5, 7, 9, 11, 13], eco: [0, 0, 2, 4, 6, 8, 10, 12], tribo: [0, 0, 3, 5, 7, 9, 12, 14], reino: [0, 0, 3, 5, 7, 9, 12, 14] };

function botScore(p, cardId) {
  const c = CARD_BY_ID[cardId];
  let s = c.tier * 3 + (c.atk + c.hp) * 0.6;
  if (c.tribe === G.manilha) s += 2;
  if (p.style === 'tribo' && c.tribe === p.favTribe) s += 6;
  if (p.style === 'reino' && c.realm === p.favRealm) s += 5;
  const owned = [...p.board, ...p.hand].filter(m => m.id === cardId && !m.golden).length;
  s += owned * 5;
  if (c.royal) s += 6;
  // quanto essa carta melhora a mão de poker da arena
  const mine = [...p.board, ...p.hand].filter(m => !isSpell(m));
  const now = evaluatePoker(mine).hand.rank;
  const next = evaluatePoker([...mine, { tribe: c.tribe, realm: c.realm }]).hand.rank;
  s += (next - now) * 5;
  return s;
}
const minionValue = m => m.tier * 3 + (m.atk + m.hp) * 0.6 + (m.golden ? 8 : 0);

function botTurn(p) {
  const sched = TIER_SCHEDULE[p.style] || TIER_SCHEDULE.tempo;
  // 1) subir de Taverna conforme o cronograma do estilo
  if (p.tier < 7 && G.round >= sched[p.tier + 1] && p.gold >= p.upgradeCost) ACTIONS.upgrade(p);
  if (p.style === 'eco' && p.tier < 7 && p.gold >= p.upgradeCost + 2) ACTIONS.upgrade(p);

  if (hasHero(p, 'h-ar')) ACTIONS.heroPower(p);

  // 2) comprar / renovar
  let rerolls = 0, guard = 0;
  const reserve = p.style === 'eco' && G.round < 8 ? 3 : 0;
  while (guard++ < 30) {
    const cands = p.shop.map(s => ({ s, score: botScore(p, s.id), cost: minionCost(p, s.id) }))
      .filter(x => x.cost <= p.gold - reserve).sort((a, b) => b.score - a.score);
    const roomy = p.board.length + p.hand.filter(m => !isSpell(m)).length < CONFIG.boardSize;
    const best = cands[0];
    if (best && (roomy || (p.board.length && best.score > Math.min(...p.board.map(minionValue)) + 3))) {
      if (!roomy) {
        const weakest = p.board.reduce((a, b) => (minionValue(b) < minionValue(a) ? b : a));
        if (p.style === 'reino' || G.rng() < 0.4) ACTIONS.burn(p, weakest.uid); else ACTIONS.sell(p, weakest.uid);
      }
      if (!ACTIONS.buy(p, best.s.uid)) break;
      botPlayHand(p);
      continue;
    }
    if (p.gold - reserve >= CONFIG.rerollCost + CONFIG.minionCost && rerolls < 3) { ACTIONS.reroll(p); rerolls++; continue; }
    break;
  }

  // 3) Mago e feitiços
  if (p.gold >= MAGO_COST + reserve && G.round >= 4 && G.rng() < 0.5) ACTIONS.buyMago(p);
  const sp = p.spellShop.find(x => x.spell);
  if (sp && canPayEther(p, spellCost(p, sp.spell))) ACTIONS.buySpell(p, sp.uid);
  botCastSpells(p);

  if (hasHero(p, 'h-fogo') && p.gold >= 1) ACTIONS.heroPower(p);
  botPlayHand(p);

  // 4) organizar: Provocar e vida alta na frente, Últimos Suspiros no meio
  p.board.sort((a, b) => (b.kw.includes('taunt') - a.kw.includes('taunt')) || (b.hp - a.hp));
}

function botPlayHand(p) {
  for (const id of triplesAvailable(p)) {
    const opts = ACTIONS.fuse(p, id);
    if (opts && opts.length) ACTIONS.discover(p, opts.sort((a, b) => botScore(p, b) - botScore(p, a))[0]);
  }
  for (const m of [...p.hand]) {
    if (isSpell(m)) continue;
    if (p.board.length < CONFIG.boardSize || m.kw.includes('magnetic')) ACTIONS.play(p, m.uid);
  }
}

function botCastSpells(p) {
  for (const it of [...p.hand]) {
    if (!isSpell(it)) continue;
    const sp = SPELL_BY_ID[it.spell];
    let target = null;
    if (sp.target) {
      const pool = p.board.filter(m => (!sp.maxTier || m.tier <= sp.maxTier) && (!sp.needsNonGolden || !m.golden));
      if (!pool.length) continue;
      target = pool.reduce((a, b) => (minionValue(b) > minionValue(a) ? b : a));
    }
    ACTIONS.cast(p, it.uid, target && target.uid);
  }
}
