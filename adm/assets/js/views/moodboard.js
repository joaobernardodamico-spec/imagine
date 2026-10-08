// Moodboard do projeto: quadro em branco de referências.
// Grade meio torta de molduras retangulares. Arraste imagens do computador para uma moldura,
// cole com Ctrl+V ou adicione por link. No hover aparece o nome e o botão "Texto".
// O mesmo "Texto" é o diário de processo: simples, em formato de receita de bolo.
import { store } from '../store.js';
import { STAGES, JOURNAL } from '../config.js';
import { me, stagesOf } from '../ops.js';
import { esc, icon, modal, toast, shrinkImage, safeUrl } from '../util.js';

// Formatos das molduras (colunas × linhas), em ciclo: dá o ar de mural montado à mão
const SHAPES = ['w2 h2', '', 'h2', '', 'w2', '', 'h2', '', '', 'w2 h2', '', 'w2'];
const TILTS = [-1.2, .8, -.4, 1.1, -.9, .5, 1.4, -1.1, .3, -.6, 1, -.2];
const MIN_FRAMES = 12;

export const moodItems = pid => store.where('moodboard', m => m.project_id === pid)
  .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));

const SPAN = { 'w2 h2': [2, 2], 'w2': [2, 1], 'h2': [1, 2], '': [1, 1] };
const sizeOf = (m, i) => [m.w || SPAN[SHAPES[i % SHAPES.length]][0], m.h || SPAN[SHAPES[i % SHAPES.length]][1]];

export function moodPanel(p, edit) {
  const items = moodItems(p.id);
  const empties = Math.max(3, MIN_FRAMES - items.length);
  const frame = (i, inner, cls = '', attrs = '') =>
    `<div class="mframe ${cls === 'mframe-img' ? '' : SHAPES[i % SHAPES.length]} ${cls}" ${attrs.includes('style=') ? '' : `style="--tilt:${TILTS[i % TILTS.length]}deg"`} ${attrs}>${inner}</div>`;
  return `<section class="mood">
    <div class="mood-head">
      <div><div class="kicker">Quadro de referências</div><h2>Moodboard</h2>
        <p class="muted">Arraste imagens do computador para as molduras, cole com Ctrl+V ou adicione por link. Passe o mouse para ver o nome e abrir o texto.</p></div>
      ${edit ? `<div class="row gap-8 wrap">
        <button class="btn btn-ghost" data-act="moodUrl">${icon('link', 16)} Por link</button>
        <label class="btn btn-primary">${icon('upload', 16)} Enviar imagens<input type="file" accept="image/*" multiple hidden data-change="moodFiles"></label>
      </div>` : ''}
    </div>
    <div class="mood-grid ${edit ? 'can-edit' : ''}" id="mood">
      ${items.map((m, i) => { const [w, h] = sizeOf(m, i); return frame(i, `
        <img src="${esc(m.url)}" alt="${esc(m.title || 'Referência')}" loading="lazy" draggable="false">
        ${m.source && /^https?:/i.test(m.source) ? `<a class="mlink" href="${esc(safeUrl(m.source))}" target="_blank" rel="noopener" title="Abrir a origem: ${esc(m.source)}">${icon('link', 15)}</a>` : ''}
        <div class="mcap">
          <span class="mname">${esc(m.title || 'Sem nome')}${edit ? `<button class="mpen" data-act="moodEdit" data-id="${esc(m.id)}" title="Editar nome e origem">${icon('edit', 13)}</button>` : ''}</span>
          <button class="mbtn" data-act="moodInfo" data-id="${esc(m.id)}">${icon('text', 14)} Texto</button>
          ${edit ? `<button class="mbtn mbtn-x" data-act="moodDel" data-id="${esc(m.id)}" title="Remover">${icon('trash', 14)}</button>` : ''}
        </div>
        ${m.note ? `<span class="mnote-dot" title="Tem texto"></span>` : ''}
        ${edit ? `<span class="mresize" data-id="${esc(m.id)}" title="Arraste para redimensionar"></span>` : ''}`, 'mframe-img', `data-id="${esc(m.id)}" data-w="${w}" data-h="${h}" style="--tilt:${TILTS[i % TILTS.length]}deg;grid-column:span ${w};grid-row:span ${h}" ${edit ? 'draggable="true"' : ''}`); }).join('')}
      ${edit ? Array.from({ length: empties }, (_, j) => frame(items.length + j, `<span>${icon('image', 20)}<small>Solte aqui</small></span>`, 'mframe-empty', `data-slot="${items.length + j}"`)).join('') : ''}
    </div>
  </section>`;
}

