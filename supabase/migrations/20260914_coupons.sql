-- Cupons de desconto na assinatura.
--
-- Um uso só conta quando o pagamento confirma (coupon_redemptions nasce no
-- webhook). Checkout abandonado não gasta o limite de usos do cupom.

create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  code             text not null unique,                 -- sempre em maiúsculas
  note             text,                                 -- anotação interna
  discount_type    text not null default 'percent',      -- percent | fixed
  discount_value   numeric not null check (discount_value > 0),
  applies_to       text not null default 'ambos',        -- ambos | mensal | anual
  monthly_scope    text not null default 'primeira',     -- primeira | todas (só no mensal)
  restricted_email text,                                 -- vazio = qualquer pessoa
  max_uses         int,                                  -- vazio = sem limite
  expires_at       timestamptz,                          -- vazio = não expira
  active           boolean not null default true
);
alter table public.coupons enable row level security;

create table if not exists public.coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  coupon_id       uuid not null references public.coupons(id) on delete cascade,
  order_id        uuid not null unique references public.orders(id) on delete cascade,
  email           text,
  discount_amount numeric
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);
alter table public.coupon_redemptions enable row level security;

-- O pedido guarda o cupom usado e quanto ele descontou.
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists original_amount numeric;
alter table public.orders add column if not exists discount_amount numeric;
