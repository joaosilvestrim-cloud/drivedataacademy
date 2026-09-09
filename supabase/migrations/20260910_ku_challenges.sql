-- Desafios entregues pelo aluno.
-- Aditivo ao Knowledge Universe: nao altera ku_activity_events, ku_catalog_*,
-- nem o motor. A entrega e uma area de trabalho mutavel; a evidencia so nasce
-- na aprovacao, e sempre pelo ku_append_activity ja existente.
begin;

-- Briefs publicados pela equipe.
create table if not exists public.ku_challenges (
  id uuid primary key default gen_random_uuid(),
  competency text not null,
  dimension text not null default 'challenge' check (dimension in ('exercise','challenge','retention')),
  title text not null,
  brief text not null,
  group_key text not null,
  credits numeric not null check (credits > 0 and credits <= 10000),
  advanced boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists ku_challenges_published on public.ku_challenges(published, competency);

-- Uma entrega por aluno por desafio. Reprovada, o aluno reenvia na mesma linha.
create table if not exists public.ku_challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.ku_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  link text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  quality numeric check (quality >= 0 and quality <= 1),
  feedback text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index if not exists ku_submissions_status on public.ku_challenge_submissions(status, created_at);

alter table public.ku_challenges enable row level security;
alter table public.ku_challenge_submissions enable row level security;

-- Mesmo contrato do restante do Knowledge Universe: o aluno le, nunca escreve
-- direto. Toda escrita passa por Server Action com o cliente administrativo.
revoke all on public.ku_challenges, public.ku_challenge_submissions from anon, authenticated;
grant select on public.ku_challenges, public.ku_challenge_submissions to authenticated;
grant all on public.ku_challenges, public.ku_challenge_submissions to service_role;

drop policy if exists ku_challenges_read on public.ku_challenges;
create policy ku_challenges_read on public.ku_challenges
  for select to authenticated using (published);

drop policy if exists ku_submissions_owner on public.ku_challenge_submissions;
create policy ku_submissions_owner on public.ku_challenge_submissions
  for select to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';
commit;