async function addFiles(pid, files) {
  const imgs = [...files].filter(f => f.type.startsWith('image/'));
  if (!imgs.length) return;
  let sort = moodItems(pid).length;
  const rows = [];
  for (const f of imgs) {
    try {
      rows.push({ project_id: pid, url: await shrinkImage(f, 900, .78), title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), note: '', source: '', sort: sort++, created_by: me().id });
    } catch { toast(`Não consegui ler ${f.name}`, { kind: 'error' }); }
  }
  if (rows.length) { await store.insertMany('moodboard', rows); toast(`${rows.length} imagem${rows.length > 1 ? 'ns' : ''} no quadro`, { kind: 'success' }); }
}

// Drag & drop (arquivos de fora e troca de posição entre molduras) + colar
export function wireMood(root, pid) {
  const grid = root.querySelector('#mood.can-edit');
  if (!grid) return;
  grid.querySelectorAll('.mresize').forEach(h => h.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    const f = h.closest('.mframe');
    const cs = getComputedStyle(grid);
    const gap = parseFloat(cs.columnGap) || 14;
    const colW = parseFloat(cs.gridTemplateColumns.split(' ')[0]) + gap;
    const rowH = parseFloat(cs.gridAutoRows) + gap;
    const cols = cs.gridTemplateColumns.split(' ').length;
    const start = { x: e.clientX, y: e.clientY, w: +f.dataset.w, h: +f.dataset.h };
    f.draggable = false; f.classList.add('resizing');
    h.setPointerCapture(e.pointerId);
    const move = ev => {
      const w = Math.max(1, Math.min(cols, 4, Math.round(start.w + (ev.clientX - start.x) / colW)));
      const hh = Math.max(1, Math.min(4, Math.round(start.h + (ev.clientY - start.y) / rowH)));
      if (w === +f.dataset.w && hh === +f.dataset.h) return;
      f.dataset.w = w; f.dataset.h = hh;
      f.style.gridColumn = `span ${w}`; f.style.gridRow = `span ${hh}`;
    };
    const up = async () => {
      h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up);
      f.draggable = true; f.classList.remove('resizing');
      if (+f.dataset.w !== start.w || +f.dataset.h !== start.h) {
        try { await store.update('moodboard', f.dataset.id, { w: +f.dataset.w, h: +f.dataset.h }, { silent: true }); }
        catch (err) { toast('Não salvou o tamanho: ' + err.message, { kind: 'error' }); }
      }
    };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
  }));
  grid.querySelectorAll('.mframe-img').forEach(f => {
    f.addEventListener('dragstart', e => { e.dataTransfer.setData('text/mood-id', f.dataset.id); f.classList.add('dragging'); });
    f.addEventListener('dragend', () => f.classList.remove('dragging'));
  });
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    grid.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    e.target.closest('.mframe')?.classList.add('over');
  });
  grid.addEventListener('dragleave', e => { if (!grid.contains(e.relatedTarget)) grid.querySelectorAll('.over').forEach(x => x.classList.remove('over')); });
  grid.addEventListener('drop', async e => {
    e.preventDefault();
    const target = e.target.closest('.mframe');
    grid.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    const moved = e.dataTransfer.getData('text/mood-id');
    if (moved) {
      const items = moodItems(pid);
      const from = items.findIndex(m => m.id === moved);
      const to = target?.dataset.id ? items.findIndex(m => m.id === target.dataset.id) : items.length - 1;
      if (from < 0 || to < 0 || from === to) return;
      const [it] = items.splice(from, 1); items.splice(to, 0, it);
      for (const [i, m] of items.entries()) if (m.sort !== i) await store.update('moodboard', m.id, { sort: i });
      return;
    }
    if (e.dataTransfer.files?.length) return addFiles(pid, e.dataTransfer.files);
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (/^https?:\/\/\S+$/i.test(url)) await store.insert('moodboard', { project_id: pid, url, title: '', note: '', source: url, sort: moodItems(pid).length, created_by: me().id });
  });
  // Ctrl+V com imagem copiada (um listener por vez)
  window.__moodPaste && document.removeEventListener('paste', window.__moodPaste);
  window.__moodPaste = e => {
    if (!document.getElementById('mood') || e.target.closest?.('input, textarea')) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(pid, files); }
  };
  document.addEventListener('paste', window.__moodPaste);
}

