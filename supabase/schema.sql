-- ============================================================
-- DriveData Academy — schema Supabase
-- Cole tudo no SQL Editor do Supabase e execute (uma vez).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tabelas ----------

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  whatsapp    text,
  source      text default 'site'
);

create table if not exists public.enterprise_leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  request_type text,
  email        text not null,
  phone        text,
  message      text
);

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  title        text not null,
  slug         text unique not null,
  category     text,
  excerpt      text,
  content      text,
  cover_url    text,
  author       text,
  published    boolean not null default false,
  published_at timestamptz
);

create index if not exists posts_published_idx on public.posts (published, published_at desc);

-- Traduções opcionais do post (EN/ES); em branco, o site usa o português.
alter table public.posts add column if not exists title_en    text;
alter table public.posts add column if not exists excerpt_en  text;
alter table public.posts add column if not exists category_en text;
alter table public.posts add column if not exists title_es    text;
alter table public.posts add column if not exists excerpt_es  text;
alter table public.posts add column if not exists category_es text;

-- ---------- updated_at automático ----------

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
-- A service_role (usada só no servidor pelo portal) ignora RLS.

alter table public.waitlist        enable row level security;
alter table public.enterprise_leads enable row level security;
alter table public.posts            enable row level security;

-- Formulários públicos: permite INSERT, mas ninguém lê os leads pelo navegador.
drop policy if exists "anon insert waitlist" on public.waitlist;
create policy "anon insert waitlist" on public.waitlist
  for insert to anon, authenticated with check (true);

drop policy if exists "anon insert enterprise" on public.enterprise_leads;
create policy "anon insert enterprise" on public.enterprise_leads
  for insert to anon, authenticated with check (true);

-- Blog: leitura pública apenas dos posts publicados.
drop policy if exists "public read published posts" on public.posts;
create policy "public read published posts" on public.posts
  for select to anon, authenticated using (published = true);

-- ---------- Seed dos posts atuais (publicados) ----------

insert into public.posts (title, slug, category, excerpt, content, author, published, published_at)
values
  (
    'Política de uso de IA: 12 elementos para uma governança efetiva',
    'politica-de-uso-de-ia-12-elementos',
    'Inteligência Artificial',
    'O que separa um documento que realmente governa o uso de IA de um que só decora a apresentação.',
    'Uma boa política de uso de IA vai muito além de um documento bonito. Neste artigo, reunimos os 12 elementos essenciais para uma governança que realmente funciona no dia a dia da empresa.',
    'DriveData Academy',
    true,
    '2026-06-10T12:00:00Z'
  ),
  (
    'Ferramentas de IA para criar dashboards: qual escolher?',
    'ferramentas-de-ia-para-dashboards',
    'Dados & IA',
    'Comparativo honesto entre Claude, ChatGPT, Copilot e Gemini para acelerar análises de verdade.',
    'Cada ferramenta de IA tem pontos fortes diferentes quando o assunto é acelerar a criação de dashboards. Comparamos Claude, ChatGPT, Copilot e Gemini em cenários reais de análise de dados.',
    'DriveData Academy',
    true,
    '2026-06-03T12:00:00Z'
  ),
  (
    'Formatação condicional no Power BI que comunica',
    'formatacao-condicional-power-bi',
    'Power BI',
    'Como transformar tabelas cruas em visuais que contam uma história e guiam a decisão.',
    'Formatação condicional bem aplicada transforma tabelas cruas em visuais que comunicam. Veja técnicas práticas para guiar a leitura e apoiar a tomada de decisão no Power BI.',
    'DriveData Academy',
    true,
    '2026-05-28T12:00:00Z'
  )
on conflict (slug) do nothing;

-- ---------- Configurações do site (chave/valor) ----------

create table if not exists public.site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Leitura pública (config não sensível, ex.: URL do vídeo).
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select to anon, authenticated using (true);

-- Escrita só via service_role (portal) — sem policy de insert/update p/ anon.

insert into public.site_settings (key, value)
values ('promo_videos', '["https://youtu.be/xOLcyH6yrxo"]')
on conflict (key) do nothing;

-- ============================================================
-- Captura de conteúdo (Lead Generation)
-- ============================================================

