// Leads: funil de conversão em kanban (Base → MQL → SQL → Proposta → Venda) com painel de indicadores.
// O briefing da página inicial cai sozinho na Base (função submit_site_lead no schema).
// Clique no card abre a ficha completa (#/leads/<id>): dados, mapa de dores e proposta.
import { store } from '../store.js';
import { LEAD_STAGES, LEAD_WON, LEAD_LOST, LEAD_CHANNELS, SERVICES } from '../config.js';
import { me, profile } from '../ops.js';
import { esc, icon, avatar, money, relDays, modal, thisMonth, inMonth, toast, today } from '../util.js';
import { pageHead } from './components.js';
import { hbars, funnel, line, kpi, panel, dashboard, lastMonths, monthLabel, shortMoney } from '../charts.js';
import { CH_ICON, leadName, leadLogo, socials, leadValue, move, convertLead, leadModal } from './leadkit.js';

const state = { owner: 'todos', channel: 'todos', q: '', lost: false, dash: true, view: 'quadro' };
const LS_MAP = 'imagine-hub:mymaps';

export default {
  title: () => 'Leads',

  render() {
    const all = store.all('leads');
    const mine = state.owner === 'meus' ? all.filter(l => l.owner_id === me().id) : all;
    const leads = state.channel === 'todos' ? mine : mine.filter(l => l.source === state.channel);
    const lost = leads.filter(l => l.stage === LEAD_LOST);
    const active = leads.filter(l => l.stage !== LEAD_LOST);
    const chCount = c => mine.filter(l => l.source === c).length;

    return `<div class="page page-wide">
      ${pageHead('Leads', 'Funil dos futuros projetos. Arraste os cards entre as etapas; o briefing do site cai direto na Base.',
        `<div class="seg"><button class="seg-btn ${state.owner === 'todos' ? 'active' : ''}" data-act="owner" data-v="todos">Todos</button><button class="seg-btn ${state.owner === 'meus' ? 'active' : ''}" data-act="owner" data-v="meus">Meus</button></div>
         <button class="btn btn-ghost" data-act="mapTools">${icon('map')} My Maps</button>
         <button class="btn btn-primary" data-act="newLead">${icon('plus')} Registrar lead</button>`)}

      ${leadsDashboard(leads)}

      <div class="toolbar">
        <div class="seg">
          ${[['todos', 'Todos', mine.length], ...LEAD_CHANNELS.map(c => [c, c, chCount(c)])].map(([k, l, c]) =>
            `<button class="seg-btn ${state.channel === k ? 'active' : ''}" data-act="channel" data-v="${esc(k)}">${k !== 'todos' ? icon(CH_ICON[k], 14) : ''}${esc(l)} <span class="count">${c}</span></button>`).join('')}
        </div>
        <div class="row gap-8">
          <label class="search">${icon('search', 16)}<input type="search" placeholder="Buscar empresa, e-mail, CNPJ" value="${esc(state.q)}" data-input="search"></label>
          <div class="seg"><button class="seg-btn ${state.view === 'quadro' ? 'active' : ''}" data-act="view" data-v="quadro">${icon('grid', 14)} Quadro</button><button class="seg-btn ${state.view === 'mapa' ? 'active' : ''}" data-act="view" data-v="mapa">${icon('map', 14)} Mapa</button></div>
          <button class="btn btn-ghost ${state.lost ? 'is-on' : ''}" data-act="toggleLost">Perdidos <span class="count">${lost.length}</span></button>
        </div>
      </div>

      ${state.view === 'mapa' ? mapView(active) : `<div class="kanban kanban-leads" id="kanban">
        ${LEAD_STAGES.map((s, i) => {
          const col = active.filter(l => l.stage === s.key)
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
          const total = col.reduce((sum, l) => sum + leadValue(l), 0);
          return `<section class="kcol kcol-${s.key}" data-stage="${s.key}" style="--step:${i}">
            <header>
              <div class="kcol-title"><strong>${esc(s.name)}</strong><span class="count">${col.length}</span><small>${money(total)}</small></div>
              <p>${esc(s.desc)}</p>
            </header>
            <div class="kcol-body">${col.map(card).join('') || '<div class="kcol-empty">Solte um lead aqui</div>'}</div>
          </section>`;
        }).join('')}
      </div>`}

      ${state.lost ? `<section class="card lost-list">
        <div class="card-head"><h2>Perdidos</h2><span class="muted">${lost.length} leads fora do funil</span></div>
        ${lost.length ? `<ul>${lost.map(l => `<li data-search="${esc(searchText(l))}">
          <div class="row gap-8">${leadLogo(l, 28)}<div><strong>${esc(leadName(l))}</strong> <span class="muted">· ${esc(l.source || '—')}${l.lost_reason ? ` · ${esc(l.lost_reason)}` : ''}</span></div></div>
          <div class="row gap-8"><a class="btn btn-ghost btn-sm" href="#/leads/${esc(l.id)}">Abrir</a><button class="btn btn-ghost btn-sm" data-act="revive" data-id="${esc(l.id)}">Voltar para Base</button></div>
        </li>`).join('')}</ul>` : '<p class="muted">Nenhum lead perdido. Bom sinal.</p>'}
      </section>` : ''}
    </div>`;
  },

  after(root) {
    if (state.q) filterCards(root, state.q);
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
    channel(el) { state.channel = el.dataset.v; store.emit({}); },
    view(el) { state.view = el.dataset.v; store.emit({}); },
    toggleLost() { state.lost = !state.lost; store.emit({}); },
    toggleDash() { state.dash = !state.dash; store.emit({}); },
    search(el) { state.q = el.value; filterCards(document.getElementById('view'), el.value); },
    newLead() { leadModal({}, { onSaved: rec => { location.hash = `#/leads/${rec.id}`; } }); },
    openLead(el) { location.hash = `#/leads/${el.dataset.id}`; },
    async revive(el) { await move(store.find('leads', el.dataset.id), 'base'); },
    async quickMove(el, e) {
      e.stopPropagation();
      await move(store.find('leads', el.dataset.id), el.value);
    },
    async convert(el, e) {
      e.stopPropagation();
      await convertLead(store.find('leads', el.dataset.id));
    },
    mapTools() { mapToolsModal(); },
  },
};

