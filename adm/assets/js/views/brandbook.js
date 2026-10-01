// Marca do projeto: o livro da marca seção por seção e, no fim, o manual completo em slides (PDF).
// Textos ficam em projects.brand (salvam sozinhos ao sair do campo).
// Imagens (logos, variações, mockups…) ficam na tabela brand_assets, uma linha por imagem.
import { store, uid } from '../store.js';
import { ARCHETYPES, BUSINESS_MODELS } from '../config.js';
import { me, account } from '../ops.js';
import { esc, icon, toast, readImage } from '../util.js';
import { hexNorm, codes, contrast, grade, inkOn, luminance } from '../color.js';

export const BRAND_GROUPS = [
  { key: 'essencia',       label: 'Essência',         icon: 'sparkle' },
  { key: 'voz',            label: 'Tom de voz',       icon: 'mic' },
  { key: 'arquetipos',     label: 'Arquétipos',       icon: 'compass' },
  { key: 'posicionamento', label: 'Posicionamento',   icon: 'target' },
  { key: 'publico',        label: 'Público-alvo',     icon: 'users' },
  { key: 'cores',          label: 'Paleta de cores',  icon: 'brand' },
  { key: 'logo',           label: 'Logo',             icon: 'shapes' },
  { key: 'tipografia',     label: 'Tipografia',       icon: 'text' },
  { key: 'aplicacoes',     label: 'Aplicações',       icon: 'image' },
  { key: 'evolucao',       label: 'Marca atualizada', icon: 'refresh' },
  { key: 'manual',         label: 'Manual completo',  icon: 'book' },
];

const LOGO_PARTS = [
  ['composicao', 'Composição'], ['posicoes', 'Variações de posição'], ['cores-logo', 'Variações de cor'],
  ['respiro', 'Respiro e reduções'], ['incorretos', 'Usos incorretos'],
];

const PERSONA_FIELDS = [
  ['name', 'Nome', 'Ex.: Ana, a curiosa'], ['age', 'Faixa etária', '25–34', 'dl-age'], ['gender', 'Gênero', 'Feminino', 'dl-gender'],
  ['occupation', 'Ocupação', 'Profissão / momento'], ['income', 'Classe / renda', 'Classe B', 'dl-income'], ['location', 'Onde vive', 'Cidade, bairro…'],
  ['style', 'Estilo de vida', 'Rotina, gostos, como se veste…', null, true], ['desires', 'Desejos e interesses', '', null, true],
  ['pains', 'Dores', '', null, true], ['channels', 'Onde encontrar', 'Instagram, eventos, indicação…'], ['quote', 'Uma frase dela(e)', '“…”'],
];

const LIST_MAX = { personas: 3, colors: 12, fonts: 6, values: 8, deliveries: 8 };

let RO = false; // somente leitura (sem permissão de edição)

// ------------------------------------------------------------
// Dados
// ------------------------------------------------------------
export const assetsOf = (pid, section) => store.where('brand_assets', a => a.project_id === pid && a.section === section)
  .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));

const brandOf = p => p.brand || {};
const has = v => Array.isArray(v) ? v.length > 0 : !!String(v ?? '').trim();

function filledGroups(p) {
  const b = brandOf(p);
  const A = s => assetsOf(p.id, s).length;
  return {
    essencia: has(b.essence) || has(b.concept) || has(b.purpose) || has(b.name_meaning),
    voz: has(b.voice?.essence) || (b.voice?.keywords || []).some(has),
    arquetipos: has(b.archetypes?.main),
    posicionamento: has(b.positioning) || has(b.business_model),
    publico: has(b.personas),
    cores: has(b.colors),
    logo: A('composition') + A('composition_result') + A('positions') + A('color_versions') + A('clearspace') + A('misuse') > 0,
    tipografia: has(b.fonts),
    aplicacoes: A('mockups') > 0,
    evolucao: A('before') + A('draft') + A('after') > 0,
  };
}

export function brandProgress(p) {
  const f = Object.values(filledGroups(p));
  const done = f.filter(Boolean).length;
  return { done, total: f.length, pct: Math.round((done / f.length) * 100) };
}

function setPath(obj, path, val) {
  const keys = path.split('.');
  const root = structuredClone(obj || {});
  let o = root;
  keys.slice(0, -1).forEach((k, i) => {
    if (!o[k] || typeof o[k] !== 'object') o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  });
  o[keys.at(-1)] = val;
  return root;
}
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

async function saveBrand(pid, brand, silent = false) {
  await store.update('projects', pid, { brand }, { silent });
}

// ------------------------------------------------------------
// Campos (salvam sozinhos ao sair)
// ------------------------------------------------------------
const ro = () => (RO ? 'readonly' : '');
const field = (b, path, { ph = '', rows = 0, cls = '' } = {}) => rows
  ? `<textarea class="bb-in ${cls}" rows="${rows}" data-change="bSet" data-path="${path}" placeholder="${esc(ph)}" ${ro()}>${esc(getPath(b, path) || '')}</textarea>`
  : `<input class="bb-in ${cls}" data-change="bSet" data-path="${path}" value="${esc(getPath(b, path) || '')}" placeholder="${esc(ph)}" ${ro()}>`;
const itemField = (list, it, f, ph = '', rows = 0, extra = '') => rows
  ? `<textarea class="bb-in" rows="${rows}" data-change="bItem" data-list="${list}" data-id="${esc(it.id)}" data-field="${f}" placeholder="${esc(ph)}" ${ro()}>${esc(it[f] || '')}</textarea>`
  : `<input class="bb-in" data-change="bItem" data-list="${list}" data-id="${esc(it.id)}" data-field="${f}" value="${esc(it[f] || '')}" placeholder="${esc(ph)}" ${extra} ${ro()}>`;
const block = (title, hint, inner, id = '') => `<section class="card bb-block" ${id ? `id="bb-${id}"` : ''}>
  <header class="bb-block-head"><h3>${title}</h3>${hint ? `<p class="muted">${hint}</p>` : ''}</header>${inner}</section>`;
const addBtn = (list, label, b) => RO || (b[list] || []).length >= LIST_MAX[list] ? ''
  : `<button class="bb-add" data-act="bListAdd" data-list="${list}">${icon('plus', 16)} ${label}</button>`;
const delBtn = (list, it) => RO ? '' : `<button class="icon-btn bb-del" data-act="bListDel" data-list="${list}" data-id="${esc(it.id)}" title="Remover">${icon('trash', 15)}</button>`;

