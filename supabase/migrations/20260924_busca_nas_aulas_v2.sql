-- Conserta a busca nas aulas. A v1 falhava nos dois casos mais comuns.
--
-- 1. TERMO COMPOSTO. O aluno escreve "snowpipe", o professor fala "Snow
--    Pipe". Nenhuma das cinco aulas do assunto era encontrada. Não é
--    exceção: é a regra em jargão técnico, que vive oscilando entre junto e
--    separado (data lake, datalake; power query, powerquery).
--
-- 2. PERGUNTA LONGA. websearch_to_tsquery exige TODOS os termos no mesmo
--    trecho. "arquitetura medalhão bronze prata ouro" pede cinco palavras
--    numa janela de 45 segundos e volta vazio, embora a aula inteira seja
--    sobre isso.
--
-- E os resultados vinham em dobro, porque os dois cursos de Snowflake
-- apontam para os mesmos vídeos.
--
-- Nota sobre pg_trgm: a primeira versão criava a extensão para indexar a
-- coluna compacta. No editor do Supabase tudo roda numa transação só, e se a
-- criação da extensão falhar por permissão o bloco inteiro volta atrás em
-- silêncio, parecendo que rodou. Com 2.678 trechos a varredura direta resolve
-- em milissegundos, então a extensão saiu.

-- Texto sem espaço nem pontuação, para casar termo composto escrito de
-- qualquer jeito.
alter table public.licao_trecho
  add column if not exists compacto text
  generated always as (lower(regexp_replace(texto, '[^a-zA-Z0-9]', '', 'g'))) stored;

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
language plpgsql
stable
as $$
/* Os nomes da cláusula RETURNS TABLE viram variáveis dentro do corpo, e
   colidem com as colunas de mesmo nome das CTEs: "column reference peso is
   ambiguous". Esta diretiva manda a coluna ganhar da variável, que é o que se
   quer em toda consulta daqui para baixo. */
#variable_conflict use_column
declare
  q_todos  tsquery;
  q_algum  tsquery;
  palavras text[];
begin
  -- Todos os termos no mesmo trecho: preciso, e vale peso triplo quando acha.
  q_todos := websearch_to_tsquery('portuguese', termo);

  -- Basta um termo. O ts_rank continua ordenando, então o trecho com mais
  -- termos sobe sozinho. É o que faz pergunta em linguagem natural funcionar.
  select to_tsquery('portuguese', array_to_string(tsvector_to_array(to_tsvector('portuguese', termo)), ' | '))
    into q_algum;

  -- Palavras longas, sem acento nem espaço, para o termo composto. Curtas
  -- ficam de fora: "para", "como" e "onde" casariam com qualquer coisa.
  select array_agg(z.w)
    into palavras
    from (
      select lower(regexp_replace(p, '[^a-zA-Z0-9]', '', 'g')) as w
        from unnest(regexp_split_to_array(coalesce(termo, ''), '\s+')) as p
    ) z
   where length(z.w) >= 5;

  return query
  with achados as (
    select
      l.id                           as r_lesson_id,
      l.title                        as r_aula,
      m.title                        as r_modulo,
      c.title                        as r_curso,
      c.slug                         as r_slug,
      t.inicio                       as r_inicio,
      t.texto                        as r_texto,
      (c.id = any(cursos_liberados)) as r_liberado,
      greatest(
        case when q_todos is not null and t.busca @@ q_todos then ts_rank(t.busca, q_todos) * 3 else 0 end,
        case when q_algum is not null and t.busca @@ q_algum then ts_rank(t.busca, q_algum)     else 0 end,
        /* O composto não passa pelo ts_rank, então ganha peso fixo alto: se a
           pessoa escreveu "snowpipe" e o trecho diz "snow pipe", é
           exatamente o que ela procura. */
        case when palavras is not null
               and exists (select 1 from unnest(palavras) as w where t.compacto like '%' || w || '%')
             then 0.5 else 0 end
      )::real                        as r_peso
    from public.licao_trecho t
    join public.lessons        l on l.id = t.lesson_id
    join public.course_modules m on m.id = l.module_id
    join public.courses        c on c.id = l.course_id
  ),
  /* Um minuto de uma aula aparece uma vez só, mesmo que dois cursos usem o
     mesmo vídeo. A ordem interna escolhe a versão liberada, para o aluno
     receber o texto quando tem direito a ele. */
  unicos as (
    select distinct on (a.r_aula, a.r_inicio) a.*
      from achados a
     where a.r_peso > 0
     order by a.r_aula, a.r_inicio, a.r_liberado desc, a.r_peso desc
  )
  select
    u.r_lesson_id,
    u.r_aula,
    u.r_modulo,
    u.r_curso,
    u.r_slug,
    u.r_inicio,
    case when u.r_liberado then u.r_texto else null end,
    u.r_liberado,
    u.r_peso
  from unicos u
  order by u.r_peso desc, u.r_inicio
  limit greatest(1, least(limite, 20));
end;
$$;

comment on function public.buscar_trechos is
  'Acha onde um assunto é explicado. Casa termo composto (snowpipe = snow pipe), aceita pergunta em linguagem natural e devolve o texto só dos cursos liberados.';
