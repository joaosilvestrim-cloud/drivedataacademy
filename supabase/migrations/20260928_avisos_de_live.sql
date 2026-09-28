-- Registro dos avisos de live já enviados.
--
-- É a memória do disparo automático, e a peça que impede o pior erro possível
-- aqui: mandar o mesmo e-mail duas vezes para a base inteira porque o
-- agendador rodou de novo. A linha entra ANTES do envio, como reserva, e a
-- chave primária faz a segunda execução desistir sozinha.
--
-- Também é o que permite o agendador falhar sem perder a live. Quem decide se
-- o aviso está pendente não é a hora da execução e sim a ausência da linha:
-- um agendador que só rodou de manhã manda o aviso atrasado, em vez de pular.
create table if not exists public.live_avisos (
  live_id uuid not null references public.live_events (id) on delete cascade,
  -- Qual dos dois lembretes: "24h" no dia anterior, "1h" perto da hora.
  janela text not null,
  criado_em timestamptz not null default now(),
  -- Fica nulo quando a reserva entrou e o envio não terminou. Linha reservada
  -- e nunca concluída é sinal de execução interrompida no meio.
  enviado_em timestamptz,
  destinatarios int,
  falhas int,
  primary key (live_id, janela)
);

comment on table public.live_avisos is
  'Avisos de live já enviados aos assinantes. A linha entra antes do envio, como reserva, para o disparo nunca repetir.';

alter table public.live_avisos enable row level security;

-- Ninguém lê isto pelo cliente. O disparo e o painel usam a service role, que
-- passa por cima da RLS. Sem política, o anon não enxerga nada, que é o certo:
-- a tabela diz quando a sala foi divulgada e para quantas pessoas.
