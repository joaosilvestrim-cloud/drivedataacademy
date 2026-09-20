-- Vitrine de portfólio: os projetos que os alunos fizeram.
--
-- O aluno publica o que construiu (dashboard, automação, modelo), com imagem,
-- link e as ferramentas usadas. Passa por revisão do time antes de aparecer,
-- porque a vitrine é a cara da Academy para quem está de fora.
--
-- status: rascunho (só o dono vê), revisao (na fila do time),
--         aprovado (aparece na vitrine), recusado (volta com um motivo).

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  resumo text not null,
  descricao text,
  problema text,
  resultado text,
  ferramentas text[] not null default '{}',
  cover_url text,
  link_url text,
  repo_url text,
  course_id uuid references public.courses(id) on delete set null,
  status text not null default 'revisao' check (status in ('rascunho', 'revisao', 'aprovado', 'recusado')),
  motivo text,
  destaque boolean not null default false,
  publico boolean not null default true,
  curtidas int not null default 0,
  visitas int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  aprovado_em timestamptz
);

create index if not exists portfolio_status_idx on public.portfolio_projects (status, destaque desc, aprovado_em desc);
create index if not exists portfolio_dono_idx on public.portfolio_projects (user_id, updated_at desc);

-- Quem curtiu o quê: uma curtida por pessoa e projeto.
create table if not exists public.portfolio_likes (
  project_id uuid not null references public.portfolio_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Só o servidor da Academy lê e grava, com a service role.
alter table public.portfolio_projects enable row level security;
alter table public.portfolio_likes enable row level security;
