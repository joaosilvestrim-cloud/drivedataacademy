-- ============================================================
-- Curso in company
--
-- Dois caminhos para o mesmo conteúdo: o do catálogo, que qualquer assinante
-- compra, e o fechado, entregue dentro de uma empresa contratante. O fechado
-- não aparece no catálogo, não tem preço e só abre para quem o time matricula.
-- ============================================================

alter table public.courses add column if not exists access_mode text not null default 'catalogo';
alter table public.courses add column if not exists client_name text;

comment on column public.courses.access_mode is 'catalogo = venda aberta; in_company = turma fechada de empresa contratante';
