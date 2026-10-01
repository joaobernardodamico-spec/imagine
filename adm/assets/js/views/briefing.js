// Briefing do projeto: as perguntas do Google Forms "BRIEFING — IMAGINE CONCEPT" dentro do ATLAS.
// Dá para preencher numa ligação (cada campo salva sozinho ao sair dele) ou puxar as respostas
// que o cliente mandou pelo Forms, direto da planilha de respostas.
import { store } from '../store.js';
import { BRIEFING_FORM, BRIEFING_QS, BRIEFING_SHEET } from '../config.js';
import { saveBriefing } from '../ops.js';
import { esc, icon, modal, toast, progressBar } from '../util.js';
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
          return `<a href="#/projetos/${esc(p.id)}/briefing/${s.n}" class="${s.n === cur ? 'active' : ''} ${n === s.qs.length ? 'full' : ''}">
            <span class="bn-n">${n === s.qs.length ? icon('check', 13) : s.n}</span><span class="bn-t">${esc(s.title)}</span>
            <small data-bcount="${s.n}">${n}/${s.qs.length}</small></a>`;
        }).join('')}
      </nav>

      <div class="brief-body">
        ${BRIEFING_FORM.map(s => `<section class="card bsec ${s.n === cur ? 'on' : ''}" data-sec="${s.n}">
          <div class="bsec-head"><span class="bsec-n">${s.n}</span><h3>${esc(s.title)}</h3></div>
          ${s.qs.map(([n, q, opts]) => {
            const key = 'q' + n.replace('.', '_');
            const val = String(b[key] || '');
            const picked = new Set(val.split(',').map(x => x.trim()).filter(Boolean));
            return `<div class="bq">
              <label for="bq-${key}"><span class="bq-n">${/^\d/.test(n) ? n : '•'}</span>${esc(q)}</label>
              ${opts ? `<div class="bq-opts no-print">${opts.map(o => `<button type="button" class="bq-opt ${picked.has(o) ? 'on' : ''}" data-act="bChip" data-key="${key}" data-opt="${esc(o)}" ${edit ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>` : ''}
              <textarea id="bq-${key}" rows="${opts ? 1 : 3}" data-change="bField" data-key="${key}" data-sec="${s.n}" placeholder="${opts ? 'Escolha acima ou escreva' : 'Resposta'}" ${edit ? '' : 'readonly'}>${esc(val)}</textarea>
            </div>`;
          }).join('')}
          <footer class="bsec-foot no-print">
            ${s.n > 1 ? `<a class="btn btn-ghost btn-sm" href="#/projetos/${esc(p.id)}/briefing/${s.n - 1}">${icon('chevL', 15)} ${esc(BRIEFING_FORM[s.n - 2].title)}</a>` : '<span></span>'}
            ${s.n < BRIEFING_FORM.length ? `<a class="btn btn-primary btn-sm" href="#/projetos/${esc(p.id)}/briefing/${s.n + 1}">${esc(BRIEFING_FORM[s.n].title)} ${icon('chevR', 15)}</a>` : ''}
          </footer>
        </section>`).join('')}

        ${legacy.length ? `<details class="card brief-legacy"><summary>Respostas do briefing anterior (${legacy.length})</summary>
          <dl class="dl mt-12">${legacy.map(([k, l]) => `<dt>${esc(l)}</dt><dd class="pre">${esc(b[k])}</dd>`).join('')}</dl></details>` : ''}
      </div>
    </div>
  </div>`;
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