-- Materiais / campanhas (landing de conteúdo gated)
create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  title         text not null,
  slug          text unique not null,
  subtitle      text,
  description   text,
  cover_url     text,
  file_url      text,            -- conteúdo entregue (PDF/link)
  cta_text      text,            -- texto do botão do formulário
  email_subject text,            -- assunto do e-mail (opcional)
  email_message text,            -- mensagem extra no e-mail (opcional)
  ask_phone     boolean not null default true,
  ask_company   boolean not null default true,
  ask_role      boolean not null default false,
  published     boolean not null default false
);

create index if not exists materials_published_idx on public.materials (published);

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

-- Leads capturados (um por download/preenchimento)
create table if not exists public.material_leads (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  material_id    uuid references public.materials(id) on delete set null,
  material_title text,           -- conteúdo baixado (denormalizado)
  name           text not null,
  email          text not null,
  phone          text,
  company        text,
  role           text,
  utm_source     text,           -- campanha de origem
  utm_medium     text,
  utm_campaign   text,
  referrer       text
);

create index if not exists material_leads_material_idx on public.material_leads (material_id);
create index if not exists material_leads_created_idx on public.material_leads (created_at desc);

alter table public.materials      enable row level security;
alter table public.material_leads enable row level security;

-- Materiais publicados: leitura pública. (Escrita só via service_role/portal.)
drop policy if exists "public read materials" on public.materials;
create policy "public read materials" on public.materials
  for select to anon, authenticated using (published = true);

-- Leads: qualquer um pode INSERIR (formulário público); ninguém lê pelo navegador.
drop policy if exists "anon insert material_leads" on public.material_leads;
create policy "anon insert material_leads" on public.material_leads
  for insert to anon, authenticated with check (true);

-- Gating: o público lê só as colunas de exibição. O arquivo entregue (file_url)
-- e os textos do e-mail ficam acessíveis apenas via service_role (servidor),
-- entregues só depois do formulário.
revoke select on public.materials from anon, authenticated;
grant select (id, created_at, updated_at, title, slug, subtitle, description,
              cover_url, cta_text, ask_phone, ask_company, ask_role, published)
  on public.materials to anon, authenticated;

-- ============================================================
-- Plataforma de cursos — Fase 0: perfis de aluno
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name  text,
  avatar_url text,
  role       text not null default 'student',   -- student | instructor | admin
  phone      text,
  country    text,
  locale     text default 'pt'
);

alter table public.profiles enable row level security;

-- Cada usuário só enxerga e edita o próprio perfil.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Plataforma de cursos — Fase 1: cursos, módulos, aulas, matrículas, progresso
-- ============================================================

create table if not exists public.courses (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  slug            text unique not null,
  title           text not null,
  subtitle        text,
  description     text,
  cover_url       text,
  level           text,
  price           numeric not null default 0,     -- 0 = gratuito
  currency        text default 'BRL',
  instructor_name text,
  published       boolean not null default false,
  position        int not null default 0
);

create table if not exists public.course_modules (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  title      text not null,
  position   int not null default 0
);

create table if not exists public.lessons (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  module_id  uuid not null references public.course_modules(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  title      text not null,
  type       text not null default 'video',   -- video | text
  video_id   text,
  content    text,
  duration   text,
  position   int not null default 0,
  is_preview boolean not null default false,
  materials  jsonb not null default '[]'      -- [{ "title": "...", "url": "..." }]
);

create table if not exists public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  source     text not null default 'free',
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id         uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  completed  boolean not null default true,
  unique (user_id, lesson_id)
);

create index if not exists modules_course_idx on public.course_modules (course_id, position);
create index if not exists lessons_module_idx on public.lessons (module_id, position);
create index if not exists enrollments_user_idx on public.enrollments (user_id);
create index if not exists progress_user_idx on public.lesson_progress (user_id, course_id);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.courses         enable row level security;
alter table public.course_modules  enable row level security;
alter table public.lessons         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;

-- Catálogo público (cursos publicados e sua estrutura). Escrita só via service_role/portal.
drop policy if exists "public read courses" on public.courses;
create policy "public read courses" on public.courses
  for select to anon, authenticated using (published = true);

drop policy if exists "public read modules" on public.course_modules;
create policy "public read modules" on public.course_modules
  for select to anon, authenticated using (
    exists (select 1 from public.courses c where c.id = course_id and c.published)
  );

