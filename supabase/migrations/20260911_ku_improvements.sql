-- Melhorias do Knowledge Universe. Aditivo, sem alterar tabelas existentes.
begin;

-- 1) Busca de usuario por e-mail sem varrer a lista inteira do Auth.
-- Hoje o codigo pagina listUsers de 1000 em 1000 ate achar.
create or replace function public.user_id_by_email(p_email text) returns uuid
language sql security definer set search_path = public, auth, pg_temp as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- 2) Idempotencia dos marcos do universo virando pontos da comunidade.
-- ref_id e um uuid deterministico derivado de aluno + competencia + marco,
-- entao a unicidade por (kind, ref_id) ja impede conceder duas vezes.
create unique index if not exists point_events_ku_milestone_uidx
  on public.point_events (kind, ref_id) where kind = 'ku_milestone';

-- 3) Consultar rapido o ultimo snapshot de um aluno.
create index if not exists ku_snapshots_lookup
  on public.ku_score_snapshots (user_id, catalog_version, source_cursor);

notify pgrst, 'reload schema';
commit;