function searchText(l) {
  return [l.company, l.name, l.email, l.cnpj, l.segment, l.instagram, l.linkedin, l.city].join(' ').toLowerCase();
}

function filterCards(root, q) {
  const s = q.trim().toLowerCase();
  root.querySelectorAll('[data-search]').forEach(el => { el.hidden = !!s && !el.dataset.search.includes(s); });
}

function card(l) {
  const owner = profile(l.owner_id);
  const late = l.next_date && l.next_date < today() && l.stage !== LEAD_WON;
  const fresh = l.source === 'Site' && l.stage === 'base' && Date.now() - new Date(l.created_at) < 3 * 864e5;
  const pains = l.pains || [];
  const val = leadValue(l);
  return `<article class="lcard" draggable="true" data-id="${esc(l.id)}" data-act="openLead" data-search="${esc(searchText(l))}">
    <div class="lcard-top">${leadLogo(l, 34)}<div class="lcard-id"><strong class="lcard-name">${esc(leadName(l))}</strong>
      <small class="muted">${esc(l.name)}${l.role_title ? ` · ${esc(l.role_title)}` : ''}</small></div>${avatar(owner, 22)}</div>
    <div class="lcard-meta">
      ${l.source ? `<span class="lchan">${icon(CH_ICON[l.source] || 'link', 13)} ${esc(l.source)}</span>` : ''}
      ${fresh ? '<span class="lnew">Novo · site</span>' : ''}
      ${l.segment ? `<span class="lseg">${esc(l.segment)}</span>` : ''}
      <span class="lsocs">${socials(l)}</span>
    </div>
    ${pains.length ? `<div class="lpains" title="${esc(pains.map(p => p.dor).join(' · '))}">${[...new Set(pains.map(p => p.service))].map(s => `<span>${esc(SERVICES[s]?.short || s)}</span>`).join('')}</div>` : ''}
    ${val ? `<div class="lcard-value">${money(val)}</div>` : ''}
    ${l.next_action && l.stage !== LEAD_WON ? `<div class="lcard-next ${late ? 'late' : ''}">${icon('calendar', 14)} ${esc(l.next_action)}${l.next_date ? ` · ${relDays(l.next_date)}` : ''}</div>` : ''}
    ${l.stage === LEAD_WON ? (l.account_id
      ? `<a class="lcard-link" href="#/contas/${esc(l.account_id)}">${icon('layers', 14)} Ver conta</a>`
      : `<button class="btn btn-primary btn-sm" data-act="convert" data-id="${esc(l.id)}">${icon('folder', 14)} Virar conta + projeto</button>`) : ''}
    <select class="mini lcard-move" data-change="quickMove" data-id="${esc(l.id)}" aria-label="Mover para">
      ${LEAD_STAGES.map(s => `<option value="${s.key}" ${s.key === l.stage ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
      <option value="${LEAD_LOST}">Perdido</option>
    </select>
  </article>`;
}

// ------------------------------------------------------------
// Painel
// ------------------------------------------------------------
function leadsDashboard(leads) {
  const m = thisMonth();
  const months = lastMonths(6);
  const prevM = months[months.length - 2];
  const won = leads.filter(l => l.stage === LEAD_WON && l.won_at);
  const wonIn = mm => won.filter(l => inMonth(l.won_at, mm));
  const sum = arr => arr.reduce((s, l) => s + leadValue(l), 0);
  const wonM = wonIn(m), wonP = wonIn(prevM);
  const cycle = arr => {
    const d = arr.map(l => (new Date(l.won_at) - new Date(l.created_at)) / 864e5).filter(x => x >= 0);
    return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null;
  };
  const recent = won.filter(l => Date.now() - new Date(l.won_at) < 90 * 864e5);
  const cyc = cycle(recent);
  const ticket = won.length ? sum(won) / won.length : 0;
  const open = leads.filter(l => ![LEAD_WON, LEAD_LOST].includes(l.stage));

  const kpis = [
    kpi('Negócios ganhos no mês', wonM.length, { delta: wonM.length - wonP.length, deltaText: `${Math.abs(wonM.length - wonP.length)} vs mês anterior` }),
    kpi('Valor em vendas no mês', money(sum(wonM)), { delta: sum(wonM) - sum(wonP), deltaText: `${money(Math.abs(sum(wonM) - sum(wonP)))} vs mês anterior` }),
    kpi('Em aberto no funil', money(sum(open)), { sub: `${open.length} leads` }),
    kpi('Ciclo médio de venda', cyc === null ? '—' : `${cyc} dias`, { sub: 'do cadastro à venda · 90 dias' }),
    kpi('Ticket médio', ticket ? money(ticket) : '—', { sub: `${won.length} vendas no total` }),
  ].join('');

  // Funil acumulado: quantos leads chegaram pelo menos até cada etapa
  const idx = l => LEAD_STAGES.findIndex(s => s.key === l.stage);
  const alive = leads.filter(l => l.stage !== LEAD_LOST);
  const steps = LEAD_STAGES.map((s, i) => ({ label: s.name, count: alive.filter(l => idx(l) >= i).length }));

  const byChannel = LEAD_CHANNELS.map(c => {
    const ls = leads.filter(l => l.source === c);
    const w = ls.filter(l => l.stage === LEAD_WON);
    return { label: c, value: sum(w), n: ls.length, sub: `${ls.length} leads · ${w.length} vendas` };
  });
  const anyRevenue = byChannel.some(r => r.value);
  const channelRows = (anyRevenue ? byChannel.filter(r => r.value) : byChannel.filter(r => r.n).map(r => ({ ...r, value: r.n })))
    .sort((a, b) => b.value - a.value);

  const segs = countBy(leads, l => l.segment || 'Sem segmento');
  const services = countBy(leads.flatMap(l => (l.pains || []).map(p => SERVICES[p.service]?.short || p.service)), x => x);
  const reasons = countBy(leads.filter(l => l.stage === LEAD_LOST), l => l.lost_reason || 'Sem motivo');

  const sellers = store.all('profiles').filter(p => ['socio', 'comercial'].includes(p.role)).map(p => {
    const mineL = leads.filter(l => l.owner_id === p.id);
    const w = mineL.filter(l => l.stage === LEAD_WON);
    return { p, won: sum(w), wonN: w.length, lostN: mineL.filter(l => l.stage === LEAD_LOST).length, newN: mineL.filter(l => inMonth(l.created_at, m)).length };
  }).filter(s => s.won || s.wonN || s.lostN || s.newN).sort((a, b) => b.won - a.won);

  const cards = [
    panel('Funil de conversão', funnel(steps), { hint: 'Leads que chegaram até cada etapa' }),
    panel(anyRevenue ? 'Origens que trazem mais receita' : 'Leads por canal', hbars(channelRows, { fmt: anyRevenue ? money : v => `${v}` }),
      { hint: anyRevenue ? 'Soma das vendas por canal' : 'Ainda sem vendas: contando leads' }),
    panel('Vendas por mês', line(months.map(mm => ({ label: monthLabel(mm), value: sum(wonIn(mm)) })), { fmt: money, axisFmt: shortMoney }), { hint: 'Últimos 6 meses' }),
    panel('O que mais vamos vender', hbars(services, { fmt: v => `${v} dores` }), { hint: 'Serviços pedidos pelo mapa de dores' }),
    panel('Segmentos', hbars(segs.slice(0, 6), { fmt: v => `${v}` })),
    panel('Quem vendeu mais', sellers.length ? `<table class="viz-table"><thead><tr><th>Pessoa</th><th class="ok">Ganhos</th><th class="bad">Perdidos</th><th>Novos no mês</th></tr></thead><tbody>
      ${sellers.map(s => `<tr><td><span class="row gap-8">${avatar(s.p, 22)} ${esc(s.p.name.split(' ')[0])}</span></td><td>${money(s.won)}<small>${s.wonN}</small></td><td>${s.lostN}</td><td>${s.newN}</td></tr>`).join('')}
    </tbody></table>` : '<p class="viz-empty">Sem movimentação ainda.</p>'),
    ...(reasons.length ? [panel('Motivos de perda', hbars(reasons, { fmt: v => `${v}` }))] : []),
  ].join('');

  return dashboard({ open: state.dash, kpis, cards });
}

function countBy(list, fn) {
  const m = new Map();
  list.forEach(x => { const k = fn(x); m.set(k, (m.get(k) || 0) + 1); });
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// ------------------------------------------------------------
// My Maps: mapa embutido, importar KML (empresas mapeadas) e exportar CSV
// ------------------------------------------------------------
function myMapsId() { try { return localStorage.getItem(LS_MAP) || ''; } catch { return ''; } }

function mapView(leads) {
  const mid = myMapsId();
  const located = leads.filter(l => l.address || l.city || (l.lat && l.lng));
  return `<div class="map-view">
    ${mid ? `<iframe class="mymaps" src="https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mid)}" loading="lazy" title="Mapa de prospecção"></iframe>`
      : `<div class="card map-empty">${icon('map', 28)}<h3>Conecte seu mapa do My Maps</h3><p class="muted">Cole o link do mapa em <strong>My Maps</strong> (botão acima) para vê-lo aqui ao lado do funil.</p><button class="btn btn-primary" data-act="mapTools">Configurar</button></div>`}
    <aside class="card map-list">
      <div class="card-head"><h2>Com endereço</h2><span class="count">${located.length}</span></div>
      ${located.length ? `<ul>${located.map(l => `<li data-search="${esc(searchText(l))}"><a href="#/leads/${esc(l.id)}">${leadLogo(l, 26)}<span><strong>${esc(leadName(l))}</strong><small class="muted">${esc([l.city, l.uf].filter(Boolean).join(' · ') || l.address || '')}</small></span></a></li>`).join('')}</ul>`
        : '<p class="muted">Nenhum lead com endereço ainda. Importe do My Maps ou preencha cidade/endereço na ficha.</p>'}
    </aside>
  </div>`;
}

function mapToolsModal() {
  const { root, close } = modal({
    title: 'My Maps',
    wide: true,
    body: `<div class="mm-steps">
      <section>
        <h3>1. Mostrar o mapa aqui</h3>
        <p class="muted">No My Maps: <em>Compartilhar</em> → deixe "qualquer pessoa com o link pode ver" → copie o link e cole abaixo.</p>
        <div class="row gap-8"><input id="mm-link" placeholder="https://www.google.com/maps/d/edit?mid=..." value="${esc(myMapsId() ? `https://www.google.com/maps/d/viewer?mid=${myMapsId()}` : '')}"><button type="button" class="btn btn-ghost" id="mm-save">Salvar</button></div>
      </section>
      <section>
        <h3>2. Trazer as empresas mapeadas para o funil</h3>
        <p class="muted">No My Maps: menu ⋮ → <em>Exportar para KML/KMZ</em> → marque <em>"Exportar como KML"</em>. Solte o arquivo aqui. Cada ponto vira um lead na Base, canal Prospecção.</p>
        <label class="mm-drop">${icon('upload', 20)} Escolher arquivo .kml<input type="file" accept=".kml,application/vnd.google-earth.kml+xml" id="mm-file" hidden></label>
        <div id="mm-preview"></div>
      </section>
      <section>
        <h3>3. Levar os leads para o My Maps</h3>
        <p class="muted">Baixe a planilha e, no My Maps, <em>Adicionar camada → Importar</em>. Ele posiciona pelo endereço ou pela latitude/longitude.</p>
        <button type="button" class="btn btn-ghost" id="mm-csv">${icon('download', 16)} Baixar CSV dos leads</button>
      </section>
    </div>`,
  });

  root.querySelector('#mm-save').addEventListener('click', () => {
    const v = root.querySelector('#mm-link').value.trim();
    const mid = (v.match(/[?&]mid=([^&#]+)/) || [])[1] || (/^[\w-]{10,}$/.test(v) ? v : '');
    if (v && !mid) return toast('Não achei o "mid" nesse link. Cole o link do mapa do My Maps.', { kind: 'error' });
    try { mid ? localStorage.setItem(LS_MAP, mid) : localStorage.removeItem(LS_MAP); } catch { /* noop */ }
    toast(mid ? 'Mapa conectado. Veja na aba Mapa.' : 'Mapa desconectado.', { kind: 'success' });
    state.view = 'mapa'; close(); store.emit({});
  });

  root.querySelector('#mm-csv').addEventListener('click', () => downloadCsv());

  root.querySelector('#mm-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    let places;
    try { places = parseKml(await f.text()); } catch { return toast('Não consegui ler esse KML.', { kind: 'error' }); }
    const existing = new Set(store.all('leads').map(l => leadName(l).trim().toLowerCase()));
    const box = root.querySelector('#mm-preview');
    if (!places.length) { box.innerHTML = '<p class="muted">Nenhum ponto encontrado no arquivo.</p>'; return; }
    box.innerHTML = `<ul class="mm-list">${places.map((p, i) => {
      const dup = existing.has(p.company.toLowerCase());
      return `<li><label class="check"><input type="checkbox" data-i="${i}" ${dup ? '' : 'checked'}> <strong>${esc(p.company)}</strong> <small class="muted">${esc(p.address || `${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)}`)}${dup ? ' · já existe' : ''}</small></label></li>`;
    }).join('')}</ul><button type="button" class="btn btn-primary" id="mm-import">Importar selecionados</button>`;
    box.querySelector('#mm-import').addEventListener('click', async ev => {
      ev.target.disabled = true;
      const pick = [...box.querySelectorAll('input[data-i]:checked')].map(c => places[c.dataset.i]);
      await store.insertMany('leads', pick.map(p => ({
        name: p.contact || 'Contato a definir', company: p.company, email: p.email || '', phone: p.phone || '',
        website: p.website || '', instagram: p.instagram || '', segment: p.segment || '', address: p.address || '',
        lat: p.lat ?? null, lng: p.lng ?? null, notes: p.notes || '', source: 'Prospecção', stage: 'base',
        owner_id: me().id, pains: [], bant: {}, briefing: {}, proposal: {},
      })));
      toast(`${pick.length} empresas importadas para a Base`, { kind: 'success' });
      close();
    });
  });
}

// KML do My Maps: <Placemark><name/><description/><ExtendedData><Data name=""><value/></Data></ExtendedData><Point><coordinates>lng,lat</coordinates></Point>
export function parseKml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('kml');
  const strip = s => { const d = document.createElement('div'); d.innerHTML = String(s || '').replace(/<br\s*\/?>/gi, '\n'); return d.textContent.trim(); };
  const pick = (data, ...keys) => { const k = Object.keys(data).find(x => keys.some(y => x.toLowerCase().includes(y))); return k ? data[k] : ''; };
  return [...doc.getElementsByTagName('Placemark')].map(pm => {
    const name = pm.getElementsByTagName('name')[0]?.textContent.trim() || '';
    const data = {};
    [...pm.getElementsByTagName('Data')].forEach(d => { data[d.getAttribute('name') || ''] = d.getElementsByTagName('value')[0]?.textContent.trim() || ''; });
    const coords = pm.getElementsByTagName('Point')[0]?.getElementsByTagName('coordinates')[0]?.textContent.trim().split(',').map(Number);
    return {
      company: name || pick(data, 'nome', 'name', 'empresa'),
      address: pick(data, 'endere', 'address', 'local') || pm.getElementsByTagName('address')[0]?.textContent.trim() || '',
      phone: pick(data, 'telefone', 'phone', 'whats'), email: pick(data, 'mail'), website: pick(data, 'site', 'web'),
      instagram: pick(data, 'insta'), segment: pick(data, 'segment', 'categoria', 'setor'), contact: pick(data, 'contato', 'contact'),
      notes: strip(pm.getElementsByTagName('description')[0]?.textContent),
      lng: coords && !isNaN(coords[0]) ? coords[0] : null, lat: coords && !isNaN(coords[1]) ? coords[1] : null,
    };
  }).filter(p => p.company);
}

function downloadCsv() {
  const cols = [['Empresa', l => leadName(l)], ['Contato', l => l.name], ['Etapa', l => LEAD_STAGES.find(s => s.key === l.stage)?.name || l.stage],
    ['Canal', l => l.source], ['Segmento', l => l.segment], ['Endereço', l => [l.address, l.city, l.uf].filter(Boolean).join(', ')],
    ['Latitude', l => l.lat], ['Longitude', l => l.lng], ['Site', l => l.website], ['Instagram', l => l.instagram],
    ['E-mail', l => l.email], ['Telefone', l => l.phone], ['Valor', l => leadValue(l)]];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = store.all('leads').filter(l => l.stage !== LEAD_LOST);
  const csv = '﻿' + [cols.map(c => q(c[0])).join(','), ...rows.map(l => cols.map(c => q(c[1](l))).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `leads-imagine-${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