drop policy if exists "public read lessons" on public.lessons;
create policy "public read lessons" on public.lessons
  for select to anon, authenticated using (
    exists (select 1 from public.courses c where c.id = course_id and c.published)
  );

-- Matrículas: cada usuário lê/cria/remove as próprias.
drop policy if exists "own enrollments read" on public.enrollments;
create policy "own enrollments read" on public.enrollments
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own enrollments insert" on public.enrollments;
create policy "own enrollments insert" on public.enrollments
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own enrollments delete" on public.enrollments;
create policy "own enrollments delete" on public.enrollments
  for delete to authenticated using (auth.uid() = user_id);

-- Progresso: cada usuário gerencia o próprio.
drop policy if exists "own progress all" on public.lesson_progress;
create policy "own progress all" on public.lesson_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Plataforma de cursos — Certificação
-- ============================================================

alter table public.courses add column if not exists workload text;   -- carga horária (ex.: "8 horas")

create table if not exists public.certificates (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),   -- data de emissão
  user_id      uuid not null references auth.users(id) on delete cascade,
  course_id    uuid references public.courses(id) on delete set null,
  code         text unique not null,                 -- código de autenticidade (hash)
  student_name text,
  course_title text,
  workload     text,
  expires_at   timestamptz,                          -- validade opcional (compliance/NR)
  revoked      boolean not null default false,
  unique (user_id, course_id)
);

create index if not exists certificates_user_idx on public.certificates (user_id);

alter table public.certificates enable row level security;

-- O aluno lê os próprios certificados (carteira). Emissão e validação pública
-- acontecem via service_role no servidor (por código), sem expor a tabela ao anon.
drop policy if exists "own certificates read" on public.certificates;
create policy "own certificates read" on public.certificates
  for select to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Plataforma de cursos — Avaliações (quizzes)
-- ============================================================

create table if not exists public.quizzes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  course_id      uuid not null references public.courses(id) on delete cascade,
  title          text not null default 'Avaliação final',
  pass_score     int not null default 70,   -- % mínimo para passar
  max_attempts   int not null default 3,
  cooldown_hours int not null default 0,     -- bloqueio após esgotar tentativas
  published      boolean not null default true,
  unique (course_id)
);

create table if not exists public.quiz_questions (
  id       uuid primary key default gen_random_uuid(),
  quiz_id  uuid not null references public.quizzes(id) on delete cascade,
  prompt   text not null,
  options  jsonb not null default '[]',   -- [{ "text": "...", "correct": true|false }]
  position int not null default 0
);

create table if not exists public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  quiz_id    uuid not null references public.quizzes(id) on delete cascade,
  course_id  uuid references public.courses(id) on delete set null,
  score      int not null default 0,
  passed     boolean not null default false,
  answers    jsonb                          -- { questionId: optionIndex }
);

create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id);

alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts  enable row level security;

-- Config do quiz é pública (título, nota de corte). Perguntas NÃO são expostas
-- ao cliente (evita ver a resposta certa) — leitura só via service_role no servidor.
drop policy if exists "public read quizzes" on public.quizzes;
create policy "public read quizzes" on public.quizzes
  for select to anon, authenticated using (
    published and exists (select 1 from public.courses c where c.id = course_id and c.published)
  );

-- Tentativas: o aluno lê as próprias (correção/gravação via service_role no servidor).
drop policy if exists "own attempts read" on public.quiz_attempts;
create policy "own attempts read" on public.quiz_attempts
  for select to authenticated using (auth.uid() = user_id);

-- ============================================================
-- LMS — Terreno das 10 frentes (acesso full, pagamento, panda, talentos)
-- ============================================================

-- Colunas de apoio
alter table public.certificates   add column if not exists module_id uuid references public.course_modules(id) on delete set null;
alter table public.lessons         add column if not exists video_provider text not null default 'youtube';  -- youtube | panda
alter table public.lesson_progress add column if not exists pct int not null default 0;                      -- % assistido
alter table public.profiles        add column if not exists linkedin_url text;                               -- banco de talentos

