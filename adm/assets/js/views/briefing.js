// Briefing do projeto: as perguntas do Google Forms "BRIEFING — IMAGINE CONCEPT" dentro do ATLAS.
// Dá para preencher numa ligação (cada campo salva sozinho ao sair dele) ou puxar as respostas
// que o cliente mandou pelo Forms, direto da planilha de respostas.
import { store } from '../store.js';
import { BRIEFING_FORM, BRIEFING_QS, BRIEFING_SHEET, PAYMENT_FORMS } from '../config.js';
import { saveBriefing, syncProjectRevenue, seesMoney } from '../ops.js';
import { esc, icon, modal, toast, progressBar, date, money } from '../util.js';
import * as google from '../google.js';

// Campos do briefing antigo do Hub (antes de seguir o Forms): ficam visíveis só para consulta
const LEGACY = {
  empresa: 'Sobre a empresa', publico: 'Público', problema: 'Problema / oportunidade', diferenciais: 'Diferenciais',
  concorrentes: 'Concorrentes e similares', tom: 'Personalidade e tom', referencias: 'Referências que gosta', nao_quer: 'O que não quer',
  entregaveis: 'Entregáveis', restricoes: 'Obrigatórios e restrições', prazo: 'Prazo', investimento: 'Investimento', sucesso: 'Como medir sucesso',
};

export function briefingFilled(p) {
  const b = p.briefing || {};
  return { done: BRIEFING_QS.filter(q => String(b[q.key] || '').trim()).length, total: BRIEFING_QS.length };
}

const sectionCount = (b, s) => s.qs.filter(([n]) => String(b['q' + n.replace('.', '_')] || '').trim()).length;

