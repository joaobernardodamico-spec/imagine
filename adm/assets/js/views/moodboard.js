// Moodboard do projeto: quadro em branco de referências.
// Grade meio torta de molduras. Cada moldura é uma posição fixa (o "sort" da imagem):
// clique numa moldura vazia para escolher a imagem dela, solte um arquivo do computador
// numa moldura, ou arraste uma imagem sobre outra para trocar as duas de lugar (mouse ou dedo).
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
  const used = moodSlots(p.id);
  const last = used.size ? Math.max(...used.keys()) : -1;
  const total = used.size ? last + 1 : (edit ? MIN_FRAMES : 0);
  const frame = (i, inner, cls = '', attrs = '') =>
    `<div class="mframe ${cls === 'mframe-img' ? '' : SHAPES[i % SHAPES.length]} ${cls}" ${attrs.includes('style=') ? '' : `style="--tilt:${TILTS[i % TILTS.length]}deg"`} ${attrs}>${inner}</div>`;
  return `<section class="mood">
    <div class="mood-head">
      <div><div class="kicker">Quadro de referências</div><h2>Moodboard</h2>
        <p class="muted">Clique numa imagem para ver em tela cheia. Arraste uma sobre a outra para trocar de lugar e puxe o canto para mudar o tamanho.</p></div>
      ${`<div class="row gap-8 wrap">
        ${used.size ? `<button class="btn btn-ghost" data-act="moodPdf">${icon('download', 16)} Baixar A4</button>` : ''}` + (edit ? `
        <button class="btn btn-ghost" data-act="moodUrl">${icon('link', 16)} Por link</button>
        <label class="btn btn-primary">${icon('upload', 16)} Enviar imagens<input type="file" accept="image/*" multiple hidden data-change="moodFiles"></label>` : '') + `
      </div>`}
    </div>
    <div class="mood-grid ${edit ? 'can-edit' : ''}" id="mood">
      ${Array.from({ length: total }, (_, i) => {
        const m = used.get(i);
        if (!m) return edit ? frame(i, `<span>${icon('upload', 20)}<small>Clique ou solte</small></span>`, 'mframe-empty', `data-slot="${i}" role="button" tabindex="0" aria-label="Adicionar imagem nesta moldura"`) : '';
        const [w, h] = sizeOf(m, i); return frame(i, `
        <img src="${esc(m.url)}" alt="${esc(m.title || 'Referência')}" loading="lazy" draggable="false">
        ${m.source && /^https?:/i.test(m.source) ? `<a class="mlink" href="${esc(safeUrl(m.source))}" target="_blank" rel="noopener" title="Abrir a origem: ${esc(m.source)}">${icon('link', 15)}</a>` : ''}
        <div class="mcap">
          <span class="mname">${esc(m.title || 'Sem nome')}${edit ? `<button class="mpen" data-act="moodEdit" data-id="${esc(m.id)}" title="Editar nome e origem">${icon('edit', 13)}</button>` : ''}</span>
          <button class="mbtn" data-act="moodInfo" data-id="${esc(m.id)}">${icon('text', 14)} Texto</button>
          ${edit ? `<button class="mbtn mbtn-x" data-act="moodDel" data-id="${esc(m.id)}" title="Remover">${icon('trash', 14)}</button>` : ''}
        </div>
        ${m.note ? `<span class="mnote-dot" title="Tem texto"></span>` : ''}
        ${edit ? `<span class="mresize" data-id="${esc(m.id)}" title="Arraste para redimensionar"></span>` : ''}`, 'mframe-img', `data-id="${esc(m.id)}" data-slot="${i}" data-w="${w}" data-h="${h}" style="--tilt:${TILTS[i % TILTS.length]}deg;grid-column:span ${w};grid-row:span ${h}"`);
      }).join('')}
    </div>
  </section>`;
}

// Posição de cada imagem: o sort salvo, ou a próxima livre (imagens antigas com sort repetido)
export function moodSlots(pid) {
  const used = new Map();
  let next = 0;
  for (const m of moodItems(pid)) {
    let s = Number.isInteger(m.sort) && m.sort >= 0 && !used.has(m.sort) ? m.sort : null;
    if (s === null) { while (used.has(next)) next++; s = next; }
    used.set(s, m);
  }
  return used;
}
const freeSlots = (pid, from = 0, n = 1) => {
  const used = moodSlots(pid), out = [];
  for (let s = from; out.length < n; s++) if (!used.has(s)) out.push(s);
  return out;
};

