-- Quando o projeto foi feito.
--
-- É a quarta dimensão do Universo 4D na página pública do portfólio. A
-- constelação mostra a carreira real do aluno, não o histórico de estudo na
-- Academy: cada competência acende quando um projeto a demonstrou, e o
-- visitante aperta play para ver a carreira crescer ao longo dos anos.
--
-- Mês de precisão, guardado como o dia 1. Ninguém lembra o dia em que
-- entregou um painel, e o mês basta para ordenar a carreira.
alter table public.portfolio_projects
  add column if not exists feito_em date;

comment on column public.portfolio_projects.feito_em is
  'Mês em que o projeto foi feito (dia 1). Ordena a linha do tempo do Universo 4D público.';

notify pgrst, 'reload schema';
