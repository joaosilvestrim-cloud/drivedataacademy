-- O assistente passa a conhecer o CONTEÚDO das aulas, não só o catálogo.
--
-- Até aqui ele sabia que o aluno comprou Snowflake, mas não sabia que
-- Snowpipe é explicado na aula 8, aos 12 minutos. Perguntas do tipo "onde ele
-- fala de X" viravam encaminhamento para o time humano, que é o pior
-- desfecho possível: a resposta existe, está gravada, e ninguém acha.
--
-- A matéria-prima são as transcrições geradas para as legendas: 39 aulas,
-- 12 mil blocos, 644 mil caracteres. Já estavam no disco sem uso além do
-- .vtt.

-- --------------------------------------------------------------- trechos
-- Um trecho é uma janela de ~45 segundos de fala, com o tempo de início. É o
-- tamanho que responde "onde isso é explicado" sem obrigar o aluno a caçar
-- dentro de uma aula de uma hora.
create table if not exists public.licao_trecho (
  id        bigserial primary key,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  inicio    numeric not null,          -- segundos desde o começo do vídeo
  fim       numeric not null,
  texto     text    not null,
  -- Coluna gerada: o índice acompanha o texto sozinho, sem gatilho para
  -- alguém esquecer de manter.
  busca     tsvector generated always as (to_tsvector('portuguese', texto)) stored
);

create index if not exists licao_trecho_busca_idx  on public.licao_trecho using gin (busca);
create index if not exists licao_trecho_lesson_idx on public.licao_trecho (lesson_id);

alter table public.licao_trecho enable row level security;
-- Sem policy: só o service role entra. A busca roda no servidor, dentro da
-- rota do assistente, que já sabe quem é o aluno.

comment on table public.licao_trecho is
  'Transcrição das aulas em janelas curtas, para o assistente citar aula e minuto.';

-- ---------------------------------------------------------------- busca
-- Busca textual em português, não vetorial, e isso é escolha e não limitação.
--
-- A pergunta típica aqui é "onde ele fala de Snowpipe", "tem aula de
-- CALCULATE", "o que é camada Bronze". São termos técnicos exatos, e nesses
-- casos o índice textual acerta mais que similaridade semântica, roda dentro
-- do Postgres que já existe e não custa chamada de API nenhuma.
--
-- O controle de acesso está aqui dentro de propósito. O trecho de um curso
-- que o aluno NÃO comprou volta com o texto nulo: ele fica sabendo que o
-- assunto existe e em qual treinamento, sem receber o conteúdo pago de
-- graça. Deixar esse filtro na aplicação seria confiar que ninguém vai
-- esquecer dele numa próxima chamada.
create or replace function public.buscar_trechos(
  termo            text,
  cursos_liberados uuid[] default '{}',
  limite           int    default 6
)
returns table (
  lesson_id  uuid,
  aula       text,
  modulo     text,
  curso      text,
  curso_slug text,
  inicio     numeric,
  texto      text,
  liberado   boolean,
  peso       real
)
language sql
stable
as $$
  with consulta as (
    select websearch_to_tsquery('portuguese', termo) as q
  )
  select
    l.id,
    l.title,
    m.title,
    c.title,
    c.slug,
    t.inicio,
    case when c.id = any(cursos_liberados) then t.texto else null end,
    c.id = any(cursos_liberados),
    ts_rank(t.busca, consulta.q)
  from public.licao_trecho t
  join public.lessons        l on l.id = t.lesson_id
  join public.course_modules m on m.id = l.module_id
  join public.courses        c on c.id = l.course_id
  cross join consulta
  where consulta.q is not null
    and t.busca @@ consulta.q
  order by ts_rank(t.busca, consulta.q) desc, t.inicio
  limit greatest(1, least(limite, 20));
$$;

comment on function public.buscar_trechos is
  'Acha onde um assunto é explicado. Devolve o texto só dos cursos liberados para o aluno.';
