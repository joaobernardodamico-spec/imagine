// Processos IMAGINE desenhados: fluxo de projeto (9 etapas) e fluxo comercial.
import { store } from '../store.js';
import { STAGES, TRACKS, LEAD_STAGES, XP, stageTasksFor } from '../config.js';
import { esc, icon } from '../util.js';
import { pageHead } from './components.js';

const state = { stage: 'objetivo', track: 'branding' };

const PHASES = [
  { name: 'Entender', desc: 'Antes de criar, entender.', keys: ['objetivo', 'briefing', 'arquivos', 'pesquisa'] },
  { name: 'Criar', desc: 'Ideia forte, execução fiel.', keys: ['conceito', 'implementacao'] },
  { name: 'Entregar', desc: 'Apresentar, ajustar, fechar bonito.', keys: ['apresentacao', 'revisao', 'entrega'] },
];

const TIPS = {
  objetivo: ['Se não cabe em uma frase, ainda não está claro.', 'Pergunte: "como vamos saber que deu certo?"'],
  briefing: ['Preencha junto com o cliente, em call.', 'Briefing marcado como completo libera XP e fecha a tarefa.'],
  arquivos: ['Pasta do Drive com nome padrão: CLIENTE — Projeto — Ano.', 'Senhas vão no cofre, nunca no Hub.'],
  pesquisa: ['Concorrente direto, indireto e uma referência fora do setor.', 'Resuma em 3 oportunidades.'],
  conceito: ['O conceito precisa ser explicável em 30 segundos.', 'Volte ao objetivo: o conceito responde a ele?'],
  implementacao: ['Quebre em tarefas pequenas. Cada uma conta ponto.', 'Checkpoint interno antes de mostrar ao cliente.'],
  apresentacao: ['Conte a história: problema → conceito → solução.', 'Registre o feedback nas notas do projeto.'],
  revisao: ['Ajuste dentro do escopo; fora do escopo vira proposta nova.', 'Aprovação final sempre por escrito.'],
  entrega: ['Entregue também o manual de marca no Hub.', 'Peça NPS e autorização para usar como case.'],
};

export default {
  title: () => 'Processos',

  render() {
    const def = STAGES.find(s => s.key === state.stage);
    const tasks = stageTasksFor(def, state.track);
    const live = store.where('stages', s => s.key === def.key && s.status === 'andamento')
      .map(s => store.find('projects', s.project_id)).filter(p => p && p.status === 'ativo');

    return `<div class="page">
      ${pageHead('Processos', 'Como a IMAGINE trabalha, do primeiro contato à entrega. Todo projeto no Hub segue este fluxo.')}

      <section class="card flow-card">
        <div class="card-head"><h2>Fluxo de projeto</h2>
          <div class="seg seg-sm">${Object.entries(TRACKS).map(([k, l]) =>
            `<button class="seg-btn ${state.track === k ? 'active' : ''}" data-act="track" data-track="${k}">${esc(l)}</button>`).join('')}</div>
        </div>
        <div class="flow">
          ${PHASES.map((ph, pi) => `
            <div class="phase phase-${pi + 1}" style="flex:${ph.keys.length} 1 0">
              <div class="phase-label"><strong>${esc(ph.name)}</strong><small>${esc(ph.desc)}</small></div>
              <div class="phase-nodes">
                ${ph.keys.map(k => {
                  const s = STAGES.find(x => x.key === k);
                  return `<button class="node ${state.stage === k ? 'active' : ''}" data-act="stage" data-key="${k}">
                    <span class="node-n">${s.n}</span><span class="node-name">${esc(s.name)}</span>
                  </button>`;
                }).join('<span class="arrow" aria-hidden="true"></span>')}
              </div>
            </div>`).join('<span class="phase-arrow" aria-hidden="true">' + icon('arrow', 20) + '</span>')}
        </div>
        <p class="flow-loop">${icon('refresh', 16)} Se a revisão pedir mais do que ajustes, volta para <strong>Implementação</strong>. Fora do escopo vira proposta nova.</p>
      </section>

      <div class="grid-2">
        <section class="card stage-detail">
          <div class="kicker">Etapa ${def.n} de 9</div>
          <h2>${esc(def.name)}</h2>
          <p class="lead">${esc(def.why)}</p>
          <div class="sd-output"><span>Sai desta etapa com</span><strong>${esc(def.output)}</strong></div>
          <h3>Checklist · ${esc(TRACKS[state.track])}</h3>
          <ol class="checklist">${tasks.map(t => `<li>${esc(t)}</li>`).join('') || '<li class="muted">Sem tarefas padrão nesta trilha.</li>'}</ol>
          <h3>Dicas</h3>
          <ul class="bullets">${(TIPS[def.key] || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        </section>
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Projetos nesta etapa agora</h2></div>
            ${live.length ? `<ul class="link-list">${live.map(p => `<li><a href="#/projetos/${esc(p.id)}/etapas">${icon('folder', 16)} <span>${esc(p.name)}</span></a></li>`).join('')}</ul>` : '<p class="muted">Nenhum.</p>'}
          </section>
          <section class="card">
            <div class="card-head"><h2>Como a pontuação funciona</h2></div>
            <ul class="xp-rules">
              <li><span>Tarefa concluída</span><b>+${XP.task_done}</b></li>
              <li><span>Briefing completo</span><b>+${XP.briefing_done}</b></li>
              <li><span>Etapa concluída</span><b>+${XP.stage_done}</b></li>
              <li><span>Projeto entregue</span><b>+${XP.project_delivered}</b></li>
              <li><span>Lead cadastrado</span><b>+${XP.lead_created}</b></li>
              <li><span>Lead avançou no funil</span><b>+${XP.lead_advanced}</b></li>
              <li><span>Venda fechada</span><b>+${XP.lead_won}</b></li>
              <li><span>Pagamento recebido</span><b>+${XP.revenue_received}</b></li>
            </ul>
          </section>
        </div>
      </div>

      <section class="card flow-card">
        <div class="card-head"><h2>Fluxo comercial</h2><a class="link" href="#/leads">Abrir Leads ${icon('arrow', 14)}</a></div>
        <div class="flow flow-sales">
          <div class="phase-nodes">
            ${LEAD_STAGES.map((s, i) => `<span class="node node-static ${s.key === 'venda' ? 'node-win' : ''}"><span class="node-n">${i + 1}</span><span class="node-name">${esc(s.name)}</span></span>`).join('<span class="arrow" aria-hidden="true"></span>')}
            <span class="arrow" aria-hidden="true"></span>
            <span class="node node-static node-handoff"><span class="node-n">${icon('folder', 14)}</span><span class="node-name">Vira conta + projeto → Etapa 1</span></span>
          </div>
        </div>
        <p class="fine">Lead que chega em Venda vira conta de cliente com um clique, e o projeto já nasce com as 9 etapas. O briefing do site entra sozinho na Base.</p>
      </section>
    </div>`;
  },

  actions: {
    stage(el) { state.stage = el.dataset.key; store.emit({}); },
    track(el) { state.track = el.dataset.track; store.emit({}); },
  },
};
