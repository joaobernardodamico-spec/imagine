// Elementarios Arena — dados das cartas, feitiços e feiticeiros.
// Para balancear, mexa só aqui: o motor lê tudo deste arquivo.

const REALMS = {
  fogo:  { name: 'Fogo',  icon: '🔥', color: '#e5482f' },
  agua:  { name: 'Água',  icon: '💧', color: '#2f7fe5' },
  ar:    { name: 'Ar',    icon: '🌪️', color: '#e5b52f' },
  terra: { name: 'Terra', icon: '🌿', color: '#3fae4f' },
};
const REALM_ORDER = ['fogo', 'agua', 'ar', 'terra']; // ciclo elemental

// rank segue o baralho físico (Ás=1 … Rei=13)
const TRIBES = {
  bobo:       { name: 'Bobo',       rank: 1,  tier: 1, file: '01' },
  goblin:     { name: 'Goblin',     rank: 2,  tier: 1, file: '02' },
  ladino:     { name: 'Ladino',     rank: 3,  tier: 2, file: '03' },
  golem:      { name: 'Golem',      rank: 4,  tier: 2, file: '04' },
  guerreira:  { name: 'Guerreira',  rank: 5,  tier: 3, file: '05' },
  bruxa:      { name: 'Bruxa',      rank: 6,  tier: 3, file: '06' },
  necromante: { name: 'Necromante', rank: 7,  tier: 4, file: '07' },
  orc:        { name: 'Orc',        rank: 8,  tier: 4, file: '08' },
  druida:     { name: 'Druida',     rank: 9,  tier: 5, file: '09' },
  dragao:     { name: 'Dragão',     rank: 10, tier: 5, file: '10' },
  paladino:   { name: 'Paladino',   rank: 11, tier: 6, file: 'J' },
  rainha:     { name: 'Rainha',     rank: 12, tier: 6, file: 'Q' },
  rei:        { name: 'Rei',        rank: 13, tier: 7, file: 'K' },
};
const TRIBE_BY_RANK = Object.fromEntries(Object.entries(TRIBES).map(([k, t]) => [t.rank, k]));

const COPIES_BY_TIER = [0, 15, 13, 11, 9, 7, 5, 3];
const SHOP_SLOTS_BY_TIER = [0, 3, 4, 4, 5, 5, 6, 6];
const UPGRADE_COST = [0, 0, 5, 7, 8, 9, 10, 11]; // custo para chegar no nível N
const SELL_VALUE_BY_TIER = [0, 1, 1, 1, 2, 2, 3, 3];

const KEYWORDS = {
  taunt:     { name: 'Provocar',          icon: '🛡️' },
  shield:    { name: 'Escudo',            icon: '✨' },
  windfury:  { name: 'Fúria dos Ventos',  icon: '🌀' },
  reborn:    { name: 'Renascer',          icon: '♻️' },
  poison:    { name: 'Veneno',            icon: '☠️' },
  magnetic:  { name: 'Magnetizar',        icon: '🧲' },
};

// Hooks disponíveis (todos recebem ctx; o motor aplica multiplicadores de dourado/realeza):
//  battlecry(ctx)    — Grito de Guerra, ao jogar no tabuleiro
//  endTurn(ctx)      — Fim de Turno, ao encerrar o recrutamento
//  onBurn(ctx)       — sempre que o dono queima uma carta
//  onSpell(ctx)      — sempre que o dono conjura um feitiço
//  onSell(ctx)       — quando esta carta é vendida
//  startRecruit(ctx) — no início do recrutamento
//  startCombat(ctx)  — início do combate (combate)
//  rally(ctx)        — Conclamar, quando ataca (combate)
//  deathrattle(ctx)  — Último Suspiro (combate)

