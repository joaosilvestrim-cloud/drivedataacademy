-- Uso da plataforma: quais ferramentas e quais cursos os alunos abrem.
--
-- Uma linha por visita, e não por recarga: a API só grava de novo a mesma
-- ferramenta para o mesmo aluno depois de 30 minutos. Assim o número responde
-- "quantas vezes voltaram", e não "quantas vezes apertaram F5".
--
-- A chave é o nome curto da ferramenta (lib/uso.ts) ou o slug do curso.

create table if not exists public.access_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('ferramenta', 'curso')),
  chave text not null,
  created_at timestamptz not null default now()
);

create index if not exists access_events_periodo_idx on public.access_events (created_at desc, tipo);
create index if not exists access_events_aluno_idx on public.access_events (user_id, tipo, chave, created_at desc);

-- Só o servidor da Academy lê e grava, com a service role.
alter table public.access_events enable row level security;
