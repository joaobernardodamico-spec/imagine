// Helpers de UI: escape, formatação, ícones, toast, modal, celebração.

export const esc = v => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const money = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const num = v => (Number(v) || 0).toLocaleString('pt-BR');
export const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

export function date(d, opts = { day: '2-digit', month: 'short' }) {
  if (!d) return '—';
  const x = typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00') : new Date(d);
  return x.toLocaleDateString('pt-BR', opts).replace('.', '');
}
export const time = d => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const today = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const inMonth = (d, m) => !!d && String(d).slice(0, 7) === m;

export function relDays(d) {
  if (!d) return '';
  const a = new Date(today() + 'T12:00'), b = new Date(String(d).slice(0, 10) + 'T12:00');
  const diff = Math.round((b - a) / 864e5);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  if (diff === -1) return 'ontem';
  return diff > 0 ? `em ${diff}d` : `${-diff}d atrás`;
}

export function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

export const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function avatar(p, size = 28) {
  if (!p) return '';
  return `<span class="avatar" style="--av:${esc(p.color || '#12328C')};--s:${size}px" title="${esc(p.name)}">${esc(initials(p.name))}</span>`;
}

// ------------------------------------------------------------
// Ícones (traço 1.75, 24x24)
// ------------------------------------------------------------
const P = {
  home: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
  folder: 'M3 6.5A1.5 1.5 0 014.5 5H9l2 2.5h8.5A1.5 1.5 0 0121 9v9.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  flow: 'M4 4h6v6H4zM14 14h6v6h-6zM7 10v4a3 3 0 003 3h4M17 14v-4a3 3 0 00-3-3h-4',
  funnel: 'M3 4h18l-7 9v6l-4 2v-8z',
  wallet: 'M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2zM16 14.5h1',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  calendar: 'M4 6.5A1.5 1.5 0 015.5 5h13A1.5 1.5 0 0120 6.5v12a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5zM4 10h16M8 3v4M16 3v4',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H4.5a3 3 0 003.5 4M16 6h3.5a3 3 0 01-3.5 4M12 13v4M8 21h8M9.5 17h5v4h-5z',
  users: 'M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 4.15a3.5 3.5 0 010 6.7',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  link: 'M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1',
  file: 'M14 3H6.5A1.5 1.5 0 005 4.5v15A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V8zM14 3v5h5M8.5 13h7M8.5 17h5',
  note: 'M5 4h14v11l-5 5H5zM14 20v-5h5M8.5 9h7M8.5 12.5h4',
  brand: 'M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H16a5 5 0 005-5c0-4.1-4-7.5-9-7.5zM7.5 12h.01M10 7.5h.01M15 7.5h.01',
  brief: 'M8 5H6.5A1.5 1.5 0 005 6.5v13A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0017.5 5H16M9 3h6v4H9zM9 12h6M9 16h4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  logout: 'M15 4h3.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H15M10 16l-4-4 4-4M6 12h10',
  bolt: 'M13 3L4 14h7l-1 7 9-11h-7z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  google: 'M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5zM12 21c2.4 0 4.5-.8 5.9-2.2L15 16.6c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0012 21zM7 13.8a5.4 5.4 0 010-3.5V8H4a9 9 0 000 8.1zM12 6.6c1.3 0 2.5.5 3.4 1.3L18 5.4A9 9 0 004 8l3 2.3c.7-2.1 2.7-3.7 5-3.7z',
  pin: 'M9 4h6l-1 6 3 3v1H7v-1l3-3zM12 14v7',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  refresh: 'M20 11a8 8 0 00-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0014.3 4.9L20 16M20 20v-4h-4',
};

export const icon = (name, size = 18) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || ''}"/></svg>`;

// ------------------------------------------------------------
// Toast
// ------------------------------------------------------------
export function toast(msg, { kind = 'info', xp = 0, ms = 3200 } = {}) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${xp ? `<span class="toast-xp">+${xp} XP</span>` : ''}<span>${esc(msg)}</span>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms);
}

// ------------------------------------------------------------
// Celebração — cada etapa concluída ganha destaque
// ------------------------------------------------------------
export function celebrate(title, sub = '', xp = 0, kicker = 'Etapa concluída') {
  const root = document.getElementById('celebrate');
  root.innerHTML = `
    <div class="cele-card">
      <div class="cele-burst">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      <div class="cele-kicker">${esc(kicker)}</div>
      <div class="cele-title">${esc(title)}</div>
      ${sub ? `<div class="cele-sub">${esc(sub)}</div>` : ''}
      ${xp ? `<div class="cele-xp">+${xp} XP</div>` : ''}
    </div>`;
  root.classList.add('show');
  clearTimeout(root._t);
  root._t = setTimeout(() => root.classList.remove('show'), 2600);
  root.onclick = () => root.classList.remove('show');
}

