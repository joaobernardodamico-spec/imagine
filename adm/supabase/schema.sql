-- ============================================================
-- IMAGINE HUB — schema Supabase (Postgres)
-- Rode inteiro no SQL Editor do Supabase. Pode rodar de novo sem quebrar.
--
-- Segurança: toda tabela tem Row Level Security.
--   socio     → tudo
--   comercial → CRM, financeiro, NPS, contas e projetos
--   producao  → contas, todos os projetos, processos
--   freela    → só projetos em que está em project_members
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'freela' check (role in ('socio','comercial','producao','freela')),
  title text default '',
  color text default '#12328C',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'cliente' check (kind in ('cliente','ecossistema','imagine')),
  name text not null,
  segment text default '',
  contact_name text default '',
  contact_email text default '',
  contact_phone text default '',
  website text default '',
  instagram text default '',
  notes text default '',
  links jsonb not null default '[]',
  brand jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete set null,
  name text not null,
  track text not null default 'branding',
  status text not null default 'ativo' check (status in ('ativo','pausado','entregue','cancelado')),
  objective text default '',
  start_date date,
  due_date date,
  value numeric(12,2) default 0,
  briefing jsonb not null default '{}',
  briefing_done boolean not null default false,
  cover_color text,
  cover_url text,
  created_by uuid references profiles(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'design',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  n int not null,
  status text not null default 'pendente' check (status in ('pendente','andamento','concluida')),
  done_at timestamptz,
  done_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  stage_key text not null,
  title text not null,
  sort int default 0,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references profiles(id) on delete set null,
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  author_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  kind text not null default 'outro',
  label text not null,
  url text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text default '',
  email text default '',
  phone text default '',
  source text default '',
  stage text not null default 'novo',
  value numeric(12,2) default 0,
  owner_id uuid references profiles(id) on delete set null,
  next_action text default '',
  next_date date,
  notes text default '',
  lost_reason text default '',
  account_id uuid references accounts(id) on delete set null,
  won_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists revenue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null default 0,
  kind text not null default 'projeto' check (kind in ('projeto','recorrente')),
  status text not null default 'previsto' check (status in ('previsto','recebido')),
  due_date date,
  paid_at date,
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  period text not null,               -- 'YYYY-MM'
  target numeric(14,2) not null,
  user_id uuid references profiles(id) on delete cascade,  -- null = meta da empresa
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start text not null,                -- 'YYYY-MM-DDTHH:MM' (hora local)
  "end" text,
  kind text default 'reuniao',
  project_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  kind text not null,
  label text default '',
  ref_id text,
  created_at timestamptz not null default now()
);

create table if not exists nps (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  score int not null check (score between 0 and 10),
  comment text default '',
  created_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on tasks(project_id);
create index if not exists stages_project_idx on stages(project_id);
create index if not exists members_user_idx on project_members(user_id);
create index if not exists xp_user_idx on xp_events(user_id);

-- ---------- helpers de permissão ----------
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function is_socio() returns boolean language sql stable as $$ select my_role() = 'socio' $$;
create or replace function is_sales() returns boolean language sql stable as $$ select my_role() in ('socio','comercial') $$;
create or replace function is_staff() returns boolean language sql stable as $$ select my_role() in ('socio','comercial','producao') $$;

create or replace function is_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid())
$$;

create or replace function can_see_project(pid uuid) returns boolean
language sql stable as $$ select is_staff() or is_member(pid) $$;

-- ---------- perfil automático no primeiro login ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'freela')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Ninguém muda o próprio papel; só sócio muda papel de alguém
create or replace function guard_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- SQL Editor / service role
  if new.role is distinct from old.role and not is_socio() then
    raise exception 'Só sócios mudam papéis';
  end if;
  if new.role is distinct from old.role and new.id = auth.uid() then
    raise exception 'Você não pode mudar o próprio papel';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role on profiles;
