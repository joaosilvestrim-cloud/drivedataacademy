const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const userA='00000000-0000-4000-8000-000000000001',userB='00000000-0000-4000-8000-000000000002';
const course='00000000-0000-4000-8000-000000000010',lessonA='00000000-0000-4000-8000-000000000011',lessonB='00000000-0000-4000-8000-000000000012';
const document={version:'draft',areas:[{id:'dados',name:'Dados',color:'#56e7cf',position:[0,0,0]}],competencies:[{id:'sql',name:'SQL',area:'dados',position:[1,0,0],description:'SQL',halfLifeDays:180,targets:{learning:100,assessment:100,exercise:100,challenge:100,retention:100}}],relations:[],unlocks:[],path:['sql'],mappings:[{courseId:course,competency:'sql',weight:1,credits:100,group:'basics',advanced:false}],weights:{learning:25,assessment:35,exercise:15,challenge:20,retention:5}};
test('Knowledge Universe migration and live ingestion',async t=>{
  const db=new PGlite();
  const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260909_knowledge_universe.sql'),'utf8');
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to authenticated;
      create table courses(id uuid primary key,title text,slug text);
      create table lessons(id uuid primary key,course_id uuid references courses(id));
      create table enrollments(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),course_id uuid references courses(id));
      create table lesson_progress(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),course_id uuid references courses(id),lesson_id uuid references lessons(id),completed boolean,updated_at timestamptz default now(),pct integer default 0,unique(user_id,lesson_id));
      create table quiz_attempts(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),course_id uuid references courses(id),score integer,passed boolean,created_at timestamptz default now());
      create table certificates(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),course_id uuid references courses(id),module_id uuid,revoked boolean default false,created_at timestamptz default now());
      grant all on courses,lessons,enrollments,lesson_progress,quiz_attempts,certificates to service_role;
      grant all on lesson_progress,enrollments to authenticated;
      insert into auth.users values('${userA}'),('${userB}');
      insert into courses values('${course}','Curso de SQL','sql');
      insert into lessons values('${lessonA}','${course}'),('${lessonB}','${course}');`);
    await t.test('migration is atomic and repeatable without erasing data',async()=>{await db.exec(migration);await db.exec(migration);assert.equal((await db.query('select count(*)::int as n from ku_catalog_draft')).rows[0].n,1);});
    await t.test('draft uses optimistic concurrency',async()=>{await db.query('select ku_save_draft($1::jsonb,0)',[JSON.stringify(document)]);await assert.rejects(db.query('select ku_save_draft($1::jsonb,0)',[JSON.stringify(document)]),/KU_CONFLICT/);});
    let version;
    await t.test('published catalog validates mapping totals and is immutable',async()=>{
      version=(await db.query('select ku_publish_catalog(1,$1) as id',[userA])).rows[0].id;
      await assert.rejects(db.query('update ku_catalog_versions set document=$1::jsonb where id=$2',[JSON.stringify(document),version]),/KU_IMMUTABLE/);
      const invalid=structuredClone(document);invalid.mappings[0].weight=.5;await db.query('select ku_save_draft($1::jsonb,1)',[JSON.stringify(invalid)]);
      await assert.rejects(db.query('select ku_publish_catalog(2,$1)',[userA]),/KU_WEIGHTS_SUM/);
    });
    await t.test('lesson progress and evidence commit together; repeating completion is idempotent',async()=>{
      await db.query('insert into lesson_progress(user_id,course_id,lesson_id,completed) values($1,$2,$3,true)',[userA,course,lessonA]);
      await db.query('update lesson_progress set updated_at=now(),pct=100 where user_id=$1',[userA]);
      const events=(await db.query("select * from ku_activity_events where user_id=$1 and kind='progress'",[userA])).rows;
      assert.equal(events.length,1);assert.equal(Number(events[0].payload.ratio),.5);assert.equal(events[0].catalog_version,version);
      await db.exec('begin');await db.query('insert into lesson_progress(user_id,course_id,lesson_id,completed) values($1,$2,$3,true)',[userA,course,lessonB]);await db.exec('rollback');
      assert.equal((await db.query("select count(*)::int as n from ku_activity_events where kind='progress'")).rows[0].n,1);
    });
    await t.test('quiz and certificate capture retain actual dates; revocation is a new event',async()=>{
      await db.query("insert into quiz_attempts(user_id,course_id,score,passed,created_at) values($1,$2,80,true,'2025-12-10T12:00:00Z')",[userA,course]);
      const cert=(await db.query("insert into certificates(user_id,course_id,created_at) values($1,$2,'2025-12-11T12:00:00Z') returning id",[userA,course])).rows[0].id;
      await db.query('update certificates set revoked=true where id=$1',[cert]);
      const kinds=(await db.query('select kind,payload from ku_activity_events where user_id=$1',[userA])).rows;
      assert.ok(kinds.some(x=>x.kind==='assessment'&&x.payload.score===80));assert.ok(kinds.some(x=>x.kind==='certificate_revoked'));
    });
    await t.test('legacy import is idempotent; mutable progress is dated at import time',async()=>{
      const initial=Number((await db.query('select ku_import_history($1,$2) as n',[userA,version])).rows[0].n);assert.ok(initial>0);
      assert.equal((await db.query('select ku_import_history($1,$2) as n',[userA,version])).rows[0].n,0);
      const imported=(await db.query("select occurred_at,precision from ku_activity_events where source_key like 'import:%' and kind='progress'")).rows[0];
      assert.equal(imported.precision,'baseline');assert.ok(Date.now()-Date.parse(imported.occurred_at)<60000);
    });
    await t.test('students cannot insert evidence, change drafts, publish or forge lesson progress',async()=>{
      await db.exec(`set role authenticated;set request.jwt.claim.sub='${userA}';`);
      await assert.rejects(db.query("insert into ku_activity_events(user_id,kind,source_key,payload,occurred_at,precision) values($1,'progress','forged','{}',now(),'exact')",[userA]),/permission denied/);
      await assert.rejects(db.query('select ku_publish_catalog(2,$1)',[userA]),/permission denied/);
      await assert.rejects(db.query('select ku_save_draft($1::jsonb,2)',[JSON.stringify(document)]),/permission denied/);
      await assert.rejects(db.query('insert into lesson_progress(user_id,course_id,lesson_id,completed) values($1,$2,$3,true)',[userA,course,lessonB]),/permission denied/);
      await assert.rejects(db.query('insert into enrollments(user_id,course_id) values($1,$2)',[userA,course]),/permission denied/);
      await db.exec('reset role');
    });
    await t.test('RLS isolates learner history and service-role snapshots cannot be overwritten',async()=>{
      await db.query("select ku_append_activity($1,$2,'assessment','private-b','{\"score\":100}',now(),'exact',$3)",[userB,course,version]);
      await db.exec(`set role authenticated;set request.jwt.claim.sub='${userA}';`);
      const rows=(await db.query('select user_id from ku_activity_events')).rows;assert.ok(rows.length>0);assert.ok(rows.every(x=>x.user_id===userA));
      await db.exec('reset role;set role service_role');
      await db.query("insert into ku_score_snapshots(user_id,catalog_version,source_cursor,as_of,scores) values($1,$2,10,now(),'{}')",[userA,version]);
      await assert.rejects(db.query("update ku_score_snapshots set scores='{\"fake\":100}'"),/permission denied/);
      await db.exec('reset role');
    });
  }finally{await db.close();}
});