// ------------------------------------------------------------
// Painel
// ------------------------------------------------------------
export function brandbookPanel(p, edit, sub) {
  RO = !edit;
  const g = BRAND_GROUPS.some(x => x.key === sub) ? sub : 'essencia';
  const b = brandOf(p);
  const filled = filledGroups(p);
  const pr = brandProgress(p);
  const acc = account(p.account_id);
  const accBrand = acc?.brand || {};
  const canImport = edit && pr.done === 0 && (has(accBrand.colors) || has(accBrand.fonts) || has(accBrand.essence));

  if (g === 'manual') return manualView(p);

  return `<div class="bb">
    <header class="card bb-head">
      <div>
        <div class="kicker">Marca · ${esc(p.name)}</div>
        <h2>${b.essence ? esc(b.essence) : '<span class="muted">A essência da marca em uma frase</span>'}</h2>
        <p class="muted">${pr.done} de ${pr.total} seções preenchidas · tudo salva sozinho</p>
      </div>
      <div class="row gap-8 wrap">
        ${canImport ? `<button class="btn btn-ghost" data-act="brandImport">${icon('download', 16)} Trazer da conta ${esc(acc.name)}</button>` : ''}
        <a class="btn btn-primary" href="#/projetos/${esc(p.id)}/marca/manual">${icon('book', 16)} Manual completo</a>
      </div>
    </header>
    <div class="bb-layout">
      <nav class="bb-nav card" aria-label="Seções da marca">
        ${BRAND_GROUPS.map(x => `<a href="#/projetos/${esc(p.id)}/marca/${x.key}" class="${x.key === g ? 'active' : ''}">
          ${icon(x.icon, 16)}<span>${esc(x.label)}</span>${filled[x.key] ? `<i class="bb-ok">${icon('check', 12)}</i>` : ''}</a>
          ${x.key === 'logo' && g === 'logo' ? `<div class="bb-subnav">${LOGO_PARTS.map(([k, l]) => `<a href="#bb-${k}" data-act="bbJump" data-to="bb-${k}">${esc(l)}</a>`).join('')}</div>` : ''}`).join('')}
      </nav>
      <div class="bb-body">${GROUPS[g](p, b)}</div>
    </div>
    <datalist id="dl-age">${['Até 17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+', 'Todas as idades'].map(o => `<option value="${o}">`).join('')}</datalist>
    <datalist id="dl-gender">${['Feminino', 'Masculino', 'Não-binário', 'Todos'].map(o => `<option value="${o}">`).join('')}</datalist>
    <datalist id="dl-income">${['Classe A', 'Classe B', 'Classe C', 'Classe D/E', 'Empresas'].map(o => `<option value="${o}">`).join('')}</datalist>
    <datalist id="dl-role">${['Títulos', 'Texto', 'Destaque', 'Assinatura'].map(o => `<option value="${o}">`).join('')}</datalist>
  </div>`;
}

