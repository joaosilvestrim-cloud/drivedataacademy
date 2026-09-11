const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const assert=require('node:assert/strict');
const {test}=require('node:test');
function load(file,mocks={}){
  const filename=path.resolve(file);const mod=new Module(filename);mod.paths=Module._nodeModulePaths(path.dirname(filename));const original=mod.require.bind(mod);
  mod.require=id=>Object.hasOwn(mocks,id)?mocks[id]:original(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
  return mod.exports;
}
const ranking=load('lib/ranking.ts');
const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',C='00000000-0000-0000-0000-000000000003';
test('all medal boundaries use the same catalog',()=>{for(const [n,key] of [[1,'gold'],[2,'silver'],[3,'bronze'],[4,'emerald'],[10,'emerald'],[11,'sapphire'],[99,'sapphire']])assert.equal(ranking.medalTier(n).key,key);for(const n of [0,-1,1.5,NaN,Infinity])assert.equal(ranking.medalTier(n),null);});
test('positions come from global totals, never from the authors subset',()=>{const all=ranking.rankUsers({[A]:20,[B]:50,[C]:10});assert.deepEqual(ranking.ranksForUsers(all,[C,A]),{[C]:3,[A]:2});assert.equal(all.length,3);});
test('members without ranking lose the medal explicitly',()=>{assert.deepEqual(ranking.ranksForUsers([], [A]),{[A]:null});assert.deepEqual(ranking.ranksForUsers(ranking.rankUsers({[B]:50}),[A,B]),{[A]:null,[B]:1});});
test('tie ordering and points remain unchanged from the existing ranking',()=>{const totals={[B]:10,[A]:10,[C]:5};assert.deepEqual(ranking.rankUsers(totals).map(r=>r.id),[B,A,C]);assert.equal(totals[B],10);});
test('input rejects invalid IDs and excessive batches; removes duplicates',()=>{assert.deepEqual(ranking.validMedalIds([A,A,B]),[A,B]);for(const input of [null,{},'abc',['admin'],[null],Array(201).fill(A)])assert.throws(()=>ranking.validMedalIds(input));});
function action({user={id:A,email:'member@example.test'},allowed=true}={}){
  let rankingReads=0;
  const actions=load('app/conta/comunidade/actions.ts',{
    'next/cache':{revalidatePath(){}},'next/navigation':{redirect(url){throw new Error('REDIRECT '+url);}},
    '@/lib/supabase/server':{createClient(){return {auth:{getUser:async()=>({data:{user}})}};}},
    '@/lib/supabase/admin':{createAdminClient(){return {};}},'@/lib/community':{canUseCommunity:async()=>allowed},
    '@/lib/community-ranking':{loadCommunityRanking:async()=>{rankingReads++;return ranking.rankUsers({[A]:3,[B]:50,[C]:20});}},'@/lib/ranking':ranking,
  });
  return {actions,reads:()=>rankingReads};
}
test('unauthenticated and ineligible users cannot read medal data',async()=>{for(const config of [{user:null},{allowed:false}]){const x=action(config);await assert.rejects(x.actions.chatMedals([B]),/REDIRECT/);assert.equal(x.reads(),0);}});
test('every authorized viewer receives other authors ranks from server',async()=>{const one=action(),two=action({user:{id:C,email:'second@example.test'}});const expected={ranks:{[B]:1,[A]:3}};assert.deepEqual(await one.actions.chatMedals([B,A]),expected);assert.deepEqual(await two.actions.chatMedals([B,A]),expected);});
test('the action does not disclose unrelated users or accept caller-supplied ranks',async()=>{const x=action();assert.deepEqual(await x.actions.chatMedals([C]),{ranks:{[C]:2}});await assert.rejects(x.actions.chatMedals([{id:A,rank:1}]),/inválido/);});
test('avatars preserve photo and initials, and only ranked authors get a ring',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const Avatar=load('components/Avatar.tsx').default;
  const styles=new Proxy({},{get:(_,name)=>String(name)});
  const MedalAvatar=load('components/ranking/MedalAvatar.tsx',{'@/components/Avatar':{__esModule:true,default:Avatar},'@/lib/ranking':ranking,'./community-medals.module.css':{__esModule:true,default:styles}}).default;
  const plain=renderToStaticMarkup(React.createElement(MedalAvatar,{name:'Aluno Sem Pontos',rank:null}));assert.ok(!plain.includes('class="ring"'));assert.ok(!plain.includes('no ranking'));
  const gold=renderToStaticMarkup(React.createElement(MedalAvatar,{name:'Aluna',rank:1,src:'/photo.png'}));assert.ok(gold.includes('Ouro · 1º lugar no ranking'));assert.ok(gold.includes('src="/photo.png"'));assert.ok(gold.includes('class="ring"'));
  const sapphire=renderToStaticMarkup(React.createElement(MedalAvatar,{name:'Aluna',rank:150}));assert.ok(sapphire.includes('150º lugar no ranking'));assert.ok(sapphire.includes('★'));
});
