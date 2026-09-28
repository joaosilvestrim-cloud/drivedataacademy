-- O id da assinatura do Asaas passa a ter coluna própria.
--
-- O bug: o checkout gravava o id da ASSINATURA (sub_...) em orders.gateway_id,
-- e o webhook do primeiro pagamento sobrescrevia com o id da COBRANÇA
-- (pay_...). O cancelamento lia esse campo achando que era assinatura e
-- chamava DELETE /subscriptions/pay_..., que devolve 404.
--
-- Consequência: nenhum cancelamento de mensalidade chegava ao Asaas. O aluno
-- cancelava na tela, a plataforma registrava, e o cartão continuava sendo
-- cobrado. Só não virou prejuízo porque o primeiro caso foi resolvido à mão
-- no mesmo dia.
--
-- Os dois ids precisam conviver: gateway_id é a ÚLTIMA cobrança, e é por ele
-- que o webhook reencontra o pedido e que a integração do Conta Azul liga
-- venda a pedido. Quem some é a assinatura, então ela ganha lugar próprio.

alter table public.orders add column if not exists asaas_subscription_id text;

comment on column public.orders.asaas_subscription_id is
  'Id da assinatura recorrente no Asaas (sub_...). NUNCA sobrescrever com id de cobrança: é o que o cancelamento usa.';

create index if not exists orders_asaas_sub_idx
  on public.orders (asaas_subscription_id)
  where asaas_subscription_id is not null;

-- Recupera o que dava para recuperar sozinho: onde o gateway_id ainda é o id
-- da assinatura, ele é copiado. O resto vem do Asaas, pelo script
-- scripts/recuperar-assinaturas.ts, que casa pelo externalReference.
update public.orders
   set asaas_subscription_id = gateway_id
 where product = 'subscription'
   and gateway = 'asaas'
   and asaas_subscription_id is null
   and gateway_id like 'sub\_%';