const GROUPS = {
  essencia(p, b) {
    return `
      ${block('Essência em uma frase', 'A frase que abre o manual e resume tudo.', field(b, 'essence', { ph: 'Ex.: Doces que transformam momentos em memórias.', cls: 'big' }))}
      ${block(`O que é “${esc(p.name)}”?`, 'A origem e o significado do nome.', field(b, 'name_meaning', { rows: 3, ph: 'De onde vem o nome, o que ele carrega…' }))}
      <div class="grid-2-eq">
        ${block('Conceito', 'A ideia central que sustenta a marca.', field(b, 'concept', { rows: 4 }))}
        ${block('Propósito', 'Por que a marca existe, além de vender.', field(b, 'purpose', { rows: 4 }))}
      </div>
      <div class="grid-2-eq">
        ${block(`${icon('eye', 16)} Visão`, 'Onde a marca quer chegar.', field(b, 'vision', { rows: 3 }))}
        ${block(`${icon('target', 16)} Missão`, 'O que a marca faz todo dia para chegar lá.', field(b, 'mission', { rows: 3 }))}
      </div>
      ${block(`${icon('heart', 16)} Valores`, 'O que guia as decisões. 3 a 5 costuma bastar.', `
        <div class="mini-cards">${(b.values || []).map(it => `<div class="mini-card">
          ${itemField('values', it, 'title', 'Valor')}${itemField('values', it, 'desc', 'O que ele significa na prática', 2)}${delBtn('values', it)}</div>`).join('')}
          ${addBtn('values', 'Valor', b)}</div>`)}`;
  },

  voz(p, b) {
    const kw = b.voice?.keywords || [];
    return `
      ${block('Essência da voz', 'Como a marca soa, em uma frase.', field(b, 'voice.essence', { ph: 'Ex.: Uma amiga elegante que fala com carinho e sem enrolação.', cls: 'big' }))}
      ${block('4 palavras-chave de tom', 'As palavras que todo texto da marca precisa respeitar.', `
        <div class="kw-grid">${[0, 1, 2, 3].map(i => `<div class="kw"><span>${i + 1}</span>${field(b, `voice.keywords.${i}`, { ph: ['Acolhedora', 'Elegante', 'Espontânea', 'Direta'][i] })}</div>`).join('')}</div>`)}
      <div class="grid-2-eq">
        ${block(`<span class="ok">${icon('check', 16)}</span> Como falamos`, 'Um item por linha.', field(b, 'voice.do', { rows: 6, ph: 'Frases curtas\nVocê, nunca o senhor\nEmojis com moderação' }))}
        ${block(`<span class="bad">${icon('x', 16)}</span> Como não falamos`, 'Um item por linha.', field(b, 'voice.dont', { rows: 6, ph: 'Gírias\nTermos técnicos sem explicar\nCaixa alta para gritar' }))}
      </div>`;
  },

  arquetipos(p, b) {
    const a = b.archetypes || {};
    const slots = [['main', 'Principal'], ['second', 'Secundário'], ['extra', 'Complemento (opcional)']];
    const posOf = k => slots.findIndex(([s]) => a[s] === k);
    return `
      ${block('Arquétipos da marca', 'Clique para escolher: o primeiro clique vira o principal, depois o secundário e o complemento. Clique de novo para tirar.', `
        <div class="arch-slots">${slots.map(([s, l], i) => {
          const def = ARCHETYPES.find(x => x.key === a[s]);
          return `<div class="arch-slot ${def ? 'has' : ''}"><small>${i + 1} · ${l}</small>
            ${def ? `<strong>${esc(def.name)}</strong><span class="muted">${esc(def.motto)}</span>${RO ? '' : `<button class="icon-btn" data-act="archClear" data-slot="${s}" title="Tirar">${icon('x', 14)}</button>`}` : '<span class="muted">Escolha abaixo</span>'}</div>`;
        }).join('')}</div>
        <div class="arch-grid">${ARCHETYPES.map(x => {
          const i = posOf(x.key);
          return `<button class="arch ${i >= 0 ? 'on' : ''}" data-act="archPick" data-key="${x.key}" ${RO ? 'disabled' : ''}>
            ${i >= 0 ? `<i>${i + 1}</i>` : ''}<strong>${esc(x.name)}</strong><span>${esc(x.motto)}</span><small>${esc(x.desc)}</small></button>`;
        }).join('')}</div>`)}
      ${block('Como os arquétipos aparecem na marca', '', field(b, 'archetypes_note', { rows: 4, ph: 'Na comunicação, no visual, no atendimento…' }))}`;
  },

  posicionamento(p, b) {
    const bm = new Set(b.business_model || []);
    return `
      ${block('Posicionamento', 'Para [público] que [necessidade], [marca] é [categoria] que [benefício], diferente de [concorrência] porque [razão].',
        field(b, 'positioning', { rows: 5, cls: 'big' }))}
      ${block('Modelo de negócio', 'Marque o que vale para a marca.', `
        <div class="bm-chips">${BUSINESS_MODELS.map(m => `<button class="bq-opt ${bm.has(m) ? 'on' : ''}" data-act="bToggle" data-path="business_model" data-val="${esc(m)}" ${RO ? 'disabled' : ''}>${esc(m)}</button>`).join('')}</div>
        ${field(b, 'business_note', { rows: 3, ph: 'Como a marca ganha dinheiro: canais, ticket, recorrência…' })}`)}`;
  },

  publico(p, b) {
    return `
      ${block('Personas', 'De 2 a 3 pessoas reais que a marca quer conquistar.', `
        <div class="personas">${(b.personas || []).map((it, i) => `<article class="persona">
          <header><span class="persona-av">${icon('user', 22)}</span><div><small>Persona ${i + 1}</small>${itemField('personas', it, 'name', 'Nome')}</div>${delBtn('personas', it)}</header>
          <div class="persona-grid">${PERSONA_FIELDS.slice(1).map(([f, l, ph, dl, big]) => `<label class="${big ? 'wide' : ''}"><span>${l}</span>
            ${big ? itemField('personas', it, f, ph, 2) : itemField('personas', it, f, ph, 0, dl ? `list="${dl}"` : '')}</label>`).join('')}</div>
        </article>`).join('')}
        ${addBtn('personas', 'Persona', b)}</div>`)}
      ${block('Entregas de valor', 'O que a marca entrega para esse público: resultado, sensação, transformação.', `
        <div class="mini-cards">${(b.deliveries || []).map(it => `<div class="mini-card">
          ${itemField('deliveries', it, 'title', 'Entrega')}${itemField('deliveries', it, 'desc', 'Por que isso importa para a persona', 2)}${delBtn('deliveries', it)}</div>`).join('')}
          ${addBtn('deliveries', 'Entrega de valor', b)}</div>`)}`;
  },

  cores(p, b) {
    const colors = (b.colors || []).filter(c => hexNorm(c.hex));
    const total = colors.reduce((s, c) => s + (Number(c.share) || 0), 0);
    return `
      ${block('Paleta de cores', 'Escolha a cor no seletor ou cole o HEX. Os códigos RGB, CMYK e HSL saem sozinhos; clique num código para copiar.', `
        <div class="palette">${(b.colors || []).map(c => colorCard(c)).join('')}${addBtn('colors', 'Cor', b)}</div>`)}
      ${colors.length ? block('Sistema cromático', 'Proporção de uso de cada cor (preencha o % em cada card; vazio divide igual).', `
        <div class="chroma-bar">${colors.map(c => `<span style="flex:${total ? Number(c.share) || 0 : 1};background:${c.hex};color:${inkOn(c.hex)}" title="${esc(c.name || c.hex)}">${total && c.share ? `${Number(c.share)}%` : ''}</span>`).join('')}</div>`) : ''}
      ${colors.length > 1 ? block('Contrastes', 'Texto (coluna) sobre fundo (linha). AAA e AA passam em texto normal; AA+ só em texto grande (títulos).', contrastMatrix(colors)) : ''}`;
  },

  logo(p, b) {
    const palette = (b.colors || []).map(c => hexNorm(c.hex)).filter(Boolean);
    const cbg = hexNorm(b.composition_bg) || palette[0] || '#1D5CF0';
    return `
      ${block('Composição da logo', 'Os símbolos e ideias que, somados, formam a marca final.', `
        ${composition(p, cbg)}
        ${RO ? '' : `<div class="bb-row"><span class="field-label">Fundo</span>${swatchPick('bPick', 'composition_bg', cbg, palette)}</div>
          <h4 class="bb-sub">Peças (ícone, PNG/SVG ou referência + palavra)</h4>
          ${assetGrid(p, 'composition', { label: 'Palavra', note: 'Complemento (ex.: Trindade)', bg: cbg, add: 'Adicionar peça' })}
          <h4 class="bb-sub">Resultado</h4>
          ${assetGrid(p, 'composition_result', { label: 'Nome da marca', bg: cbg, max: 1, add: 'Logo final' })}`}`, 'composicao')}
      ${block('Variações de posição', 'Horizontal, vertical, símbolo, assinatura reduzida…', assetGrid(p, 'positions', { label: 'Ex.: Horizontal', bgPick: palette }), 'posicoes')}
      ${block('Variações de cor', 'A logo nas cores de aplicação: positiva, negativa, monocromática… Escolha o fundo de cada uma.', assetGrid(p, 'color_versions', { label: 'Ex.: Negativa', bgPick: palette }), 'cores-logo')}
      ${block('Respiro e reduções', 'A área de proteção ao redor da logo e o menor tamanho em que ela continua legível.', `
        ${assetGrid(p, 'clearspace', { label: 'Ex.: Área de respiro', bgPick: palette })}
        <div class="grid-3 mt-12">
          <label class="bb-lab"><span>Regra de respiro</span>${field(b, 'clearspace.rule', { ph: 'Ex.: a altura do “D” em volta de toda a logo' })}</label>
          <label class="bb-lab"><span>Redução mínima digital</span>${field(b, 'clearspace.min_digital', { ph: 'Ex.: 24 px de altura' })}</label>
          <label class="bb-lab"><span>Redução mínima impressa</span>${field(b, 'clearspace.min_print', { ph: 'Ex.: 15 mm de largura' })}</label>
        </div>`, 'respiro')}
      ${block('Usos incorretos', 'O que nunca fazer com a logo: distorcer, trocar cor, girar, aplicar sem contraste…', assetGrid(p, 'misuse', { label: 'Ex.: Não distorcer', cls: 'assets-misuse', bgPick: palette }), 'incorretos')}`;
  },

  tipografia(p, b) {
    return block('Fontes e tipografia', 'Fontes do Google Fonts aparecem com a prévia real. Outras ficam com o nome registrado.', `
      <div class="fonts-ed">${(b.fonts || []).map(f => `<article class="font-ed">
        <div class="font-spec" style="font-family:'${esc(f.name)}',var(--font)"><b>Aa</b><span>ABCDEFGHIJKLM<br>abcdefghijklm<br>0123456789</span></div>
        <div class="font-fields">
          <label class="bb-lab"><span>Fonte</span>${itemField('fonts', f, 'name', 'Ex.: Montserrat')}</label>
          <label class="bb-lab"><span>Uso</span>${itemField('fonts', f, 'role', 'Títulos', 0, 'list="dl-role"')}</label>
          <label class="bb-lab"><span>Pesos</span>${itemField('fonts', f, 'weights', 'Regular, Bold')}</label>
          <label class="bb-lab wide"><span>Por que essa fonte</span>${itemField('fonts', f, 'use', 'O que ela comunica', 2)}</label>
        </div>${delBtn('fonts', f)}
      </article>`).join('')}${addBtn('fonts', 'Fonte', b)}</div>`);
  },

  aplicacoes(p) {
    return block('Aplicações (mockups)', 'A marca no mundo: embalagem, papelaria, redes, fachada, uniforme…', assetGrid(p, 'mockups', { label: 'Ex.: Embalagem', cls: 'assets-wide', fit: 'cover' }));
  },

  evolucao(p, b) {
    return `
      ${block('Marca atualizada', 'De onde a marca saiu e onde chegou.', `
        <div class="evo">
          <div class="evo-col"><span class="evo-tag">Antes</span>
            <h4 class="bb-sub">Logo antiga</h4>${assetGrid(p, 'before', { label: 'Logo antiga', max: 1, add: 'Logo antiga' })}
            <h4 class="bb-sub">Rascunho inicial</h4>${assetGrid(p, 'draft', { label: 'Rascunho', add: 'Rascunhos' })}
          </div>
          <div class="evo-vs">VS</div>
          <div class="evo-col evo-after"><span class="evo-tag">Depois</span>
            <h4 class="bb-sub">Versão final</h4>${assetGrid(p, 'after', { label: 'Versão final', max: 1, add: 'Logo final' })}
          </div>
        </div>`)}
      ${block('O que mudou e por quê', '', field(b, 'evolution_note', { rows: 4 }))}`;
  },
};

