-- Competências que o projeto prova, lidas no texto inteiro do projeto.
--
-- É o que alimenta o Universo 4D público além do campo Ferramentas. Cada item
-- traz o id da competência no catálogo e o TRECHO do próprio projeto que a
-- prova, conferido no código contra o texto. O trecho é também o "por que"
-- que o visitante lê ao tocar numa esfera.
--
-- Formato: {"hash": "...", "itens": [{"id": "gestao...", "trecho": "..."}]}.
-- O hash é do texto que foi lido: salvar sem mudar o texto não chama a IA de
-- novo.
alter table public.portfolio_projects
  add column if not exists competencias jsonb;

notify pgrst, 'reload schema';
