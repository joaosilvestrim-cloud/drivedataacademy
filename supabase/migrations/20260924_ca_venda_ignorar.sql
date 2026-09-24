-- Marcar uma cobrança para nunca virar venda.
--
-- Nasce de um caso concreto: uma cobrança de R$ 5,00 de 14/09 que era teste
-- do próprio João. Ela é uma cobrança paga de verdade no Asaas, então a lista
-- de pendentes a mostra para sempre, e sem uma forma de dispensar ela viraria
-- receita inventada no DRE ou ficaria ali incomodando todo mês.
--
-- O caso vai se repetir por outros motivos: estorno, chargeback, cobrança
-- duplicada pelo gateway. Por isso é coluna, e não um registro forjado com
-- venda_id falso, que confundiria quem olhasse a tabela depois.
alter table public.ca_venda add column if not exists ignorado        boolean not null default false;
alter table public.ca_venda add column if not exists motivo_ignorado text;

comment on column public.ca_venda.ignorado is
  'Cobrança que nunca deve virar venda. Sai da lista de pendentes e o webhook não tenta enviar.';

-- A de R$ 5,00, que é o motivo desta migration existir.
insert into public.ca_venda (asaas_payment_id, valor, competencia, ignorado, motivo_ignorado)
values ('pay_glu3v9xtuih7dbi9', 5.00, '2026-09-14', true, 'Teste do João, não é venda')
on conflict (asaas_payment_id) do update
  set ignorado = true, motivo_ignorado = excluded.motivo_ignorado;