async function addFiles(pid, files, startSlot = 0) {
  const imgs = [...files].filter(f => f.type.startsWith('image/'));
  if (!imgs.length) return;
  const slots = freeSlots(pid, startSlot, imgs.length);
  const rows = [];
  for (const [i, f] of imgs.entries()) {
    try {
      rows.push({ project_id: pid, url: await shrinkImage(f, 900, .78), title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), note: '', source: '', sort: slots[i], created_by: me().id });
    } catch { toast(`Não consegui ler ${f.name}`, { kind: 'error' }); }
  }
  if (rows.length) { await store.insertMany('moodboard', rows); toast(`${rows.length} imagem${rows.length > 1 ? 'ns' : ''} no quadro`, { kind: 'success' }); }
}

// Troca duas posições (ou move para uma vazia)
async function moveTo(pid, id, slot) {
  const used = moodSlots(pid);
  const from = [...used.entries()].find(([, m]) => m.id === id)?.[0];
  if (from === undefined || from === slot) return;
  const other = used.get(slot);
  // fixa a posição de todas (corrige sort repetido de imagens antigas) e troca as duas
  for (const [s, m] of used) {
    const want = m.id === id ? slot : other && m.id === other.id ? from : s;
    if (m.sort !== want) await store.update('moodboard', m.id, { sort: want }, { silent: true });
  }
  store.emit({});
}

