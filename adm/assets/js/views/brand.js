// Manual de marca otimizado: o essencial de uma marca numa tela só.
import { store } from '../store.js';
import { esc, icon, modal, toast, safeUrl } from '../util.js';

const HEX = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i;

export function brandPanel(a, { editable = true } = {}) {
  const b = a.brand || {};
  const colors = b.colors || [];
  const fonts = b.fonts || [];
  const filled = [colors.length, fonts.length, b.tone, b.essence, b.dos, b.donts, b.logo_url].filter(Boolean).length;

  return `<div class="brand">
    <div class="brand-head">
      <div>
        <div class="kicker">Manual de marca · ${esc(a.name)}</div>
        <h2>${b.essence ? esc(b.essence) : '<span class="muted">Essência da marca em uma frase</span>'}</h2>
      </div>
      <div class="row gap-8">
        ${b.manual_url ? `<a class="btn btn-ghost" href="${esc(safeUrl(b.manual_url))}" target="_blank" rel="noopener">${icon('file')} Manual completo</a>` : ''}
        ${b.logo_url ? `<a class="btn btn-ghost" href="${esc(safeUrl(b.logo_url))}" target="_blank" rel="noopener">${icon('link')} Logos</a>` : ''}
        ${editable ? `<button class="btn btn-primary" data-act="editBrand" data-id="${esc(a.id)}">${icon('edit')} Editar</button>` : ''}
      </div>
    </div>
    ${filled < 4 ? `<div class="hint">${icon('bolt', 16)} Manual ${Math.round((filled / 7) * 100)}% preenchido. Cores, fontes, tom e o que fazer/não fazer já resolvem 90% das dúvidas do time.</div>` : ''}

    <section class="brand-block">
      <h3>Cores</h3>
      ${colors.length ? `<div class="swatches">${colors.map(c => `
        <button class="swatch" style="--c:${esc(c.hex)}" data-act="copyHex" data-hex="${esc(c.hex)}" title="Copiar ${esc(c.hex)}">
          <span class="swatch-color"></span>
          <span class="swatch-info"><strong>${esc(c.name)}</strong><code>${esc(c.hex.toUpperCase())}</code><small>${rgb(c.hex)}</small></span>
        </button>`).join('')}</div>` : '<p class="muted">Sem cores cadastradas.</p>'}
    </section>

    <section class="brand-block">
      <h3>Tipografia</h3>
      ${fonts.length ? `<div class="fonts">${fonts.map(f => `
        <div class="font-card">
          <div class="font-specimen" style="font-family:'${esc(f.name)}',var(--font)">Aa</div>
          <div><small class="muted">${esc(f.role)}</small><strong>${esc(f.name)}</strong>
          <a class="link" href="https://fonts.google.com/?query=${encodeURIComponent(f.name)}" target="_blank" rel="noopener">Buscar fonte</a></div>
        </div>`).join('')}</div>` : '<p class="muted">Sem fontes cadastradas.</p>'}
    </section>

    <div class="brand-cols">
      <section class="brand-block"><h3>Tom de voz</h3><p>${b.tone ? esc(b.tone) : '<span class="muted">—</span>'}</p></section>
      <section class="brand-block do"><h3>${icon('check', 16)} Fazer</h3>${list(b.dos)}</section>
      <section class="brand-block dont"><h3>${icon('x', 16)} Não fazer</h3>${list(b.donts)}</section>
    </div>
  </div>`;
}

function list(text) {
  const items = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return items.length ? `<ul class="bullets">${items.map(i => `<li>${esc(i.replace(/^[-•]\s*/, ''))}</li>`).join('')}</ul>` : '<p class="muted">—</p>';
}

function rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return isNaN(n) ? '' : `RGB ${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export const brandActions = {
  copyHex(el) {
    navigator.clipboard?.writeText(el.dataset.hex).then(() => toast(`${el.dataset.hex} copiado`));
  },
  editBrand(el) {
    const a = store.find('accounts', el.dataset.id);
    const b = a.brand || {};
    modal({
      title: `Manual de marca · ${a.name}`,
      wide: true,
      fields: [
        { name: 'essence', label: 'Essência (uma frase)', value: b.essence, full: true, placeholder: 'O que a marca é, em uma frase' },
        { name: 'colors', label: 'Cores (uma por linha: Nome #HEX)', type: 'textarea', rows: 4,
          value: (b.colors || []).map(c => `${c.name} ${c.hex}`).join('\n'), placeholder: 'Primária #12328C' },
        { name: 'fonts', label: 'Fontes (uma por linha: Papel: Fonte)', type: 'textarea', rows: 4,
          value: (b.fonts || []).map(f => `${f.role}: ${f.name}`).join('\n'), placeholder: 'Títulos: Helvetica Neue' },
        { name: 'tone', label: 'Tom de voz', type: 'textarea', rows: 2, value: b.tone },
        { name: 'dos', label: 'Fazer (um por linha)', type: 'textarea', rows: 4, value: b.dos },
        { name: 'donts', label: 'Não fazer (um por linha)', type: 'textarea', rows: 4, value: b.donts },
        { name: 'logo_url', label: 'Link dos logos (Drive/Figma)', value: b.logo_url },
        { name: 'manual_url', label: 'Link do manual completo (PDF)', value: b.manual_url },
      ],
      async onSubmit(v) {
        const colors = String(v.colors || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const m = l.match(/(#?[0-9a-f]{6}|#?[0-9a-f]{3})\s*$/i);
          const hex = m && HEX.test(m[1]) ? (m[1].startsWith('#') ? m[1] : '#' + m[1]) : '#000000';
          return { name: (m ? l.slice(0, m.index) : l).trim() || 'Cor', hex };
        });
        const fonts = String(v.fonts || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const [role, ...rest] = l.split(':');
          return rest.length ? { role: role.trim(), name: rest.join(':').trim() } : { role: 'Fonte', name: role.trim() };
        });
        await store.update('accounts', a.id, { brand: { ...b, ...v, colors, fonts } });
        toast('Manual de marca atualizado', { kind: 'success' });
      },
    });
  },
};