create trigger profiles_guard_role before update on profiles
  for each row execute function guard_role_change();

-- ---------- RLS ----------
do $$
declare t text; p record;
begin
  foreach t in array array['profiles','accounts','projects','project_members','stages','tasks','notes','files','leads','revenue','goals','events','xp_events','nps']
  loop
    execute format('alter table %I enable row level security', t);
    -- recria políticas do zero para o script ser idempotente
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on %I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- profiles
create policy profiles_read   on profiles for select to authenticated using (true);
create policy profiles_self   on profiles for update to authenticated using (id = auth.uid() or is_socio());
create policy profiles_insert on profiles for insert to authenticated with check (is_socio());

-- accounts: staff vê tudo; freela vê só contas dos seus projetos
create policy accounts_read on accounts for select to authenticated using (
  is_staff() or exists (select 1 from projects p where p.account_id = accounts.id and is_member(p.id)));
create policy accounts_write on accounts for insert to authenticated with check (is_staff());
create policy accounts_update on accounts for update to authenticated using (
  is_staff() or exists (select 1 from projects p where p.account_id = accounts.id and is_member(p.id)));
create policy accounts_delete on accounts for delete to authenticated using (is_socio());

-- projects
create policy projects_read   on projects for select to authenticated using (can_see_project(id));
create policy projects_insert on projects for insert to authenticated with check (is_staff());
create policy projects_update on projects for update to authenticated using (can_see_project(id));
create policy projects_delete on projects for delete to authenticated using (is_socio());

-- project_members
create policy members_read  on project_members for select to authenticated using (can_see_project(project_id));
create policy members_write on project_members for all to authenticated
  using (my_role() in ('socio','producao') or (is_staff() and exists (select 1 from projects p where p.id = project_id and p.created_by = auth.uid())))
  with check (my_role() in ('socio','producao') or (is_staff() and exists (select 1 from projects p where p.id = project_id and p.created_by = auth.uid())));

-- stages / tasks: quem vê o projeto, trabalha nele
create policy stages_all on stages for all to authenticated using (can_see_project(project_id)) with check (can_see_project(project_id));
create policy tasks_all  on tasks  for all to authenticated using (can_see_project(project_id)) with check (can_see_project(project_id));

-- notes
create policy notes_read   on notes for select to authenticated using (case when project_id is null then is_staff() else can_see_project(project_id) end);
create policy notes_insert on notes for insert to authenticated with check (author_id = auth.uid() and (case when project_id is null then is_staff() else can_see_project(project_id) end));
create policy notes_update on notes for update to authenticated using (case when project_id is null then is_staff() else can_see_project(project_id) end);
create policy notes_delete on notes for delete to authenticated using (author_id = auth.uid() or is_socio());

-- files (links)
create policy files_all on files for all to authenticated
  using (case when project_id is null then is_staff() else can_see_project(project_id) end)
  with check (case when project_id is null then is_staff() else can_see_project(project_id) end);

-- CRM e dinheiro: só comercial e sócio
create policy leads_all   on leads   for all to authenticated using (is_sales()) with check (is_sales());
create policy revenue_all on revenue for all to authenticated using (is_sales()) with check (is_sales());
create policy nps_all     on nps     for all to authenticated using (is_sales()) with check (is_sales());

-- metas: todos leem, sócio define
create policy goals_read  on goals for select to authenticated using (true);
create policy goals_write on goals for all to authenticated using (is_socio()) with check (is_socio());

-- agenda interna
create policy events_read   on events for select to authenticated using (project_id is null or can_see_project(project_id));
create policy events_insert on events for insert to authenticated with check (created_by = auth.uid());
create policy events_change on events for update to authenticated using (created_by = auth.uid() or is_socio());
create policy events_delete on events for delete to authenticated using (created_by = auth.uid() or is_socio());