const CARDS = [
  // ── NÍVEL 1 · BOBO (caos)
  { id: 'fogo-bobo', name: 'Sparky', realm: 'fogo', tribe: 'bobo', atk: 2, hp: 1,
    text: 'Grito de Guerra: queima uma carta aleatória da loja.',
    battlecry: c => c.burnRandomShop() },
  { id: 'agua-bobo', name: 'Bubble', realm: 'agua', tribe: 'bobo', atk: 1, hp: 3,
    text: 'Grito de Guerra: um aliado aleatório ganha +1/+2.',
    battlecry: c => c.buffRandom(1, 2) },
  { id: 'ar-bobo', name: 'Weather', realm: 'ar', tribe: 'bobo', atk: 2, hp: 2,
    text: 'Fim de Turno: um aliado aleatório ganha +1 de ataque.',
    endTurn: c => c.buffRandom(1, 0) },
  { id: 'terra-bobo', name: 'Rocky', realm: 'terra', tribe: 'bobo', atk: 1, hp: 3, kw: ['taunt'],
    text: 'Provocar. Último Suspiro: um aliado aleatório ganha +2 de vida.',
    deathrattle: c => c.buffRandom(0, 2) },

  // ── NÍVEL 1 · GOBLIN (ouro, dividendos 📈)
  { id: 'fogo-goblin', name: 'Scorchter', realm: 'fogo', tribe: 'goblin', atk: 3, hp: 1,
    text: 'Ao ser vendido: +1 ouro extra e +1 Éter 🔥.',
    onSell: c => { c.gainGold(1); c.gainEther('fogo', 1); } },
  { id: 'agua-goblin', name: 'Blink', realm: 'agua', tribe: 'goblin', atk: 2, hp: 2, dividend: true,
    text: '📈 Fim de Turno: +1 Éter 💧.',
    endTurn: c => c.gainEther('agua', 1) },
  { id: 'ar-goblin', name: 'Vennuk', realm: 'ar', tribe: 'goblin', atk: 2, hp: 1,
    text: 'Grito de Guerra: sua próxima renovação é grátis.',
    battlecry: c => c.freeRerolls(1) },
  { id: 'terra-goblin', name: 'Sneack', realm: 'terra', tribe: 'goblin', atk: 1, hp: 3, dividend: true,
    // vídeo do personagem: trechos em segundos (entrada no 1º ataque do combate, rugido nos seguintes)
    video: { src: 'assets/video/terra-goblin.mp4', first: [2.4, 7.0], attack: [4.4, 6.4] },
    text: '📈 Fim de Turno: guarda +1 ouro no Tesouro.',
    endTurn: c => c.gainTreasury(1) },

  // ── NÍVEL 2 · LADINO (queimar)
  { id: 'fogo-ladino', name: 'Ignarion', realm: 'fogo', tribe: 'ladino', atk: 2, hp: 3,
    text: 'Sempre que você queima uma carta, ganha +2 de ataque.',
    onBurn: c => c.buffSelf(2, 0) },
  { id: 'agua-ladino', name: 'Muracãn', realm: 'agua', tribe: 'ladino', atk: 3, hp: 3,
    text: 'Sempre que você queima uma carta, ele e um aliado aleatório ganham +1/+1.',
    onBurn: c => { c.buffSelf(1, 1); c.buffRandom(1, 1); } },
  { id: 'ar-ladino', name: 'Vortex', realm: 'ar', tribe: 'ladino', atk: 3, hp: 2,
    text: 'Grito de Guerra: queima a carta mais forte da loja e ganha os atributos dela.',
    battlecry: c => c.burnStrongestShopAbsorb() },
  { id: 'terra-ladino', name: 'Fang', realm: 'terra', tribe: 'ladino', atk: 3, hp: 3,
    text: 'Sempre que você queima uma carta, ganha +1/+2.',
    onBurn: c => c.buffSelf(1, 2) },

  // ── NÍVEL 2 · GOLEM (provocar / magnetizar)
  { id: 'fogo-golem', name: 'Krumble', realm: 'fogo', tribe: 'golem', atk: 3, hp: 3, kw: ['taunt'],
    text: 'Provocar. Último Suspiro: 1 de dano em todos os inimigos.',
    deathrattle: c => c.damageAllEnemies(1) },
  { id: 'agua-golem', name: 'Ummuaramus', realm: 'agua', tribe: 'golem', atk: 2, hp: 4, kw: ['magnetic'],
    text: 'Magnetizar (funde-se a outro Golem ao ser jogado).' },
  { id: 'ar-golem', name: 'Brisoou', realm: 'ar', tribe: 'golem', atk: 3, hp: 2, kw: ['magnetic', 'shield'],
    text: 'Magnetizar. Escudo.' },
  { id: 'terra-golem', name: 'Petrus', realm: 'terra', tribe: 'golem', atk: 2, hp: 5, kw: ['taunt'],
    text: 'Provocar.' },

  // ── NÍVEL 3 · GUERREIRA (conclamar)
  { id: 'fogo-guerreira', name: 'Kaótica', realm: 'fogo', tribe: 'guerreira', atk: 4, hp: 3,
    text: 'Conclamar: 2 de dano em um inimigo aleatório.',
    rally: c => c.damageRandomEnemy(2) },
  { id: 'agua-guerreira', name: 'Myra', realm: 'agua', tribe: 'guerreira', atk: 3, hp: 4,
    text: 'Conclamar: um aliado aleatório ganha +1/+1.',
    rally: c => c.buffRandom(1, 1) },
  { id: 'ar-guerreira', name: 'Ventanya', realm: 'ar', tribe: 'guerreira', atk: 3, hp: 3, kw: ['windfury'],
    text: 'Fúria dos Ventos. Conclamar: ganha +1 de ataque.',
    rally: c => c.buffSelf(1, 0) },
  { id: 'terra-guerreira', name: 'Crathera', realm: 'terra', tribe: 'guerreira', atk: 3, hp: 5,
    text: 'Conclamar: aliados de Terra ganham +1 de vida.',
    rally: c => c.buffAll(0, 1, 'terra') },

  // ── NÍVEL 3 · BRUXA (feitiço)
  { id: 'fogo-bruxa', name: 'Pyther', realm: 'fogo', tribe: 'bruxa', atk: 4, hp: 3,
    text: 'Grito de Guerra: +2 Éter 🔥.',
    battlecry: c => c.gainEther('fogo', 2) },
  { id: 'agua-bruxa', name: 'Hydralith', realm: 'agua', tribe: 'bruxa', atk: 3, hp: 4, spellDiscount: 1,
    text: 'Seus feitiços custam 1 Éter a menos.' },
  { id: 'ar-bruxa', name: 'Heaven', realm: 'ar', tribe: 'bruxa', atk: 3, hp: 3,
    text: 'Sempre que você conjura um feitiço, ganha +2/+2.',
    onSpell: c => c.buffSelf(2, 2) },
  { id: 'terra-bruxa', name: 'Riven', realm: 'terra', tribe: 'bruxa', atk: 2, hp: 5, dividend: true,
    text: '📈 Fim de Turno: +1 Éter 🌿.',
    endTurn: c => c.gainEther('terra', 1) },

  // ── NÍVEL 4 · NECROMANTE (último suspiro)
  { id: 'fogo-necromante', name: 'Fireshadow', realm: 'fogo', tribe: 'necromante', atk: 5, hp: 3,
    text: 'Último Suspiro: 3 de dano em um inimigo aleatório.',
    deathrattle: c => c.damageRandomEnemy(3) },
  { id: 'agua-necromante', name: 'Abysscaller', realm: 'agua', tribe: 'necromante', atk: 4, hp: 4,
    text: 'Último Suspiro: invoca um Espectro 3/3.',
    deathrattle: c => c.summon({ name: 'Espectro', realm: 'agua', atk: 3, hp: 3 }) },
  { id: 'ar-necromante', name: 'Airflade', realm: 'ar', tribe: 'necromante', atk: 4, hp: 4, kw: ['reborn'],
    text: 'Renascer. Último Suspiro: aliados de Ar ganham +1 de ataque.',
    deathrattle: c => c.buffAll(1, 0, 'ar') },
  { id: 'terra-necromante', name: 'Bonecaller', realm: 'terra', tribe: 'necromante', atk: 3, hp: 6,
    text: 'Último Suspiro: invoca dois Esqueletos 2/2.',
    deathrattle: c => { c.summon({ name: 'Esqueleto', realm: 'terra', atk: 2, hp: 2 }); c.summon({ name: 'Esqueleto', realm: 'terra', atk: 2, hp: 2 }); } },

  // ── NÍVEL 4 · ORC (crescimento / valorização)
  { id: 'fogo-orc', name: 'Blazor', realm: 'fogo', tribe: 'orc', atk: 5, hp: 4,
    text: 'Fim de Turno: ganha +2 de ataque.',
    endTurn: c => c.buffSelf(2, 0) },
  { id: 'agua-orc', name: 'Garrosh', realm: 'agua', tribe: 'orc', atk: 4, hp: 5,
    text: 'Fim de Turno: seus Orcs ganham +1/+1.',
    endTurn: c => c.buffAll(1, 1, null, 'orc') },
  { id: 'ar-orc', name: 'Astrothunder', realm: 'ar', tribe: 'orc', atk: 5, hp: 5,
    text: 'Fim de Turno: ganha +1/+1.',
    endTurn: c => c.buffSelf(1, 1) },
  { id: 'terra-orc', name: 'Gravetorn', realm: 'terra', tribe: 'orc', atk: 4, hp: 6, kw: ['taunt'],
    text: 'Provocar. Fim de Turno: ganha +2 de vida.',
    endTurn: c => c.buffSelf(0, 2) },

  // ── NÍVEL 5 · DRUIDA (fim de turno)
  { id: 'fogo-druida', name: 'Ashmar', realm: 'fogo', tribe: 'druida', atk: 6, hp: 5,
    text: 'Fim de Turno: aliados de Fogo ganham +2 de ataque.',
    endTurn: c => c.buffAll(2, 0, 'fogo') },
  { id: 'agua-druida', name: 'Ocean', realm: 'agua', tribe: 'druida', atk: 5, hp: 6,
    text: 'Fim de Turno: dois aliados aleatórios ganham +2/+2.',
    endTurn: c => { c.buffRandom(2, 2); c.buffRandom(2, 2); } },
  { id: 'ar-druida', name: 'Galegrim', realm: 'ar', tribe: 'druida', atk: 6, hp: 5,
    text: 'Fim de Turno: aliados de Ar ganham +1/+1.',
    endTurn: c => c.buffAll(1, 1, 'ar') },
  { id: 'terra-druida', name: 'Stonel', realm: 'terra', tribe: 'druida', atk: 5, hp: 7,
    text: 'Fim de Turno: todos os aliados ganham +0/+2.',
    endTurn: c => c.buffAll(0, 2) },

  // ── NÍVEL 5 · DRAGÃO (grito de guerra)
  { id: 'fogo-dragao', name: 'Bhaskaran', realm: 'fogo', tribe: 'dragao', atk: 7, hp: 5,
    text: 'Grito de Guerra: todos os aliados ganham +2 de ataque.',
    battlecry: c => c.buffAll(2, 0) },
  { id: 'agua-dragao', name: 'Hydro', realm: 'agua', tribe: 'dragao', atk: 6, hp: 6, kw: ['shield'],
    text: 'Escudo. Grito de Guerra: concede Escudo a um aliado aleatório.',
    battlecry: c => c.giveKeywordRandom('shield') },
  { id: 'ar-dragao', name: 'Kroonos', realm: 'ar', tribe: 'dragao', atk: 6, hp: 6,
    text: 'Grito de Guerra: aliados de Ar ganham +2/+2.',
    battlecry: c => c.buffAll(2, 2, 'ar') },
  { id: 'terra-dragao', name: 'Terradon', realm: 'terra', tribe: 'dragao', atk: 5, hp: 8, kw: ['taunt'],
    text: 'Provocar. Grito de Guerra: todos os aliados ganham +0/+3.',
    battlecry: c => c.buffAll(0, 3) },

  // ── NÍVEL 6 · PALADINO (Últimos Suspiros 2×)
  { id: 'fogo-paladino', name: 'Sr Berserker', realm: 'fogo', tribe: 'paladino', atk: 8, hp: 6, royal: 'deathrattle',
    text: 'Seus Últimos Suspiros disparam 2× (dourado: 3×).' },
  { id: 'agua-paladino', name: 'Sr Astarion', realm: 'agua', tribe: 'paladino', atk: 7, hp: 7, royal: 'deathrattle', kw: ['shield'],
    text: 'Escudo. Seus Últimos Suspiros disparam 2× (dourado: 3×).' },
  { id: 'ar-paladino', name: 'Sr Cloudhammer', realm: 'ar', tribe: 'paladino', atk: 7, hp: 6, royal: 'deathrattle', kw: ['windfury'],
    text: 'Fúria dos Ventos. Seus Últimos Suspiros disparam 2× (dourado: 3×).' },
  { id: 'terra-paladino', name: 'Sr Granthor', realm: 'terra', tribe: 'paladino', atk: 6, hp: 9, royal: 'deathrattle', kw: ['taunt'],
    text: 'Provocar. Seus Últimos Suspiros disparam 2× (dourado: 3×).' },

  // ── NÍVEL 6 · RAINHA (Fim de Turno 2×)
  { id: 'fogo-rainha', name: 'Andromeda', realm: 'fogo', tribe: 'rainha', atk: 8, hp: 6, royal: 'endTurn',
    text: 'Seus efeitos de Fim de Turno disparam 2× (dourada: 3×).' },
  { id: 'agua-rainha', name: 'Coralyth', realm: 'agua', tribe: 'rainha', atk: 7, hp: 7, royal: 'endTurn', kw: ['shield'],
    text: 'Escudo. Seus efeitos de Fim de Turno disparam 2× (dourada: 3×).' },
  { id: 'ar-rainha', name: 'Zephi', realm: 'ar', tribe: 'rainha', atk: 7, hp: 6, royal: 'endTurn', kw: ['windfury'],
    text: 'Fúria dos Ventos. Seus efeitos de Fim de Turno disparam 2× (dourada: 3×).' },
  { id: 'terra-rainha', name: 'Savhana', realm: 'terra', tribe: 'rainha', atk: 6, hp: 9, royal: 'endTurn', kw: ['taunt'],
    text: 'Provocar. Seus efeitos de Fim de Turno disparam 2× (dourada: 3×).' },

  // ── NÍVEL 7 · REI (Gritos de Guerra 2× + efeito do reino)
  { id: 'fogo-rei', name: 'Pyro', realm: 'fogo', tribe: 'rei', atk: 9, hp: 8, royal: 'battlecry',
    text: 'Seus Gritos de Guerra disparam 2×. Início do recrutamento: queima a carta mais forte da loja e ganha os atributos dela.',
    startRecruit: c => c.burnStrongestShopAbsorb() },
  { id: 'agua-rei', name: 'Neptulon', realm: 'agua', tribe: 'rei', atk: 8, hp: 9, royal: 'battlecry',
    text: 'Seus Gritos de Guerra disparam 2×. Fim de Turno: aliados de Água ganham +2/+2.',
    endTurn: c => c.buffAll(2, 2, 'agua') },
  { id: 'ar-rei', name: 'Ventuus', realm: 'ar', tribe: 'rei', atk: 9, hp: 8, royal: 'battlecry', kw: ['windfury'],
    text: 'Fúria dos Ventos. Seus Gritos de Guerra disparam 2×. Início do combate: aliados de Ar ganham +3 de ataque.',
    startCombat: c => c.buffAll(3, 0, 'ar') },
  { id: 'terra-rei', name: 'Marcus Aurelius', realm: 'terra', tribe: 'rei', atk: 8, hp: 10, royal: 'battlecry', kw: ['taunt'],
    text: 'Provocar. Seus Gritos de Guerra disparam 2×. Início do combate: aliados de Terra ganham +4 de vida.',
    startCombat: c => c.buffAll(0, 4, 'terra') },
];

