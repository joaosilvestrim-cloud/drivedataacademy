import { replay, validateDecision, type Decision, type Difficulty } from './engine';
export interface Attempt {id:string;name:string;difficulty:Difficulty;createdAt:string;decisions:Decision[];seed?:number}
export interface Save {version:1;activeId:string;attempts:Attempt[]}
export function readSave(text:string):Save {
  if(text.length>200000)throw new Error('Arquivo muito grande. O limite é 200 KB.');
  const data=JSON.parse(text);
  if(!data||data.version!==1||!Array.isArray(data.attempts)||!data.attempts.length||data.attempts.length>5)throw new Error('Arquivo de partida incompatível.');
  const ids=new Set<string>();
  const attempts=data.attempts.map((a:Attempt)=>{
    if(!a||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.id)||ids.has(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>80||typeof a.createdAt!=='string'||!Number.isFinite(Date.parse(a.createdAt))||!Array.isArray(a.decisions)||a.decisions.length>6)throw new Error('Dados da partida inválidos.');
    ids.add(a.id);const decisions=a.decisions.map(validateDecision);
    // Partida antiga nao tem semente: segue na ordem original de eventos.
    const seed=a.seed===undefined?undefined:(typeof a.seed==='number'&&Number.isFinite(a.seed)?Math.trunc(a.seed):(()=>{throw new Error('Semente invalida na partida.');})());
    replay(a.difficulty,decisions,seed);
    return {id:a.id,name:a.name,difficulty:a.difficulty,createdAt:a.createdAt,decisions,seed};
  });
  if(!ids.has(data.activeId))throw new Error('Partida ativa não encontrada.');
  return {version:1,activeId:data.activeId,attempts};
}
export function newAttempt(difficulty:Difficulty,name:string):Attempt {
  return {id:crypto.randomUUID(),name:name.trim().slice(0,80)||'Minha estratégia',difficulty,createdAt:new Date().toISOString(),decisions:[],seed:Math.floor(Math.random()*2147483647)+1};
}