// Visualizador: a imagem em tela cheia, com setas, teclado e deslizar no celular
export function openViewer(pid, id) {
  const list = [...moodSlots(pid).entries()].sort((a, b) => a[0] - b[0]).map(([, m]) => m);
  let i = Math.max(0, list.findIndex(m => m.id === id));
  document.getElementById('mood-viewer')?.remove();
  const box = document.createElement('div');
  box.id = 'mood-viewer'; box.className = 'mviewer'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<button class="mv-x" aria-label="Fechar">${icon('x', 22)}</button>
    <button class="mv-nav mv-prev" aria-label="Anterior">${icon('chevL', 26)}</button>
    <figure class="mv-fig"><img alt=""><figcaption><strong></strong><span class="mv-count"></span><a class="mv-src" target="_blank" rel="noopener">${icon('link', 14)} Abrir origem</a></figcaption></figure>
    <button class="mv-nav mv-next" aria-label="Próxima">${icon('chevR', 26)}</button>`;
  document.body.appendChild(box);
  const img = box.querySelector('img');
  const show = () => {
    const m = list[i];
    img.src = m.url; img.alt = m.title || 'Referência';
    box.querySelector('strong').textContent = m.title || 'Sem nome';
    box.querySelector('.mv-count').textContent = `${i + 1} de ${list.length}`;
    const src = box.querySelector('.mv-src');
    src.hidden = !/^https?:/i.test(m.source || ''); src.href = src.hidden ? '#' : safeUrl(m.source);
    box.querySelectorAll('.mv-nav').forEach(b => { b.hidden = list.length < 2; });
  };
  const go = d => { i = (i + d + list.length) % list.length; show(); };
  const close = () => { box.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  box.querySelector('.mv-x').onclick = close;
  box.querySelector('.mv-prev').onclick = e => { e.stopPropagation(); go(-1); };
  box.querySelector('.mv-next').onclick = e => { e.stopPropagation(); go(1); };
  box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('mv-fig')) close(); });
  let sx = null;
  box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
  document.addEventListener('keydown', key);
  document.body.style.overflow = 'hidden';
  show();
}

export function wireMood(root, pid) {
  const all = root.querySelector('#mood');
  if (!all) return;
  // Quem só visualiza: clique abre a imagem em tela cheia
  if (!all.classList.contains('can-edit')) {
    all.querySelectorAll('.mframe-img').forEach(f => f.addEventListener('click', e => { if (!e.target.closest('button, a')) openViewer(pid, f.dataset.id); }));
    return;
  }
  const grid = all;
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
  // Moldura vazia: clique abre o seletor de arquivos daquela posição
  const picker = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  grid.after(picker);
  let pickSlot = 0;
  picker.addEventListener('change', async () => { await addFiles(pid, picker.files, pickSlot); picker.value = ''; });
  const openPicker = slot => { pickSlot = slot; picker.click(); };
  grid.querySelectorAll('.mframe-empty').forEach(f => {
    f.addEventListener('click', () => openPicker(+f.dataset.slot));
    f.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPicker(+f.dataset.slot); } });
  });

  // Arrastar uma imagem sobre outra (mouse ou toque): troca as duas de lugar
  grid.querySelectorAll('.mframe-img').forEach(f => {
    f.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button, a, .mresize, input')) return;
      const sx = e.clientX, sy = e.clientY;
      let ghost = null, target = null;
      const pick = (x, y) => {
        if (ghost) ghost.style.visibility = 'hidden';
        const el = document.elementFromPoint(x, y)?.closest('#mood .mframe');
        if (ghost) ghost.style.visibility = '';
        return el && el !== f ? el : null;
      };
      const move = ev => {
        if (!ghost) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
          const r = f.getBoundingClientRect();
          ghost = f.cloneNode(true);
          Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, zIndex: 300, pointerEvents: 'none', opacity: .85, transform: 'rotate(2deg) scale(.96)' });
          ghost.classList.add('mghost');
          document.body.appendChild(ghost);
          f.classList.add('dragging');
          ghost.dataset.ox = sx - r.left; ghost.dataset.oy = sy - r.top;
        }
        ev.preventDefault();
        ghost.style.left = ev.clientX - ghost.dataset.ox + 'px';
        ghost.style.top = ev.clientY - ghost.dataset.oy + 'px';
        const t = pick(ev.clientX, ev.clientY);
        if (t !== target) { target?.classList.remove('over'); target = t; target?.classList.add('over'); }
      };
      const up = async () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (!ghost) return openViewer(pid, f.dataset.id);
        ghost.remove(); f.classList.remove('dragging'); target?.classList.remove('over');
        if (target) await moveTo(pid, f.dataset.id, +target.dataset.slot);
      };
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
  });

  // Arquivos vindos do computador (arrastar e soltar): entram na moldura onde caírem
  grid.addEventListener('dragover', e => {
    if (!e.dataTransfer?.types?.includes('Files') && !e.dataTransfer?.types?.includes('text/uri-list')) return;
    e.preventDefault();
    grid.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    e.target.closest('.mframe')?.classList.add('over');
  });
  grid.addEventListener('dragleave', e => { if (!grid.contains(e.relatedTarget)) grid.querySelectorAll('.over').forEach(x => x.classList.remove('over')); });
  grid.addEventListener('drop', async e => {
    e.preventDefault();
    const target = e.target.closest('.mframe');
    grid.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    const slot = target ? +target.dataset.slot : 0;
    if (e.dataTransfer.files?.length) return addFiles(pid, e.dataTransfer.files, slot);
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (/^https?:\/\/\S+$/i.test(url)) await store.insert('moodboard', { project_id: pid, url, title: '', note: '', source: url, sort: freeSlots(pid, slot)[0], created_by: me().id });
  });
  // Ctrl+V com imagem copiada (um listener por vez)
  window.__moodPaste && document.removeEventListener('paste', window.__moodPaste);
  window.__moodPaste = e => {
    if (!document.getElementById('mood') || e.target.closest?.('input, textarea')) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(pid, files, 0); }
  };
  document.addEventListener('paste', window.__moodPaste);
}

export const moodActions = {
  async moodFiles(el, e, { id }) { await addFiles(id, el.files, 0); el.value = ''; },
  moodUrl(el, e, { id }) {
    modal({
      title: 'Referência por link',
      fields: [
        { name: 'url', label: 'Link da imagem', required: true, placeholder: 'https://…/imagem.jpg', full: true, help: 'Clique com o botão direito na imagem → "Copiar endereço da imagem".' },
        { name: 'title', label: 'Nome da referência', full: true },
        { name: 'source', label: 'Fonte (página, perfil, Behance…)', full: true },
      ],
      async onSubmit(v) { await store.insert('moodboard', { project_id: id, ...v, note: '', sort: freeSlots(id)[0], created_by: me().id }); },
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
  async moodPdf(el, e, { id }) {
    const p = store.find('projects', id);
    const used = moodSlots(id);
    const last = Math.max(...used.keys());
    const cells = Array.from({ length: last + 1 }, (_, i) => {
      const m = used.get(i);
      if (!m) return '<div class="mp-cell"></div>';
      const [w, h] = sizeOf(m, i);
      return `<figure class="mp-cell" style="grid-column:span ${Math.min(w, 6)};grid-row:span ${h}"><img src="${esc(m.url)}" alt=""></figure>`;
    }).join('');
    const root = document.createElement('div');
    root.id = 'print-root';
    root.innerHTML = `<section class="mood-print"><header><strong>${esc(p.name)}</strong><span>Moodboard · IMAGINE Concept</span></header><div class="mp-grid">${cells}</div></section>`;
    document.body.appendChild(root);
    const page = document.createElement('style');
    page.textContent = '@page { size: A4 landscape; margin: 0; }';
    document.head.appendChild(page);
    document.body.classList.add('print-manual');
    await Promise.all([...root.querySelectorAll('img')].map(i => i.decode?.().catch(() => {})));
    const done = () => { root.remove(); page.remove(); document.body.classList.remove('print-manual'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(() => document.getElementById('print-root') && done(), 1500);
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