export const moodActions = {
  async moodFiles(el, e, { id }) { await addFiles(id, el.files); el.value = ''; },
  moodUrl(el, e, { id }) {
    modal({
      title: 'Referência por link',
      fields: [
        { name: 'url', label: 'Link da imagem', required: true, placeholder: 'https://…/imagem.jpg', full: true, help: 'Clique com o botão direito na imagem → "Copiar endereço da imagem".' },
        { name: 'title', label: 'Nome da referência', full: true },
        { name: 'source', label: 'Fonte (página, perfil, Behance…)', full: true },
      ],
      async onSubmit(v) { await store.insert('moodboard', { project_id: id, ...v, note: '', sort: moodItems(id).length, created_by: me().id }); },
    });
  },
  moodInfo(el) {
    const m = store.find('moodboard', el.dataset.id);
    if (!m) return;
    modal({
      title: m.title || 'Referência',
      body: `<img class="mood-preview" src="${esc(m.url)}" alt="">`,
      fields: [
        { name: 'title', label: 'Nome da referência', value: m.title, full: true },
        { name: 'source', label: 'Fonte / link', value: m.source, full: true },
        { name: 'note', label: 'Por que ela está aqui? O que pegar dela?', type: 'textarea', rows: 5, value: m.note,
          placeholder: '• O que chama atenção\n• O que vamos usar (cor, textura, composição, tipo)\n• O que NÃO usar' },
      ],
      async onSubmit(v) { await store.update('moodboard', m.id, v); },
    });
  },
  moodEdit(el) {
    const m = store.find('moodboard', el.dataset.id);
    if (!m) return;
    modal({
      title: 'Editar referência',
      fields: [
        { name: 'title', label: 'Nome', value: m.title, full: true },
        { name: 'source', label: 'Origem (link da página, perfil, Behance…)', value: m.source, full: true, placeholder: 'https://' },
      ],
      async onSubmit(v) { await store.update('moodboard', m.id, v); },
    });
  },
  async moodDel(el) { if (confirm('Tirar esta imagem do quadro?')) await store.remove('moodboard', el.dataset.id); },

  journal(el, e, { id }) { journalModal(id, el.dataset.key); },
};

// ------------------------------------------------------------
// Diário da etapa (receita de bolo)
// ------------------------------------------------------------
export function journalSummary(stage) {
  const j = stage?.journal || {};
  const filled = JOURNAL.filter(f => j[f.key]);
  if (!filled.length) return '';
  return `<dl class="journal-sum">${filled.map(f => `<dt>${esc(f.label)}</dt><dd class="pre">${esc(j[f.key])}</dd>`).join('')}</dl>`;
}

export function journalModal(pid, key) {
  const stage = stagesOf(pid).find(s => s.key === key);
  const def = STAGES.find(s => s.key === key);
  if (!stage) return;
  const j = stage.journal || {};
  modal({
    title: `Diário · ${def.n}. ${def.name}`,
    body: `<p class="muted modal-lead">Receita de bolo: quatro respostas curtas. Quem pegar o projeto amanhã entende tudo.</p>`,
    fields: JOURNAL.map(f => ({ name: f.key, label: f.label, type: 'textarea', rows: 3, value: j[f.key], placeholder: f.hint })),
    async onSubmit(v) {
      await store.update('stages', stage.id, { journal: { ...v, updated_at: new Date().toISOString(), updated_by: me().id } });
      toast('Diário salvo', { kind: 'success' });
    },
  });
}