CARDS.forEach(c => {
  c.tier = TRIBES[c.tribe].tier;
  c.kw = c.kw || [];
  c.art = `assets/cards/${c.realm}-${TRIBES[c.tribe].file}.jpg`;
});
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

// ── FEITIÇOS (custam Éter). target: 'minion' pede um alvo no seu tabuleiro.
const SPELLS = [
  { id: 'forja', name: 'Forja Elemental', cost: { fogo: 2, terra: 1 }, target: 'minion',
    text: '+3/+3 em um lacaio.', cast: (c, t) => c.buff(t, 3, 3) },
  { id: 'brasa', name: 'Brasa', cost: { fogo: 2 }, target: 'minion',
    text: '+4 de ataque em um lacaio.', cast: (c, t) => c.buff(t, 4, 0) },
  { id: 'mare', name: 'Maré Espelhada', cost: { agua: 3 }, target: 'minion', maxTier: 3,
    text: 'Cria uma cópia (nível ≤ 3) de um lacaio seu na mão.', cast: (c, t) => c.copyToHand(t) },
  { id: 'chuva', name: 'Chuva', cost: { agua: 2 },
    text: 'Todos os seus lacaios ganham +0/+2.', cast: c => c.buffAll(0, 2) },
  { id: 'vendaval', name: 'Vendaval', cost: { ar: 2 },
    text: 'Renova a loja e ganha 1 de ouro.', cast: c => { c.rerollFree(); c.gainGold(1); } },
  { id: 'rajada', name: 'Rajada', cost: { ar: 2 },
    text: 'Dois lacaios aleatórios ganham +2/+1.', cast: c => { c.buffRandom(2, 1); c.buffRandom(2, 1); } },
  { id: 'raiz', name: 'Raiz', cost: { terra: 2 }, target: 'minion',
    text: '+1/+3 e Provocar em um lacaio.', cast: (c, t) => { c.buff(t, 1, 3); c.giveKeyword(t, 'taunt'); } },
  { id: 'ascensao', name: 'Ascensão', cost: { terra: 4, ar: 3 }, target: 'minion', needsNonGolden: true,
    text: 'Transforma um lacaio na versão dourada.', cast: (c, t) => c.makeGolden(t) },
  { id: 'transmutar', name: 'Transmutar', cost: { fogo: 1, agua: 1, ar: 1, terra: 1 }, target: 'minion',
    text: 'Muda o reino de um lacaio para o reino do Vira e dá +2/+2.', cast: (c, t) => { c.setRealm(t, c.viraRealm()); c.buff(t, 2, 2); } },
];
const SPELL_BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s]));
const MAGO_COST = 2;

