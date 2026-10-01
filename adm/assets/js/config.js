// ============================================================
// ATLAS — o CRM da IMAGINE · configuração
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

// Modo demo: sem Supabase, ou forçado em localhost com ?demo (testar sem tocar no banco real)
const localDemo = () => typeof location !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(location.hostname) && /[?&]demo\b/.test(location.search);
export const DEMO = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY || localDemo();

export const APP_NAME = 'ATLAS';

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
  ecossistema: { label: 'Ecossistema', desc: 'Marcas próprias e projetos internos da IMAGINE.' },
  imagine:     { label: 'IMAGINE',     desc: 'A própria operação: site, processos, marketing.' },
};

// Serviço do projeto (no banco segue como "track"): define o checklist de cada etapa
export const TRACKS = {
  branding: 'Branding',
  web: 'Web',
  social: 'Social',
  produto: 'Produto',
  conteudo: 'Conteúdo',
};
export const TRACK_ICONS = { branding: 'brand', web: 'globe', social: 'instagram', produto: 'box', conteudo: 'play' };

// Objetivos prontos por serviço, do mais simples ao mais completo
export const OBJECTIVE_PRESETS = {
  branding: [
    ['Essencial', 'Criar um logotipo marcante e versátil, pronto para redes sociais e materiais básicos.'],
    ['Completo', 'Desenvolver a identidade visual completa (logo, cores, tipografia e aplicações) que traduza a essência da marca.'],
    ['Estratégico', 'Construir a marca do zero: posicionamento, identidade verbal e visual e manual completo para crescer com consistência.'],
  ],
  web: [
    ['Essencial', 'Colocar no ar uma página única que apresente a marca e leve o visitante ao contato.'],
    ['Completo', 'Criar um site institucional completo, rápido e responsivo, que gere confiança e capte clientes.'],
    ['Estratégico', 'Desenvolver uma plataforma digital com SEO, integrações e conteúdo gerenciável, focada em conversão.'],
  ],
  social: [
    ['Essencial', 'Padronizar o visual das redes com templates prontos para os principais formatos.'],
    ['Completo', 'Estruturar a presença nas redes: identidade, grid, templates e calendário de conteúdo.'],
    ['Estratégico', 'Transformar as redes num canal de vendas: linha editorial, produção contínua e métricas de crescimento.'],
  ],
  produto: [
    ['Essencial', 'Validar a ideia do produto com um protótipo navegável e testes rápidos.'],
    ['Completo', 'Projetar a experiência e a interface do produto, prontas para desenvolvimento.'],
    ['Estratégico', 'Lançar o produto: estratégia, UX/UI, desenvolvimento e plano de evolução guiado por dados.'],
  ],
  conteudo: [
    ['Essencial', 'Produzir uma peça de conteúdo (vídeo ou série curta) que apresente a marca.'],
    ['Completo', 'Criar uma série de conteúdos com roteiro, produção e edição alinhados à marca.'],
    ['Estratégico', 'Montar uma estratégia de conteúdo contínua que posicione a marca como referência no seu nicho.'],
  ],
};

// ------------------------------------------------------------
// Marca: arquétipos e modelos de negócio
// ------------------------------------------------------------
export const ARCHETYPES = [
  { key: 'inocente',   name: 'Inocente',      motto: 'Ser feliz',     desc: 'Otimismo, pureza e simplicidade.' },
  { key: 'explorador', name: 'Explorador',    motto: 'Liberdade',     desc: 'Descoberta, autenticidade e aventura.' },
  { key: 'sabio',      name: 'Sábio',         motto: 'Verdade',       desc: 'Conhecimento, análise e clareza.' },
  { key: 'heroi',      name: 'Herói',         motto: 'Superação',     desc: 'Coragem, disciplina e conquista.' },
  { key: 'foradalei',  name: 'Fora da lei',   motto: 'Revolução',     desc: 'Ruptura, rebeldia e transformação.' },
  { key: 'mago',       name: 'Mago',          motto: 'Transformar',   desc: 'Visão, imaginação e encanto.' },
  { key: 'comum',      name: 'Pessoa comum',  motto: 'Pertencer',     desc: 'Empatia, proximidade e realismo.' },
  { key: 'amante',     name: 'Amante',        motto: 'Intimidade',    desc: 'Paixão, estética e prazer.' },
  { key: 'bobo',       name: 'Bobo da corte', motto: 'Diversão',      desc: 'Humor, leveza e espontaneidade.' },
  { key: 'cuidador',   name: 'Cuidador',      motto: 'Proteger',      desc: 'Acolhimento, generosidade e cuidado.' },
  { key: 'criador',    name: 'Criador',       motto: 'Inovar',        desc: 'Criatividade, expressão e originalidade.' },
  { key: 'governante', name: 'Governante',    motto: 'Liderar',       desc: 'Ordem, excelência e responsabilidade.' },
];

