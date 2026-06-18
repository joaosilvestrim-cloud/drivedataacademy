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
