-- Uma linha por cobrança enviada ao Conta Azul.
--
-- Corrige o modelo da migration anterior, que marcava o envio em colunas do
-- pedido. Estava errado, e o erro só aparece no segundo mês.
--
-- A assinatura reusa o MESMO pedido a cada renovação: o webhook do Asaas só
-- troca o gateway_id do pedido pela cobrança mais recente, sem criar pedido
-- novo. Com a marca no pedido, o aluno geraria uma venda no primeiro mês e
-- nunca mais, e a receita recorrente sumiria do Conta Azul em silêncio.
--
-- A chave certa é a cobrança do Asaas, que é única por mês. Ela também é a
-- chave natural do backfill: o histórico mês a mês existe lá, não aqui.

create table if not exists public.ca_venda (
  asaas_payment_id text primary key,
  order_id         uuid references public.orders(id) on delete set null,
  venda_id         text,
  numero           integer,
  valor            numeric(12,2),
  pessoa_id        text,
  competencia      date,
  criado_em        timestamptz not null default now(),
  erro             text
);

alter table public.ca_venda enable row level security;

comment on table public.ca_venda is
  'Cobranças do Asaas já transformadas em venda no Conta Azul. Linha existente com venda_id preenchido = não enviar de novo.';
comment on column public.ca_venda.erro is
  'Falha da última tentativa. Linha com erro e sem venda_id é o que a tela de pendentes mostra para reenviar.';

create index if not exists ca_venda_pendentes_idx on public.ca_venda (criado_em) where venda_id is null;

-- As colunas do pedido saem: o conceito que elas representavam estava errado,
-- e deixar meio caminho andado convida alguém a confiar nelas depois.
alter table public.orders drop column if exists ca_venda_id;
alter table public.orders drop column if exists ca_venda_numero;
alter table public.orders drop column if exists ca_sincronizado_em;
alter table public.orders drop column if exists ca_erro;
drop index if exists orders_ca_pendentes_idx;
