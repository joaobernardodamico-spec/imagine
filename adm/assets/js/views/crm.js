// CRM: funil de leads em kanban (arrastar e soltar), conversão em conta + projeto.
import { store } from '../store.js';
import { LEAD_STAGES, LEAD_SOURCES } from '../config.js';
import { me, profile, moveLead, leadToAccount } from '../ops.js';
import { award } from '../game.js';
import { esc, icon, avatar, money, relDays, modal, thisMonth, inMonth, toast } from '../util.js';
import { pageHead, statTile } from './components.js';
import { newProjectModal } from './projects.js';

const state = { owner: 'todos' };

export default {
  title: () => 'CRM',

  render() {
    const all = store.all('leads');
    const leads = state.owner === 'meus' ? all.filter(l => l.owner_id === me().id) : all;
    const open = leads.filter(l => !['ganho', 'perdido'].includes(l.stage));
    const m = thisMonth();
    const wonM = leads.filter(l => l.stage === 'ganho' && inMonth(l.won_at, m));
    const closed = leads.filter(l => ['ganho', 'perdido'].includes(l.stage));
    const conv = closed.length ? Math.round((leads.filter(l => l.stage === 'ganho').length / closed.length) * 100) : 0;
    const sources = LEAD_SOURCES.map(s => [s, leads.filter(l => l.source === s).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);

    return `<div class="page page-wide">
      ${pageHead('CRM', 'Arraste os cards entre as colunas. Cada avanço conta ponto; venda fechada vira conta e projeto.',
        `<div class="seg"><button class="seg-btn ${state.owner === 'todos' ? 'active' : ''}" data-act="owner" data-v="todos">Todos</button><button class="seg-btn ${state.owner === 'meus' ? 'active' : ''}" data-act="owner" data-v="meus">Meus</button></div>
         <button class="btn btn-primary" data-act="newLead">${icon('plus')} Novo lead</button>`)}

      <div class="stats">
        ${statTile('Em aberto no funil', money(open.reduce((s, l) => s + Number(l.value || 0), 0)), `${open.length} leads`)}
        ${statTile('Fechado no mês', money(wonM.reduce((s, l) => s + Number(l.value || 0), 0)), `${wonM.length} vendas`)}
        ${statTile('Conversão', conv + '%', 'ganhos / (ganhos + perdidos)')}
        ${statTile('Principal origem', esc(sources[0]?.[0] || '—'), sources.slice(0, 3).map(([s, n]) => `${esc(s)} ${n}`).join(' · '))}
      </div>

      <div class="kanban" id="kanban">
        ${LEAD_STAGES.map(s => {
          const col = leads.filter(l => l.stage === s.key);
          const total = col.reduce((sum, l) => sum + Number(l.value || 0), 0);
          return `<section class="kcol kcol-${s.key}" data-stage="${s.key}">
            <header><strong>${esc(s.name)}</strong><span class="count">${col.length}</span><small>${money(total)}</small></header>
            <div class="kcol-body">${col.map(card).join('')}</div>
          </section>`;
        }).join('')}
      </div>
    </div>`;
  },

  after(root) {
    const board = root.querySelector('#kanban');
    if (!board) return;
    board.querySelectorAll('.lcard').forEach(c => {
      c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); });
      c.addEventListener('dragend', () => c.classList.remove('dragging'));
    });
    board.querySelectorAll('.kcol').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('over');
        const lead = store.find('leads', e.dataTransfer.getData('text/plain'));
        if (lead) await move(lead, col.dataset.stage);
      });
    });
  },

  actions: {
    owner(el) { state.owner = el.dataset.v; store.emit({}); },
    newLead() { leadModal(); },
    openLead(el) { leadModal(store.find('leads', el.dataset.id)); },
    async quickMove(el, e) {
      e.stopPropagation();
      await move(store.find('leads', el.dataset.id), el.value);
    },
    async convert(el, e) {
      e.stopPropagation();
      const lead = store.find('leads', el.dataset.id);
      const a = await leadToAccount(lead);
      newProjectModal({ account_id: a.id, name: `Projeto ${a.name}`, value: lead.value });
    },
  },
};

