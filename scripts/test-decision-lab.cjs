const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../lib/decision-lab');
require.extensions['.ts']=(module,filename)=>{
  if(!filename.startsWith(root+path.sep))throw new Error('Unexpected module');
  module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
};
const {initial,advance,replay,reference,quote,goals,DEFAULT_DECISION,LEVELS}=require('../lib/decision-lab/engine.ts');
const {readSave}=require('../lib/decision-lab/storage.ts');
const decide=patch=>({...DEFAULT_DECISION,...patch});
const cents=n=>Math.round(n*100);
test('a purchase moves cash into inventory; accounting balances for all levels',()=>{
  for(const level of Object.keys(LEVELS)) {
    let s=initial(level);const assets=s.cash+s.inventoryValue;
    for(let r=0;r<6;r++) {
      const plan=decide({price:65,marketing:0,team:0,order:350,express:r%2===1});
      s=advance(s,plan);
      const after=s.cash+s.inventoryValue+s.deliveries.reduce((n,d)=>n+d.value,0);
      assert.equal(cents(after),cents(assets+s.profit));assert.ok(s.stock>=0);assert.ok(s.cash>=0);
    }
    assert.equal(s.day,30);
  }
});
test('normal deliveries arrive exactly once in the next cycle; express is immediate and costs more',()=>{
  const base=initial('guided');
  const normal=advance(base,decide({order:200,express:false}));
  assert.equal(normal.history[0].receipts,0);assert.equal(normal.deliveries[0].quantity,200);
  const next=advance(normal,decide({order:0}));
  assert.equal(next.history[1].receipts,200);assert.equal(next.deliveries.length,0);
  const third=advance(next,decide({order:0}));assert.equal(third.history[2].receipts,0);
  const express=advance(base,decide({order:200,express:true}));
  assert.equal(express.history[0].receipts,200);assert.equal(express.deliveries.length,0);
  assert.equal(express.history[0].purchase,7820);assert.equal(normal.history[0].purchase,6800);
});
test('insufficient cash rejects the entire plan without changing the state',()=>{
  const s=initial('expert'),original=structuredClone(s);
  assert.throws(()=>advance(s,decide({order:1000,express:true})),/caixa/);assert.deepEqual(s,original);
});
test('demand depends on price and marketing; sales respect stock and capacity',()=>{
  const s=initial('guided');
  const low=advance(s,decide({price:40,marketing:0,order:0,team:0})).history[0];
  const high=advance(s,decide({price:80,marketing:0,order:0,team:0})).history[0];
  assert.ok(low.demand>high.demand);assert.ok(low.sold<=400);assert.ok(low.sold<=500);
  const ads=advance(s,decide({price:80,marketing:2400,order:0,team:0})).history[0];assert.ok(ads.demand>high.demand);
  const shortage=advance({...s,stock:0,inventoryValue:0},decide({order:0}));
  assert.equal(shortage.sold,0);assert.ok(shortage.satisfaction<s.satisfaction);assert.equal(shortage.history[0].lost,shortage.history[0].demand);
});
test('staff adds capacity but can be idle; satisfaction recovers with good service',()=>{
  const s=initial('guided');
  const basic=advance(s,decide({order:0,price:55,team:0}));
  const staffed=advance(s,decide({order:0,price:55,team:2}));
  assert.ok(staffed.sold>=basic.sold);assert.equal(staffed.history[0].overhead-basic.history[0].overhead,1500);
  const quiet=advance(s,decide({order:0,price:70,marketing:0,team:0}));assert.equal(quiet.satisfaction,79);
});
test('same decisions replay exactly; simulations do not mutate their inputs',()=>{
  const actions=Array.from({length:6},()=>decide({price:65,order:350,marketing:0,team:0}));
  const original=structuredClone(actions);const a=replay('standard',actions),b=replay('standard',actions);
  assert.deepEqual(a,b);assert.deepEqual(actions,original);assert.equal(a.history.length,6);
  assert.throws(()=>advance(a,decide({order:0})),/concluída/);
});
test('final normal purchase remains in transit and is not counted as an expense or sale',()=>{
  const s=replay('guided',Array.from({length:5},()=>decide({price:65,marketing:0,team:0,order:350})));
  const bought=advance(s,decide({price:65,marketing:0,team:0,order:100}));
  const skipped=advance(s,decide({price:65,marketing:0,team:0,order:0}));
  assert.equal(bought.profit,skipped.profit);assert.equal(bought.sold,skipped.sold);assert.equal(bought.cash,skipped.cash-3400);assert.equal(bought.deliveries[0].quantity,100);
});
test('each difficulty has an achievable mission and deterministic reference strategy',()=>{
  for(const level of Object.keys(LEVELS)) {
    const s=replay(level,Array.from({length:6},()=>decide({price:65,marketing:0,team:0,order:350})));
    assert.ok(goals(s).every(g=>g.met),`${level} should be winnable`);
    assert.deepEqual(reference(level),reference(level));assert.ok(reference(level).day<=30);
  }
});
test('invalid, fractional, out-of-bounds and non-finite decisions are rejected',()=>{
  for(const patch of [{price:NaN},{price:Infinity},{price:55.5},{price:'55'},{marketing:-1},{marketing:2500},{marketing:50},{order:1001},{order:1},{team:4},{express:1}])assert.throws(()=>advance(initial('guided'),decide(patch)));
  assert.throws(()=>initial('__proto__'));assert.throws(()=>initial('other'));
});
const fixture=()=>({version:1,activeId:'attempt-1',attempts:[{id:'attempt-1',name:'Plano A',difficulty:'guided',createdAt:'2026-09-10T12:00:00Z',decisions:[decide({order:0})]}]});
test('save import verifies decisions by replay and does not trust supplied scores or cash',()=>{
  const file=fixture();file.attempts[0].cash=999999999;file.attempts[0].profit=999999;
  const saved=readSave(JSON.stringify(file));assert.equal(saved.attempts[0].cash,undefined);assert.equal(saved.attempts[0].profit,undefined);
  assert.deepEqual(readSave(JSON.stringify(saved)),saved);
  file.attempts[0].decisions=[decide({order:1000,express:true})];assert.throws(()=>readSave(JSON.stringify(file)),/caixa/);
});
test('corrupt and incompatible saves cannot replace the current game',()=>{
  const variants=[{...fixture(),version:2},{...fixture(),attempts:[]},{...fixture(),activeId:'missing'}];
  const duplicate=fixture();duplicate.attempts.push({...duplicate.attempts[0]});variants.push(duplicate);
  const tooLong=fixture();tooLong.attempts[0].decisions=Array.from({length:7},()=>decide({order:0}));variants.push(tooLong);
  for(const bad of variants)assert.throws(()=>readSave(JSON.stringify(bad)));
  assert.throws(()=>readSave('{bad'));assert.throws(()=>readSave(' '.repeat(200001)));
});
test('random legal plans preserve accounting, bounds and terminal day limits',()=>{
  let seed=9471;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<100;i++) {
    let s=initial('guided');const startingAssets=s.cash+s.inventoryValue;
    for(let cycle=0;cycle<6;cycle++) {
      const d={price:40+Math.floor(rand()*41),marketing:Math.floor(rand()*25)*100,team:Math.floor(rand()*4),order:Math.floor(rand()*41)*25,express:rand()>.5};
      while(quote(s,d).upfront>s.cash&&d.order>0)d.order-=25;
      if(quote(s,d).upfront>s.cash)break;
      s=advance(s,d);
      assert.equal(cents(s.cash+s.inventoryValue+s.deliveries.reduce((n,d)=>n+d.value,0)),cents(startingAssets+s.profit));
      assert.ok(s.satisfaction>=0&&s.satisfaction<=100);assert.ok(s.stock>=0);assert.ok(s.day<=30);assert.ok(s.sold<=s.demand);
    }
  }
});
test('Decision Lab has no Knowledge Universe, AI or remote progress dependency',()=>{
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  for(const file of ['lib/decision-lab','components/decision-lab','app/(decision)'].flatMap(dir=>walk(path.resolve(__dirname,'..',dir))).filter(f=>/\.tsx?$/.test(f))) {
    const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/from\s+['"][^'"]*(?:knowledge|\/lib\/ai|openai|anthropic|generative-ai)/);assert.doesNotMatch(source,/\bfetch\s*\(/);
  }
});