export const BUSINESS_MODELS = ['B2B', 'B2C', 'B2B2C', 'D2C', 'B2G', 'Marketplace', 'Assinatura', 'Serviço', 'Produto físico', 'Produto digital', 'Infoproduto', 'Franquia'];

// ------------------------------------------------------------
// Briefing — as mesmas perguntas do Google Forms "BRIEFING — IMAGINE CONCEPT".
// O número da pergunta (1.1, 2.3…) é o que liga a coluna da planilha de respostas ao campo.
// opts: atalhos de resposta (o campo continua livre). Ajuste aqui se o Forms mudar.
// ------------------------------------------------------------
export const BRIEFING_SHEET = {
  id: '1TWVdXOxIV7pBXhHU_-GMIezAa3edI0smuSMNMapR0gg',
  range: 'Respostas ao formulário 1',
  formUrl: '',   // link público do Forms (Enviar → link), para mandar ao cliente
};

export const BRIEFING_FORM = [
  { n: 1, title: 'Sobre a marca / negócio', qs: [
    ['1.1', 'Qual é o nome da marca? Há algum significado por trás dele?'],
    ['1.2', 'A marca já existe ou está sendo criada do zero?', ['Já existe', 'Estou criando do zero', 'Existe, mas quero reformular']],
    ['1.3', 'Qual é o objetivo da marca? (origem, motivação, momento atual)'],
    ['1.4', 'Quais são os produtos ou serviços oferecidos?'],
    ['1.5', 'Quem são os fundadores ou responsáveis pela marca?'],
  ] },
  { n: 2, title: 'Propósito e valores', qs: [
    ['2.1', 'Qual é a missão da marca?'],
    ['2.2', 'Qual é a visão de futuro da empresa?'],
    ['2.3', 'Quais são os principais valores que guiam o negócio? (Cite pelo menos 3)'],
    ['2.4', 'Qual é o diferencial da sua marca em relação à concorrência?'],
    ['2.5', 'Como você gostaria que sua marca fosse percebida pelas pessoas?'],
  ] },
  { n: 3, title: 'Público', qs: [
    ['3.1', 'Quem é o cliente ideal da marca? (faixa etária, gênero, localização, estilo de vida, classe social)'],
    ['3.2', 'Quais são os principais interesses, dores ou desejos desse público?'],
    ['3.3', 'Que tipo de linguagem e comunicação funciona melhor com esse público?'],
  ] },
  { n: 4, title: 'Personalidade', qs: [
    ['4.1', 'Se sua marca fosse uma pessoa, como ela seria? (ex: divertida, séria, sofisticada, rebelde...)'],
    ['4.2', 'Que tom de voz representa melhor a marca?', ['Formal', 'Coloquial', 'Amigável', 'Divertido', 'Inspirador', 'Técnico', 'Sofisticado', 'Provocador']],
    ['4.3', 'Existem marcas ou figuras públicas com as quais você se identifica nesse sentido? (perfis do Instagram, vídeos…)'],
  ] },
  { n: 5, title: 'Referências visuais', qs: [
    ['5.1', 'Você tem marcas que admira? Quais e por quê?'],
    ['5.2', 'Tem alguma paleta de cores que gosta ou gostaria de evitar?'],
    ['5.3', 'Existem elementos visuais que você gostaria de incluir ou que não combinam com a marca?'],
    ['5.4', 'Como você imagina seu logotipo?', ['Só o nome (tipográfico)', 'Símbolo + nome', 'Emblema / selo', 'Monograma (iniciais)', 'Combinação (pode incluir 1 ou mais itens dessa lista)']],
    ['5.5', 'Há alguma simbologia que represente sua área ou visão em relação à marca? (filosofia de vida, doutrina…)'],
  ] },
  { n: 6, title: 'Mercado', qs: [
    ['6.1', 'Quem são seus principais concorrentes?'],
    ['6.2', 'O que você admira neles? E o que gostaria de fazer diferente?'],
    ['6.3', 'Como você enxerga sua posição atual no mercado? E aonde quer chegar?'],
  ] },
  { n: 7, title: 'Aplicações', qs: [
    ['7.1', 'Em quais materiais a marca será mais usada?', ['Redes sociais', 'Site', 'Embalagem', 'Papelaria (cartão, envelope, papel timbrado)', 'Fachada / sinalização', 'Uniforme', 'Materiais impressos']],
    ['7.2', 'Há alguma necessidade técnica específica? (bordado, impressão em preto e branco, favicon…)'],
    ['7.3', 'Você já tem presença online? Quer manter ou reformular?', ['Quero manter', 'Podemos reformular', 'Ainda não tenho']],
  ] },
  { n: 8, title: 'Prazo e sucesso', qs: [
    ['8.1', 'Qual é o prazo ideal para entrega do projeto?'],
    ['8.2', 'Há algum evento, lançamento ou campanha que depende da identidade?'],
    ['8.3', 'O que seria, para você, um resultado de sucesso neste projeto?'],
  ] },
  { n: 9, title: 'Investimento e materiais', qs: [
    ['9.1', 'Você já tem uma ideia de quanto pretende investir neste projeto?'],
    ['anexos', 'Materiais existentes (logos antigas, paleta, rascunhos): cole os links'],
    ['10.1', 'Já possui algum material que deve ser mantido ou considerado? (logo anterior, paleta, slogan…)'],
    ['10.2', 'Você já tem uma identidade visual? Está satisfeito com ela? Por quê?'],
  ] },
  { n: 10, title: 'Processo', qs: [
    ['11.1', 'Quem será o responsável por aprovar as etapas do projeto?'],
    ['11.2', 'Qual a melhor forma de comunicação durante o processo?', ['WhatsApp', 'E-mail', 'Ligação', 'Reunião online']],
    ['11.3', 'Você está aberto a sugestões criativas fora do esperado, caso façam sentido com a estratégia?', ['Sim', 'Depende — podemos conversar', 'Não']],
  ] },
];
export const BRIEFING_QS = BRIEFING_FORM.flatMap(s => s.qs.map(([n, q, opts]) => ({ key: 'q' + n.replace('.', '_'), n, q, opts, section: s.n })));

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
    next: { title: 'Comece pelo que é sucesso.', text: 'Escreva o objetivo em uma frase e valide com o cliente.', cta: null },
    why: 'Uma frase que define o sucesso do projeto. Sem isso, nada começa.',
    output: 'Objetivo escrito e validado pelo cliente',
    tasks: { base: ['Reunião de kickoff', 'Escrever o objetivo em uma frase', 'Validar objetivo com o cliente'] },
  },
  {
    key: 'briefing', n: 2, name: 'Briefing completo',
    next: { title: 'Vamos dar forma à essência de {name}.', text: 'Complete o briefing para iniciar a pesquisa.', cta: ['briefing', 'Abrir briefing'] },
    why: 'O direcionador. Todas as decisões futuras voltam aqui.',
    output: 'Briefing preenchido no Hub',
    tasks: {
      base: ['Preencher briefing no Hub', 'Definir público e posicionamento', 'Definir entregáveis e prazo', 'Aprovar briefing'],
    },
  },
  {
    key: 'arquivos', n: 3, name: 'Arquivos e acessos',
    next: { title: 'Tudo num lugar só.', text: 'Reúna materiais, acessos e contrato antes de criar.', cta: ['arquivos', 'Abrir arquivos'] },
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
    next: { title: 'Hora de olhar o terreno.', text: 'Concorrentes, similares e referências vão para o moodboard.', cta: ['moodboard', 'Abrir moodboard'] },
    why: 'Entender o terreno: concorrentes, similares e referências.',
    output: 'Painel de referências + análise de concorrentes',
    tasks: {
      base: ['Mapear 3–5 concorrentes', 'Levantar similares e referências', 'Montar moodboard', 'Resumo de oportunidades'],
      web: ['Benchmark de UX dos concorrentes'],
    },
  },
  {
    key: 'conceito', n: 5, name: 'Conceito',
    next: { title: 'A ideia que sustenta tudo.', text: 'Defina conceito, propósito e tom de voz na Marca.', cta: ['marca', 'Abrir marca'] },
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
    next: { title: 'Mão na massa.', text: 'Logo, cores, tipografia e aplicações ganham forma na Marca.', cta: ['marca/logo', 'Abrir marca'] },
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
    next: { title: 'Conte a história do projeto.', text: 'O manual completo já monta a apresentação com o que foi preenchido.', cta: ['marca/manual', 'Ver manual'] },
    why: 'Contar a história do projeto, não só mostrar telas.',
    output: 'Apresentação feita e feedback registrado',
    tasks: { base: ['Montar apresentação', 'Apresentar ao cliente', 'Registrar feedback'] },
  },
  {
    key: 'revisao', n: 8, name: 'Revisão',
    next: { title: 'Ajustes finos.', text: 'Aplique o feedback dentro do escopo e registre a aprovação.', cta: ['notas', 'Abrir notas'] },
    why: 'Ajustes com base no feedback, dentro do escopo.',
    output: 'Versão final aprovada',
    tasks: {
      base: ['Aplicar ajustes', 'Aprovação final por escrito'],
      web: ['QA final (links, formulários, velocidade)'],
    },
  },
  {
    key: 'entrega', n: 9, name: 'Entrega',
    next: { title: 'Fechar bonito.', text: 'Baixe o manual em PDF, entregue os arquivos e peça o NPS.', cta: ['marca/manual', 'Baixar manual'] },
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
