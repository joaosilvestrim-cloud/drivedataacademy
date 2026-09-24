-- Terceira volta na busca. A v2 achava a AULA certa e errava o MINUTO, que
-- é metade do valor da coisa.
--
-- Duas causas, e as duas vinham do casamento de termo composto:
--
-- 1. NOTA FIXA. Todo trecho que continha a palavra ganhava 0.5, então dezenas
--    empatavam e o desempate por tempo jogava a ABERTURA de cada aula para o
--    topo. "Onde ele fala de snowpipe" devolvia o "bom pessoal, retomando
--    aqui" de quatro aulas diferentes.
--
-- 2. PALAVRA ONIPRESENTE. Num curso de Snowflake, "snowflake" aparece na
--    abertura de quase toda aula. Casar com ela não informa nada, só empata
--    mais.
--
-- Agora a nota é contínua e soma em vez de escolher o maior: quem casa no
-- texto E no composto sobe acima de quem casa só num. E a nota do composto
-- cresce com a quantidade de vezes que o termo aparece no trecho, porque
-- quem repete o assunto cinco vezes está explicando ele, não citando de
-- passagem.

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
  q_todos  tsquery;
  q_algum  tsquery;
  palavras text[];
  total    int;
begin
  q_todos := websearch_to_tsquery('portuguese', termo);

  select to_tsquery('portuguese', array_to_string(tsvector_to_array(to_tsvector('portuguese', termo)), ' | '))
    into q_algum;

  select count(*) into total from public.licao_trecho;

  /* As palavras que valem como termo composto.

     Ficam de fora as curtas, que casariam com qualquer coisa, e as que
     aparecem em mais de 30% dos trechos. Essa segunda regra é o que remove
     "snowflake" de dentro do curso de Snowflake sem precisar de lista de
     palavras proibidas escrita à mão: o corpus diz sozinho o que é comum
     demais para servir de pista. */
  select array_agg(z.w)
    into palavras
    from (
      select distinct lower(regexp_replace(p, '[^a-zA-Z0-9]', '', 'g')) as w
        from unnest(regexp_split_to_array(coalesce(termo, ''), '\s+')) as p
    ) z
   where length(z.w) >= 5
     and (select count(*) from public.licao_trecho t2 where t2.compacto like '%' || z.w || '%')
         <= greatest(3, total * 0.30);

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
      (
        case when q_todos is not null and t.busca @@ q_todos then ts_rank(t.busca, q_todos) * 3 else 0 end
        + case when q_algum is not null and t.busca @@ q_algum then ts_rank(t.busca, q_algum) else 0 end
        /* Quantas vezes o termo composto aparece no trecho, com teto.
           Mencionar uma vez é citação de passagem; repetir é explicação. O
           teto impede que uma aula que diz a palavra o tempo todo enterre a
           que de fato responde. */
        + coalesce((
            select sum(least(4, (length(t.compacto) - length(replace(t.compacto, w, ''))) / greatest(1, length(w)))) * 0.12
              from unnest(coalesce(palavras, '{}')) as w
             where t.compacto like '%' || w || '%'
          ), 0)
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
  ),
  /* No máximo dois trechos por aula. Sem isto, uma aula muito on-topic ocupa
     as seis vagas e o assistente perde as outras aulas que também tratam do
     assunto. */
  ranqueados as (
    select u.*, row_number() over (partition by u.r_aula order by u.r_peso desc) as ordem
      from unicos u
  )
  select
    r.r_lesson_id,
    r.r_aula,
    r.r_modulo,
    r.r_curso,
    r.r_slug,
    r.r_inicio,
    case when r.r_liberado then r.r_texto else null end,
    r.r_liberado,
    r.r_peso
  from ranqueados r
  where r.ordem <= 2
  order by r.r_peso desc, r.r_inicio
  limit greatest(1, least(limite, 20));
end;
$$;

comment on function public.buscar_trechos is
  'Acha o MINUTO em que um assunto é explicado. Nota contínua, casa termo composto, ignora palavra onipresente no corpus e devolve o texto só dos cursos liberados.';
