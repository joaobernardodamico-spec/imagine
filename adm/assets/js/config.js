// ============================================================
// IMAGINE HUB — configuração
// Preencha SUPABASE_URL e SUPABASE_ANON_KEY para sair do modo demo.
// A anon key é pública por natureza: quem protege os dados é o RLS
// definido em /adm/supabase/schema.sql.
// ============================================================
export const CONFIG = {
  SUPABASE_URL: 'https://qfjkzagivvbltgmjnhzf.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_LtbqK7q10GkVp9liWU561w_FAugEYwo',

  // Google Cloud → APIs & Services → Credentials → OAuth Client ID (Web)
  // Origem autorizada: https://www.imagineconcept.com.br
  GOOGLE_CLIENT_ID: '826085847361-47l8crsppfeu250n4oh36ipfofdeufbq.apps.googleusercontent.com',
  GOOGLE_CALENDAR_ID: 'primary',
};

export const DEMO = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;

// ------------------------------------------------------------
// Papéis da equipe (visão e funções diferentes)
// ------------------------------------------------------------
export const ROLES = {
  socio:     { label: 'Sócio',     desc: 'Acesso total: financeiro, equipe, metas.' },
  comercial: { label: 'Comercial', desc: 'Leads, clientes, propostas e receitas.' },
  producao:  { label: 'Produção',  desc: 'Todos os projetos, processos e entregas.' },
  freela:    { label: 'Freela',    desc: 'Só os projetos em que foi escalado.' },
};

// Quais módulos cada papel enxerga no menu
export const ACCESS = {
  dashboard:  ['socio', 'comercial', 'producao', 'freela'],
  painel:     ['socio', 'comercial', 'producao'],
  projetos:   ['socio', 'comercial', 'producao', 'freela'],
  contas:     ['socio', 'comercial', 'producao'],
  processos:  ['socio', 'comercial', 'producao', 'freela'],
  leads:      ['socio', 'comercial'],
  posvenda:   ['socio', 'comercial'],
  aliancas:   ['socio', 'comercial', 'producao'],
  financeiro: ['socio', 'comercial'],
  metas:      ['socio', 'comercial', 'producao'],
  agenda:     ['socio', 'comercial', 'producao', 'freela'],
  ranking:    ['socio', 'comercial', 'producao', 'freela'],
  equipe:     ['socio'],
  config:     ['socio'],
};

export const PROJECT_ROLES = {
  lider: 'Líder', design: 'Design', dev: 'Dev', comercial: 'Comercial', revisor: 'Revisão',
};

// ------------------------------------------------------------
// Tipos de conta — a separação que organiza tudo
// ------------------------------------------------------------
export const ACCOUNT_KINDS = {
  cliente:     { label: 'Cliente',     desc: 'Contas externas. Geram receita.' },
  ecossistema: { label: 'Ecossistema', desc: 'Marcas próprias que vivem em paralelo à IMAGINE.' },
  imagine:     { label: 'IMAGINE',     desc: 'A própria operação: site, processos, marketing.' },
};

export const TRACKS = {
  branding: 'Branding',
  web: 'Web',
  social: 'Social',
  produto: 'Produto',
  conteudo: 'Conteúdo',
};

