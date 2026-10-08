// Ficha do lead (#/leads/<id>/<aba>): resumo, mapa de dores e proposta.
// A proposta nasce do mapa de dores: cada serviço vira uma entrega de valor, com o objetivo no topo.
import { store } from '../store.js';
import { LEAD_STAGES, LEAD_WON, LEAD_LOST, SERVICES, BANT } from '../config.js';
import { profile, moveLead } from '../ops.js';
import { esc, icon, avatar, money, date, relDays, ago, empty, toast, today, progressBar } from '../util.js';
import { tabs } from './components.js';
import {
  CH_ICON, leadName, leadLogo, socials, webUrl, mapsUrl, alliance, activeAlliances, proposalTotal, leadValue,
  move, convertLead, leadModal, painEditor, wirePainEditor, readPains, painList,
} from './leadkit.js';

const PROP_STATUS = { rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita', recusada: 'Recusada' };

export default {
  title: ({ id }) => { const l = store.find('leads', id); return l ? leadName(l) : 'Lead'; },

  render({ id, tab }) {
    const l = store.find('leads', id);
    if (!l) return `<div class="page">${empty('Lead não encontrado', '', '<a class="btn btn-primary" href="#/leads">Voltar</a>')}</div>`;
    const pains = l.pains || [];
    const TABS = [['resumo', 'Resumo'], ['dores', 'Mapa de dores', pains.length], ['proposta', 'Proposta', (l.proposal?.entregas || []).length || null]];
    return `<div class="page lead-page">
      <a href="#/leads" class="back no-print">${icon('back', 16)} Leads</a>
      ${head(l)}
      <div class="no-print">${tabs(TABS, tab, `leads/${l.id}`)}</div>
      <div class="tab-panel">${tab === 'dores' ? painsTab(l) : tab === 'proposta' ? proposalTab(l) : summary(l)}</div>
    </div>`;
  },

  after(root) {
    wirePainEditor(root);
    wireEntregas(root);
  },

  actions: {
    edit(el, e, { id }) { leadModal(store.find('leads', id)); },
    async stage(el, e, { id }) { await move(store.find('leads', id), el.dataset.stage); },
    async lost(el, e, { id }) { await move(store.find('leads', id), LEAD_LOST); },
    async convert(el, e, { id }) { await convertLead(store.find('leads', id)); },
    async savePains(form, e, { id }) {
      await store.update('leads', id, { pains: readPains(form) });
      toast('Mapa de dores salvo', { kind: 'success' });
    },
    async genEntregas(el, e, { id }) {
      const l = store.find('leads', id);
      const form = document.querySelector('.prop-ed');
      const cur = form ? readProposal(form) : (l.proposal || {});
      const entregas = entregasFromPains(l.pains || [], cur.entregas || []);
      if (!entregas.length) return toast('Mapeie as dores primeiro (aba Mapa de dores).', { kind: 'error' });
      await store.update('leads', id, { proposal: { ...cur, entregas }, value: entregas.reduce((s, x) => s + Number(x.valor || 0), 0) || store.find('leads', id).value || 0 });
      toast('Entregas geradas a partir das dores');
    },
    async saveProposal(form, e, { id }) {
      const l = store.find('leads', id);
      const p = readProposal(form);
      const wasSent = ['enviada', 'aceita'].includes(l.proposal?.status);
      if (p.status === 'enviada' && !l.proposal?.sent_at) p.sent_at = new Date().toISOString();
      const prop = { ...(l.proposal || {}), ...p };
      const total = (prop.entregas || []).reduce((s, x) => s + Number(x.valor || 0), 0);
      await store.update('leads', id, { proposal: prop, ...(total ? { value: total } : {}) });
      const idx = LEAD_STAGES.findIndex(s => s.key === l.stage);
      if (!wasSent && ['enviada', 'aceita'].includes(p.status) && idx > -1 && idx < LEAD_STAGES.findIndex(s => s.key === 'proposta')) {
        await moveLead(store.find('leads', id), 'proposta');
      }
      if (p.status === 'aceita' && l.stage !== LEAD_WON) {
        if (confirm('Proposta aceita! Mover o lead para Venda?')) await move(store.find('leads', id), LEAD_WON);
      } else toast('Proposta salva', { kind: 'success' });
    },
    printProposal() { window.print(); },
  },
};

// ------------------------------------------------------------
function head(l) {
  const idx = LEAD_STAGES.findIndex(s => s.key === l.stage);
  const owner = profile(l.owner_id);
  return `<header class="lead-head no-print">
    <div class="lead-id">
      ${leadLogo(l, 72)}
      <div>
        <div class="row gap-8 wrap">
          ${l.source ? `<span class="lchan">${icon(CH_ICON[l.source] || 'link', 13)} ${esc(l.source)}</span>` : ''}
          ${l.segment ? `<span class="lseg">${esc(l.segment)}</span>` : ''}
          ${l.stage === LEAD_LOST ? '<span class="tag tag-status-cancelado">Perdido</span>' : ''}
        </div>
        <h1>${esc(leadName(l))}</h1>
        <p class="muted">${esc(l.name)}${l.role_title ? ` · ${esc(l.role_title)}` : ''}${l.city ? ` · ${esc(l.city)}${l.uf ? `/${esc(l.uf)}` : ''}` : ''}</p>
        <div class="lsocs lsocs-lg">${socials(l, 17)}</div>
      </div>
    </div>
    <div class="lead-side">
      ${leadValue(l) ? `<div class="big-pct">${money(leadValue(l))}</div>` : '<div class="muted">Sem valor ainda · monte a proposta</div>'}
      <div class="muted">${owner ? `${avatar(owner, 20)} ${esc(owner.name.split(' ')[0])} · ` : ''}${ago(l.created_at) === 'agora' ? 'criado agora' : `criado há ${ago(l.created_at)}`}</div>
      <div class="row gap-8 wrap end">
        <button class="btn btn-ghost btn-sm" data-act="edit">${icon('edit', 15)} Editar dados</button>
        <a class="btn btn-ghost btn-sm" href="#/leads/${esc(l.id)}/proposta">${icon('file', 15)} Proposta</a>
        ${l.stage === LEAD_WON
          ? (l.account_id ? `<a class="btn btn-primary btn-sm" href="#/contas/${esc(l.account_id)}">${icon('layers', 15)} Ver conta</a>` : `<button class="btn btn-primary btn-sm" data-act="convert">${icon('folder', 15)} Virar conta + projeto</button>`)
          : l.stage !== LEAD_LOST ? `<button class="btn btn-ghost btn-sm" data-act="lost">${icon('x', 15)} Perdido</button>` : ''}
      </div>
    </div>
    <div class="lstages lstages-page">
      ${LEAD_STAGES.map((s, i) => `<button type="button" class="lstage ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}" data-act="stage" data-stage="${s.key}" title="${esc(s.desc)}">${esc(s.name)}</button>`).join('')}
    </div>
    ${l.stage === LEAD_LOST ? `<p class="lost-note">Perdido${l.lost_reason ? `: ${esc(l.lost_reason)}` : ''}. Clique numa etapa para reativar.</p>` : ''}
  </header>`;
}

function dl(rows) {
  const r = rows.filter(([, v]) => v);
  return r.length ? `<dl class="dl">${r.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : '<p class="muted">Nada preenchido.</p>';
}

function summary(l) {
  const b = l.bant || {};
  const bFilled = BANT.filter(q => b[q.key]).length;
  const brief = l.briefing || {};
  const sol = Array.isArray(brief.solucao) ? brief.solucao.join(', ') : brief.solucao;
  const late = l.next_date && l.next_date < today();
  const maps = mapsUrl(l);
  return `<div class="grid-2">
    <div class="stack">
      <section class="card">
        <div class="card-head"><h2>Empresa</h2><button class="link" data-act="edit">Editar ${icon('arrow', 14)}</button></div>
        ${dl([
          ['Nome fantasia', esc(l.company)], ['Razão social', esc(l.razao_social)], ['CNPJ', esc(l.cnpj)],
          ['Segmento', esc(l.segment)], ['Porte', esc(l.size)],
          ['Site', l.website ? `<a class="link-plain" href="${esc(webUrl(l.website))}" target="_blank" rel="noopener">${esc(l.website)}</a>` : ''],
          ['Endereço', [l.address, l.city, l.uf].filter(Boolean).length ? `${esc([l.address, l.city, l.uf].filter(Boolean).join(', '))}${maps ? ` · <a class="link-plain" href="${esc(maps)}" target="_blank" rel="noopener">ver no mapa</a>` : ''}` : ''],
          ['Indicação / relação', esc(l.referral)],
        ])}
      </section>
      <section class="card">
        <div class="card-head"><h2>Contato</h2></div>
        ${dl([
          ['Nome', esc(l.name)], ['Cargo', esc(l.role_title)],
          ['E-mail', l.email ? `<a class="link-plain" href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : ''],
          ['WhatsApp', l.phone ? `<a class="link-plain" href="https://wa.me/55${esc(String(l.phone).replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(l.phone)}</a>` : ''],
        ])}
      </section>
      <section class="card">
        <div class="card-head"><h2>Qualificação (BANT)</h2><span class="muted">${bFilled}/4</span></div>
        ${progressBar(bFilled, 4)}
        <dl class="dl mt-12">${BANT.map(q => `<dt>${esc(q.label)}</dt><dd>${b[q.key] ? esc(b[q.key]) : `<span class="muted">${esc(q.hint)}</span>`}</dd>`).join('')}</dl>
      </section>
      ${sol || brief.prazo || brief.descricao ? `<section class="card lbrief-card">
        <div class="card-head"><h2>${icon('globe', 16)} Briefing enviado pelo site</h2></div>
        ${dl([['Solução', esc(sol)], ['Prazo', esc(brief.prazo)], ['Descrição', esc(brief.descricao)]])}
      </section>` : ''}
    </div>
    <div class="stack">
      <section class="card">
        <div class="card-head"><h2>Mapa de dores</h2><a class="link" href="#/leads/${esc(l.id)}/dores">Editar ${icon('arrow', 14)}</a></div>
        ${painList(l.pains || [])}
      </section>
      <section class="card">
        <div class="card-head"><h2>Próximo passo</h2></div>
        ${l.next_action ? `<p class="${late ? 'late' : ''}">${icon('calendar', 15)} ${esc(l.next_action)}${l.next_date ? ` · ${date(l.next_date)} (${relDays(l.next_date)})` : ''}</p>` : '<p class="muted">Nenhum definido. Use "Editar dados".</p>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>Proposta</h2><a class="link" href="#/leads/${esc(l.id)}/proposta">Abrir ${icon('arrow', 14)}</a></div>
        ${l.proposal?.entregas?.length ? `<p><strong>${money(proposalTotal(l))}</strong> · ${l.proposal.entregas.length} entregas · <span class="tag">${esc(PROP_STATUS[l.proposal.status] || 'Rascunho')}</span></p>
          ${l.proposal.objetivo ? `<p class="muted">${esc(l.proposal.objetivo)}</p>` : ''}` : '<p class="muted">Ainda não montada. Ela nasce do mapa de dores.</p>'}
      </section>
      ${l.notes ? `<section class="card"><div class="card-head"><h2>Notas</h2></div><p class="pre">${esc(l.notes)}</p></section>` : ''}
    </div>
  </div>`;
}

function painsTab(l) {
  return `<form class="card" data-submit="savePains">
    <div class="card-head"><div><h2>Mapa de dores</h2><p class="muted">Diagnóstico objetivo da captação: o que dói hoje, qual serviço resolve e se entra uma aliança. É daqui que sai a proposta.</p></div></div>
    ${painEditor(l.pains || [])}
    <div class="row gap-8 end mt-16">
      <a class="btn btn-ghost" href="#/leads/${esc(l.id)}/proposta">Ir para a proposta</a>
      <button class="btn btn-primary" type="submit">${icon('check', 16)} Salvar mapa</button>
    </div>
  </form>`;
}

// ------------------------------------------------------------
// Proposta
// ------------------------------------------------------------
function entregasFromPains(pains, current = []) {
  const groups = new Map();
  pains.forEach(p => { if (!groups.has(p.service)) groups.set(p.service, []); groups.get(p.service).push(p); });
  return [...groups].map(([service, ps]) => {
    const prev = current.find(e => e.service === service);
    return {
      service,
      titulo: prev?.titulo || SERVICES[service]?.label || service,
      descricao: prev?.descricao || `Resolve: ${ps.map(p => p.dor).join('; ')}.`,
      valor: prev?.valor || 0,
      alliance_id: ps.find(p => p.alliance_id)?.alliance_id || prev?.alliance_id || null,
    };
  });
}

function entRow(e = {}) {
  const allies = activeAlliances();
  return `<div class="ent-row">
    <div class="ent-top">
      <select class="ent-svc" aria-label="Serviço">${Object.entries(SERVICES).map(([k, s]) => `<option value="${k}" ${k === (e.service || 'identidade') ? 'selected' : ''}>${esc(s.short)}</option>`).join('')}</select>
      <input class="ent-tit" value="${esc(e.titulo || '')}" placeholder="Título da entrega" aria-label="Título">
      <input class="ent-val" type="number" min="0" step="0.01" value="${esc(e.valor || '')}" placeholder="R$" aria-label="Valor">
      <select class="ent-ally" aria-label="Aliança"><option value="">Sem aliança</option>${allies.map(a => `<option value="${esc(a.id)}" ${a.id === e.alliance_id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <button type="button" class="icon-btn" data-ent-del title="Remover">${icon('x', 16)}</button>
    </div>
    <textarea class="ent-desc" rows="2" placeholder="O que está incluído e o valor que isso gera para o cliente">${esc(e.descricao || '')}</textarea>
  </div>`;
}

function wireEntregas(root) {
  const ed = root.querySelector('.ent-ed');
  if (!ed) return;
  ed.addEventListener('click', e => {
    if (e.target.closest('[data-ent-add]')) {
      ed.querySelector('.ent-rows').insertAdjacentHTML('beforeend', ed.querySelector('.ent-tpl').innerHTML);
      ed.querySelector('.ent-rows').lastElementChild.querySelector('.ent-tit').focus();
    }
    const del = e.target.closest('[data-ent-del]');
    if (del) del.closest('.ent-row').remove();
  });
}

function readProposal(form) {
  return {
    objetivo: form.elements.objetivo.value.trim(),
    prazo: form.elements.prazo.value.trim(),
    validade: form.elements.validade.value || null,
    condicoes: form.elements.condicoes.value.trim(),
    status: form.elements.status.value,
    entregas: [...form.querySelectorAll('.ent-row')].map(r => ({
      service: r.querySelector('.ent-svc').value,
      titulo: r.querySelector('.ent-tit').value.trim(),
      descricao: r.querySelector('.ent-desc').value.trim(),
      valor: Number(r.querySelector('.ent-val').value) || 0,
      alliance_id: r.querySelector('.ent-ally').value || null,
    })).filter(e => e.titulo),
  };
}

function proposalTab(l) {
  const p = l.proposal || {};
  const ents = p.entregas || [];
  return `<div class="prop-layout">
    <form class="card prop-ed no-print" data-submit="saveProposal">
      <div class="card-head"><h2>Montar proposta</h2>
        <select name="status" aria-label="Status">${Object.entries(PROP_STATUS).map(([k, v]) => `<option value="${k}" ${k === (p.status || 'rascunho') ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="p-obj">Objetivo <b>*</b></label>
        <textarea id="p-obj" name="objetivo" rows="2" placeholder="Uma frase: o que o cliente conquista com este projeto.">${esc(p.objetivo || '')}</textarea>
        <small>É a primeira coisa que o cliente lê. Claro e nítido.</small></div>

      <div class="ent-ed">
        <div class="row between mt-16"><label class="field-label">Entregas de valor</label>
          <button type="button" class="btn btn-ghost btn-sm" data-act="genEntregas">${icon('bolt', 14)} Gerar a partir das dores</button></div>
        <div class="ent-rows">${ents.map(entRow).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-ent-add>${icon('plus', 14)} Adicionar entrega</button>
        <template class="ent-tpl">${entRow()}</template>
      </div>

      <div class="form-grid mt-16">
        <div class="field"><label for="p-prazo">Prazo</label><input id="p-prazo" name="prazo" value="${esc(p.prazo || '')}" placeholder="Ex.: 6 a 8 semanas"></div>
        <div class="field"><label for="p-val">Válida até</label><input id="p-val" name="validade" type="date" value="${esc(p.validade || '')}"></div>
        <div class="field full"><label for="p-cond">Condições de pagamento</label><textarea id="p-cond" name="condicoes" rows="2" placeholder="Ex.: 50% na aprovação, 50% na entrega. Pix ou boleto.">${esc(p.condicoes || '')}</textarea></div>
      </div>
      <div class="row gap-8 end mt-16">
        <button type="button" class="btn btn-ghost" data-act="printProposal">${icon('file', 16)} Imprimir / PDF</button>
        <button class="btn btn-primary" type="submit">${icon('check', 16)} Salvar proposta</button>
      </div>
    </form>
    ${proposalDoc(l)}
  </div>`;
}

function proposalDoc(l) {
  const p = l.proposal || {};
  const ents = p.entregas || [];
  const owner = profile(l.owner_id);
  const pains = l.pains || [];
  const total = proposalTotal(l);
  return `<article class="prop-doc">
    <header class="prop-cover">
      <div class="prop-brand"><span class="logo-chip"><img src="assets/img/logo.png" alt="IMAGINE Concept"></span><span class="kicker">Proposta comercial</span></div>
      <div class="prop-client">${leadLogo(l, 64)}<div><small>Preparada para</small><h2>${esc(leadName(l))}</h2><p class="muted">${esc(l.name)}${l.role_title ? ` · ${esc(l.role_title)}` : ''}</p></div></div>
      <dl class="prop-meta">
        <div><dt>Data</dt><dd>${date(p.sent_at || new Date(), { day: '2-digit', month: 'short', year: 'numeric' })}</dd></div>
        ${p.validade ? `<div><dt>Válida até</dt><dd>${date(p.validade, { day: '2-digit', month: 'short', year: 'numeric' })}</dd></div>` : ''}
        ${owner ? `<div><dt>Responsável</dt><dd>${esc(owner.name)}</dd></div>` : ''}
      </dl>
    </header>

    <section class="prop-obj">
      <span class="kicker">Objetivo</span>
      <p>${p.objetivo ? esc(p.objetivo) : '<span class="muted">Escreva o objetivo em uma frase.</span>'}</p>
    </section>

    ${pains.length ? `<section class="prop-sec">
      <span class="kicker">Diagnóstico</span><h3>O que encontramos</h3>
      <table class="prop-table"><thead><tr><th>Dor</th><th>Como resolvemos</th></tr></thead><tbody>
        ${pains.map(x => `<tr><td>${esc(x.dor)}</td><td>${esc(SERVICES[x.service]?.label || x.service)}</td></tr>`).join('')}
      </tbody></table>
    </section>` : ''}

    <section class="prop-sec">
      <span class="kicker">Entregas de valor</span><h3>O que vamos entregar</h3>
      ${ents.length ? `<ol class="prop-ents">${ents.map((e, i) => {
        const a = alliance(e.alliance_id);
        return `<li><span class="prop-n">${String(i + 1).padStart(2, '0')}</span>
          <div><strong>${esc(e.titulo)}</strong>${e.descricao ? `<p>${esc(e.descricao)}</p>` : ''}${a ? `<small>${icon('handshake', 13)} Em aliança com ${esc(a.name)}</small>` : ''}</div>
          <span class="prop-val">${e.valor ? money(e.valor) : ''}</span></li>`;
      }).join('')}</ol>` : '<p class="muted">Nenhuma entrega ainda. Gere a partir das dores.</p>'}
    </section>

    <section class="prop-total">
      <div><span class="kicker">Investimento total</span><strong>${money(total)}</strong></div>
      ${p.condicoes ? `<p>${esc(p.condicoes)}</p>` : ''}
    </section>

    ${p.prazo ? `<section class="prop-sec"><span class="kicker">Prazo</span><p>${esc(p.prazo)}</p></section>` : ''}

    <section class="prop-sec">
      <span class="kicker">Próximos passos</span>
      <ol class="prop-steps"><li>Aprovação desta proposta</li><li>Contrato e entrada</li><li>Kickoff: objetivo e briefing completo</li><li>Início das 9 etapas do processo IMAGINE</li></ol>
    </section>

    <footer class="prop-foot">IMAGINE Concept · imagineconcept.com.br · admin@imagineconcept.com.br</footer>
  </article>`;
}
