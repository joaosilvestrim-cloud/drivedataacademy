-- Quarta e última volta: palavra rara vale mais que palavra comum.
--
-- O sintoma: "arquitetura medalhão bronze prata ouro" tirava nota 0.504 e
-- "onde ele fala de snowpipe" tirava 0.510. Indistinguíveis, embora a
-- primeira pergunta não tenha resposta nenhuma no material e a segunda tenha
-- a resposta exata. Nenhum corte separa duas notas iguais, então o problema
-- não era o corte, era a nota.
--
-- A causa: "arquitetura" casava e valia o mesmo que "snowpipe" casaria.
-- Palavra que aparece em toda aula não diz onde está a resposta; palavra que
-- aparece em cinco trechos diz.
--
-- Agora cada palavra da pergunta vale conforme a raridade dela no próprio
-- material, e não por lista escrita à mão. O corpus se ajusta sozinho quando
-- entrar curso de assunto novo.

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
  /* Palavras da pergunta com o peso de cada uma.
     ln(total/ocorrências) normalizado: zero para palavra que está em tudo,
     perto de um para a que quase não aparece. */
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
        /* Quantas vezes o termo aparece, com teto, vezes a importância dele.
           Repetir é explicar; mencionar de passagem não é. E repetir uma
           palavra que está em toda aula continua não valendo nada. */
        + coalesce((
            select sum(
                     least(4, (length(t.compacto) - length(replace(t.compacto, pz.w, ''))) / greatest(1, length(pz.w)))
                     * pz.importancia
                   ) * 0.35
              from pesos pz
             where pz.importancia > 0
               and t.compacto like '%' || pz.w || '%'
          ), 0)
      )::real                        as r_peso
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
  /* No máximo dois trechos por aula, para uma aula muito on-topic não ocupar
     todas as vagas e esconder as outras que tratam do assunto. */
  ranqueados as (
    select u.*, row_number() over (partition by u.r_aula order by u.r_peso desc) as ordem
      from unicos u
  )
  select
    r.r_lesson_id, r.r_aula, r.r_modulo, r.r_curso, r.r_slug, r.r_inicio,
    case when r.r_liberado then r.r_texto else null end,
    r.r_liberado, r.r_peso
  from ranqueados r
  where r.ordem <= 2
  order by r.r_peso desc, r.r_inicio
  limit greatest(1, least(limite, 20));
end;
$$;

comment on function public.buscar_trechos is
  'Acha o MINUTO em que um assunto é explicado. Pesa cada palavra pela raridade no próprio material, casa termo composto e devolve o texto só dos cursos liberados.';