-- XP: todos leem (ranking); cada um registra o seu, comercial/sócio creditam vendas ao dono do lead
create policy xp_read   on xp_events for select to authenticated using (true);
create policy xp_insert on xp_events for insert to authenticated with check (user_id = auth.uid() or is_sales());
create policy xp_delete on xp_events for delete to authenticated using (user_id = auth.uid() or is_staff());

-- ---------- contas-base do ecossistema ----------
insert into accounts (kind, name, segment, website)
select * from (values
  ('imagine', 'IMAGINE Concept', 'Estúdio de design e tecnologia', 'https://www.imagineconcept.com.br'),
  ('ecossistema', 'Elementarios', 'Card game · universo próprio', ''),
  ('ecossistema', 'Trajetória', 'SaaS · orientação vocacional', 'https://www.suatrajetoria.com.br'),
  ('ecossistema', 'Tekno Sapiens', 'Marca de roupas', '')
) v(kind, name, segment, website)
where not exists (select 1 from accounts a where a.name = v.name);

-- ---------- depois do seu primeiro login, rode UMA vez: ----------
-- update profiles set role = 'socio', name = 'João Bernardo' where email = 'SEU_EMAIL_AQUI';

-- ---------- janela da tarefa (descrição, links, checklist, atividade) ----------
alter table tasks add column if not exists description text default '';
alter table tasks add column if not exists links jsonb not null default '[]';
alter table tasks add column if not exists checklist jsonb not null default '[]';
alter table tasks add column if not exists activity jsonb not null default '[]';

alter table events add column if not exists google_id text;
alter table projects add column if not exists cover_url text;

-- ---------- Leads: funil Base → MQL → SQL → Proposta → Venda ----------
alter table leads add column if not exists cnpj text default '';
alter table leads add column if not exists segment text default '';
alter table leads add column if not exists instagram text default '';
alter table leads add column if not exists linkedin text default '';
alter table leads add column if not exists briefing jsonb not null default '{}';
alter table leads alter column stage set default 'base';

-- etapas do CRM antigo → funil novo ('perdido' continua igual)
update leads set stage = case stage
  when 'novo' then 'base' when 'contato' then 'mql' when 'reuniao' then 'sql'
  when 'negociacao' then 'proposta' when 'ganho' then 'venda' end
where stage in ('novo','contato','reuniao','negociacao','ganho');

-- Briefing da página inicial → etapa Base. O site usa a chave pública (anon),
-- que NÃO lê nem escreve em leads: só consegue chamar esta função.
create or replace function submit_site_lead(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p->>'email', '')));
begin
  if coalesce(trim(p->>'nome'), '') = '' or coalesce(trim(p->>'empresa'), '') = '' or v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Briefing incompleto';
  end if;
  -- clique duplo / reenvio: ignora o mesmo e-mail nos últimos 10 minutos
  if exists (select 1 from leads where lower(email) = v_email and created_at > now() - interval '10 minutes') then
    return;
  end if;
  insert into leads (name, company, email, phone, cnpj, segment, source, stage, notes, briefing)
  values (
    left(trim(p->>'nome'), 120), left(trim(p->>'empresa'), 160), left(v_email, 160),
    left(coalesce(p->>'whatsapp', ''), 40), left(coalesce(p->>'cnpj', ''), 20), left(coalesce(p->>'segmento', ''), 80),
    'Site', 'base', '',
    jsonb_build_object(
      'solucao', case when jsonb_typeof(p->'solucao') = 'array' then p->'solucao' else '[]'::jsonb end,
      'prazo', left(coalesce(p->>'prazo', ''), 40),
      'descricao', left(coalesce(p->>'descricao', ''), 4000))
  );
end $$;

revoke all on function submit_site_lead(jsonb) from public;
grant execute on function submit_site_lead(jsonb) to anon, authenticated;

