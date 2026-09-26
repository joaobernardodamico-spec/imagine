// Arquivos principais: poucos, fixos e sempre a um clique.
// Guardamos links (Drive, Figma, PDF) — nada de upload pesado nem senha em texto.
import { store } from '../store.js';
import { me } from '../ops.js';
import { esc, icon, modal, safeUrl, date } from '../util.js';

export const FILE_SLOTS = [
  { kind: 'briefing', label: 'Briefing', desc: 'O direcionador do projeto' },
  { kind: 'contrato', label: 'Contrato', desc: 'Versão assinada' },
  { kind: 'proposta', label: 'Proposta', desc: 'O que foi vendido' },
  { kind: 'drive',    label: 'Pasta do cliente', desc: 'Drive com tudo' },
  { kind: 'figma',    label: 'Figma / arquivos de design', desc: 'Onde o trabalho vive' },
  { kind: 'acesso',   label: 'Acessos', desc: 'Link do cofre de senhas' },
];

const KIND_LABEL = Object.fromEntries([...FILE_SLOTS.map(s => [s.kind, s.label]), ['outro', 'Outro']]);

export function filesPanel({ project_id = null, account_id = null, compact = false }) {
  const rows = store.where('files', f => (project_id ? f.project_id === project_id : f.account_id === account_id && !f.project_id));
  const slot = kind => rows.find(f => f.kind === kind);
  const others = rows.filter(f => f.kind === 'outro' || !FILE_SLOTS.some(s => s.kind === f.kind) || rows.filter(x => x.kind === f.kind).indexOf(f) > 0);
  const ctx = `data-project="${esc(project_id || '')}" data-account="${esc(account_id || '')}"`;

  return `<div class="files">
    <div class="slots">
      ${FILE_SLOTS.map(s => {
        const f = slot(s.kind);
        if (!f && s.kind === 'briefing' && project_id) {
          return `<a class="slot filled" href="#/projetos/${esc(project_id)}/briefing">
            <span class="slot-ic">${icon('brief', 20)}</span>
            <span><strong>${s.label}</strong><small>Briefing no Hub</small></span></a>`;
        }
        return f
          ? `<div class="slot filled">
              <a href="${esc(safeUrl(f.url))}" ${f.url.startsWith('#/') ? '' : 'target="_blank" rel="noopener"'} class="slot-link">
                <span class="slot-ic">${icon(s.kind === 'briefing' ? 'brief' : s.kind === 'acesso' ? 'eye' : 'file', 20)}</span>
                <span><strong>${esc(s.label)}</strong><small>${esc(f.label)}</small></span>
              </a>
              <button class="icon-btn" data-act="editFile" data-id="${esc(f.id)}" title="Editar">${icon('edit', 16)}</button>
            </div>`
          : `<button class="slot empty-slot" data-act="addFile" data-kind="${s.kind}" ${ctx}>
              <span class="slot-ic">${icon('plus', 20)}</span>
              <span><strong>${esc(s.label)}</strong><small>${esc(s.desc)}</small></span>
            </button>`;
      }).join('')}
    </div>
    ${compact ? '' : `
    <div class="card-head mt-24"><h3>Outros links</h3><button class="btn btn-ghost btn-sm" data-act="addFile" data-kind="outro" ${ctx}>${icon('plus', 16)} Link</button></div>
    ${others.length ? `<ul class="link-list">${others.map(f => `
      <li>
        <a href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener">${icon('link', 16)} <span>${esc(f.label)}</span></a>
        <small class="muted">${esc(KIND_LABEL[f.kind] || f.kind)} · ${date(f.created_at)}</small>
        <button class="icon-btn" data-act="editFile" data-id="${esc(f.id)}" title="Editar">${icon('edit', 16)}</button>
      </li>`).join('')}</ul>` : '<p class="muted">Referências, moodboards, entregas parciais…</p>'}
    <p class="fine">Senhas nunca ficam aqui. Use um cofre (Bitwarden, 1Password) e cole só o link.</p>`}
  </div>`;
}

function fileFields(f = {}) {
  return [
    { name: 'kind', label: 'Tipo', type: 'select', value: f.kind || 'outro', options: [...FILE_SLOTS.map(s => [s.kind, s.label]), ['outro', 'Outro']] },
    { name: 'label', label: 'Nome', required: true, value: f.label, placeholder: 'Ex.: Contrato assinado' },
    { name: 'url', label: 'Link', required: true, value: f.url, placeholder: 'https://drive.google.com/…', full: true },
  ];
}

export const fileActions = {
  addFile(el) {
    const project_id = el.dataset.project || null;
    let account_id = el.dataset.account || null;
    if (project_id && !account_id) account_id = store.find('projects', project_id)?.account_id || null;
    modal({
      title: 'Adicionar link',
      fields: fileFields({ kind: el.dataset.kind }),
      async onSubmit(v) { await store.insert('files', { ...v, project_id, account_id, created_by: me().id }); },
    });
  },
  editFile(el) {
    const f = store.find('files', el.dataset.id);
    modal({
      title: 'Editar link',
      fields: fileFields(f),
      danger: { label: 'Remover', confirm: 'Remover este link?', onClick: () => store.remove('files', f.id) },
      async onSubmit(v) { await store.update('files', f.id, v); },
    });
  },
};
