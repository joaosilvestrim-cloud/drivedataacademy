-- Treinamentos vendidos só para assinantes, com preço próprio de assinante.
-- A assinatura deixa de abrir curso sozinha: dá comunidade, lives, gravações
-- e o desconto. vazio = ainda não está à venda; 0 = incluso na assinatura.
alter table public.courses add column if not exists subscriber_price numeric;

-- Gravação de lives, workshops e mentorias, assistida pelo assinante na Agenda.
alter table public.live_events add column if not exists recording_url text;

-- Pedido de compra de treinamento avulso.
alter table public.orders add column if not exists course_id uuid references public.courses(id) on delete set null;
