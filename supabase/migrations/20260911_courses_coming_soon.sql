-- Curso "Em breve": publicado no catálogo, visível para o aluno, mas ainda sem
-- aulas e sem matrícula. Antes disso só existiam dois estados, rascunho
-- (invisível) e publicado (matriculável), e faltava o meio do caminho.
alter table public.courses add column if not exists coming_soon boolean not null default false;

-- Índice não é necessário: o catálogo já filtra por published e a coluna só é
-- lida junto com as linhas que já vêm desse filtro.