// ------------------------------------------------------------
// Modal com formulário declarativo
// fields: [{ name, label, type, options, value, required, placeholder, full, help }]
// ------------------------------------------------------------
export function modal({ title, fields = [], body = '', submit = 'Salvar', danger = null, onSubmit, wide = false }) {
  const root = document.getElementById('modal');
  root.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <form class="modal-card ${wide ? 'wide' : ''}" novalidate>
      <header class="modal-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button>
      </header>
      <div class="modal-body">
        ${body}
        <div class="form-grid">${fields.map(fieldHTML).join('')}</div>
      </div>
      <footer class="modal-foot">
        ${danger ? `<button type="button" class="btn btn-danger-ghost" data-danger>${esc(danger.label)}</button>` : '<span></span>'}
        <div class="row gap-8">
          <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
          ${onSubmit ? `<button type="submit" class="btn btn-primary">${esc(submit)}</button>` : ''}
        </div>
      </footer>
    </form>`;
  root.classList.add('show');
  const form = root.querySelector('form');
  const close = () => { root.classList.remove('show'); root.innerHTML = ''; };
  root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  if (danger) root.querySelector('[data-danger]').addEventListener('click', async () => {
    if (confirm(danger.confirm || 'Tem certeza?')) { await danger.onClick(); close(); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const values = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (!el) continue;
      let v = f.type === 'checkbox' ? el.checked : el.value.trim();
      if (f.type === 'number' || f.type === 'money') v = v === '' ? null : Number(String(v).replace(',', '.'));
      if (f.required && (v === '' || v === null)) { el.focus(); el.classList.add('invalid'); return; }
      values[f.name] = v === '' ? null : v;
    }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try { await onSubmit(values); close(); }
    catch (err) { console.error(err); toast(err.message || 'Erro ao salvar', { kind: 'error' }); btn.disabled = false; }
  });
  root.querySelectorAll('.img-field').forEach(wireImageField);
  setTimeout(() => form.querySelector('input:not([type=hidden]):not([type=file]),textarea,select')?.focus(), 30);
  return { close, root };
}

// Campo de foto: reduz no navegador (máx. 960px, JPEG) e guarda como data URL no próprio registro.
function wireImageField(box) {
  const file = box.querySelector('input[type=file]');
  const hidden = box.querySelector('input[type=hidden]');
  const prev = box.querySelector('.img-prev');
  const set = url => { hidden.value = url; prev.style.backgroundImage = url ? `url('${url}')` : ''; box.classList.toggle('has', !!url); };
  prev.addEventListener('click', () => file.click());
  box.querySelector('.img-clear').addEventListener('click', () => { set(''); file.value = ''; });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try { set(await shrinkImage(f)); } catch { toast('Não consegui ler essa imagem.', { kind: 'error' }); }
  });
}

export function shrinkImage(file, max = 960, quality = .8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fieldHTML(f) {
  const v = f.value ?? '';
  const id = `f-${f.name}`;
  const req = f.required ? 'required' : '';
  let input;
  if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}" ${req}>${esc(v)}</textarea>`;
  } else if (f.type === 'select') {
    input = `<select id="${id}" name="${f.name}" ${req}>${(f.options || []).map(o => {
      const [val, lab] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`;
    }).join('')}</select>`;
  } else if (f.type === 'image') {
    input = `<div class="img-field ${v ? 'has' : ''}">
      <div class="img-prev" style="${v ? `background-image:url('${esc(v)}')` : ''}"><span>${icon('file', 20)} Escolher foto</span></div>
      <input type="file" accept="image/*" id="${id}" hidden>
      <input type="hidden" name="${f.name}" value="${esc(v)}">
      <button type="button" class="btn btn-ghost btn-sm img-clear">Remover</button>
    </div>`;
  } else if (f.type === 'checkbox') {
    input = `<label class="check"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.checkLabel || '')}</label>`;
  } else {
    const type = f.type === 'money' ? 'number' : (f.type || 'text');
    input = `<input id="${id}" name="${f.name}" type="${type}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.type === 'money' ? 'step="0.01" min="0"' : ''} ${req}>`;
  }
  return `<div class="field ${f.full || f.type === 'textarea' || f.type === 'image' ? 'full' : ''}">
    <label for="${id}">${esc(f.label)}${f.required ? ' <b>*</b>' : ''}</label>
    ${input}
    ${f.help ? `<small>${esc(f.help)}</small>` : ''}
  </div>`;
}

export function progressBar(value, max = 100, cls = '') {
  const p = pct(value, max);
  return `<div class="bar ${cls}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div>`;
}

export function empty(title, text = '', action = '') {
  return `<div class="empty"><div class="empty-title">${esc(title)}</div>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}

export const safeUrl = u => {
  const s = String(u || '').trim();
  if (!s) return '#';
  if (s.startsWith('#/')) return s;
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
};
