-- Acesso de demonstração: login temporário que mostra a área do assinante
-- inteira, mas só deixa usar o DriveCanvas.
--
-- Uma linha por pessoa. Enquanto expires_at estiver no futuro, ela vê tudo
-- como assinante (sem poder clicar) e usa o DriveCanvas. Quando vence, a conta
-- volta a ser uma conta comum, sem assinatura, e cai nas telas de assinatura.

create table if not exists public.demo_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by text,
  note text
);

create index if not exists demo_access_expira_idx on public.demo_access (expires_at);

-- Só o servidor da Academy lê e grava, com a service role.
alter table public.demo_access enable row level security;
