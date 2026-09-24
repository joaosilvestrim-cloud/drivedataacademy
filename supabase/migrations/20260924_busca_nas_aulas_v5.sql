-- Devolve a COBERTURA junto com a nota.
--
-- As quatro versões anteriores tentaram separar "tem resposta" de "não tem"
-- pela nota, e nenhuma conseguiu, porque a nota depende do tamanho da
-- pergunta e da raridade das palavras. Duas perguntas muito diferentes
-- tiravam 0.50 e 0.51.
--
-- O que separa é outra coisa: quantas das palavras da pergunta aparecem NO
-- MESMO trecho.
--
--   snowpipe                            1 de 1  = 100%
--   warehouse tamanho custo             2 de 3  =  66%
--   capital franca                      1 de 2  =  50%
--   arquitetura medalhao bronze prata   1 de 4  =  25%
--
-- A nota continua ordenando, que é o que ela sabe fazer bem. A cobertura
-- decide se vale responder, e o corte fica na aplicação, onde dá para ajustar
-- sem outra migration.

-- Acrescentar coluna ao retorno muda o tipo da funcao, e o Postgres recusa
-- fazer isso por CREATE OR REPLACE. Precisa apagar antes.
drop function if exists public.buscar_trechos(text, uuid[], int);

create function public.buscar_trechos(
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
  peso       real,
  cobertura  real
)
language plpgsql
stable
as $$
#variable_conflict use_column
declare
  q_todos tsquery;
  q_algum tsquery;
  total   int;
begin
  q_todos := websearch_to_tsquery('portuguese', termo);

  select to_tsquery('portuguese', array_to_string(tsvector_to_array(to_tsvector('portuguese', termo)), ' | '))
    into q_algum;

  select count(*) into total from public.licao_trecho;
  if total = 0 then return; end if;

  return query
  with
  pesos as (
    select
      z.w,
      greatest(0.0, ln(total::numeric / greatest(1, (
        select count(*) from public.licao_trecho t2 where t2.compacto like '%' || z.w || '%'
      ))) / nullif(ln(total::numeric), 0))::numeric as importancia
    from (
      select distinct lower(regexp_replace(p, '[^a-zA-Z0-9]', '', 'g')) as w
        from unnest(regexp_split_to_array(coalesce(termo, ''), '\s+')) as p
    ) z
    where length(z.w) >= 5
  ),
  quantas as (select count(*)::real as n from pesos),
  achados as (
    select
      l.id                           as r_lesson_id,
      l.title                        as r_aula,
      m.title                        as r_modulo,
      c.title                        as r_curso,
      c.slug                         as r_slug,
      t.inicio                       as r_inicio,
      t.texto                        as r_texto,
      (c.id = any(cursos_liberados)) as r_liberado,
      (
        case when q_todos is not null and t.busca @@ q_todos then ts_rank(t.busca, q_todos) * 3 else 0 end
        + case when q_algum is not null and t.busca @@ q_algum then ts_rank(t.busca, q_algum) else 0 end
        + coalesce((
            select sum(
                     least(4, (length(t.compacto) - length(replace(t.compacto, pz.w, ''))) / greatest(1, length(pz.w)))
                     * pz.importancia
                   ) * 0.35
              from pesos pz
             where pz.importancia > 0
               and t.compacto like '%' || pz.w || '%'
          ), 0)
      )::real                        as r_peso,
      /* Fração das palavras longas da pergunta presentes NESTE trecho.
         Pergunta sem palavra longa nenhuma (só conectivos) devolve 1, para
         não bloquear a busca puramente textual. */
      case
        when (select n from quantas) = 0 then 1.0::real
        else ((select count(*) from pesos pz where t.compacto like '%' || pz.w || '%')::real
              / (select n from quantas))
      end                            as r_cobertura
    from public.licao_trecho t
    join public.lessons        l on l.id = t.lesson_id
    join public.course_modules m on m.id = l.module_id
    join public.courses        c on c.id = l.course_id
  ),
  unicos as (
    select distinct on (a.r_aula, a.r_inicio) a.*
      from achados a
     where a.r_peso > 0
     order by a.r_aula, a.r_inicio, a.r_liberado desc, a.r_peso desc
  ),
  ranqueados as (
    select u.*, row_number() over (partition by u.r_aula order by u.r_peso desc) as ordem
      from unicos u
  )
  select
    r.r_lesson_id, r.r_aula, r.r_modulo, r.r_curso, r.r_slug, r.r_inicio,
    case when r.r_liberado then r.r_texto else null end,
    r.r_liberado, r.r_peso, r.r_cobertura
  from ranqueados r
  where r.ordem <= 2
  order by r.r_peso desc, r.r_inicio
  limit greatest(1, least(limite, 20));
end;
$$;

comment on function public.buscar_trechos is
  'Acha o MINUTO em que um assunto é explicado. A nota ordena; a cobertura diz se vale responder.';