-- Acesso "full por turma" (uma compra libera todos os cursos)
create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  plan       text not null default 'full',      -- full = acesso a tudo
  status     text not null default 'active',     -- active | expired | canceled
  source     text,                               -- asaas | admin | cortesia
  starts_at  timestamptz not null default now(),
  expires_at timestamptz                         -- null = sem expiração
);
create index if not exists memberships_user_idx on public.memberships (user_id, status);
alter table public.memberships enable row level security;
drop policy if exists "own memberships read" on public.memberships;
create policy "own memberships read" on public.memberships
  for select to authenticated using (auth.uid() = user_id);

-- Pedidos (checkout / Asaas). Escrita e leitura sensível via service_role.
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  user_id            uuid references auth.users(id) on delete set null,
  email              text,
  product            text not null default 'full_access',
  amount             numeric,
  status             text not null default 'pending',   -- pending | paid | refunded | canceled
  gateway            text default 'asaas',
  gateway_id         text,                               -- id da cobranca no gateway
  external_reference text
);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_gateway_idx on public.orders (gateway_id);
alter table public.orders enable row level security;
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders
  for select to authenticated using (auth.uid() = user_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- Comunidade (fórum) + Gamificação
-- ============================================================

create table if not exists public.forum_channels (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  slug        text unique not null,
  name        text not null,
  description text,
  position    int not null default 0
);
alter table public.forum_channels enable row level security;
drop policy if exists "channels read" on public.forum_channels;
create policy "channels read" on public.forum_channels for select to authenticated using (true);

-- canais iniciais
insert into public.forum_channels (slug, name, description, position) values
  ('geral', 'Geral', 'Avisos, apresentações e conversa livre', 0),
  ('power-bi', 'Power BI', 'Dúvidas de Power BI e DAX', 1),
  ('ia', 'Inteligência Artificial', 'IA aplicada a negócios', 2),
  ('html-web', 'HTML & Web', 'Front-end e desenvolvimento web', 3),
  ('gestao-projetos', 'Gestão de Projetos', 'Métodos, ferramentas e carreira', 4)
on conflict (slug) do nothing;

create table if not exists public.forum_threads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  channel_id  uuid not null references public.forum_channels(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  solved      boolean not null default false,
  answer_id   uuid,
  pinned      boolean not null default false,
  locked      boolean not null default false,
  reply_count int not null default 0
);
create index if not exists forum_threads_channel_idx on public.forum_threads (channel_id, created_at desc);
alter table public.forum_threads enable row level security;
drop policy if exists "threads read" on public.forum_threads;
create policy "threads read" on public.forum_threads for select to authenticated using (true);
drop policy if exists "threads insert own" on public.forum_threads;
create policy "threads insert own" on public.forum_threads for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "threads update own" on public.forum_threads;
create policy "threads update own" on public.forum_threads for update to authenticated using (auth.uid() = user_id);
drop policy if exists "threads delete own" on public.forum_threads;
create policy "threads delete own" on public.forum_threads for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.forum_posts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  thread_id  uuid not null references public.forum_threads(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  is_answer  boolean not null default false
);
create index if not exists forum_posts_thread_idx on public.forum_posts (thread_id, created_at);
alter table public.forum_posts enable row level security;
drop policy if exists "posts read" on public.forum_posts;
create policy "posts read" on public.forum_posts for select to authenticated using (true);
drop policy if exists "posts insert own" on public.forum_posts;
create policy "posts insert own" on public.forum_posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "posts update own" on public.forum_posts;
create policy "posts update own" on public.forum_posts for update to authenticated using (auth.uid() = user_id);
drop policy if exists "posts delete own" on public.forum_posts;
create policy "posts delete own" on public.forum_posts for delete to authenticated using (auth.uid() = user_id);

-- Gamificação: eventos de pontos (append-only) + badges
create table if not exists public.point_events (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,   -- solution | thread | post
  points     int not null default 0,
  ref_id     uuid
);
create unique index if not exists point_events_solution_uidx on public.point_events (kind, ref_id) where kind = 'solution';
create index if not exists point_events_user_idx on public.point_events (user_id);
alter table public.point_events enable row level security;
drop policy if exists "points read" on public.point_events;
create policy "points read" on public.point_events for select to authenticated using (true);

create table if not exists public.user_badges (
  user_id    uuid not null references auth.users(id) on delete cascade,
  badge      text not null,   -- fundador | top | ...
  created_at timestamptz not null default now(),
  primary key (user_id, badge)
);
alter table public.user_badges enable row level security;
drop policy if exists "badges read" on public.user_badges;
create policy "badges read" on public.user_badges for select to authenticated using (true);

-- ============================================================
-- Lives / roadmap + liberação de conteúdo por data (drip)
-- ============================================================

create table if not exists public.live_events (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  description  text,
  starts_at    timestamptz not null,
  duration_min int,
  url          text,
  cover_url    text,
  published    boolean not null default true
);
create index if not exists live_events_starts_idx on public.live_events (starts_at);
alter table public.live_events enable row level security;
drop policy if exists "lives read" on public.live_events;
create policy "lives read" on public.live_events for select to authenticated using (published);

-- Drip: libera o módulo a partir de uma data (null = liberado)
alter table public.course_modules add column if not exists available_at timestamptz;

-- Certificado: liga/desliga por curso (default ligado)
alter table public.courses add column if not exists certificate_enabled boolean not null default true;

-- ============================================================
-- Suporte / Central de Ajuda (chamados) — base para IA de triagem
-- ============================================================

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,
  subject    text not null,
  category   text not null default 'duvida',   -- duvida | tecnico | financeiro | certificado | outro
  status     text not null default 'open',     -- open | answered | resolved
  last_actor text not null default 'user'      -- user | agent | ai
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
alter table public.support_tickets enable row level security;
drop policy if exists "own tickets read" on public.support_tickets;
create policy "own tickets read" on public.support_tickets
  for select to authenticated using (auth.uid() = user_id);

create table if not exists public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ticket_id  uuid not null references public.support_tickets(id) on delete cascade,
  author     text not null,   -- user | agent | ai
  body       text not null
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
alter table public.support_messages enable row level security;
drop policy if exists "own ticket messages read" on public.support_messages;
create policy "own ticket messages read" on public.support_messages
  for select to authenticated using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ============================================================
-- Turmas / lotes de acesso (liberar acesso por turma)
-- ============================================================

create table if not exists public.turmas (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  starts_at   date,
  access_days int,                 -- duração do acesso em dias (vazio = sem expiração)
  price       numeric,
  status      text not null default 'open',   -- open | closed
  notes       text
);
alter table public.turmas enable row level security;
-- Sem policy de select: alunos não leem turmas; admin acessa via service role.

-- Liga a compra/acesso à turma que liberou
alter table public.memberships add column if not exists turma_id uuid references public.turmas(id) on delete set null;

-- ============================================================
-- Cobrança: modelos de pagamento (base p/ Asaas)
-- ============================================================

create table if not exists public.payment_products (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  description     text,
  price           numeric not null default 0,
  kind            text not null default 'full_access',  -- full_access | course
  course_id       uuid references public.courses(id) on delete set null,
  access_days     int,                                  -- duração do acesso (full_access)
  methods         text not null default 'pix,card,boleto',
  max_installments int not null default 1,
  active          boolean not null default true,
  position        int not null default 0
);
alter table public.payment_products enable row level security;
drop policy if exists "products read" on public.payment_products;
create policy "products read" on public.payment_products for select to anon, authenticated using (active);

-- Curtidas em respostas do fórum (interatividade)
create table if not exists public.forum_reactions (
  post_id    uuid not null references public.forum_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.forum_reactions enable row level security;
drop policy if exists "reactions read" on public.forum_reactions;
create policy "reactions read" on public.forum_reactions for select to authenticated using (true);

-- ============================================================
-- NPS por curso (satisfação / desempenho)
-- ============================================================

create table if not exists public.course_nps (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  score      int not null,     -- 0 a 10
  comment    text,
  unique (course_id, user_id)
);
alter table public.course_nps enable row level security;
drop policy if exists "nps own read" on public.course_nps;
create policy "nps own read" on public.course_nps for select to authenticated using (auth.uid() = user_id);


-- ============================================================
-- Log das conversas com a IA (assistente) — gestão/auditoria
-- ============================================================

create table if not exists public.ai_chat_logs (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  question   text,
  answer     text,
  escalated  boolean not null default false,
  ticket_id  uuid references public.support_tickets(id) on delete set null
);
create index if not exists ai_chat_logs_created_idx on public.ai_chat_logs (created_at desc);
alter table public.ai_chat_logs enable row level security;