// ------------------------------------------------------------
// Peças visuais
// ------------------------------------------------------------
function colorCard(c) {
  const hex = hexNorm(c.hex) || '#CCCCCC';
  return `<article class="color-card">
    <div class="cc-swatch" style="background:${hex};color:${inkOn(hex)}">
      ${RO ? '' : `<label class="cc-pick" title="Escolher cor">${icon('brand', 16)}<input type="color" value="${hex.toLowerCase()}" data-input="colorLive" data-change="colorHex" data-id="${esc(c.id)}"></label>`}
      <input class="cc-hex" value="${hex}" data-change="colorHex" data-id="${esc(c.id)}" aria-label="HEX" spellcheck="false" ${ro()}>
    </div>
    <div class="cc-body">
      ${itemField('colors', c, 'name', 'Nome da cor (ex.: Azul Imaginação)')}
      ${itemField('colors', c, 'why', 'Justificativa: o papel dessa cor na marca', 2)}
      <dl class="cc-codes">${codes(hex).map(([k, v]) => `<button data-act="copyCode" data-code="${esc(v)}" title="Copiar"><dt>${k}</dt><dd>${esc(v)}</dd></button>`).join('')}</dl>
      <div class="cc-foot"><label class="cc-share">${itemField('colors', c, 'share', '—', 0, 'type="number" min="0" max="100"')}<span>% de uso</span></label>${delBtn('colors', c)}</div>
    </div>
  </article>`;
}

