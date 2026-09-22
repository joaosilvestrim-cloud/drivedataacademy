-- Cancelamento de assinatura pelo próprio aluno.
--
-- Hoje cancelar é abrir chamado e alguém do time mexer no Asaas à mão. O aluno
-- não vê o que paga nem quando vence, e o time descobre o motivo da saída no
-- meio de uma conversa, quando descobre.
--
-- Esta tabela é o registro do pedido: fica gravada mesmo quando o Asaas
-- responde erro, porque a intenção do aluno não pode depender de API de
-- terceiro estar de pé. Quem confere se o cancelamento saiu é a coluna
-- asaas_ok, e o time vê na tela quais ficaram para trás.
--
-- Append-only de propósito: cancelou, voltou, cancelou de novo, são três
-- linhas. O histórico é o dado de churn que hoje não existe em lugar nenhum.

create table if not exists subscription_cancellations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,

  -- O que foi cancelado. order_id é o pedido da assinatura na Academy,
  -- asaas_subscription_id é o objeto lá no Asaas. O anual não tem recorrência,
  -- então vem nulo: não há o que cancelar, só não renova.
  order_id uuid references orders(id) on delete set null,
  asaas_subscription_id text,
  plano text,

  -- O motivo. "motivo" é uma das opções da tela, "detalhe" é o texto livre.
  -- Separados porque um serve para contar e o outro para ler.
  motivo text not null,
  detalhe text,

  -- Até quando o acesso continua. O aluno pagou o mês, então usa o mês.
  acesso_ate timestamptz,

  -- Resultado da chamada ao Asaas. null = não havia recorrência a cancelar.
  asaas_ok boolean,
  asaas_resposta text,

  created_at timestamptz not null default now()
);

create index if not exists subscription_cancellations_user_idx
  on subscription_cancellations (user_id, created_at desc);
create index if not exists subscription_cancellations_pendentes_idx
  on subscription_cancellations (created_at desc) where asaas_ok is false;

alter table subscription_cancellations enable row level security;

-- O aluno registra e lê o próprio cancelamento. Alterar e apagar ninguém pode:
-- é registro de intenção com data, não rascunho.
drop policy if exists "aluno cria o proprio cancelamento" on subscription_cancellations;
create policy "aluno cria o proprio cancelamento" on subscription_cancellations
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "aluno le o proprio cancelamento" on subscription_cancellations;
create policy "aluno le o proprio cancelamento" on subscription_cancellations
  for select to authenticated using (auth.uid() = user_id);

comment on table subscription_cancellations is
  'Pedidos de cancelamento de assinatura feitos pelo aluno, com o motivo. Append-only.';
comment on column subscription_cancellations.asaas_ok is
  'true = a recorrencia foi cancelada no Asaas; false = a chamada falhou e o time precisa cancelar na mao; null = plano sem recorrencia.';
