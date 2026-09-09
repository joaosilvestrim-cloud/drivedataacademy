-- Diagnostico de entrada do Knowledge Universe.
-- Aditivo. Nao altera o motor nem o log imutavel. O diagnostico e uma
-- avaliacao real corrigida: acerto vira evidencia na dimensao exercise,
-- nunca avancada, entao nao burla o teto de 79 pontos.
begin;

create table if not exists public.ku_diagnostic_questions (
  id uuid primary key default gen_random_uuid(),
  competency text not null,
  prompt text not null,
  options jsonb not null,
  answer integer not null check (answer >= 0),
  credits numeric not null default 1 check (credits > 0 and credits <= 1000),
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ku_diag_published on public.ku_diagnostic_questions(published, position);

-- Uma tentativa por aluno: e uma linha de base, nao um simulado repetivel.
create table if not exists public.ku_diagnostic_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null,
  results jsonb not null,
  completed_at timestamptz not null default now()
);

alter table public.ku_diagnostic_questions enable row level security;
alter table public.ku_diagnostic_attempts enable row level security;

revoke all on public.ku_diagnostic_questions, public.ku_diagnostic_attempts from anon, authenticated;
-- O gabarito nunca vai para o navegador: a correcao acontece no servidor.
grant select on public.ku_diagnostic_attempts to authenticated;
grant all on public.ku_diagnostic_questions, public.ku_diagnostic_attempts to service_role;

drop policy if exists ku_diag_attempt_owner on public.ku_diagnostic_attempts;
create policy ku_diag_attempt_owner on public.ku_diagnostic_attempts
  for select to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';
commit;