function contrastMatrix(colors) {
  const cs = colors.slice(0, 8);
  return `<div class="table-wrap"><table class="cmatrix"><thead><tr><th></th>${cs.map(c => `<th><span style="background:${c.hex}"></span>${esc(c.name || c.hex)}</th>`).join('')}</tr></thead>
    <tbody>${cs.map(bg => `<tr><th><span style="background:${bg.hex}"></span>${esc(bg.name || bg.hex)}</th>${cs.map(fg => {
      if (fg === bg) return '<td class="cm-x"></td>';
      const r = contrast(fg.hex, bg.hex);
      const gr = grade(r);
      return `<td style="background:${bg.hex};color:${fg.hex}" class="${gr ? '' : 'cm-fail'}"><b>Aa</b><small style="color:${inkOn(bg.hex)}">${r.toFixed(1)} ${gr || '✕'}</small></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function composition(p, bg) {
  const parts = assetsOf(p.id, 'composition');
  const res = assetsOf(p.id, 'composition_result')[0];
  if (!parts.length && !res) return `<div class="compo compo-empty">${icon('shapes', 24)}<span>Adicione as peças abaixo para montar a composição.</span></div>`;
  const fig = (a, cls = '') => `<figure class="compo-part ${cls}">${a.url ? `<img src="${esc(a.url)}" alt="">` : ''}
    <figcaption>${a.note ? `<small>${esc(a.note)}</small>` : ''}<strong>${esc(a.label || '')}</strong></figcaption></figure>`;
  return `<div class="compo" style="--cbg:${bg};--cink:${inkOn(bg)}">
    ${parts.map((a, i) => `${i ? '<span class="compo-op">+</span>' : ''}${fig(a)}`).join('')}
    ${res ? `<span class="compo-op">=</span>${fig(res, 'compo-result')}` : ''}
  </div>`;
}

function swatchPick(act, path, cur, palette, id = '') {
  const opts = [...new Set([...palette, '#FFFFFF', '#0D0D0D'])];
  return `<div class="swpick">${opts.map(h => `<button class="${h === cur ? 'on' : ''}" style="background:${h}" data-act="${act}" data-path="${path}" data-id="${esc(id)}" data-bg="${h}" title="${h}"></button>`).join('')}</div>`;
}

function assetGrid(p, section, { label = 'Legenda', note = '', bg = '', bgPick = null, max = 0, cls = '', add = 'Adicionar imagens', fit = 'contain' } = {}) {
  const list = assetsOf(p.id, section);
  const canAdd = !RO && (!max || list.length < max);
  return `<div class="assets ${cls}">
    ${list.map(a => `<figure class="asset">
      <div class="asset-img fit-${fit}" style="background:${esc(a.bg || bg || 'var(--surface-2)')}"><img src="${esc(a.url)}" alt="${esc(a.label || '')}" loading="lazy"></div>
      <figcaption>
        <input class="bb-in" data-change="assetField" data-id="${esc(a.id)}" data-field="label" value="${esc(a.label || '')}" placeholder="${esc(label)}" ${ro()}>
        ${note ? `<input class="bb-in bb-in-sm" data-change="assetField" data-id="${esc(a.id)}" data-field="note" value="${esc(a.note || '')}" placeholder="${esc(note)}" ${ro()}>` : ''}
        ${bgPick && !RO ? swatchPick('assetBg', '', hexNorm(a.bg), bgPick, a.id) : ''}
      </figcaption>
      ${RO ? '' : `<button class="icon-btn asset-del" data-act="assetDel" data-id="${esc(a.id)}" title="Remover">${icon('trash', 15)}</button>`}
    </figure>`).join('')}
    ${canAdd ? `<label class="asset-add">${icon('upload', 22)}<span>${esc(add)}</span><small>PNG, SVG ou JPG</small>
      <input type="file" accept="image/*,.svg" ${max === 1 ? '' : 'multiple'} hidden data-change="assetFiles" data-section="${section}" data-max="${max}"></label>` : ''}
    ${!list.length && RO ? '<p class="muted">Nada por aqui ainda.</p>' : ''}
  </div>`;
}

// Fontes do Google Fonts para a prévia (nome inválido só falha em silêncio)
function loadFonts(b) {
  (b.fonts || []).map(f => String(f.name || '').trim()).filter(Boolean).forEach(name => {
    const id = 'gf-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(l);
  });
}

export function wireBrandbook(root, p, sub) {
  loadFonts(brandOf(p));
  if (sub === 'manual') wireManual(root);
}

// ------------------------------------------------------------
// Ações
// ------------------------------------------------------------
export const brandbookActions = {
  async bSet(el, e, { id }) {
    const p = store.find('projects', id);
    await saveBrand(id, setPath(brandOf(p), el.dataset.path, el.value.trim()), true);
  },
  async bItem(el, e, { id }) {
    const p = store.find('projects', id);
    const b = structuredClone(brandOf(p));
    const it = (b[el.dataset.list] || []).find(x => x.id === el.dataset.id);
    if (!it) return;
    it[el.dataset.field] = el.value.trim();
    await saveBrand(id, b, true);
    if (el.dataset.list === 'fonts' && el.dataset.field === 'name') { loadFonts(b); store.emit({}); }
  },
  async bListAdd(el, e, { id }) {
    const p = store.find('projects', id);
    const b = structuredClone(brandOf(p));
    const list = el.dataset.list;
    const n = (b[list] || []).length;
    const base = {
      colors: { hex: ['#1D5CF0', '#0B1B3F', '#59C6FE', '#F4F6FB', '#FFB020', '#16825D'][n % 6], name: '', why: '', share: '' },
      fonts: { name: '', role: n ? 'Texto' : 'Títulos', weights: 'Regular, Bold', use: '' },
    }[list] || {};
    b[list] = [...(b[list] || []), { id: uid(), ...base }];
    await saveBrand(id, b);
  },
  async bListDel(el, e, { id }) {
    if (['personas', 'colors', 'fonts'].includes(el.dataset.list) && !confirm('Remover este item?')) return;
    const p = store.find('projects', id);
    const b = structuredClone(brandOf(p));
    b[el.dataset.list] = (b[el.dataset.list] || []).filter(x => x.id !== el.dataset.id);
    await saveBrand(id, b);
  },
  async bToggle(el, e, { id }) {
    const p = store.find('projects', id);
    const cur = new Set(getPath(brandOf(p), el.dataset.path) || []);
    cur.has(el.dataset.val) ? cur.delete(el.dataset.val) : cur.add(el.dataset.val);
    await saveBrand(id, setPath(brandOf(p), el.dataset.path, [...cur]));
  },
  async bPick(el, e, { id }) {
    const p = store.find('projects', id);
    await saveBrand(id, setPath(brandOf(p), el.dataset.path, el.dataset.bg));
  },
  async archPick(el, e, { id }) {
    const p = store.find('projects', id);
    const a = { ...(brandOf(p).archetypes || {}) };
    const k = el.dataset.key;
    const slot = ['main', 'second', 'extra'].find(s => a[s] === k);
    if (slot) a[slot] = '';
    else a[['main', 'second', 'extra'].find(s => !a[s]) || 'extra'] = k;
    await saveBrand(id, setPath(brandOf(p), 'archetypes', a));
  },
  async archClear(el, e, { id }) {
    const p = store.find('projects', id);
    await saveBrand(id, setPath(brandOf(p), `archetypes.${el.dataset.slot}`, ''));
  },
  colorLive(el) {
    const card = el.closest('.color-card');
    const sw = card?.querySelector('.cc-swatch');
    if (!sw) return;
    sw.style.background = el.value;
    sw.style.color = inkOn(el.value);
    card.querySelector('.cc-hex').value = el.value.toUpperCase();
  },
  async colorHex(el, e, { id }) {
    const hex = hexNorm(el.value);
    if (!hex) return toast('Use um HEX válido, ex.: #1D5CF0', { kind: 'error' });
    const p = store.find('projects', id);
    const b = structuredClone(brandOf(p));
    const c = (b.colors || []).find(x => x.id === el.dataset.id);
    if (!c) return;
    c.hex = hex;
    await saveBrand(id, b);
  },
  copyCode(el) { navigator.clipboard?.writeText(el.dataset.code).then(() => toast(`${el.dataset.code} copiado`)); },
  bbJump(el) { document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },

  async assetFiles(el, e, { id }) {
    const files = [...el.files].filter(f => f.type.startsWith('image/'));
    const section = el.dataset.section;
    const max = Number(el.dataset.max) || 0;
    el.value = '';
    if (!files.length) return;
    let sort = assetsOf(id, section).length;
    const room = max ? Math.max(0, max - sort) : files.length;
    const rows = [];
    for (const f of files.slice(0, room)) {
      try {
        const url = await readImage(f);
        if (url.length > 3_000_000) { toast(`${f.name} é grande demais. Reduza e envie de novo.`, { kind: 'error' }); continue; }
        rows.push({ project_id: id, section, url, label: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), note: '', bg: '', sort: sort++, created_by: me().id });
      } catch { toast(`Não consegui ler ${f.name}`, { kind: 'error' }); }
    }
    if (rows.length) await store.insertMany('brand_assets', rows);
  },
  async assetField(el) { await store.update('brand_assets', el.dataset.id, { [el.dataset.field]: el.value.trim() }, { silent: true }); },
  async assetBg(el) { await store.update('brand_assets', el.dataset.id, { bg: el.dataset.bg }); },
  async assetDel(el) { if (confirm('Remover esta imagem?')) await store.remove('brand_assets', el.dataset.id); },

  // Projeto antigo cuja marca estava na conta: traz cores, fontes e tom para o projeto
  async brandImport(el, e, { id }) {
    const p = store.find('projects', id);
    const ab = account(p.account_id)?.brand || {};
    const lines = t => String(t || '').trim();
    await saveBrand(id, {
      ...brandOf(p),
      essence: ab.essence || '',
      colors: (ab.colors || []).map(c => ({ id: uid(), hex: hexNorm(c.hex) || '#000000', name: c.name || '', why: '', share: '' })),
      fonts: (ab.fonts || []).map(f => ({ id: uid(), name: f.name || '', role: f.role || '', weights: '', use: '' })),
      voice: { essence: lines(ab.tone), do: lines(ab.dos), dont: lines(ab.donts), keywords: [] },
    });
    toast('Marca trazida da conta', { kind: 'success' });
  },

  manualPrev() { slideBy(-1); },
  manualNext() { slideBy(1); },
  manualGo(el) { slideTo(Number(el.dataset.i)); },
  manualPdf() { printManual(); },
};

// ============================================================
// Manual completo: slides 16:9 montados com o que foi preenchido
// ============================================================
function theme(b) {
  const cs = (b.colors || []).map(c => hexNorm(c.hex)).filter(Boolean);
  const byLum = cs.slice().sort((x, y) => luminance(x) - luminance(y));
  const primary = cs[0] || '#1D5CF0';
  let dark = byLum[0] || '#0B1B3F';
  if (luminance(dark) > .12) dark = '#111111';
  let light = byLum.at(-1) || '#F6F5F1';
  if (luminance(light) < .75) light = '#F6F5F1';
  const accent = cs.find(c => c !== primary && luminance(c) > .05 && luminance(c) < .8) || primary;
  const fTitle = (b.fonts || []).find(f => /t[ií]t/i.test(f.role || ''))?.name || b.fonts?.[0]?.name || '';
  const fText = (b.fonts || []).find(f => /texto|corpo/i.test(f.role || ''))?.name || b.fonts?.[1]?.name || fTitle;
  return `--m-p:${primary};--m-on-p:${inkOn(primary)};--m-d:${dark};--m-l:${light};--m-a:${accent};--m-on-a:${inkOn(accent)};`
    + `--m-ft:${fTitle ? `'${fTitle.replace(/'/g, '')}',` : ''}var(--font-title);--m-fb:${fText ? `'${fText.replace(/'/g, '')}',` : ''}var(--font);`;
}

const lines = t => String(t || '').split('\n').map(s => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

function manualSlides(p) {
  const b = brandOf(p);
  const A = s => assetsOf(p.id, s);
  const logo = A('after')[0] || A('composition_result')[0] || A('positions')[0];
  const out = [];
  let sec = 0;
  const kick = t => `<div class="sl-kick">${String(++sec).padStart(2, '0')} · ${esc(t)}</div>`;
  const slide = (cls, inner) => out.push(`<section class="slide ${cls}">${inner}<footer class="sl-foot"><span>${esc(p.name)} · Manual de marca</span><span>${out.length + 1}</span></footer></section>`);

  // Capa
  slide('sl-cover sl-p', `<div class="sl-cover-in">
    ${logo ? `<img class="sl-logo" src="${esc(logo.url)}" alt="">` : `<div class="sl-name">${esc(p.name)}</div>`}
    <div class="sl-kick">Manual de marca</div>
    ${b.essence ? `<p class="sl-lead">${esc(b.essence)}</p>` : ''}</div>`);

  if (has(b.name_meaning) || has(b.concept)) slide('sl-l', `${kick('Essência')}
    <div class="sl-2col"><div><h2>O que é “${esc(p.name)}”?</h2><p class="sl-text">${esc(b.name_meaning || '')}</p></div>
    ${has(b.concept) ? `<div class="sl-box"><h3>Conceito</h3><p>${esc(b.concept)}</p></div>` : ''}</div>`);

  if (has(b.purpose)) slide('sl-d', `${kick('Propósito')}<blockquote class="sl-quote">${esc(b.purpose)}</blockquote>`);

  if (has(b.vision) || has(b.mission) || has(b.values)) slide('sl-l', `${kick('Visão, missão e valores')}
    <div class="sl-3col">
      ${has(b.vision) ? `<div class="sl-box"><h3>Visão</h3><p>${esc(b.vision)}</p></div>` : ''}
      ${has(b.mission) ? `<div class="sl-box"><h3>Missão</h3><p>${esc(b.mission)}</p></div>` : ''}
      ${has(b.values) ? `<div class="sl-box sl-box-p"><h3>Valores</h3><ul>${b.values.filter(v => v.title).map(v => `<li><strong>${esc(v.title)}</strong>${v.desc ? ` ${esc(v.desc)}` : ''}</li>`).join('')}</ul></div>` : ''}
    </div>`);

  const v = b.voice || {};
  if (has(v.essence) || (v.keywords || []).some(has)) slide('sl-l', `${kick('Tom de voz')}
    ${v.essence ? `<h2>${esc(v.essence)}</h2>` : ''}
    <div class="sl-kws">${(v.keywords || []).filter(has).map(k => `<span>${esc(k)}</span>`).join('')}</div>
    <div class="sl-2col sl-dodont">
      ${lines(v.do).length ? `<div><h3>Como falamos</h3><ul>${lines(v.do).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${lines(v.dont).length ? `<div class="dont"><h3>Como não falamos</h3><ul>${lines(v.dont).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </div>`);

  const ar = b.archetypes || {};
  const arch = [['main', 'Principal'], ['second', 'Secundário'], ['extra', 'Complemento']].map(([k, l]) => [l, ARCHETYPES.find(x => x.key === ar[k])]).filter(x => x[1]);
  if (arch.length) slide('sl-d', `${kick('Arquétipos')}
    <div class="sl-arch">${arch.map(([l, x], i) => `<div class="${i ? '' : 'sl-arch-main'}"><small>${l}</small><strong>${esc(x.name)}</strong><em>${esc(x.motto)}</em><p>${esc(x.desc)}</p></div>`).join('')}</div>
    ${has(b.archetypes_note) ? `<p class="sl-text">${esc(b.archetypes_note)}</p>` : ''}`);

  if (has(b.positioning) || has(b.business_model)) slide('sl-l', `${kick('Posicionamento')}
    ${has(b.positioning) ? `<h2 class="sl-h-md">${esc(b.positioning)}</h2>` : ''}
    ${has(b.business_model) ? `<div class="sl-kws sl-kws-sm"><b>Modelo de negócio</b>${b.business_model.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
    ${has(b.business_note) ? `<p class="sl-text">${esc(b.business_note)}</p>` : ''}`);

  const personas = (b.personas || []).filter(x => has(x.name) || has(x.age));
  if (personas.length) slide('sl-l', `${kick('Público-alvo')}
    <div class="sl-personas">${personas.map(x => `<div class="sl-box">
      <h3>${esc(x.name || 'Persona')}</h3>
      <p class="sl-tags">${[x.age, x.gender, x.occupation, x.income, x.location].filter(has).map(esc).join(' · ')}</p>
      ${x.style ? `<p><b>Estilo:</b> ${esc(x.style)}</p>` : ''}${x.desires ? `<p><b>Deseja:</b> ${esc(x.desires)}</p>` : ''}
      ${x.pains ? `<p><b>Dores:</b> ${esc(x.pains)}</p>` : ''}${x.channels ? `<p><b>Onde está:</b> ${esc(x.channels)}</p>` : ''}
      ${x.quote ? `<p class="sl-pq">${esc(x.quote)}</p>` : ''}</div>`).join('')}</div>`);

  const del = (b.deliveries || []).filter(x => has(x.title));
  if (del.length) slide('sl-p', `${kick('Entregas de valor')}
    <div class="sl-deliv">${del.map((x, i) => `<div><span>${i + 1}</span><strong>${esc(x.title)}</strong>${x.desc ? `<p>${esc(x.desc)}</p>` : ''}</div>`).join('')}</div>`);

  const parts = A('composition'), res = A('composition_result')[0];
  if (parts.length || res) {
    const bg = hexNorm(b.composition_bg) || hexNorm(b.colors?.[0]?.hex) || '#1D5CF0';
    slide('sl-compo', `<div class="sl-compo-bg" style="background:${bg};color:${inkOn(bg)}">${kick('Composição da logo')}
      ${res ? `<img class="sl-compo-top" src="${esc(res.url)}" alt="">` : ''}
      <div class="sl-compo-row">${parts.map((a, i) => `${i ? '<span>+</span>' : ''}<figure><img src="${esc(a.url)}" alt=""><figcaption>${esc(a.note || '')}<b>${esc(a.label || '')}</b></figcaption></figure>`).join('')}
      ${res ? `<span>=</span><figure><img src="${esc(res.url)}" alt=""><figcaption><b>${esc(res.label || p.name)}</b></figcaption></figure>` : ''}</div></div>`);
  }

  const gallery = (title, items, { cls = '', misuse = false } = {}) => {
    if (!items.length) return;
    slide(`sl-l ${cls}`, `${kick(title)}<div class="sl-gal sl-gal-${Math.min(items.length, 4)}">${items.slice(0, 8).map(a => `<figure class="${misuse ? 'misuse' : ''}">
      <div style="background:${esc(a.bg || '#FFFFFF')}"><img src="${esc(a.url)}" alt=""></div><figcaption>${misuse ? '✕ ' : ''}${esc(a.label || '')}</figcaption></figure>`).join('')}</div>`);
  };
  gallery('Variações de posição', A('positions'));
  gallery('Variações de cor', A('color_versions'));

  const cs = b.clearspace || {};
  if (A('clearspace').length || has(cs.rule) || has(cs.min_digital) || has(cs.min_print)) slide('sl-l', `${kick('Respiro e reduções')}
    <div class="sl-2col">${A('clearspace')[0] ? `<figure class="sl-fig" style="background:${esc(A('clearspace')[0].bg || '#FFFFFF')}"><img src="${esc(A('clearspace')[0].url)}" alt=""></figure>` : '<div></div>'}
    <div class="sl-rules">${has(cs.rule) ? `<div><small>Respiro</small><p>${esc(cs.rule)}</p></div>` : ''}
      ${has(cs.min_digital) ? `<div><small>Redução mínima digital</small><p>${esc(cs.min_digital)}</p></div>` : ''}
      ${has(cs.min_print) ? `<div><small>Redução mínima impressa</small><p>${esc(cs.min_print)}</p></div>` : ''}</div></div>`);

  gallery('Usos incorretos', A('misuse'), { misuse: true });

  const colors = (b.colors || []).filter(c => hexNorm(c.hex));
  if (colors.length) slide('sl-l', `${kick('Paleta de cores')}
    <div class="sl-colors sl-colors-${Math.min(colors.length, 6)}">${colors.slice(0, 8).map(c => `<div class="sl-color">
      <div style="background:${c.hex};color:${inkOn(c.hex)}"><b>${hexNorm(c.hex)}</b></div>
      <strong>${esc(c.name || '')}</strong>${c.why ? `<p>${esc(c.why)}</p>` : ''}
      <dl>${codes(c.hex).slice(1).map(([k, x]) => `<dt>${k}</dt><dd>${esc(x)}</dd>`).join('')}</dl></div>`).join('')}</div>`);

  if (colors.length > 1) {
    const pairs = [];
    colors.forEach(bg => colors.forEach(fg => { if (bg !== fg) { const r = contrast(fg.hex, bg.hex); if (r >= 4.5) pairs.push([bg, fg, r]); } }));
    pairs.sort((x, y) => y[2] - x[2]);
    if (pairs.length) slide('sl-l', `${kick('Sistema cromático')}
      <div class="sl-chroma">${colors.map(c => `<span style="flex:${Number(c.share) || 1};background:${c.hex}"></span>`).join('')}</div>
      <div class="sl-pairs">${pairs.slice(0, 8).map(([bg, fg, r]) => `<div style="background:${bg.hex};color:${fg.hex}"><b>Aa</b><small>${esc(fg.name || fg.hex)} sobre ${esc(bg.name || bg.hex)} · ${r.toFixed(1)} ${grade(r)}</small></div>`).join('')}</div>`);
  }

  const fonts = (b.fonts || []).filter(f => has(f.name));
  if (fonts.length) slide('sl-l', `${kick('Tipografia')}
    <div class="sl-fonts">${fonts.slice(0, 3).map(f => `<div><small>${esc(f.role || '')}</small>
      <b style="font-family:'${esc(f.name)}',var(--font)">Aa</b><strong>${esc(f.name)}</strong>
      <span style="font-family:'${esc(f.name)}',var(--font)">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0123456789</span>
      ${f.weights ? `<em>${esc(f.weights)}</em>` : ''}${f.use ? `<p>${esc(f.use)}</p>` : ''}</div>`).join('')}</div>`);

  const mk = A('mockups');
  for (let i = 0; i < mk.length; i += 4) {
    const chunk = mk.slice(i, i + 4);
    const head = i ? `<div class="sl-kick">${String(sec).padStart(2, '0')} · Aplicações (cont.)</div>` : kick('Aplicações');
    slide('sl-l sl-mock', `${head}<div class="sl-mocks sl-mocks-${chunk.length}">${chunk.map(a => `<figure><img src="${esc(a.url)}" alt=""><figcaption>${esc(a.label || '')}</figcaption></figure>`).join('')}</div>`);
  }

  const before = [...A('before'), ...A('draft')], after = A('after');
  if (before.length || after.length) slide('sl-l', `${kick('Marca atualizada')}
    <div class="sl-evo"><div class="sl-evo-col"><small>Antes</small><div class="sl-evo-imgs">${before.slice(0, 3).map(a => `<figure><img src="${esc(a.url)}" alt=""><figcaption>${esc(a.label || '')}</figcaption></figure>`).join('')}</div></div>
    <span class="sl-vs">VS</span>
    <div class="sl-evo-col after"><small>Depois</small>${after[0] ? `<figure class="big"><img src="${esc(after[0].url)}" alt=""></figure>` : ''}</div></div>
    ${has(b.evolution_note) ? `<p class="sl-text">${esc(b.evolution_note)}</p>` : ''}`);

  slide('sl-end sl-p', `<div class="sl-cover-in">
    ${logo ? `<img class="sl-logo sl-logo-sm" src="${esc(logo.url)}" alt="">` : ''}
    <div class="sl-name">Até o próximo projeto!</div>
    <p class="sl-lead">${esc(p.name)} · marca desenvolvida com a IMAGINE Concept</p>
    <img class="sl-imagine" src="assets/img/logo.png" alt="IMAGINE Concept"></div>`);

  return out;
}

function manualView(p) {
  const slides = manualSlides(p);
  return `<div class="manual" style="${theme(brandOf(p))}">
    <header class="card manual-bar">
      <div><div class="kicker">Manual completo</div><h2>${esc(p.name)}</h2>
        <p class="muted">Revise slide a slide. Ele se monta com o que foi preenchido nas seções da Marca.</p></div>
      <div class="row gap-8 wrap">
        <a class="btn btn-ghost" href="#/projetos/${esc(p.id)}/marca/essencia">${icon('edit', 16)} Editar marca</a>
        <button class="btn btn-primary" data-act="manualPdf">${icon('download', 16)} Baixar PDF</button>
      </div>
    </header>
    <div class="manual-stage">
      <button class="manual-arrow prev" data-act="manualPrev" aria-label="Anterior">${icon('chevL', 22)}</button>
      <div class="manual-track" id="manual-track">${slides.map(s => `<div class="slide-wrap">${s}</div>`).join('')}</div>
      <button class="manual-arrow next" data-act="manualNext" aria-label="Próximo">${icon('chevR', 22)}</button>
    </div>
    <div class="manual-dots">${slides.map((_, i) => `<button data-act="manualGo" data-i="${i}" class="${i ? '' : 'on'}" aria-label="Slide ${i + 1}">${i + 1}</button>`).join('')}
      <span class="manual-count" id="manual-count">1 / ${slides.length}</span></div>
  </div>`;
}

const track = () => document.getElementById('manual-track');
function curSlide() { const t = track(); return t ? Math.round(t.scrollLeft / t.clientWidth) : 0; }
function slideTo(i) { const t = track(); if (t) t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' }); }
function slideBy(d) { slideTo(curSlide() + d); }

function wireManual(root) {
  const t = root.querySelector('#manual-track');
  if (!t) return;
  const n = t.children.length;
  const sync = () => {
    const i = curSlide();
    root.querySelector('#manual-count').textContent = `${i + 1} / ${n}`;
    root.querySelectorAll('.manual-dots button').forEach((b, j) => b.classList.toggle('on', j === i));
  };
  t.addEventListener('scroll', () => { clearTimeout(t._s); t._s = setTimeout(sync, 60); });
  window.__manualKeys && document.removeEventListener('keydown', window.__manualKeys);
  window.__manualKeys = e => {
    if (!document.getElementById('manual-track') || e.target.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight') slideBy(1);
    if (e.key === 'ArrowLeft') slideBy(-1);
  };
  document.addEventListener('keydown', window.__manualKeys);
}

// PDF: copia os slides para uma área só de impressão, página 16:9 sem margem
async function printManual() {
  const t = track();
  if (!t) return;
  const manual = t.closest('.manual');
  const root = document.createElement('div');
  root.id = 'print-root';
  root.setAttribute('style', manual.getAttribute('style'));
  root.innerHTML = [...t.querySelectorAll('.slide')].map(s => s.outerHTML).join('');
  document.body.appendChild(root);
  const page = document.createElement('style');
  page.textContent = '@page { size: 338.67mm 190.5mm; margin: 0; }';
  document.head.appendChild(page);
  document.body.classList.add('print-manual');
  try { await document.fonts?.ready; } catch { /* noop */ }
  await Promise.all([...root.querySelectorAll('img')].map(i => i.decode?.().catch(() => {})));
  const done = () => { root.remove(); page.remove(); document.body.classList.remove('print-manual'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(() => document.getElementById('print-root') && done(), 1500);
}
