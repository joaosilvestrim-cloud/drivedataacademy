-- ============================================================
-- Chamado de quem ainda não tem conta
--
-- Quem tenta assinar e não consegue, ou paga e não recebe o código, não tem
-- login para abrir chamado. O pedido de ajuda passa a aceitar user_id nulo e
-- se identifica pelo e-mail. Cai na mesma fila de Chamados do admin.
-- ============================================================

alter table public.support_tickets alter column user_id drop not null;