// ── FEITICEIROS PROVISÓRIOS (heróis)
// O poder de cada Feiticeiro mora numa relíquia que ele carrega na mão.
const HEROES = [
  { id: 'h-fogo', name: 'Feiticeiro do Fogo', realm: 'fogo', kind: 'ativo', cost: 1, relic: 'adaga', relicName: 'Adaga de Brasa',
    text: '1 ouro: a Adaga corta uma carta aleatória da loja, que queima e dá +2 Éter de Fogo extra.' },
  { id: 'h-agua', name: 'Feiticeiro da Água', realm: 'agua', kind: 'passivo', cost: null, relic: 'anel', relicName: 'Anel da Maré',
    text: 'Passivo: o Anel barateia em 1 ouro a primeira carta comprada em cada rodada.' },
  { id: 'h-ar', name: 'Feiticeiro do Ar', realm: 'ar', kind: 'ativo', cost: 0, relic: 'relogio', relicName: 'Relógio dos Ventos',
    text: '0 ouro: o Relógio volta o tempo e renova a loja de graça (1× por rodada).' },
  { id: 'h-terra', name: 'Feiticeiro da Terra', realm: 'terra', kind: 'carregável', cost: null, relic: 'amuleto', relicName: 'Amuleto de Raiz',
    text: 'O Amuleto carrega a cada lacaio de Terra jogado. Com 3 cargas, gera o feitiço Ascensão.' },
];