-- ============================================================
-- Leads completos, alianças, pós-venda, rascunho (moodboard),
-- lembretes e diário de etapa
-- ============================================================
alter table leads add column if not exists razao_social text default '';
alter table leads add column if not exists size text default '';
alter table leads add column if not exists website text default '';
alter table leads add column if not exists city text default '';
alter table leads add column if not exists uf text default '';
alter table leads add column if not exists address text default '';
alter table leads add column if not exists lat double precision;
alter table leads add column if not exists lng double precision;
alter table leads add column if not exists role_title text default '';
alter table leads add column if not exists referral text default '';
alter table leads add column if not exists logo_url text default '';
alter table leads add column if not exists bant jsonb not null default '{}';
alter table leads add column if not exists pains jsonb not null default '[]';
alter table leads add column if not exists proposal jsonb not null default '{}';

alter table projects add column if not exists alliances jsonb not null default '[]';
alter table projects add column if not exists reminders jsonb not null default '[]';
alter table stages add column if not exists journal jsonb not null default '{}';

create table if not exists alliances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service text default 'outro',
  area text default '',
  model text default 'indicacao',
  commission text default '',
  contact_name text default '',
  contact_role text default '',
  email text default '',
  phone text default '',
  website text default '',
  instagram text default '',
  logo_url text default '',
  how text default '',
  notes text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists aftersales (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  title text default '',
  stage text not null default 'implementacao',
  value numeric(12,2) default 0,
  owner_id uuid references profiles(id) on delete set null,
  last_contact date,
  next_action text default '',
  next_date date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists moodboard (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,
  title text default '',
  source text default '',
  note text default '',
  sort int default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists moodboard_project_idx on moodboard(project_id);

do $$
declare t text; p record;
begin
  foreach t in array array['alliances','aftersales','moodboard'] loop
    execute format('alter table %I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on %I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- alianças: equipe interna vê; comercial/sócio cadastram
create policy alliances_read  on alliances for select to authenticated using (is_staff());
create policy alliances_write on alliances for all to authenticated using (is_sales()) with check (is_sales());
-- pós-venda: comercial e sócio
create policy aftersales_all on aftersales for all to authenticated using (is_sales()) with check (is_sales());
-- rascunho: quem vê o projeto, usa o quadro
create policy moodboard_all on moodboard for all to authenticated using (can_see_project(project_id)) with check (can_see_project(project_id));

-- ---------- aliança: Doma Marcas ----------
insert into alliances (name, service, area, model, how)
select 'Doma Marcas', 'registro', 'Registro de marcas e patentes no INPI', 'indicacao',
  E'1. No lead, mapear a dor "marca não registrada no INPI".\n2. Na proposta, incluir a entrega "Registro de marca (INPI)" em aliança com a Doma.\n3. Aprovado: enviar à Doma nome da marca, CNPJ, logo final e atividades do cliente.\n4. Acompanhar o protocolo nos lembretes do projeto.'
where not exists (select 1 from alliances where name = 'Doma Marcas');

-- ---------- leads reais ----------
do $$
declare
  v_owner uuid := (select id from profiles where role = 'socio' order by created_at limit 1);
  v_doma text := (select id::text from alliances where name = 'Doma Marcas' limit 1);
begin
  -- Arctia: relacionamento próximo e quente
  if not exists (select 1 from leads where company = 'Arctia Marketing') then
    insert into leads (name, role_title, company, cnpj, segment, source, stage, owner_id, logo_url, referral, notes, pains, bant, briefing, proposal)
    values ('Alexandra', 'CEO e Founder', 'Arctia Marketing', '38.035.140/0001-78', 'Marketing', 'Relacionamento', 'mql', v_owner,
      'assets/img/leads/arctia.png', 'Relacionamento próximo e quente',
      'Arctia · "Transformação para o seu negócio". Canal extremamente próximo e quente.',
      jsonb_build_array(
        jsonb_build_object('dor', 'Marca não registrada no INPI', 'service', 'registro', 'alliance_id', v_doma),
        jsonb_build_object('dor', 'Site inexistente; Linktree desfuncional', 'service', 'web', 'alliance_id', null),
        jsonb_build_object('dor', 'Identidade visual vencida / defasada', 'service', 'identidade', 'alliance_id', null),
        jsonb_build_object('dor', 'Social media e aplicações da marca', 'service', 'social', 'alliance_id', null)),
      jsonb_build_object('autoridade', 'Alexandra (CEO e Founder) decide'), '{}', '{}');
  end if;

  -- Imagine Imóveis (SP): oferecer as 3 soluções
  if not exists (select 1 from leads where company = 'Imagine Imóveis') then
    insert into leads (name, company, segment, website, city, uf, source, stage, owner_id, notes, pains, bant, briefing, proposal)
    values ('Contato a definir', 'Imagine Imóveis', 'Imobiliário', 'imagine.com.br', 'São Paulo', 'SP', 'Prospecção', 'base', v_owner,
      'Oferecer as 3 soluções: identidade visual, estratégia de vendas e site.',
      jsonb_build_array(
        jsonb_build_object('dor', 'A validar: identidade e posicionamento da marca', 'service', 'identidade', 'alliance_id', null),
        jsonb_build_object('dor', 'A validar: estratégia de vendas e captação digital', 'service', 'marketing', 'alliance_id', null),
        jsonb_build_object('dor', 'A validar: site com captação de clientes', 'service', 'web', 'alliance_id', null)),
      '{}', '{}', '{}');
  end if;

  -- The Lightz: fotógrafo, videomaker e designer
  if not exists (select 1 from leads where company = 'The Lightz') then
    insert into leads (name, company, segment, instagram, source, stage, owner_id, logo_url, notes, pains, bant, briefing, proposal)
    values ('Contato a definir', 'The Lightz', 'Fotografia e vídeo', 'https://www.instagram.com/_thelightz/', 'Prospecção', 'base', v_owner,
      'assets/img/leads/thelightz.png', 'Fotógrafo, videomaker e designer. Hoje a presença digital é só Instagram + Linktree.',
      jsonb_build_array(
        jsonb_build_object('dor', 'Identidade visual', 'service', 'identidade', 'alliance_id', null),
        jsonb_build_object('dor', 'Sem site / portfólio próprio (depende de Linktree)', 'service', 'web', 'alliance_id', null)),
      '{}', '{}', '{}');
  end if;

  -- Box911: site e apenas logo
  if not exists (select 1 from leads where company = 'Box911') then
    insert into leads (name, company, segment, website, source, stage, owner_id, logo_url, notes, pains, bant, briefing, proposal)
    values ('Contato a definir', 'Box911', 'Automotivo', 'https://box911.com.br', 'Prospecção', 'base', v_owner,
      'assets/img/leads/box911.png', 'Oferecer site e apenas o logo (não a identidade completa).',
      jsonb_build_array(
        jsonb_build_object('dor', 'Site', 'service', 'web', 'alliance_id', null),
        jsonb_build_object('dor', 'Logo (apenas o logo)', 'service', 'identidade', 'alliance_id', null)),
      '{}', '{}', '{}');
  end if;
end $$;

-- ============================================================
-- ATLAS: cliente/tipo no projeto, marca por projeto e imagens da marca
-- (rodar de novo é seguro: tudo é "if not exists")
-- ============================================================
alter table projects add column if not exists client_name text default '';
alter table projects add column if not exists kind text;
alter table projects add column if not exists brand jsonb not null default '{}';

-- Projetos antigos: o tipo vem da conta (conta IMAGINE = ecossistema; só existem cliente e ecossistema)
update projects p set kind = case when a.kind = 'imagine' then 'ecossistema' else a.kind end from accounts a where p.account_id = a.id and p.kind is null;

create table if not exists brand_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  section text not null,
  url text not null,
  label text default '',
  note text default '',
  bg text default '',
  sort int default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists brand_assets_project_idx on brand_assets(project_id);

alter table brand_assets enable row level security;
drop policy if exists brand_assets_all on brand_assets;
create policy brand_assets_all on brand_assets for all to authenticated using (can_see_project(project_id)) with check (can_see_project(project_id));

-- ============================================================
-- Projeto Dona Frida (cliente), com o briefing respondido no Google Forms em 22/06/2026.
-- Só cria se ainda não existir um projeto com esse nome.
-- ============================================================
do $$
declare
  v_acc uuid := (select id from accounts where kind = 'imagine' order by created_at limit 1);
  v_owner uuid := (select id from profiles where role = 'socio' order by created_at limit 1);
  v_pid uuid;
begin
  if exists (select 1 from projects where name = 'Dona Frida') then return; end if;

  insert into projects (account_id, name, client_name, kind, track, status, objective, start_date, due_date, value,
                        briefing, briefing_done, cover_color, created_by, brand, alliances, reminders)
  values (v_acc, 'Dona Frida', 'Dona Frida · doces e bolos', 'cliente', 'branding', 'ativo', 'Desenvolver a identidade visual completa (logo, cores, tipografia e aplicações) que traduza a essência da marca.',
          current_date, current_date + 30, 0,
          $briefing${"objetivo":"Desenvolver a identidade visual completa (logo, cores, tipografia e aplicações) que traduza a essência da marca.","q1_1":"Dona Frida - doces e bolos","q1_2":"Estou criando do zero","q1_3":"Nome fofo do meu cachorro que acho que combina com confeitaria","q1_4":"Venda de bolos e docinhos.","q1_5":"Sheron Villalobos","q2_1":"Fazer parte dos momentos mais importantes das pessoas, aniversários, conquistas, com bolos elaborados e doces deliciosos, e também estar presente no dia a dia com um bolo de pote.","q2_3":"Adoçar o dia das pessoas, com qualidade e sabor","q2_4":"Qualidade e sabor","q2_5":"Como os doces mais gostosos da cidade","q3_1":"Maioria mulheres, de todas as idades, classe média","q3_2":"Desde “um docinho pra alegrar o dia” até “o bolo mais lindo e delicioso de aniversário”","q3_3":"Espontânea mas sem gírias. Não muito formal para gerar conexão, mas com uso correto da linguagem.","q4_1":"Espontânea, feliz e elegante","q4_2":"Coloquial, Amigável","q4_3":"https://www.instagram.com/bloomgateau\nhttps://www.instagram.com/bullbaker_doceria\nhttps://www.instagram.com/denilsonlimaatelier","q5_1":"As que enviei o link do insta, acho que transmitem a beleza de um trabalho artístico e ao mesmo tempo muita qualidade e sabor. Sofisticado, um ambiente “limpo”, claro, clássico com um toque moderno.","q5_2":"Gosto de um tom rosê, mas acho que fica um pouco infantil, não sei… Pode ser que combine mais algo em tons “amarelo queimado”, marrom, detalhe dourado…","q5_3":"Talvez criar algo com o D e F\nUma opção, um elemento gráfico, com traços finos, de um doce, bolo ou fatia que fique sobreposto com uma flor. Com o nome “Dona Frida” em evidência e embaixo menor, “confeitaria” ou “doces e bolos”.\nOutra opção seria alguns traços finos que remetessem a origem do nome, a Frida, mas acredito q não combine muito um cachorro com confeitaria, tipo pelo e doces não dá certo 😅","q5_4":"Combinação (pode incluir 1 ou mais itens dessa lista)","q6_1":"Boleiras independentes da cidade","q6_2":"Trabalho bem feito, adquirido com a experiência. Construção de um nome que remetem a qualidade.\nGostaria de fazer algo com mais personalidade e menos IA, e crescer no Instagram também, pra quem sabe no futuro vender cursos na área.","q6_3":"Pouco conhecida.","q7_1":"Redes sociais, Embalagem, Papelaria (cartão, envelope, papel timbrado)","q7_2":"Nao","q7_3":"Podemos reformular","q8_1":"1 mês","q8_2":"Não","q8_3":"Algo sofisticado mas com personalidade, marcante","q10_1":"Nao","q10_2":"Fiz sozinha no canva kkkk era oq tinha pro momento. Pode repaginar do zero, confio em vc","q11_1":"Sheron","q11_2":"WhatsApp","q11_3":"Depende — podemos conversar","_import":{"when":"22/06/2026 19:21:14","at":"2026-10-01T00:00:00.000Z"}}$briefing$::jsonb, false, '#8A5A3B', v_owner,
          '{}'::jsonb, '[]'::jsonb, $rem$[{"id":"r-frida-1","text":"Confirmar investimento com a Sheron (9.1 ficou em branco no Forms)","done":false},{"id":"r-frida-2","text":"Pedir o logo atual feito no Canva para o \"antes\" da marca","done":false}]$rem$::jsonb)
  returning id into v_pid;

  insert into stages (project_id, key, n, status)
  select v_pid, s.key, s.n, case when s.n = 1 then 'andamento' else 'pendente' end
  from (values ('objetivo', 1), ('briefing', 2), ('arquivos', 3), ('pesquisa', 4), ('conceito', 5), ('implementacao', 6), ('apresentacao', 7), ('revisao', 8), ('entrega', 9)) as s(key, n);

  insert into tasks (project_id, stage_key, title, sort, done)
  select v_pid, t.stage_key, t.title, t.sort, false
  from (values
      ('objetivo', 'Reunião de kickoff', 0),
      ('objetivo', 'Escrever o objetivo em uma frase', 1),
      ('objetivo', 'Validar objetivo com o cliente', 2),
      ('briefing', 'Preencher briefing no Hub', 0),
      ('briefing', 'Definir público e posicionamento', 1),
      ('briefing', 'Definir entregáveis e prazo', 2),
      ('briefing', 'Aprovar briefing', 3),
      ('arquivos', 'Criar pasta no Drive', 0),
      ('arquivos', 'Receber logos e materiais atuais', 1),
      ('arquivos', 'Registrar contrato assinado', 2),
      ('pesquisa', 'Mapear 3–5 concorrentes', 0),
      ('pesquisa', 'Levantar similares e referências', 1),
      ('pesquisa', 'Montar moodboard', 2),
      ('pesquisa', 'Resumo de oportunidades', 3),
      ('conceito', 'Definir conceito criativo', 0),
      ('conceito', 'Palavras-chave da marca', 1),
      ('conceito', 'Direção visual (rascunhos)', 2),
      ('conceito', 'Rascunhos de símbolo e logotipo', 3),
      ('implementacao', 'Logo principal', 0),
      ('implementacao', 'Variações e versões', 1),
      ('implementacao', 'Paleta de cores', 2),
      ('implementacao', 'Tipografia', 3),
      ('implementacao', 'Aplicações e mockups', 4),
      ('implementacao', 'Manual de marca', 5),
      ('apresentacao', 'Montar apresentação', 0),
      ('apresentacao', 'Apresentar ao cliente', 1),
      ('apresentacao', 'Registrar feedback', 2),
      ('revisao', 'Aplicar ajustes', 0),
      ('revisao', 'Aprovação final por escrito', 1),
      ('entrega', 'Entregar arquivos finais', 0),
      ('entrega', 'Enviar pesquisa NPS', 1),
      ('entrega', 'Registrar case no portfólio', 2)
  ) as t(stage_key, title, sort);

  if v_owner is not null then
    insert into project_members (project_id, user_id, role) values (v_pid, v_owner, 'lider');
  end if;
end $$;
