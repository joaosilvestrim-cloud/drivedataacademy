-- Link de live restrito a aluno.
--
-- Por que existe: o campo `url` de live_events é público. Ele é lido pelo
-- LancamentoHoje na home (app/page.tsx) e pelo ProximasMentorias em /cursos,
-- e as duas rotas ficam fora do matcher do middleware. Ou seja: o que entra
-- em `url` vira link clicável para qualquer pessoa da internet.
--
-- Isso serve para live aberta no YouTube, que é o caso de quase todas. Não
-- serve para reunião do Teams com senha, onde o link É a credencial: quem
-- tem o endereço entra na sala.
--
-- Daí a separação. `url` continua sendo o link público. `url_alunos` só é
-- lido por página atrás do login, e o `acesso_alunos` guarda o que mais for
-- preciso para entrar (ID da reunião, senha, instrução de discagem) sem
-- poluir a descrição, que também é pública.

alter table public.live_events add column if not exists url_alunos    text;
alter table public.live_events add column if not exists acesso_alunos text;

comment on column public.live_events.url_alunos is
  'Link de acesso restrito (ex.: Teams). NUNCA renderizar em rota pública: use url para isso.';
comment on column public.live_events.acesso_alunos is
  'Dados extras de acesso em texto livre (ID da reunião, senha). Mesma regra do url_alunos.';
