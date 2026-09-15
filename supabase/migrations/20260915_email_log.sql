-- Registro de cada e-mail transacional enviado pela plataforma. Serve para o
-- painel de operação do admin conferir se quem pagou recebeu o código de acesso.
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  to_email    text not null,
  subject     text,
  kind        text,                 -- conta | codigo | acesso | curso | workshop | outro
  status      text not null,        -- sent | failed
  reason      text,                 -- motivo da falha, quando houver
  provider_id text,                 -- id devolvido pelo Resend
  order_id    uuid references public.orders(id) on delete set null
);
create index if not exists email_log_to_idx on public.email_log (to_email, created_at desc);
create index if not exists email_log_order_idx on public.email_log (order_id);
alter table public.email_log enable row level security;
-- Sem policy de propósito: só o servidor, com a chave de serviço, lê e grava.
