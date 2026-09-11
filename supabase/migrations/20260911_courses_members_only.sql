-- Curso exclusivo da assinatura: não é vendido avulso e não é gratuito.
--
-- Antes disso o catálogo decidia o rótulo só pelo preço: zero virava
-- "Gratuito" e qualquer valor virava a etiqueta de preço. Faltava o caso real
-- da Academy, que é curso incluído na assinatura e fechado para quem não
-- assina. Sem essa coluna, um curso da assinatura aparecia anunciado como
-- gratuito e qualquer pessoa logada conseguia se matricular.
alter table public.courses add column if not exists members_only boolean not null default false;
