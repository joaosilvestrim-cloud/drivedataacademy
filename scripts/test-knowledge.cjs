// Run the pure TypeScript engine through the project's existing compiler.
// No browser, database, network or generated source artifacts are required.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const knowledge = path.resolve(__dirname, '../lib/knowledge');
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(knowledge + path.sep)&&filename!==path.resolve(__dirname,'../lib/learning-validation.ts')) throw new Error('Unexpected test import');
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const { calculate, universe, readiness, freshness, achievements, WEIGHTS } = require('../lib/knowledge/engine.ts');
const { DEMO_CATALOG, DEMO_EVENTS, DEMO_START, DEMO_END, demoChallengeEvidence } = require('../lib/knowledge/demo.ts');
const {validateDocument}=require('../lib/knowledge/catalog.ts');
const {projectEvidence,liveData}=require('../lib/knowledge/project.ts');
const {selectedAnswer,validCompletionPercent}=require('../lib/learning-validation.ts');
const comp = DEMO_CATALOG.competencies[0];
const event = (patch = {}) => ({ id: 'one', competency: comp.id, dimension: 'learning', group: 'objective', units: 100, quality: 1, at: '2026-01-01T12:00:00.000Z', label: 'Fixture', ...patch });
const full = () => Object.keys(WEIGHTS).map((dimension,i) => event({ id: dimension, dimension, group: dimension, qualified: true, advanced: true, at: `2026-01-${String(i+1).padStart(2,'0')}T12:00:00.000Z` }));