async function move(lead, stage) {
  if (stage === 'perdido' && lead.stage !== 'perdido') {
    const reason = prompt('Motivo da perda? (orçamento, prazo, sumiu, concorrente…)') ?? '';
    await store.update('leads', lead.id, { lost_reason: reason });
  }
  const res = await moveLead(lead, stage);
  if (res === 'won' && !lead.account_id) {
    setTimeout(() => {
      if (confirm(`Criar a conta de cliente "${lead.company || lead.name}" e já abrir o projeto?`)) {
        leadToAccount(lead).then(a => newProjectModal({ account_id: a.id, name: `Projeto ${a.name}`, value: lead.value }));
      }
    }, 900);
  }
}

function card(l) {
  const owner = profile(l.owner_id);
  const late = l.next_date && l.next_date < new Date().toISOString().slice(0, 10) && !['ganho', 'perdido'].includes(l.stage);
  return `<article class="lcard" draggable="true" data-id="${esc(l.id)}" data-act="openLead">
    <div class="row between"><strong>${esc(l.company || l.name)}</strong>${avatar(owner, 22)}</div>
    <small class="muted">${esc(l.name)}${l.source ? ` · ${esc(l.source)}` : ''}</small>
    <div class="lcard-value">${money(l.value)}</div>
    ${l.next_action && !['ganho', 'perdido'].includes(l.stage) ? `<div class="lcard-next ${late ? 'late' : ''}">${icon('calendar', 14)} ${esc(l.next_action)}${l.next_date ? ` · ${relDays(l.next_date)}` : ''}</div>` : ''}
    ${l.stage === 'perdido' && l.lost_reason ? `<div class="lcard-next">Motivo: ${esc(l.lost_reason)}</div>` : ''}
    ${l.stage === 'ganho' ? (l.account_id
      ? `<a class="lcard-link" href="#/contas/${esc(l.account_id)}">${icon('layers', 14)} Ver conta</a>`
      : `<button class="btn btn-primary btn-sm" data-act="convert" data-id="${esc(l.id)}">${icon('folder', 14)} Virar conta + projeto</button>`) : ''}
    <select class="mini lcard-move" data-change="quickMove" data-id="${esc(l.id)}" aria-label="Mover para">
      ${LEAD_STAGES.map(s => `<option value="${s.key}" ${s.key === l.stage ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
    </select>
  </article>`;
}

function leadModal(l = {}) {
  const isNew = !l.id;
  const team = store.all('profiles').filter(p => ['socio', 'comercial'].includes(p.role));
  modal({
    title: isNew ? 'Novo lead' : l.company || l.name,
    fields: [
      { name: 'name', label: 'Nome da pessoa', required: true, value: l.name },
      { name: 'company', label: 'Empresa / marca', value: l.company },
      { name: 'email', label: 'E-mail', type: 'email', value: l.email },
      { name: 'phone', label: 'Telefone', value: l.phone },
      { name: 'source', label: 'Origem', type: 'select', value: l.source || 'Indicação', options: LEAD_SOURCES },
      { name: 'value', label: 'Valor estimado (R$)', type: 'money', value: l.value },
      { name: 'stage', label: 'Etapa', type: 'select', value: l.stage || 'novo', options: LEAD_STAGES.map(s => [s.key, s.name]) },
      { name: 'owner_id', label: 'Responsável', type: 'select', value: l.owner_id || me().id, options: team.map(u => [u.id, u.name]) },
      { name: 'next_action', label: 'Próximo passo', value: l.next_action, placeholder: 'Ex.: Enviar proposta' },
      { name: 'next_date', label: 'Quando', type: 'date', value: l.next_date },
      { name: 'notes', label: 'Notas', type: 'textarea', value: l.notes },
    ],
    danger: isNew ? null : { label: 'Excluir lead', confirm: 'Excluir este lead?', onClick: () => store.remove('leads', l.id) },
    async onSubmit(v) {
      if (isNew) {
        const rec = await store.insert('leads', { ...v, won_at: v.stage === 'ganho' ? new Date().toISOString() : null });
        const xp = await award(rec.owner_id, 'lead_created', `Lead: ${rec.company || rec.name}`, rec.id);
        toast(`Lead cadastrado: ${rec.company || rec.name}`, { kind: 'success', xp });
      } else {
        const { stage, ...rest } = v;
        await store.update('leads', l.id, rest);
        if (stage !== l.stage) await move(store.find('leads', l.id), stage);
      }
    },
  });
}

