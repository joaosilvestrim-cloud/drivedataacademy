-- Knowledge Universe: execute once using the Supabase SQL Editor or a migration role.
-- Atomic migration. Catalog versions and activity records are immutable.
begin;

create table if not exists public.ku_catalog_draft (
  id integer primary key check (id = 1), revision integer not null default 0,
  document jsonb not null, updated_at timestamptz not null default now()
);
insert into public.ku_catalog_draft(id,document) values (1,
  '{"version":"draft","areas":[],"competencies":[],"relations":[],"unlocks":[],"path":[],"mappings":[],"weights":{"learning":25,"assessment":35,"exercise":15,"challenge":20,"retention":5}}')
on conflict (id) do nothing;
create table if not exists public.ku_catalog_versions (
  id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
  document jsonb not null, published_at timestamptz not null default now(), published_by uuid
);
create table if not exists public.ku_activity_events (
  id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid, kind text not null check(kind in ('progress','assessment','certificate','certificate_revoked','exercise','challenge','retention','retraction')),
  source_key text not null, payload jsonb not null,
  occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
  precision text not null check(precision in ('exact','baseline','imported')),
  catalog_version uuid references public.ku_catalog_versions(id), unique(user_id,source_key)
);
create index if not exists ku_events_user_time on public.ku_activity_events(user_id,occurred_at,sequence);
create table if not exists public.ku_score_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  catalog_version uuid not null references public.ku_catalog_versions(id), source_cursor bigint not null,
  as_of timestamptz not null, scores jsonb not null, created_at timestamptz not null default now(),
  unique(user_id,catalog_version,source_cursor)
);
create table if not exists public.ku_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz, granted_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

alter table public.ku_catalog_draft enable row level security;
alter table public.ku_catalog_versions enable row level security;
alter table public.ku_activity_events enable row level security;
alter table public.ku_score_snapshots enable row level security;
alter table public.ku_entitlements enable row level security;
revoke all on public.ku_catalog_draft,public.ku_catalog_versions,public.ku_activity_events,public.ku_score_snapshots,public.ku_entitlements from anon,authenticated;
grant select on public.ku_catalog_versions,public.ku_activity_events,public.ku_score_snapshots,public.ku_entitlements to authenticated;
grant all on public.ku_catalog_draft,public.ku_catalog_versions,public.ku_activity_events,public.ku_score_snapshots,public.ku_entitlements to service_role;
grant usage,select on sequence public.ku_catalog_versions_sequence_seq,public.ku_activity_events_sequence_seq to service_role;
drop policy if exists ku_catalog_read on public.ku_catalog_versions;
create policy ku_catalog_read on public.ku_catalog_versions for select to authenticated using(true);
drop policy if exists ku_events_owner on public.ku_activity_events;
create policy ku_events_owner on public.ku_activity_events for select to authenticated using(auth.uid()=user_id);
drop policy if exists ku_snapshots_owner on public.ku_score_snapshots;
create policy ku_snapshots_owner on public.ku_score_snapshots for select to authenticated using(auth.uid()=user_id);
drop policy if exists ku_entitlements_owner on public.ku_entitlements;
create policy ku_entitlements_owner on public.ku_entitlements for select to authenticated using(auth.uid()=user_id);

create or replace function public.ku_immutable() returns trigger language plpgsql set search_path=public as $$
begin raise exception 'KU_IMMUTABLE: create a new version or corrective event'; end $$;
drop trigger if exists ku_versions_immutable on public.ku_catalog_versions;
create trigger ku_versions_immutable before update on public.ku_catalog_versions for each row execute function public.ku_immutable();
drop trigger if exists ku_events_immutable on public.ku_activity_events;
create trigger ku_events_immutable before update on public.ku_activity_events for each row execute function public.ku_immutable();
revoke update,delete on public.ku_catalog_versions,public.ku_activity_events,public.ku_score_snapshots from service_role;