// Reações elementais (pares adjacentes no início do combate)
const REACTIONS = {
  'agua|fogo':  { name: 'Vapor',      icon: '♨️', text: 'as duas ganham Escudo' },
  'ar|fogo':    { name: 'Incêndio',   icon: '🔥', text: '2 de dano em todos os inimigos' },
  'fogo|terra': { name: 'Magma',      icon: '🌋', text: 'as duas ganham +3 de ataque' },
  'agua|ar':    { name: 'Tempestade', icon: '⛈️', text: 'a da esquerda ganha Fúria dos Ventos' },
  'agua|terra': { name: 'Florescer',  icon: '🌸', text: 'as duas ganham +4 de vida e Renascer' },
  'ar|terra':   { name: 'Areia',      icon: '🏜️', text: 'o primeiro inimigo perde 3 de ataque' },
};

// Formações = mãos de poker reais. Valor = arquétipo (Ás…Rei), naipe = reino.
// A melhor mão de 5 cartas da arena é avaliada no início de cada combate.
// scope: 'hand' = só as cartas que formam a mão; 'all' = a arena inteira.
const POKER_HANDS = [
  { id: 'carta',     name: 'Carta Alta',        rank: 0, atk: 0,  hp: 0,  scope: 'hand', text: 'Sem bônus.' },
  { id: 'par',       name: 'Par',               rank: 1, atk: 1,  hp: 2,  scope: 'hand', text: 'As 2 cartas do par ganham +1/+2.' },
  { id: 'doispares', name: 'Dois Pares',        rank: 2, atk: 2,  hp: 2,  scope: 'hand', text: 'As 4 cartas ganham +2/+2.' },
  { id: 'trinca',    name: 'Trinca',            rank: 3, atk: 3,  hp: 3,  scope: 'hand', text: 'As 3 cartas ganham +3/+3 e a primeira ganha Provocar.', kw: 'taunt' },
  { id: 'sequencia', name: 'Sequência',         rank: 4, atk: 3,  hp: 2,  scope: 'hand', text: 'As 5 cartas ganham +3/+2 e sua arena ataca primeiro.', first: true },
  { id: 'flush',     name: 'Flush',             rank: 5, atk: 3,  hp: 3,  scope: 'hand', text: 'As 5 cartas ganham +3/+3 e o poder do reino.', realmPower: true },
  { id: 'full',      name: 'Full House',        rank: 6, atk: 4,  hp: 4,  scope: 'all',  text: 'A arena inteira ganha +4/+4.' },
  { id: 'quadra',    name: 'Quadra',            rank: 7, atk: 6,  hp: 6,  scope: 'hand', text: 'As 4 cartas ganham +6/+6 e Escudo.', kw: 'shield', kwAll: true },
  { id: 'sflush',    name: 'Straight Flush',    rank: 8, atk: 6,  hp: 6,  scope: 'all',  text: 'A arena inteira ganha +6/+6 e Escudo.', kw: 'shield', kwAll: true },
  { id: 'royal',     name: 'Royal Flush',       rank: 9, atk: 10, hp: 10, scope: 'all',  text: 'Dragão, Paladino, Rainha, Rei e Bobo do mesmo reino: a arena inteira ganha +10/+10, Escudo e Renascer.', kw: 'shield', kw2: 'reborn', kwAll: true },
];
// Poder do reino (ativado pelo Flush)
const REALM_POWER = {
  fogo:  'as cartas de Fogo ganham +3 de ataque',
  agua:  'as cartas de Água ganham Escudo',
  ar:    'as cartas de Ar ganham Fúria dos Ventos',
  terra: 'as cartas de Terra ganham +4 de vida e Renascer',
};

const CONFIG = {
  players: 8,
  heroHp: 30,
  startGold: 3,
  maxGold: 10,
  minionCost: 2,
  rerollCost: 1,
  shopBurnCost: 1,
  boardSize: 7,
  handSize: 10,
  timerBase: 30, timerPerRound: 5, timerMax: 60,
  earlyDamageCap: 5, earlyDamageRounds: 4,
  lowTierWeightLate: 0.25, // níveis 1-2 a partir da Taverna 5
  treasuryStep: 3, treasuryMaxInterest: 3,
  manilhaBuff: 2,
};