// Degradê das seções: do Cloud Dancer (claro) ao azul-escuro; a última ("Processo") com texto azul-claro
const RAMP = ['#F0EEE9', '#E2E7EF', '#CEDCF1', '#B2CBF1', '#8DB2EC', '#5E92E4', '#3B73D8', '#2456C2', '#163A92', '#0B1B3F'];
const INK = ['#0B1B3F', '#0B1B3F', '#0B1B3F', '#0B1B3F', '#0B1B3F', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#59C6FE'];
const tone = n => `--sec-bg:${RAMP[(n - 1) % RAMP.length]};--sec-ink:${INK[(n - 1) % INK.length]};--i:${n}`;

function answer(p, b, q, key, sec, edit) {
  const val = String(b[key] || '');
  const ro = edit ? '' : 'readonly';
  if (q.type === 'date') {
    // O prazo do briefing é o prazo do projeto: mudar aqui muda a entrega
    return `<div class="bq-row">
      <label class="bq-date">${icon('calendar', 16)}<input type="date" value="${esc(p.due_date || '')}" data-change="bDue" data-key="${key}" data-sec="${sec}" ${edit ? '' : 'disabled'}></label>
      <span class="muted">Muda também a data de entrega do projeto.</span>
    </div>
    ${val && !/^\d{2}\/\d{2}\/\d{4}$/.test(val) ? `<p class="bq-was">Resposta do Forms: “${esc(val)}”</p>` : ''}`;
  }
  if (q.type === 'money') {
    const pay = new Set(b[key + '_pay'] || []);
    return `<div class="bq-row">
      <label class="bq-money"><span>R$</span><input type="number" min="0" step="50" inputmode="decimal" value="${esc(b[key + '_val'] ?? '')}" placeholder="0" data-change="bMoney" data-key="${key}" data-sec="${sec}" ${ro}></label>
    </div>
    <div class="bq-opts no-print">${PAYMENT_FORMS.map(o => `<button type="button" class="bq-opt ${pay.has(o) ? 'on' : ''}" data-act="bPay" data-key="${key}" data-sec="${sec}" data-opt="${esc(o)}" ${edit ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
    ${val && b[key + '_val'] == null ? `<p class="bq-was">Resposta do Forms: “${esc(val)}”</p>` : ''}`;
  }
  const picked = new Set(val.split(',').map(x => x.trim()).filter(Boolean));
  return `${q.opts ? `<div class="bq-opts no-print">${q.opts.map(o => `<button type="button" class="bq-opt ${picked.has(o) ? 'on' : ''}" data-act="bChip" data-key="${key}" data-opt="${esc(o)}" ${edit ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>` : ''}
    <textarea id="bq-${key}" rows="${q.opts ? 1 : 3}" data-change="bField" data-key="${key}" data-sec="${sec}" placeholder="${q.opts ? 'Escolha acima ou escreva' : 'Resposta'}" ${ro}>${esc(val)}</textarea>`;
}

export function briefingPanel(p, edit, sub) {
  const b = p.briefing || {};
  const cur = Math.min(BRIEFING_FORM.length, Math.max(1, Number(sub) || 1));
  const f = briefingFilled(p);
  const legacy = Object.entries(LEGACY).filter(([k]) => String(b[k] || '').trim());
  const imp = b._import;

  return `<div class="brief">
    <header class="card brief-head">
      <div>
        <div class="kicker">Direcionador</div>
        <h2>Briefing · ${esc(p.name)}</h2>
        <p class="muted">${f.done} de ${f.total} respostas${p.briefing_done ? ' · <strong class="ok">completo</strong>' : ''}${imp ? ` · importado do Forms (${esc(imp.when || '')})` : ''}.
          Na ligação, vá perguntando e preenchendo: cada resposta salva sozinha.</p>
        ${progressBar(f.done, f.total)}
      </div>
      <div class="row gap-8 wrap no-print">
        ${edit ? `<button class="btn btn-ghost" data-act="importBriefing">${icon('sheet', 16)} Importar do Forms</button>` : ''}
        ${BRIEFING_SHEET.formUrl ? `<button class="btn btn-ghost" data-act="copyFormLink">${icon('link', 16)} Link do Forms</button>` : ''}
        <button class="btn btn-ghost" data-act="printBriefing">${icon('download', 16)} PDF</button>
        ${edit && !p.briefing_done ? `<button class="btn btn-primary" data-act="briefingDone">${icon('check', 16)} Marcar como completo</button>` : ''}
      </div>
    </header>

    <div class="brief-layout">
      <nav class="brief-nav card no-print" aria-label="Seções do briefing">
        ${BRIEFING_FORM.map(s => {
          const n = sectionCount(b, s);
          return `<a href="#/projetos/${esc(p.id)}/briefing/${s.n}" data-act="bSec" data-sec="${s.n}" style="${tone(s.n)}" class="${s.n === cur ? 'active' : ''} ${n === s.qs.length ? 'full' : ''}">
            <span class="bn-n">${n === s.qs.length ? icon('check', 13) : s.n}</span><span class="bn-t">${esc(s.title)}</span>
            <small data-bcount="${s.n}">${n}/${s.qs.length}</small></a>`;
        }).join('')}
      </nav>

      <div class="brief-body">
        ${BRIEFING_FORM.map(s => `<section class="card bsec ${s.n === cur ? 'on' : ''}" data-sec="${s.n}" style="${tone(s.n)}">
          <div class="bsec-head"><span class="bsec-n">${s.n}</span><h3>${esc(s.title)}</h3></div>
          ${BRIEFING_QS.filter(q => q.section === s.n).map(q => `<div class="bq">
              <label for="bq-${q.key}"><span class="bq-n">${q.d}</span>${esc(q.q)}</label>
              ${answer(p, b, q, q.key, s.n, edit)}
            </div>`).join('')}
          <footer class="bsec-foot no-print">
            ${s.n > 1 ? `<a class="btn btn-ghost btn-sm" href="#/projetos/${esc(p.id)}/briefing/${s.n - 1}" data-act="bSec" data-sec="${s.n - 1}">${icon('chevL', 15)} ${esc(BRIEFING_FORM[s.n - 2].title)}</a>` : '<span></span>'}
            ${s.n < BRIEFING_FORM.length ? `<a class="btn btn-primary btn-sm" href="#/projetos/${esc(p.id)}/briefing/${s.n + 1}" data-act="bSec" data-sec="${s.n + 1}">${esc(BRIEFING_FORM[s.n].title)} ${icon('chevR', 15)}</a>` : ''}
          </footer>
        </section>`).join('')}

        ${legacy.length ? `<details class="card brief-legacy"><summary>Respostas do briefing anterior (${legacy.length})</summary>
          <dl class="dl mt-12">${legacy.map(([k, l]) => `<dt>${esc(l)}</dt><dd class="pre">${esc(b[k])}</dd>`).join('')}</dl></details>` : ''}
      </div>
    </div>
  </div>`;
}

// Valor + formas de pagamento viram também o texto da resposta (impressão, contagem e manual)
async function saveMoney(id, key, sec, { val, pay }) {
  const p = store.find('projects', id);
  const b = { ...(p.briefing || {}) };
  if (val !== undefined) b[key + '_val'] = val;
  if (pay !== undefined) b[key + '_pay'] = pay;
  const parts = [b[key + '_val'] != null ? money(b[key + '_val']) : '', (b[key + '_pay'] || []).join(', ')].filter(Boolean);
  b[key] = parts.join(' · ');
  // Investimento informado vira o valor do projeto quando ele ainda não tem valor
  const patch = { briefing: b };
  const adopt = val != null && val > 0 && !Number(p.value) && seesMoney();
  if (adopt) patch.value = val;
  await store.update('projects', id, patch, { silent: true });
  if (adopt) { await syncProjectRevenue(id); toast('Valor do projeto e parcelas atualizados no financeiro', { kind: 'success' }); }
  updateCount(id, sec);
}

function updateCount(id, sec) {
  const b = store.find('projects', id).briefing || {};
  const s = BRIEFING_FORM.find(x => x.n === Number(sec));
  const el = document.querySelector(`[data-bcount="${sec}"]`);
  if (s && el) el.textContent = `${sectionCount(b, s)}/${s.qs.length}`;
}

async function saveField(id, key, value, sec) {
  const p = store.find('projects', id);
  await store.update('projects', id, { briefing: { ...(p.briefing || {}), [key]: value } }, { silent: true });
  // Atualiza contadores sem redesenhar (o foco fica onde está)
  const b = store.find('projects', id).briefing;
  const s = BRIEFING_FORM.find(x => x.n === Number(sec));
  const el = document.querySelector(`[data-bcount="${sec}"]`);
  if (s && el) el.textContent = `${sectionCount(b, s)}/${s.qs.length}`;
}

export const briefingActions = {
  // Troca de seção sem recarregar a página
  bSec(el, e, { id }) {
    const n = el.dataset.sec;
    document.querySelectorAll('.bsec').forEach(x => x.classList.toggle('on', x.dataset.sec === n));
    document.querySelectorAll('.brief-nav a').forEach(a => a.classList.toggle('active', a.dataset.sec === n));
    history.replaceState(null, '', `#/projetos/${id}/briefing/${n}`);
    const sec = document.querySelector(`.bsec[data-sec="${n}"]`);
    if (sec && sec.getBoundingClientRect().top < 70) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  async bDue(el, e, { id }) {
    const v = el.value || null;
    const p = store.find('projects', id);
    const txt = v ? date(v, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    await store.update('projects', id, { due_date: v, briefing: { ...(p.briefing || {}), [el.dataset.key]: txt } }, { silent: true });
    await syncProjectRevenue(id);
    toast(v ? `Entrega do projeto: ${txt}` : 'Prazo removido');
    updateCount(id, el.dataset.sec);
  },
  async bMoney(el, e, { id }) { await saveMoney(id, el.dataset.key, el.dataset.sec, { val: el.value === '' ? null : Number(el.value) }); },
  async bPay(el, e, { id }) {
    const p = store.find('projects', id);
    const cur = new Set(p.briefing?.[el.dataset.key + '_pay'] || []);
    cur.has(el.dataset.opt) ? cur.delete(el.dataset.opt) : cur.add(el.dataset.opt);
    el.classList.toggle('on', cur.has(el.dataset.opt));
    await saveMoney(id, el.dataset.key, el.dataset.sec, { pay: [...cur] });
  },
  async bField(el, e, { id }) {
    try { await saveField(id, el.dataset.key, el.value.trim(), el.dataset.sec); }
    catch (err) { toast(err.message || 'Não salvou', { kind: 'error' }); }
  },
  async bChip(el, e, { id }) {
    const ta = document.getElementById(`bq-${el.dataset.key}`);
    const items = ta.value.split(',').map(x => x.trim()).filter(Boolean);
    const o = el.dataset.opt;
    const next = items.includes(o) ? items.filter(x => x !== o) : [...items, o];
    ta.value = next.join(', ');
    el.classList.toggle('on', next.includes(o));
    await saveField(id, el.dataset.key, ta.value, ta.dataset.sec);
  },
  async briefingDone(el, e, { id }) {
    const p = store.find('projects', id);
    await saveBriefing(p, p.briefing || {}, true);
  },
  printBriefing() { window.print(); },
  copyFormLink() {
    navigator.clipboard?.writeText(BRIEFING_SHEET.formUrl).then(() => toast('Link do Forms copiado'));
  },
  async importBriefing(el, e, { id }) {
    try {
      if (!google.configured()) throw new Error('Configure o GOOGLE_CLIENT_ID no config.js.');
      if (!google.connected('spreadsheets')) await google.connect();
      el.disabled = true;
      const rows = await google.sheetValues(BRIEFING_SHEET.id, BRIEFING_SHEET.range);
      el.disabled = false;
      if (rows.length < 2) return toast('A planilha ainda não tem respostas.');
      importModal(id, rows);
    } catch (err) {
      el.disabled = false;
      toast(err.message || 'Não consegui ler a planilha', { kind: 'error', ms: 6000 });
    }
  },
};

// Coluna da planilha → campo: o número da pergunta no cabeçalho (1.1, 2.3…) é a chave
function columnKeys(head) {
  return head.map(h => {
    const m = String(h).match(/(\d+)\.(\d+)/);
    if (m) return `q${m[1]}_${m[2]}`;
    return /anex/i.test(h) ? 'qanexos' : null;
  });
}

function importModal(id, rows) {
  const [head, ...data] = rows;
  const keys = columnKeys(head);
  const list = data.map((r, i) => ({ i, when: r[0] || '', name: r[keys.indexOf('q1_1')] || '(sem nome)' })).reverse();
  const p = store.find('projects', id);
  modal({
    title: 'Importar respostas do Forms',
    body: `<p class="muted modal-lead">Escolha a resposta do cliente. As perguntas entram nos campos com o mesmo número.</p>`,
    fields: [
      { name: 'row', label: 'Resposta', type: 'select', required: true, full: true,
        value: list.find(x => x.name.toLowerCase().includes(p.name.toLowerCase()))?.i ?? list[0]?.i,
        options: list.map(x => [x.i, `${x.name} · ${x.when}`]) },
      { name: 'overwrite', label: 'Campos já preenchidos', type: 'checkbox', checkLabel: 'Substituir pelo que veio do Forms', value: false },
    ],
    submit: 'Importar',
    async onSubmit(v) {
      const r = data[Number(v.row)];
      const cur = { ...(p.briefing || {}) };
      let n = 0;
      keys.forEach((k, j) => {
        const val = String(r[j] || '').trim();
        if (!k || !val || val === '.') return;
        if (!v.overwrite && String(cur[k] || '').trim()) return;
        cur[k] = val; n++;
      });
      cur._import = { when: r[0] || '', at: new Date().toISOString() };
      await store.update('projects', id, { briefing: cur });
      toast(`${n} resposta${n === 1 ? '' : 's'} importada${n === 1 ? '' : 's'} do Forms`, { kind: 'success' });
    },
  });
}