export const PROJECT_STATUS = {
  ativo: 'Em andamento',
  pausado: 'Pausado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// ------------------------------------------------------------
// O PROCESSO IMAGINE — 9 etapas, com checklist base por trilha
// ------------------------------------------------------------
export const STAGES = [
  {
    key: 'objetivo', n: 1, name: 'Objetivo principal',
    why: 'Uma frase que define o sucesso do projeto. Sem isso, nada começa.',
    output: 'Objetivo escrito e validado pelo cliente',
    tasks: { base: ['Reunião de kickoff', 'Escrever o objetivo em uma frase', 'Validar objetivo com o cliente'] },
  },
  {
    key: 'briefing', n: 2, name: 'Briefing completo',
    why: 'O direcionador. Todas as decisões futuras voltam aqui.',
    output: 'Briefing preenchido no Hub',
    tasks: {
      base: ['Preencher briefing no Hub', 'Definir público e posicionamento', 'Definir entregáveis e prazo', 'Aprovar briefing'],
    },
  },
  {
    key: 'arquivos', n: 3, name: 'Arquivos e acessos',
    why: 'Nada trava por falta de material. Tudo num lugar só.',
    output: 'Pasta do cliente + acessos registrados',
    tasks: {
      base: ['Criar pasta no Drive', 'Receber logos e materiais atuais', 'Registrar contrato assinado'],
      web: ['Acesso ao domínio / DNS', 'Acesso à hospedagem', 'Conteúdos e textos das páginas'],
      social: ['Acesso às redes sociais'],
    },
  },
  {
    key: 'pesquisa', n: 4, name: 'Pesquisa',
    why: 'Entender o terreno: concorrentes, similares e referências.',
    output: 'Painel de referências + análise de concorrentes',
    tasks: {
      base: ['Mapear 3–5 concorrentes', 'Levantar similares e referências', 'Montar moodboard', 'Resumo de oportunidades'],
      web: ['Benchmark de UX dos concorrentes'],
    },
  },
  {
    key: 'conceito', n: 5, name: 'Conceito',
    why: 'A ideia central que sustenta toda a execução.',
    output: 'Conceito escrito + direção visual',
    tasks: {
      base: ['Definir conceito criativo', 'Palavras-chave da marca', 'Direção visual (rascunhos)'],
      branding: ['Rascunhos de símbolo e logotipo'],
      web: ['Arquitetura de informação / sitemap', 'Wireframes'],
    },
  },
  {
    key: 'implementacao', n: 6, name: 'Implementação',
    why: 'Execução com o conceito como guia.',
    output: 'Material pronto para apresentar',
    tasks: {
      base: [],
      branding: ['Logo principal', 'Variações e versões', 'Paleta de cores', 'Tipografia', 'Aplicações e mockups', 'Manual de marca'],
      web: ['UI desktop', 'UI mobile', 'Desenvolvimento front-end', 'Integrações / CMS', 'SEO básico', 'Testes de responsividade'],
      social: ['Templates de post', 'Grid inicial', 'Calendário de conteúdo'],
      produto: ['Protótipo', 'Testes internos'],
      conteudo: ['Roteiros', 'Produção', 'Edição'],
    },
  },
  {
    key: 'apresentacao', n: 7, name: 'Apresentação',
    why: 'Contar a história do projeto, não só mostrar telas.',
    output: 'Apresentação feita e feedback registrado',
    tasks: { base: ['Montar apresentação', 'Apresentar ao cliente', 'Registrar feedback'] },
  },
  {
    key: 'revisao', n: 8, name: 'Revisão',
    why: 'Ajustes com base no feedback, dentro do escopo.',
    output: 'Versão final aprovada',
    tasks: {
      base: ['Aplicar ajustes', 'Aprovação final por escrito'],
      web: ['QA final (links, formulários, velocidade)'],
    },
  },
  {
    key: 'entrega', n: 9, name: 'Entrega',
    why: 'Fechar bonito: arquivos, acessos, NPS e case.',
    output: 'Arquivos entregues + NPS + case',
    tasks: {
      base: ['Entregar arquivos finais', 'Enviar pesquisa NPS', 'Registrar case no portfólio'],
      web: ['Deploy em produção', 'Treinamento / handoff'],
    },
  },
];

export function stageTasksFor(stage, track) {
  const t = stage.tasks;
  return [...(t.base || []), ...(t[track] || [])];
}

// ------------------------------------------------------------
// Leads — funil de conversão
// "perdido" não é coluna: sai do quadro e fica na lista de perdidos.
// ------------------------------------------------------------
export const LEAD_STAGES = [
  { key: 'base',     name: 'Base',     desc: 'Contato captado. Ainda não qualificado.' },
  { key: 'mql',      name: 'MQL',      desc: 'Tem perfil e demonstrou interesse.' },
  { key: 'sql',      name: 'SQL',      desc: 'Necessidade, orçamento e prazo confirmados.' },
  { key: 'proposta', name: 'Proposta', desc: 'Proposta enviada, em negociação.' },
  { key: 'venda',    name: 'Venda',    desc: 'Fechado. Vira conta e projeto.' },
];
export const LEAD_WON = 'venda';
export const LEAD_LOST = 'perdido';

// Etapas do CRM antigo → funil novo (o schema.sql faz o mesmo no banco)
export const LEAD_STAGE_MIGRATION = { novo: 'base', contato: 'mql', reuniao: 'sql', negociacao: 'proposta', ganho: 'venda' };

// Relacionamento = canal próximo e quente (gente que já conhece a IMAGINE).
// Prospecção = empresas que nós fomos buscar (ex.: mapeadas no My Maps).
export const LEAD_CHANNELS = ['Site', 'Indicação', 'Relacionamento', 'Instagram', 'LinkedIn', 'Prospecção', 'Outro'];

// Mesma lista do briefing da página inicial
export const LEAD_SEGMENTS = ['Alimentação', 'Moda', 'Saúde e bem-estar', 'Tecnologia', 'Educação', 'Imobiliário', 'Serviços', 'Indústria', 'Varejo', 'Marketing', 'Fotografia e vídeo', 'Automotivo'];

export const COMPANY_SIZES = ['', 'MEI', 'Micro', 'Pequena', 'Média', 'Grande'];

// ------------------------------------------------------------
// Serviços — no fim, toda dor mapeada vira uma entrega de valor
// partner: normalmente executado por uma aliança
// ------------------------------------------------------------
export const SERVICES = {
  identidade: { label: 'Identidade visual e posicionamento', short: 'Identidade visual' },
  web:        { label: 'Site e presença digital',            short: 'Site' },
  marketing:  { label: 'Estratégia de vendas e marketing',   short: 'Estratégia' },
  social:     { label: 'Social media e aplicações',          short: 'Social media' },
  registro:   { label: 'Registro de marca (INPI)',           short: 'Registro de marca', partner: true },
  outro:      { label: 'Outro',                              short: 'Outro' },
};

// Atalhos do mapa de dores (dor → serviço que resolve)
export const PAIN_PRESETS = [
  ['Marca não registrada no INPI', 'registro'],
  ['Site inexistente', 'web'],
  ['Linktree / links desfuncionais', 'web'],
  ['Site desatualizado ou lento', 'web'],
  ['Identidade visual vencida ou defasada', 'identidade'],
  ['Marca sem posicionamento claro', 'identidade'],
  ['Redes sociais sem padrão visual', 'social'],
  ['Sem aplicações da marca (papelaria, materiais)', 'social'],
  ['Sem estratégia de vendas / captação', 'marketing'],
];

// Qualificação BANT
export const BANT = [
  { key: 'orcamento',   label: 'Orçamento',   hint: 'Quanto pode investir? Já tem verba?' },
  { key: 'autoridade',  label: 'Autoridade',  hint: 'Quem decide? Quem mais participa?' },
  { key: 'necessidade', label: 'Necessidade', hint: 'O que dói hoje, nas palavras do cliente.' },
  { key: 'prazo',       label: 'Prazo',       hint: 'Quando precisa estar pronto? Por quê?' },
];

// ------------------------------------------------------------
// Pós-venda / relacionamento — carteira de clientes
// ------------------------------------------------------------
export const CARE_STAGES = [
  { key: 'implementacao',  name: 'Implementação',       desc: 'Projeto entregue, cliente colocando em uso.' },
  { key: 'manutencao',     name: 'Manutenção',          desc: 'Suporte ou contrato recorrente.' },
  { key: 'relacionamento', name: 'Relacionamento',      desc: 'Sem projeto ativo. Contato periódico.' },
  { key: 'quente',         name: 'Oportunidade quente', desc: 'Disponível para um novo projeto.' },
  { key: 'adormecido',     name: 'Adormecido',          desc: 'Sem contato há tempo. Reativar.' },
];
export const CARE_COLD_DAYS = 30;   // sem contato há mais que isso = alerta

// ------------------------------------------------------------
// Alianças — parceiros que entram nos projetos e nas propostas
// ------------------------------------------------------------
export const ALLIANCE_MODELS = {
  indicacao:   'Indicação (cliente contrata direto)',
  subcontrato: 'Subcontratação (entra no nosso orçamento)',
  coentrega:   'Co-entrega (dividimos o projeto)',
};

// Diário de processo por etapa — receita de bolo
export const JOURNAL = [
  { key: 'feito',   label: 'O que foi feito',       hint: 'Em tópicos curtos.' },
  { key: 'decisao', label: 'Decisão e por quê',     hint: 'O que escolhemos e o motivo.' },
  { key: 'refs',    label: 'Referências e links',   hint: 'Arquivos, sites, imagens.' },
  { key: 'proximo', label: 'Próximo passo',         hint: 'O que destrava a próxima etapa.' },
];

// ------------------------------------------------------------
// Gamificação
// ------------------------------------------------------------
export const XP = {
  task_done: 10,
  stage_done: 50,
  project_delivered: 200,
  briefing_done: 30,
  lead_created: 5,
  lead_advanced: 10,
  lead_won: 100,
  revenue_received: 20,
  note_created: 2,
};

export const LEVELS = [
  { min: 0,     name: 'Aprendiz' },
  { min: 200,   name: 'Explorador' },
  { min: 600,   name: 'Criador' },
  { min: 1400,  name: 'Visionário' },
  { min: 3000,  name: 'Mago' },
  { min: 6000,  name: 'Lendário' },
];

export const BADGES = [
  { key: 'first_task',   name: 'Primeiro passo',  desc: 'Concluiu a primeira tarefa',         test: s => s.tasks >= 1 },
  { key: 'tasks_50',     name: 'Máquina',         desc: '50 tarefas concluídas',               test: s => s.tasks >= 50 },
  { key: 'stage_10',     name: 'Etapista',        desc: '10 etapas fechadas',                  test: s => s.stages >= 10 },
  { key: 'delivered_1',  name: 'Entregou',        desc: 'Primeiro projeto entregue',           test: s => s.delivered >= 1 },
  { key: 'delivered_10', name: 'Portfólio vivo',  desc: '10 projetos entregues',               test: s => s.delivered >= 10 },
  { key: 'first_win',    name: 'Primeira venda',  desc: 'Fechou o primeiro lead',              test: s => s.wins >= 1 },
  { key: 'wins_10',      name: 'Closer',          desc: '10 leads fechados',                   test: s => s.wins >= 10 },
  { key: 'briefing_5',   name: 'Direcionador',    desc: '5 briefings completos',               test: s => s.briefings >= 5 },
  { key: 'streak_5',     name: 'Constância',      desc: '5 dias seguidos concluindo algo',     test: s => s.streak >= 5 },
];

// ------------------------------------------------------------
// Metas
// ------------------------------------------------------------
export const GOAL_METRICS = {
  faturamento: { label: 'Faturamento recebido', money: true },
  vendas:      { label: 'Vendas fechadas (R$)', money: true },
  leads:       { label: 'Novos leads' },
  clientes:    { label: 'Novos clientes' },
  projetos:    { label: 'Projetos em andamento' },
  entregas:    { label: 'Projetos entregues' },
  etapas:      { label: 'Etapas concluídas' },
  tarefas:     { label: 'Tarefas concluídas' },
  nps:         { label: 'NPS' },
};