test('exposure alone is capped at 25 even with repeated courses', () => {
  assert.equal(calculate(comp, [event(),event({ id:'two',group:'other',units:1000 })], DEMO_END).score,25);
});
test('same event and equivalent attempts never duplicate mastery', () => {
  const a=event({dimension:'assessment',units:60});
  assert.equal(calculate(comp,[a,a,{...a,id:'retry',units:40}],DEMO_END).score,21);
  assert.equal(calculate(comp,[a,{...a,id:'retry',units:90}],DEMO_END).raw,31.5);
});
test('future evidence cannot affect score, details, freshness or courses', () => {
  const s=calculate(comp,[event({at:DEMO_END,qualified:true,course:'Future'})],DEMO_START);
  assert.equal(s.score,0);assert.equal(s.evidence.length,0);assert.equal(s.lastActivity,null);assert.equal(s.freshness,null);
});
test('inactivity lowers freshness while retaining demonstrated mastery', () => {
  const e=event({qualified:true});
  const a=calculate(comp,[e],e.at), b=calculate(comp,[e],DEMO_END);
  assert.equal(a.score,b.score);assert.ok(b.freshness<a.freshness);
  assert.equal(freshness('2026-01-01T00:00:00Z','2026-06-30T00:00:00Z',180),50);
});
test('advanced mastery requires both advanced assessment and practical challenge', () => {
  assert.equal(calculate(comp,full(),DEMO_END).score,100);
  assert.equal(calculate(comp,full().map(e=>({...e,advanced:false})),DEMO_END).score,79);
  assert.equal(calculate(comp,full().map(e=>({...e,advanced:e.dimension==='assessment'})),DEMO_END).score,79);
});
test('score display cannot promote 99.8 into a completed rubric', () => {
  const s=calculate(comp,full().map(e=>({...e,units:99.8})),DEMO_END);
  assert.equal(s.score,99);assert.ok(s.raw<100);
  const near=calculate(comp,full().map(e=>({...e,units:99.99999999999})),DEMO_END);
  assert.equal(near.score,99);
});
test('same inputs replay identically regardless of incoming event ordering', () => {
  assert.deepEqual(universe(DEMO_CATALOG,DEMO_EVENTS,DEMO_END),universe(DEMO_CATALOG,[...DEMO_EVENTS].reverse(),DEMO_END));
});
test('retention rejects same-day and unqualified repeated reviews', () => {
  const e=event({dimension:'retention',units:20,qualified:true});
  const input=[e,event({...e,id:'fast',group:'fast',at:'2026-01-02T12:00:00Z'}),event({...e,id:'late',group:'late',at:'2026-01-09T12:00:00Z'}),event({...e,id:'bad',group:'bad',at:'2026-01-20T12:00:00Z',qualified:false})];
  const s=calculate(comp,input,DEMO_END);assert.equal(s.parts.retention,2);assert.equal(s.evidence.length,2);assert.equal(s.lastActivity,'2026-01-09T12:00:00Z');
});
test('unlock eligibility does not grant mastery of the target', () => {
  const all=universe(DEMO_CATALOG,DEMO_EVENTS,DEMO_END);
  assert.equal(all.analytics.ready,true);assert.equal(all.analytics.score,0);assert.equal(all['data-eng'].ready,false);
});
test('all/any prerequisite groups are deterministic and use raw threshold values', () => {
  const scores={a:{raw:49.9},b:{raw:80}};
  const low={competency:'a',minimum:50},high={competency:'b',minimum:70};
  assert.ok(readiness({all:[low,high]},scores)<1);
  assert.equal(readiness({any:[low,high]},scores),1);
  assert.equal(readiness({all:[]},scores),0);
});
test('legacy-less start is empty and all demo timeline states are bounded and monotone', () => {
  const start=universe(DEMO_CATALOG,DEMO_EVENTS,DEMO_START);
  assert.ok(Object.values(start).every(s=>s.score===0));
  let previous=start;
  for(let month=0;month<12;month++) {
    const at=new Date(Date.UTC(2025,8+month,28,12)).toISOString();
    const current=universe(DEMO_CATALOG,DEMO_EVENTS,at);
    for(const c of DEMO_CATALOG.competencies) {assert.ok(current[c.id].raw>=previous[c.id].raw);assert.ok(current[c.id].raw<=100);}
    previous=current;
  }
});
test('demo DAX challenge improves evidence once and only at its date', () => {
  const c=DEMO_CATALOG.competencies.find(c=>c.id==='dax'),e=demoChallengeEvidence();
  const before=calculate(c,DEMO_EVENTS,DEMO_END),after=calculate(c,[...DEMO_EVENTS,e,e],DEMO_END);
  assert.equal(before.score,68);assert.ok(after.raw>before.raw);assert.equal(after.evidence.filter(x=>x.id===e.id).length,1);
  assert.deepEqual(calculate(c,[...DEMO_EVENTS,e],'2026-09-08T12:00:00Z'),calculate(c,DEMO_EVENTS,'2026-09-08T12:00:00Z'));
});
test('achievement replay is deduplicated and excludes future awards', () => {
  assert.equal(achievements(DEMO_CATALOG,DEMO_EVENTS,DEMO_START).length,0);
  const normal=achievements(DEMO_CATALOG,DEMO_EVENTS,DEMO_END);
  assert.deepEqual(achievements(DEMO_CATALOG,[...DEMO_EVENTS,...DEMO_EVENTS],DEMO_END),normal);
  assert.equal(new Set(normal.map(a=>a.id)).size,normal.length);
});
test('invalid numeric evidence cannot poison the score', () => {
  const s=calculate(comp,[event({units:NaN}),event({id:'bad',quality:Infinity}),event({id:'negative',units:-1})],DEMO_END);
  assert.equal(s.score,0);assert.throws(()=>calculate(comp,[],'invalid'));assert.throws(()=>calculate({...comp,targets:{...comp.targets,learning:0}},[],DEMO_END));
});
test('new module has no AI dependencies or outbound model requests', () => {
  const dirs=['lib/knowledge','components/knowledge','app/(knowledge)'];
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
  for(const name of dirs.flatMap(d=>walk(path.resolve(__dirname,'..',d))).filter(f=>/\.tsx?$/.test(f))) {
    const src=fs.readFileSync(name,'utf8');
    assert.doesNotMatch(src,/from\s+['"](?:openai|@anthropic|@google\/generative-ai|groq|@\/lib\/ai|@\/components\/AssistantButton)/);
    assert.doesNotMatch(src,/\bfetch\s*\(/);
  }
});

const liveCourse='00000000-0000-4000-8000-000000000010';
function config(){return {...structuredClone(DEMO_CATALOG),weights:{...WEIGHTS},mappings:[{courseId:liveCourse,competency:comp.id,weight:1,credits:100,group:'basics',advanced:false}]};}
const version={id:'v1',published_at:'2026-02-01T00:00:00.000Z',document:config()};
const raw=(patch={})=>({id:'raw1',sequence:1,course_id:liveCourse,kind:'progress',source_key:'progress:1',payload:{ratio:.5,courseTitle:'Actual course'},occurred_at:'2026-01-01T12:00:00+00:00',recorded_at:'2026-02-01T00:00:00Z',precision:'imported',catalog_version:'v1',...patch});
test('published configuration validates budgets, cycles and references',()=>{
  validateDocument(config(),true);
  const a=config();a.mappings[0].weight=.5;assert.throws(()=>validateDocument(a,true),/100%/);
  const b=config();b.competencies[0].parent=b.competencies[1].id;b.competencies[1].parent=b.competencies[0].id;assert.throws(()=>validateDocument(b,true),/ciclo/);
  const c=config();c.unlocks.push({target:'sql',rule:{all:[{competency:'analytics',minimum:50}]}});assert.throws(()=>validateDocument(c,true),/ciclo/);
  const d=config();d.weights.learning=100;assert.throws(()=>validateDocument(d,true),/somar 100/);
});
test('course weights allocate units rather than granting guaranteed mastery',()=>{
  const d=config();d.mappings[0].weight=.4;
  const events=projectEvidence([raw({payload:{ratio:1}})],[{...version,document:d}]);
  assert.equal(calculate(comp,events,DEMO_END).score,10);
});
test('a certificate and course completion are the same learning group',()=>{
  const events=projectEvidence([raw({payload:{ratio:1}}),raw({id:'cert',kind:'certificate',payload:{ratio:1,completed:true,sourceId:'certificate1'}})],[version]);
  assert.equal(calculate(comp,events,DEMO_END).score,25);
});
test('an advanced course assessment must be passed with at least 80 percent',()=>{
  const d=config();d.mappings[0].advanced=true;
  for(const [score,passed,expected] of [[79,true,false],[80,true,true],[100,false,false]]) {
    const events=projectEvidence([raw({kind:'assessment',payload:{score,passed}})],[{...version,document:d}]);
    assert.equal(events[0].advanced,expected);
    assert.equal(events[0].assessmentScore,score);
  }
});
test('later catalog mappings do not leak back into historical scores or renew freshness',()=>{
  const d=config();d.mappings[0].credits=200;
  const v2={id:'v2',published_at:'2026-06-01T12:00:00Z',document:d};
  const original=raw({kind:'assessment',payload:{score:50,passed:true}});
  const imported=raw({...original,id:'reimport',catalog_version:'v2'});
  const events=projectEvidence([original,imported],[version,v2]);
  assert.equal(calculate(comp,events,'2026-05-01T12:00:00Z').raw,17.5);
  assert.equal(calculate(comp,events,'2026-06-02T12:00:00Z').raw,35);
  assert.equal(calculate(comp,events,DEMO_END).lastActivity,'2026-01-01T12:00:00.000Z');
});
test('revoked certificates and corrected practical evidence retain their historical state',()=>{
  const cert=raw({kind:'certificate',payload:{ratio:1,sourceId:'cert'}});
  const revoke=raw({id:'rev',kind:'certificate_revoked',payload:{sourceId:'cert'},occurred_at:'2026-05-01T00:00:00Z'});
  const practice=raw({id:'practical',kind:'challenge',payload:{competency:comp.id,units:100,quality:1,group:'p',label:'Verified',qualified:true}});
  const retract=raw({id:'retract',kind:'retraction',payload:{targetId:'practical'},occurred_at:'2026-05-01T00:00:00Z'});
  const events=projectEvidence([cert,revoke,practice,retract],[version]);
  assert.equal(calculate(comp,events,'2026-04-01T00:00:00Z').score,45);
  assert.equal(calculate(comp,events,'2026-06-01T00:00:00Z').score,0);
});
test('empty real accounts contain neither demo events nor demo catalog',()=>{
  const data=liveData([],[],DEMO_END);assert.equal(data.mode,'live');assert.equal(data.events.length,0);assert.equal(data.catalog.competencies.length,0);assert.ok(data.start<data.end);
});
test('a missing answer is never treated as option zero, and invalid progress is rejected',()=>{
  assert.equal(selectedAnswer(null),-1);assert.equal(selectedAnswer(''),-1);assert.equal(selectedAnswer('0'),0);assert.equal(selectedAnswer('1.5'),-1);
  for(const value of [NaN,Infinity,-1,89,101,'100'])assert.equal(validCompletionPercent(value),false);
  assert.equal(validCompletionPercent(90),true);
});
