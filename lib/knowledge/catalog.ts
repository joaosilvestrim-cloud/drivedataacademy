import { WEIGHTS } from './engine';
import type { KnowledgeDocument, Requirement, Vec3 } from './types';

export function emptyDocument(): KnowledgeDocument {
  return { version: 'draft', areas: [], competencies: [], relations: [], unlocks: [], path: [], mappings: [], weights: { ...WEIGHTS } };
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Cadastro inválido.'); return value as Record<string,unknown>; }
function array(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length>max) throw new Error('Lista inválida ou acima do limite.'); return value; }
function text(value: unknown, max=160): string { if (typeof value!=='string' || !value.trim() || value.length>max) throw new Error('Preencha os textos dentro do limite permitido.'); return value; }
function number(value: unknown, min: number, max: number): number { if (typeof value!=='number' || !Number.isFinite(value) || value<min || value>max) throw new Error('Valor numérico fora do intervalo permitido.'); return value; }
function coordinates(value: unknown) { const v=array(value,3); if(v.length!==3) throw new Error('Posição inválida.'); v.forEach(n=>number(n,-100,100)); }
function noCycles(edges: [string,string][]) {
  const adjacent=new Map<string,string[]>(); edges.forEach(([a,b])=>adjacent.set(a,[...(adjacent.get(a)??[]),b]));
  const done=new Set<string>(), visiting=new Set<string>();
  function visit(id:string) { if(visiting.has(id)) throw new Error('A hierarquia ou os pré-requisitos possuem um ciclo.'); if(done.has(id)) return; visiting.add(id); (adjacent.get(id)??[]).forEach(visit); visiting.delete(id); done.add(id); }
  [...adjacent.keys()].forEach(visit);
}
export function validateDocument(input: unknown, publish=false): KnowledgeDocument {
  const d=object(input); if(JSON.stringify(d).length>900000) throw new Error('Catálogo muito grande.');
  const areas=array(d.areas,30), comps=array(d.competencies,200), relations=array(d.relations,1000), unlocks=array(d.unlocks,200), paths=array(d.path,100), maps=array(d.mappings,2000);
  const areaIds=new Set<string>(),ids=new Set<string>();
  for(const raw of areas) { const a=object(raw),id=text(a.id,80); if(areaIds.has(id)) throw new Error('Área duplicada.'); areaIds.add(id); text(a.name); if(typeof a.color!=='string'||!/^#[0-9a-f]{6}$/i.test(a.color)) throw new Error('Cor inválida.'); coordinates(a.position); }
  for(const raw of comps) { const c=object(raw),id=text(c.id,80); if(ids.has(id)) throw new Error('Competência duplicada.'); ids.add(id); if(!areaIds.has(text(c.area,80))) throw new Error('Selecione uma área existente.'); text(c.name); if(typeof c.description!=='string'||c.description.length>2000) throw new Error('Descrição inválida.'); coordinates(c.position); number(c.halfLifeDays,1,3650); const t=object(c.targets); for(const key of Object.keys(WEIGHTS)) number(t[key],1,10000); }
  const edges:[string,string][]=[];
  for(const raw of comps) { const c=object(raw); if(c.parent) { if(!ids.has(text(c.parent,80))) throw new Error('Competência pai inexistente.'); edges.push([c.id as string,c.parent as string]); } }
  noCycles(edges);
  const pairs=new Set<string>();
  for(const raw of relations) { const r=object(raw); if(!ids.has(text(r.source,80))||!ids.has(text(r.target,80))||r.source===r.target) throw new Error('Relação inválida.'); number(r.strength,0,1); const key=[r.source,r.target].sort().join(':'); if(pairs.has(key)) throw new Error('Relação duplicada.'); pairs.add(key); }
  const prerequisiteEdges:[string,string][]=[]; const targets=new Set<string>();
  function requirement(raw:unknown,target:string,depth=0): void {
    if(depth>5) throw new Error('Pré-requisito muito profundo.'); const r=object(raw);
    if('competency' in r) { const id=text(r.competency,80); if(!ids.has(id)) throw new Error('Pré-requisito inexistente.'); number(r.minimum,1,100); prerequisiteEdges.push([target,id]); return; }
    if(('all' in r)===('any' in r)) throw new Error('Escolha todos ou qualquer um nos pré-requisitos.');
    const children=array('all' in r?r.all:r.any,20); if(!children.length) throw new Error('Grupo de pré-requisitos vazio.'); children.forEach(c=>requirement(c,target,depth+1));
  }
  for(const raw of unlocks) { const u=object(raw),id=text(u.target,80); if(!ids.has(id)||targets.has(id)) throw new Error('Desbloqueio duplicado ou inexistente.'); targets.add(id); requirement(u.rule,id); }
  noCycles(prerequisiteEdges);
  if(new Set(paths).size!==paths.length||paths.some(id=>typeof id!=='string'||!ids.has(id))) throw new Error('Caminho inválido.');
  const totals=new Map<string,number>(),mappingPairs=new Set<string>();
  for(const raw of maps) { const m=object(raw),course=text(m.courseId,40); if(!/^[0-9a-f-]{36}$/i.test(course)||!ids.has(text(m.competency,80))) throw new Error('Associação de curso inválida.'); const pair=course+':'+m.competency; if(mappingPairs.has(pair)) throw new Error('Competência repetida no mesmo curso.'); mappingPairs.add(pair); const w=number(m.weight,.000001,1); number(m.credits,1,10000); text(m.group,80); if(typeof m.advanced!=='boolean') throw new Error('Nível inválido.'); totals.set(course,(totals.get(course)??0)+w); }
  const weights=object(d.weights); let sum=0; for(const key of Object.keys(WEIGHTS)) sum+=number(weights[key],0,100);
  if(Math.abs(sum-100)>.000001) throw new Error('Os pesos das dimensões devem somar 100.');
  if(publish && (!areas.length||!comps.length)) throw new Error('Cadastre ao menos uma área e uma competência.');
  if(publish && [...totals.values()].some(t=>Math.abs(t-1)>.000001)) throw new Error('Os pesos das competências de cada curso devem somar 100%.');
  text(d.version,80);
  return structuredClone(d) as unknown as KnowledgeDocument;
}
export function positionFor(id: string, anchor: Vec3, index: number): Vec3 {
  let hash=0; for(const ch of id) hash=(hash*31+ch.charCodeAt(0))>>>0;
  const angle=(hash%360)*Math.PI/180; const radius=1.7+(index%3)*.65;
  return [anchor[0]+Math.cos(angle)*radius,anchor[1]+Math.sin(angle)*radius,((hash%100)/100-.5)*2];
}
export function requirements(rule: Requirement): {competency:string;minimum:number}[] {
  return 'competency' in rule?[rule]:('all' in rule?rule.all:rule.any).flatMap(requirements);
}
