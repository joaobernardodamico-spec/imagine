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