create or replace function public.ku_save_draft(p_document jsonb,p_revision integer) returns integer
language plpgsql security definer set search_path=public as $$
declare r integer;
begin
  if jsonb_typeof(p_document)<>'object' or octet_length(p_document::text)>1000000 then raise exception 'KU_INVALID_DOCUMENT'; end if;
  update ku_catalog_draft set document=p_document,revision=revision+1,updated_at=now() where id=1 and revision=p_revision returning revision into r;
  if r is null then raise exception 'KU_CONFLICT: reload the draft'; end if;
  return r;
end $$;
create or replace function public.ku_publish_catalog(p_revision integer,p_author uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare d jsonb; r integer; result uuid;
begin
  select document,revision into d,r from ku_catalog_draft where id=1 for update;
  if r<>p_revision then raise exception 'KU_CONFLICT'; end if;
  if jsonb_array_length(d->'areas')=0 or jsonb_array_length(d->'competencies')=0 then raise exception 'KU_EMPTY_CATALOG'; end if;
  if exists(select 1 from jsonb_array_elements(d->'mappings') m group by m->>'courseId' having abs(sum((m->>'weight')::numeric)-1)>.000001) then raise exception 'KU_WEIGHTS_SUM'; end if;
  if exists(select 1 from jsonb_array_elements(d->'mappings') m where not exists(select 1 from courses where id=(m->>'courseId')::uuid)) then raise exception 'KU_UNKNOWN_COURSE'; end if;
  select id into result from ku_catalog_versions where document=d order by sequence desc limit 1;
  if result is not null and result=(select id from ku_catalog_versions order by sequence desc limit 1) then return result; end if;
  insert into ku_catalog_versions(document,published_by) values(d,p_author) returning id into result;
  return result;
end $$;

create or replace function public.ku_append_activity(p_user uuid,p_course uuid,p_kind text,p_key text,p_payload jsonb,p_at timestamptz,p_precision text,p_version uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare v uuid;
begin
  if p_user is null then return; end if;
  v:=p_version;
  if v is null then select id into v from ku_catalog_versions order by sequence desc limit 1; end if;
  insert into ku_activity_events(user_id,course_id,kind,source_key,payload,occurred_at,precision,catalog_version)
  values(p_user,p_course,p_kind,p_key,p_payload,p_at,p_precision,v) on conflict(user_id,source_key) do nothing;
end $$;

create or replace function public.ku_capture_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare total integer; done integer; title text; slug text; data jsonb;
begin
  select c.title,c.slug into title,slug from courses c where c.id=new.course_id;
  if title is null then return new; end if;
  data:=jsonb_build_object('courseTitle',title,'courseSlug',slug,'sourceId',new.id);
  if tg_table_name='lesson_progress' then
    if tg_op='UPDATE' and new.completed is not distinct from old.completed then return new; end if;
    if not new.completed then return new; end if;
    select count(*) into total from lessons where course_id=new.course_id;
    select count(*) into done from lesson_progress p join lessons l on l.id=p.lesson_id and l.course_id=p.course_id where p.user_id=new.user_id and p.course_id=new.course_id and p.completed;
    if total>0 then perform ku_append_activity(new.user_id,new.course_id,'progress','progress:'||new.id||':'||done,data||jsonb_build_object('ratio',least(1.0,done::numeric/total),'completed',done>=total),now(),'exact'); end if;
  elsif tg_table_name='quiz_attempts' then
    perform ku_append_activity(new.user_id,new.course_id,'assessment','assessment:'||new.id,data||jsonb_build_object('score',greatest(0,least(100,new.score)),'passed',new.passed),new.created_at,'exact');
  elsif tg_table_name='certificates' then
    if new.module_id is not null then return new; end if;
    if coalesce(new.revoked,false) then
      if tg_op='UPDATE' and not coalesce(old.revoked,false) then perform ku_append_activity(new.user_id,new.course_id,'certificate_revoked','certificate_revoked:'||new.id,data,now(),'exact'); end if;
    elsif tg_op='INSERT' then
      perform ku_append_activity(new.user_id,new.course_id,'certificate','certificate:'||new.id,data||jsonb_build_object('ratio',1,'completed',true),new.created_at,'exact');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists ku_progress_capture on public.lesson_progress;
create trigger ku_progress_capture after insert or update on public.lesson_progress for each row execute function public.ku_capture_activity();
drop trigger if exists ku_quiz_capture on public.quiz_attempts;
create trigger ku_quiz_capture after insert on public.quiz_attempts for each row execute function public.ku_capture_activity();
drop trigger if exists ku_certificate_capture on public.certificates;
create trigger ku_certificate_capture after insert or update on public.certificates for each row execute function public.ku_capture_activity();

-- Existing application writes these tables with its service-role server client.
-- Students cannot fabricate evidence through a direct REST call.
revoke insert,update,delete on public.lesson_progress from anon,authenticated;
revoke insert,update on public.enrollments from anon,authenticated;

create or replace function public.ku_import_history(p_user uuid,p_version uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare r record; before_count integer; after_count integer; t timestamptz:=now();
begin
  if not exists(select 1 from ku_catalog_versions where id=p_version) then raise exception 'KU_UNKNOWN_VERSION'; end if;
  perform pg_advisory_xact_lock(hashtext('ku-import:'||p_user::text));
  select count(*) into before_count from ku_activity_events where user_id=p_user;
  for r in select p.course_id,count(*) filter(where p.completed) as done,c.title,c.slug,(select count(*) from lessons where course_id=p.course_id) as total
    from lesson_progress p join lessons l on l.id=p.lesson_id and l.course_id=p.course_id join courses c on c.id=p.course_id where p.user_id=p_user group by p.course_id,c.title,c.slug loop
    if r.total>0 and r.done>0 then perform ku_append_activity(p_user,r.course_id,'progress','import:'||p_version||':progress:'||r.course_id,jsonb_build_object('courseTitle',r.title,'courseSlug',r.slug,'ratio',least(1.0,r.done::numeric/r.total),'completed',r.done>=r.total),t,'baseline',p_version); end if;
  end loop;
  for r in select a.*,c.title,c.slug from quiz_attempts a join courses c on c.id=a.course_id where a.user_id=p_user loop
    perform ku_append_activity(p_user,r.course_id,'assessment','import:'||p_version||':assessment:'||r.id,jsonb_build_object('sourceId',r.id,'courseTitle',r.title,'courseSlug',r.slug,'score',greatest(0,least(100,r.score)),'passed',r.passed),r.created_at,'imported',p_version);
  end loop;
  for r in select a.*,c.title,c.slug from certificates a join courses c on c.id=a.course_id where a.user_id=p_user and a.module_id is null and not coalesce(a.revoked,false) loop
    perform ku_append_activity(p_user,r.course_id,'certificate','import:'||p_version||':certificate:'||r.id,jsonb_build_object('sourceId',r.id,'courseTitle',r.title,'courseSlug',r.slug,'ratio',1,'completed',true),r.created_at,'imported',p_version);
  end loop;
  select count(*) into after_count from ku_activity_events where user_id=p_user;
  return after_count-before_count;
end $$;

-- No user-supplied executable rule, no publicly callable privileged function.
revoke all on function public.ku_save_draft(jsonb,integer),public.ku_publish_catalog(integer,uuid),public.ku_append_activity(uuid,uuid,text,text,jsonb,timestamptz,text,uuid),public.ku_capture_activity(),public.ku_import_history(uuid,uuid),public.ku_immutable() from public,anon,authenticated;
grant execute on function public.ku_save_draft(jsonb,integer),public.ku_publish_catalog(integer,uuid),public.ku_append_activity(uuid,uuid,text,text,jsonb,timestamptz,text,uuid),public.ku_import_history(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
