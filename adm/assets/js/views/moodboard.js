// Moodboard do projeto: quadro em branco de referências.
// Grade meio torta de molduras retangulares. Arraste imagens do computador para uma moldura,
// cole com Ctrl+V ou adicione por link. No hover aparece o nome e o botão "Texto".
// O mesmo "Texto" é o diário de processo: simples, em formato de receita de bolo.
import { store } from '../store.js';
import { STAGES, JOURNAL } from '../config.js';
import { me, stagesOf } from '../ops.js';
import { esc, icon, modal, toast, shrinkImage } from '../util.js';

// Formatos das molduras (colunas × linhas), em ciclo: dá o ar de mural montado à mão
const SHAPES = ['w2 h2', '', 'h2', '', 'w2', '', 'h2', '', '', 'w2 h2', '', 'w2'];
const TILTS = [-1.2, .8, -.4, 1.1, -.9, .5, 1.4, -1.1, .3, -.6, 1, -.2];
const MIN_FRAMES = 12;

export const moodItems = pid => store.where('moodboard', m => m.project_id === pid)
  .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.created_at).localeCompare(String(b.created_at)));

export function moodPanel(p, edit) {
  const items = moodItems(p.id);
  const empties = Math.max(3, MIN_FRAMES - items.length);
  const frame = (i, inner, cls = '', attrs = '') =>
    `<div class="mframe ${SHAPES[i % SHAPES.length]} ${cls}" style="--tilt:${TILTS[i % TILTS.length]}deg" ${attrs}>${inner}</div>`;
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
      ${items.map((m, i) => frame(i, `
        <img src="${esc(m.url)}" alt="${esc(m.title || 'Referência')}" loading="lazy" draggable="false">
        <div class="mcap">
          <span>${esc(m.title || 'Sem nome')}</span>
          <button class="mbtn" data-act="moodInfo" data-id="${esc(m.id)}">${icon('text', 14)} Texto</button>
          ${edit ? `<button class="mbtn mbtn-x" data-act="moodDel" data-id="${esc(m.id)}" title="Remover">${icon('trash', 14)}</button>` : ''}
        </div>
        ${m.note ? `<span class="mnote-dot" title="Tem texto"></span>` : ''}`, 'mframe-img', `data-id="${esc(m.id)}" ${edit ? 'draggable="true"' : ''}`)).join('')}
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
