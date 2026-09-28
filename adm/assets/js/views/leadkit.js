// Peças de lead usadas no quadro (leads.js) e na ficha (lead.js):
// formulário completo, mapa de dores, logos, movimentação entre etapas.
import { store } from '../store.js';
import {
  LEAD_STAGES, LEAD_WON, LEAD_LOST, LEAD_CHANNELS, LEAD_SEGMENTS, COMPANY_SIZES, SERVICES, PAIN_PRESETS, BANT,
} from '../config.js';
import { me, moveLead, leadToAccount } from '../ops.js';
import { award } from '../game.js';
import { esc, icon, modal, toast } from '../util.js';
import { newProjectModal } from './projects.js';

export const CH_ICON = {
  Site: 'globe', 'Indicação': 'users', Relacionamento: 'heart', Instagram: 'instagram',
  LinkedIn: 'linkedin', 'Prospecção': 'map', Outro: 'link',
};
export const leadName = l => l.company || l.name;
export const activeAlliances = () => store.all('alliances').filter(a => a.active !== false);
export const alliance = id => store.find('alliances', id);

// Links: aceita @perfil, slug ou URL completa
export function igUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : /instagram\.com/i.test(s) ? 'https://' + s : `https://instagram.com/${s.replace(/^@/, '')}`;
}
export function inUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : /linkedin\.com/i.test(s) ? 'https://' + s : `https://linkedin.com/company/${s.replace(/^@/, '')}`;
}
export function webUrl(v) {
  const s = String(v || '').trim();
  return !s ? '' : /^https?:\/\//i.test(s) ? s : 'https://' + s;
}
export function mapsUrl(l) {
  if (l.lat && l.lng) return `https://www.google.com/maps?q=${l.lat},${l.lng}`;
  const q = [l.address, l.city, l.uf].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/${encodeURIComponent(q)}` : '';
}

// Logo (foto) do lead ou monograma
export function leadLogo(l, size = 36) {
  const n = leadName(l) || '?';
  return l.logo_url
    ? `<span class="llogo" style="--s:${size}px;background-image:url('${esc(l.logo_url)}')" role="img" aria-label="${esc(n)}"></span>`
    : `<span class="llogo llogo-mono" style="--s:${size}px">${esc(n.trim().charAt(0).toUpperCase())}</span>`;
}

export function socials(l, size = 15) {
  return [
    l.website ? `<a class="lsoc" href="${esc(webUrl(l.website))}" target="_blank" rel="noopener" title="Site">${icon('globe', size)}</a>` : '',
    l.instagram ? `<a class="lsoc lsoc-ig" href="${esc(igUrl(l.instagram))}" target="_blank" rel="noopener" title="Instagram">${icon('instagram', size)}</a>` : '',
    l.linkedin ? `<a class="lsoc lsoc-in" href="${esc(inUrl(l.linkedin))}" target="_blank" rel="noopener" title="LinkedIn">${icon('linkedin', size)}</a>` : '',
  ].join('');
}

export const proposalTotal = l => (l.proposal?.entregas || []).reduce((s, e) => s + Number(e.valor || 0), 0);
export const leadValue = l => Number(l.value) || proposalTotal(l);

// ------------------------------------------------------------
// Mover entre etapas (inclui perdido e a virada em conta + projeto)
// ------------------------------------------------------------
export async function move(lead, stage) {
  if (!lead || lead.stage === stage) return;
  if (stage === LEAD_LOST) {
    const reason = prompt('Motivo da perda? (orçamento, prazo, sumiu, concorrente…)');
    if (reason === null) return;
    await store.update('leads', lead.id, { lost_reason: reason });
  } else if (lead.stage === LEAD_LOST) {
    await store.update('leads', lead.id, { lost_reason: '' });
  }
  const res = await moveLead(lead, stage);
  if (res === 'won' && !lead.account_id) {
    setTimeout(() => {
      if (confirm(`Criar a conta de cliente "${leadName(lead)}" e já abrir o projeto?`)) convertLead(lead);
    }, 900);
  }
}

// Venda → conta + carteira de pós-venda + projeto já com objetivo, valor e alianças da proposta
export async function convertLead(lead) {
  const a = await leadToAccount(lead);
  const pr = lead.proposal || {};
  const allies = [...new Set([...(lead.pains || []), ...(pr.entregas || [])].map(x => x.alliance_id).filter(Boolean))];
  newProjectModal({
    account_id: a.id, name: `Projeto ${a.name}`, value: leadValue(lead),
    objective: pr.objetivo || '', alliances: allies,
  });
}

// ------------------------------------------------------------
// Mapa de dores: dor → serviço que resolve → aliança (opcional)
// ------------------------------------------------------------
function painRow(p = {}) {
  const allies = activeAlliances();
  return `<div class="pain-row">
    <input class="pain-dor" value="${esc(p.dor || '')}" placeholder="A dor, nas palavras do cliente" aria-label="Dor">
    <select class="pain-svc" aria-label="Serviço que resolve">${Object.entries(SERVICES).map(([k, s]) =>
      `<option value="${k}" ${k === (p.service || 'identidade') ? 'selected' : ''}>${esc(s.short)}</option>`).join('')}</select>
    <select class="pain-ally" aria-label="Aliança"><option value="">Sem aliança</option>${allies.map(a =>
      `<option value="${esc(a.id)}" ${a.id === p.alliance_id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
    <button type="button" class="icon-btn" data-pain-del title="Remover dor">${icon('x', 16)}</button>
  </div>`;
}

export function painEditor(pains = []) {
  return `<div class="pain-ed">
    <div class="pain-presets"><span>Atalhos</span>${PAIN_PRESETS.map(([d], i) =>
      `<button type="button" class="pain-preset" data-preset="${i}">${icon('plus', 12)} ${esc(d)}</button>`).join('')}</div>
    <div class="pain-head"><span>Dor</span><span>Serviço que resolve</span><span>Aliança</span><span></span></div>
    <div class="pain-rows">${pains.map(painRow).join('')}</div>
    <button type="button" class="btn btn-ghost btn-sm" data-pain-add>${icon('plus', 14)} Adicionar dor</button>
    <template class="pain-tpl">${painRow()}</template>
  </div>`;
}

export function wirePainEditor(root) {
  const ed = root.querySelector('.pain-ed');
  if (!ed) return;
  const rows = ed.querySelector('.pain-rows');
  const autoAlly = r => {
    const sel = r.querySelector('.pain-ally');
    if (sel.value) return;
    const a = activeAlliances().find(x => x.service === r.querySelector('.pain-svc').value);
    if (a) sel.value = a.id;
  };
  const add = (dor = '', service = 'identidade') => {
    rows.insertAdjacentHTML('beforeend', ed.querySelector('.pain-tpl').innerHTML);
    const r = rows.lastElementChild;
    r.querySelector('.pain-dor').value = dor;
    r.querySelector('.pain-svc').value = service;
    autoAlly(r);
    if (!dor) r.querySelector('.pain-dor').focus();
  };
  ed.addEventListener('click', e => {
    if (e.target.closest('[data-pain-add]')) add();
    const pre = e.target.closest('[data-preset]');
    if (pre) { const [d, s] = PAIN_PRESETS[pre.dataset.preset]; add(d, s); }
    const del = e.target.closest('[data-pain-del]');
    if (del) del.closest('.pain-row').remove();
  });
  ed.addEventListener('change', e => { if (e.target.classList.contains('pain-svc')) autoAlly(e.target.closest('.pain-row')); });
}

export const readPains = root => [...root.querySelectorAll('.pain-row')].map(r => ({
  dor: r.querySelector('.pain-dor').value.trim(),
  service: r.querySelector('.pain-svc').value,
  alliance_id: r.querySelector('.pain-ally').value || null,
})).filter(p => p.dor);

// Lista de leitura das dores (ficha, proposta)
export function painList(pains = []) {
  if (!pains.length) return '<p class="muted">Nenhuma dor mapeada ainda.</p>';
  return `<ul class="pain-list">${pains.map(p => {
    const a = alliance(p.alliance_id);
    return `<li><span class="pain-dot"></span><div><strong>${esc(p.dor)}</strong>
      <small>${icon('arrow', 12)} ${esc(SERVICES[p.service]?.label || p.service)}${a ? ` · com ${esc(a.name)}` : ''}</small></div></li>`;
  }).join('')}</ul>`;
}

// ------------------------------------------------------------
// Formulário completo de lead (registrar e editar)
// ------------------------------------------------------------
export function leadModal(l = {}, { onSaved } = {}) {
  const isNew = !l.id;
  const team = store.all('profiles').filter(p => ['socio', 'comercial'].includes(p.role));
  const b = l.bant || {};
  let ctx = null;

  ctx = modal({
    title: isNew ? 'Registrar lead' : `Editar · ${leadName(l)}`,
    submit: isNew ? 'Registrar lead' : 'Salvar',
    wide: true,
    body: isNew ? '<p class="muted modal-lead">Quanto mais completo, mais objetiva fica a proposta. Só empresa, contato e canal são obrigatórios.</p>' : '',
    fields: [
      { section: 'Empresa' },
      { name: 'logo_url', label: 'Logo / foto do cliente', type: 'image', value: l.logo_url || '' },
      { name: 'company', label: 'Nome da empresa', required: true, value: l.company, placeholder: 'Nome fantasia' },
      { name: 'razao_social', label: 'Razão social', value: l.razao_social },
      { name: 'cnpj', label: 'CNPJ', value: l.cnpj, placeholder: '00.000.000/0000-00' },
      { name: 'segment', label: 'Segmento', value: l.segment, list: LEAD_SEGMENTS, placeholder: 'Ex.: Saúde, Moda, Tecnologia' },
      { name: 'size', label: 'Porte', type: 'select', value: l.size || '', options: COMPANY_SIZES.map(s => [s, s || '—']) },
      { name: 'website', label: 'Site', value: l.website, prefix: 'globe', placeholder: 'empresa.com.br' },
      { name: 'city', label: 'Cidade', value: l.city },
      { name: 'uf', label: 'UF', value: l.uf, placeholder: 'SP' },
      { name: 'address', label: 'Endereço', value: l.address, full: true, placeholder: 'Rua, número, bairro (usado no mapa)' },

      { section: 'Canal e redes' },
      { name: 'source', label: 'Canal', type: 'chips', required: true, value: l.source || '', options: LEAD_CHANNELS.map(c => [c, c, CH_ICON[c]]), full: true },
      { name: 'referral', label: 'Quem indicou / relação', value: l.referral, full: true, placeholder: 'Ex.: cliente antigo, amiga da Alexandra, evento X' },
      { name: 'instagram', label: 'Instagram', value: l.instagram, prefix: 'instagram', placeholder: '@empresa' },
      { name: 'linkedin', label: 'LinkedIn', value: l.linkedin, prefix: 'linkedin', placeholder: 'linkedin.com/company/empresa' },

      { section: 'Contato' },
      { name: 'name', label: 'Nome do contato', required: true, value: l.name, placeholder: 'Quem fala pela empresa' },
      { name: 'role_title', label: 'Cargo', value: l.role_title, placeholder: 'Ex.: CEO e Founder' },
      { name: 'email', label: 'E-mail', type: 'email', value: l.email, placeholder: 'voce@empresa.com.br' },
      { name: 'phone', label: 'Telefone / WhatsApp', value: l.phone, placeholder: '(00) 00000-0000' },
      { name: 'owner_id', label: 'Responsável na IMAGINE', type: 'select', value: l.owner_id || me().id, options: team.map(u => [u.id, u.name]) },

      { section: 'Mapa de dores', hint: 'O que dói hoje e qual serviço resolve. Vira as entregas da proposta.' },
      { html: painEditor(l.pains || []) },

      { section: 'Qualificação (BANT)', hint: 'Preencha o que souber. É o que separa MQL de SQL.' },
      ...BANT.map(q => ({ name: `bant_${q.key}`, label: q.label, value: b[q.key], placeholder: q.hint })),

      { section: 'Negócio' },
      ...(isNew ? [{ name: 'stage', label: 'Etapa inicial', type: 'select', value: 'base', options: LEAD_STAGES.map(s => [s.key, s.name]) }] : []),
      { name: 'value', label: 'Valor estimado (R$)', type: 'money', value: l.value, help: 'Se ficar vazio, vale o total da proposta.' },
      { name: 'next_action', label: 'Próximo passo', value: l.next_action, placeholder: 'Ex.: Ligar para qualificar' },
      { name: 'next_date', label: 'Quando', type: 'date', value: l.next_date },
      { name: 'notes', label: 'Notas', type: 'textarea', value: l.notes },
    ],
    danger: isNew ? null : {
      label: 'Excluir lead', confirm: 'Excluir este lead?',
      onClick: async () => { await store.remove('leads', l.id); location.hash = '#/leads'; },
    },
    async onSubmit(v) {
      const bant = Object.fromEntries(BANT.map(q => [q.key, v[`bant_${q.key}`] || '']));
      BANT.forEach(q => delete v[`bant_${q.key}`]);
      const row = { ...v, bant, pains: readPains(ctx.root), uf: (v.uf || '').toUpperCase() || null };
      if (isNew) {
        const dup = store.all('leads').find(x =>
          (row.email && x.email && x.email.toLowerCase() === row.email.toLowerCase()) ||
          (row.cnpj && x.cnpj && x.cnpj.replace(/\D/g, '') === row.cnpj.replace(/\D/g, '')));
        if (dup && !confirm(`Já existe um lead com esse e-mail ou CNPJ: ${leadName(dup)}. Registrar mesmo assim?`)) throw new Error('Registro cancelado.');
        const rec = await store.insert('leads', { ...row, briefing: {}, proposal: {}, won_at: row.stage === LEAD_WON ? new Date().toISOString() : null });
        const xp = await award(rec.owner_id, 'lead_created', `Lead: ${leadName(rec)}`, rec.id);
        toast(`Lead registrado: ${leadName(rec)}`, { kind: 'success', xp });
        onSaved?.(rec);
      } else {
        await store.update('leads', l.id, row);
        onSaved?.(store.find('leads', l.id));
      }
    },
  });

  wirePainEditor(ctx.root);
  maskInputs(ctx.root);
  return ctx;
}

// Mesmas máscaras do briefing do site
export function maskInputs(root) {
  const mask = (el, fn) => el?.addEventListener('input', () => { el.value = fn(el.value.replace(/\D/g, '')); });
  mask(root.querySelector('[name=phone]'), d => {
    d = d.slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  });
  mask(root.querySelector('[name=cnpj]'), d => d.slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'));
}
