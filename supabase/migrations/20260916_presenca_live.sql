-- ============================================================
-- Presença em live e certificado de participação
--
-- A pessoa lê o QR code durante a live, preenche o formulário e recebe o
-- certificado na hora. A palavra-chave dita ao vivo é o que prova que ela
-- estava assistindo. Sem conta na plataforma: é porta de entrada, não área
-- do aluno, então o certificado nasce sem user_id.
-- ============================================================

alter table public.live_events add column if not exists attendance_code text;
alter table public.live_events add column if not exists certificate_enabled boolean not null default false;
alter table public.live_events add column if not exists certificate_hours text;

create table if not exists public.live_attendances (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  live_id          uuid not null references public.live_events(id) on delete cascade,
  name             text not null,
  email            text not null,
  phone            text,
  company          text,
  role             text,
  goal             text,
  consent          boolean not null default true,
  certificate_code text,
  unique (live_id, email)
);
create index if not exists live_attendances_live_idx on public.live_attendances (live_id, created_at desc);

-- Sem policy: a tabela só é escrita e lida pelo servidor, com service role.
alter table public.live_attendances enable row level security;

-- Certificado de participação não tem aluno nem curso.
alter table public.certificates alter column user_id drop not null;
alter table public.certificates add column if not exists live_id uuid references public.live_events(id) on delete set null;
alter table public.certificates add column if not exists kind text not null default 'curso';
alter table public.certificates add column if not exists email text;
