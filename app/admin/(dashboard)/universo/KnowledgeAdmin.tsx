'use client';

import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_CATALOG } from '@/lib/knowledge/demo';
import { LABELS, WEIGHTS } from '@/lib/knowledge/engine';
import { positionFor, requirements } from '@/lib/knowledge/catalog';
import type { Dimension, KnowledgeDocument, Vec3 } from '@/lib/knowledge/types';
import { Button } from '@/components/ui/primitives';
// O arquivo já tem um Field local, usado pelas abas ainda não migradas.
// O do Design System entra com apelido até as outras abas migrarem.
import { Field as DsField, TextareaField, SelectField, CheckboxField, FormSection, FormActions } from '@/components/ui/form';
import { grantKnowledgeAccess, publishKnowledgeDraft, recordPracticalEvidence, retractPracticalEvidence, revokeKnowledgeAccess, saveKnowledgeDraft, simulateKnowledgeDraft } from './actions';

const input='mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white';
const button='rounded-lg bg-teal-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40';
const secondary='rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 hover:border-teal-300/40 disabled:opacity-40';
const panel='rounded-xl border border-white/10 bg-white/[.02] p-5';
function Field({title,children}:{title:string;children:ReactNode}) {return <label className="block text-xs text-slate-400">{title}{children}</label>;}
// Seletor de cor: continua nativo e continua local. Virar campo de texto
// tiraria o seletor do sistema operacional e a operação por teclado que o
// input color já entrega de graça. O que muda é só a moldura, que passa a ser
// a mesma dos outros controles.
function ColorField({scope,name,label,defaultValue}:{scope:string;name:string;label:string;defaultValue:string}) {
  const id=`${scope}-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label font-medium text-ds-text-2">{label}</label>
      <input id={id} name={name} type="color" defaultValue={defaultValue}
        className="h-10 w-full cursor-pointer rounded-ctl border border-ds-line bg-ds-surface p-1 transition-colors duration-fast ease-ds hover:border-ds-text-3 disabled:cursor-not-allowed disabled:opacity-50"/>
    </div>
  );
}
function str(f:FormData,key:string){return String(f.get(key)??'').trim();}
function num(f:FormData,key:string){return Number(f.get(key));}
export default function KnowledgeAdmin({initial,revision:initialRevision,courses,versions,students=[],practical=[]}:{initial:KnowledgeDocument;revision:number;courses:{id:string;title:string;slug:string}[];versions:{id:string;published_at:string}[];students?:{id:string;full_name:string|null}[];practical?:{id:string;userId:string;label:string;at:string}[]}) {
  const router=useRouter();
  const [doc,setDoc]=useState(initial),[revision,setRevision]=useState(initialRevision),[tab,setTab]=useState('catalogo'),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[notice,setNotice]=useState(''),[editing,setEditing]=useState('');
  const [courseId,setCourseId]=useState(courses[0]?.id??'');
  const [requestId,setRequestId]=useState('');
  const selected=doc.competencies.find(c=>c.id===editing);
  const mutate=(change:(draft:KnowledgeDocument)=>void)=>{setDoc(current=>{const draft=structuredClone(current);change(draft);return draft;});setDirty(true);setNotice('Rascunho alterado. Salve antes de publicar.');};
  async function save(){setBusy(true);const r=await saveKnowledgeDraft(doc,revision);setBusy(false);if(r.ok){setRevision(r.revision);setDirty(false);setNotice('Rascunho salvo. A versão dos alunos permanece a mesma até a publicação.');}else setNotice(r.error);}
  async function publish(){setBusy(true);const r=await publishKnowledgeDraft(revision);setBusy(false);setNotice(r.ok?'Catálogo publicado. As próximas atividades usarão esta versão.':r.error);if(r.ok)router.refresh();}
  function competency(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);const a=doc.areas.find(a=>a.id===str(f,'area'));if(!a){setNotice('Cadastre uma macroárea primeiro.');return;}
    const id=editing||crypto.randomUUID();mutate(d=>{const next={id,name:str(f,'name'),description:str(f,'description'),area:a.id,parent:str(f,'parent')||undefined,position:selected?.position??positionFor(id,a.position,d.competencies.filter(c=>c.area===a.id).length),halfLifeDays:num(f,'freshness'),targets:Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,num(f,k)])) as Record<Dimension,number>};const at=d.competencies.findIndex(c=>c.id===id);if(at<0)d.competencies.push(next);else d.competencies[at]=next;});setEditing('');event.currentTarget.reset();}
  const options=doc.competencies.map(c=><option key={c.id} value={c.id}>{c.name}</option>);
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-brand-green">Administração acadêmica</p><h1 className="mt-1 text-3xl font-semibold">Knowledge Universe 4D</h1><p className="mt-2 text-sm text-slate-400">Defina competências, treinamentos e critérios de domínio. Nenhuma IA participa dos cálculos.</p></div><Link href="/universo" className={secondary}>Ver meu universo ↗</Link></div>
    <div className="flex flex-wrap items-center gap-3"><button disabled={busy} onClick={save} className={button}>{busy?'Processando…':'Salvar rascunho'}</button><button disabled={busy||dirty} onClick={publish} className={secondary}>Publicar versão</button><button disabled={busy} className={secondary} onClick={async()=>{setBusy(true);const r=await simulateKnowledgeDraft(doc);setBusy(false);setNotice(r.ok?`Configuração válida: ${r.competencies} competências e ${r.mappedCourses} treinamentos associados. Sem evidências, todos os scores são zero.`:r.error);}}>Validar configuração</button><span className="text-xs text-slate-500">Revisão {revision} · {dirty?'Alterações não salvas':versions.length?'Catálogo com versão publicada':'Ainda sem publicação'}</span></div>
    {notice&&<p role="status" className="rounded-lg border border-teal-200/20 bg-teal-950/30 p-3 text-sm text-teal-100">{notice}</p>}
    <nav aria-label="Configurações do universo" className="flex flex-wrap gap-2">{[['catalogo','Áreas e competências'],['cursos','Treinamentos e pesos'],['regras','Relações e regras'],['pratica','Evidências práticas'],['acessos','Acesso e versões']].map(([id,name])=><button key={id} onClick={()=>setTab(id)} aria-pressed={tab===id} className={`${secondary} ${tab===id?'bg-white/10 text-teal-200':''}`}>{name}</button>)}</nav>
    <fieldset disabled={busy} className="space-y-6">
    {tab==='catalogo'&&<>
      {!doc.areas.length&&<div className={panel}><h2 className="text-lg font-medium">Comece pelo catálogo</h2><p className="mt-2 text-sm text-slate-400">Cadastre suas próprias áreas ou use Dados, Gestão e IA como ponto de partida. O modelo não contém scores nem atividades de alunos.</p><button className={`${secondary} mt-4`} onClick={()=>mutate(d=>{d.areas=structuredClone(DEMO_CATALOG.areas);d.competencies=structuredClone(DEMO_CATALOG.competencies);d.relations=structuredClone(DEMO_CATALOG.relations);d.unlocks=structuredClone(DEMO_CATALOG.unlocks);d.path=[...DEMO_CATALOG.path];})}>Usar catálogo inicial</button></div>}
      <form className="flex flex-col gap-5" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);mutate(d=>{const i=d.areas.length;const angle=i*2.4;const position:Vec3=[Math.cos(angle)*4,Math.sin(angle)*3,0];d.areas.push({id:crypto.randomUUID(),name:str(f,'name'),color:str(f,'color'),position});});e.currentTarget.reset();}}>
        <FormSection title="Nova macroárea">
          <div className="grid items-end gap-4 tablet:grid-cols-[1fr_8rem_auto]">
            <DsField scope="area" name="name" label="Nome" required maxLength={160}/>
            <ColorField scope="area" name="color" label="Cor" defaultValue="#56e7cf"/>
            <Button type="submit">Adicionar área</Button>
          </div>
          {/* Lista das áreas já criadas: outra família, markup preservado. */}
          <div className="mt-4 flex flex-wrap gap-2">{doc.areas.map(a=><span key={a.id} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"><i className="h-2 w-2 rounded-full" style={{background:a.color}}/>{a.name}<button type="button" aria-label={`Remover área ${a.name}`} onClick={()=>{if(doc.competencies.some(c=>c.area===a.id)){setNotice('Mova ou remova as competências desta área antes de removê-la.');return;}mutate(d=>{d.areas=d.areas.filter(x=>x.id!==a.id);});}}>×</button></span>)}</div>
        </FormSection>
      </form>
      <form key={editing||'new'} className="flex flex-col gap-5" onSubmit={competency}>
        <FormSection title={selected?'Editar competência':'Nova competência'}>
          <div className="grid gap-4 tablet:grid-cols-2">
            <DsField scope="competencia" name="name" label="Nome" required maxLength={160} defaultValue={selected?.name}/>
            <SelectField scope="competencia" name="area" label="Macroárea" required defaultValue={selected?.area}>
              {doc.areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </SelectField>
            <SelectField scope="competencia" name="parent" label="Competência pai" defaultValue={selected?.parent??''} description="Opcional. Use para aninhar uma competência dentro de outra.">
              <option value="">Sem competência pai</option>
              {doc.competencies.filter(c=>c.id!==editing).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <DsField scope="competencia" name="freshness" label="Meia-vida da atualidade" type="number" min="1" max="3650" required defaultValue={selected?.halfLifeDays??180} description="Em dias."/>
          </div>
          <TextareaField scope="competencia" name="description" label="Descrição" maxLength={2000} defaultValue={selected?.description}/>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-medium text-ds-text-2">Alvos por dimensão</legend>
            <p className="text-caption text-ds-text-3">Unidades necessárias para completar cada dimensão da competência.</p>
            <div className="mt-1 grid gap-4 tablet:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(WEIGHTS) as Dimension[]).map(k=><DsField key={k} scope="competencia" name={k} label={LABELS[k]} type="number" min="1" max="10000" required defaultValue={selected?.targets[k]??100}/>)}
            </div>
          </fieldset>
        </FormSection>
        <FormActions>
          <Button type="submit" disabled={!doc.areas.length}>{selected?'Atualizar competência':'Adicionar competência'}</Button>
          {selected&&<Button type="button" variant="ghost" onClick={()=>setEditing('')}>Cancelar edição</Button>}
        </FormActions>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">{doc.competencies.map(c=><div key={c.id} className={`${panel} flex items-center justify-between gap-3`}><div><h3>{c.name}</h3><p className="mt-1 text-xs text-slate-500">{doc.areas.find(a=>a.id===c.area)?.name}</p></div><button className={secondary} onClick={()=>setEditing(c.id)}>Editar</button><button aria-label={`Remover ${c.name} do rascunho`} className="text-xs text-red-300" onClick={()=>mutate(d=>{d.competencies=d.competencies.filter(x=>x.id!==c.id);d.relations=d.relations.filter(r=>r.source!==c.id&&r.target!==c.id);d.mappings=d.mappings.filter(m=>m.competency!==c.id);d.path=d.path.filter(id=>id!==c.id);d.unlocks=d.unlocks.filter(u=>u.target!==c.id&&!requirements(u.rule).some(r=>r.competency===c.id));d.competencies.forEach(x=>{if(x.parent===c.id)delete x.parent;});})}>Remover</button></div>)}</div>
    </>}
    {tab==='cursos'&&<div className="flex flex-col gap-6">
      <FormSection title="Competências de cada treinamento" description="Os pesos do curso devem somar 100%. Créditos são unidades pedagógicas, e grupos equivalentes evitam somar novamente o mesmo conhecimento.">
        {/* Fora do formulário de propósito: escolhe de qual treinamento é o mapeamento e remonta o formulário por key. */}
        <SelectField scope="mapa" name="course" label="Treinamento" value={courseId} onChange={e=>setCourseId(e.target.value)}>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</SelectField>
        <form key={courseId} className="flex flex-col gap-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const competency=str(f,'competency');mutate(d=>{d.mappings=d.mappings.filter(m=>!(m.courseId===courseId&&m.competency===competency));d.mappings.push({courseId,competency,weight:num(f,'weight')/100,credits:num(f,'credits'),group:str(f,'group'),advanced:f.get('advanced')==='on'});});}}>
          <div className="grid gap-4 tablet:grid-cols-2">
            <SelectField scope="mapa" name="competency" label="Competência" required>{options}</SelectField>
            <DsField scope="mapa" name="weight" label="Peso" type="number" min=".01" max="100" step=".01" defaultValue="100" required description="Em porcentagem do curso."/>
            <DsField scope="mapa" name="credits" label="Créditos do curso" type="number" min="1" max="10000" defaultValue="100" required/>
            <DsField scope="mapa" name="group" label="Grupo de conhecimento" defaultValue="fundamentos" required maxLength={80} description="Mesmo nome significa conteúdos equivalentes."/>
          </div>
          <CheckboxField scope="mapa" name="advanced" label="Avaliação de nível avançado"/>
          <div><Button type="submit" disabled={!courseId||!doc.competencies.length}>Associar / atualizar</Button></div>
        </form>
      </FormSection>
      {/* Lista dos mapeamentos já criados: outra família, markup preservado. */}
      <div className="mt-6 space-y-3">{doc.mappings.filter(m=>m.courseId===courseId).map(m=><div key={m.competency} className="flex items-center justify-between border-t border-white/10 py-3 text-sm"><span>{doc.competencies.find(c=>c.id===m.competency)?.name} · {(m.weight*100).toFixed(1)}% · {m.credits} créditos · {m.group}</span><button className="text-red-300" onClick={()=>mutate(d=>{d.mappings=d.mappings.filter(x=>x!==d.mappings.find(x=>x.courseId===m.courseId&&x.competency===m.competency));})}>Remover</button></div>)}</div>
      <p className="text-body-sm text-ds-text-2">Total: <span className="font-mono tabular-nums text-ds-text">{(doc.mappings.filter(m=>m.courseId===courseId).reduce((sum,m)=>sum+m.weight,0)*100).toFixed(2)}%</span></p>
      {courseId&&<Link className="mt-4 inline-block text-xs text-slate-400" href={`/admin/cursos/${courseId}`}>Abrir cadastro do treinamento →</Link>}
    </div>}
    {tab==='regras'&&<div className="flex flex-col gap-10">
      <form className="flex flex-col gap-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);mutate(d=>{d.weights=Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,num(f,k)])) as Record<Dimension,number>;});}}>
        <FormSection title="Composição dos 100 pontos">
          <div className="grid gap-4 tablet:grid-cols-3 lg:grid-cols-5">
            {(Object.keys(WEIGHTS) as Dimension[]).map(k=><DsField key={k} scope="pesos" name={k} label={LABELS[k]} type="number" min="0" max="100" defaultValue={doc.weights?.[k]??WEIGHTS[k]}/>)}
          </div>
          <div><Button type="submit">Atualizar pesos</Button></div>
          <p className="text-caption text-ds-text-3">Alterações geram uma nova versão ao publicar. O histórico conserva as configurações anteriores.</p>
        </FormSection>
      </form>
      <form className="flex flex-col gap-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);mutate(d=>{d.relations.push({source:str(f,'source'),target:str(f,'target'),strength:num(f,'strength')/100});});}}>
        <FormSection title="Relações entre competências">
          <div className="grid gap-4 tablet:grid-cols-3">
            <SelectField scope="relacao" name="source" label="Origem" required>{options}</SelectField>
            <SelectField scope="relacao" name="target" label="Destino" required>{options}</SelectField>
            <DsField scope="relacao" name="strength" label="Afinidade" type="number" min="0" max="100" defaultValue="80" description="Em porcentagem."/>
          </div>
          <div><Button type="submit">Adicionar relação</Button></div>
          {/* Relações já criadas: outra família, markup preservado. */}
          <div className="mt-4 flex flex-wrap gap-2">{doc.relations.map((r,i)=><button type="button" key={i} className={secondary} title="Remover relação do rascunho" onClick={()=>mutate(d=>{d.relations.splice(i,1);})}>{doc.competencies.find(c=>c.id===r.source)?.name} ↔ {doc.competencies.find(c=>c.id===r.target)?.name} · {Math.round(r.strength*100)}% ×</button>)}</div>
        </FormSection>
      </form>
      <form className="flex flex-col gap-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),target=str(f,'target'),required=str(f,'required');mutate(d=>{const existing=d.unlocks.find(u=>u.target===target);const rules=existing?requirements(existing.rule).filter(r=>r.competency!==required):[];rules.push({competency:required,minimum:num(f,'minimum')});d.unlocks=d.unlocks.filter(u=>u.target!==target);d.unlocks.push({target,rule:{all:rules}});});}}>
        <FormSection title="Pré-requisitos" description="Todos os requisitos listados para uma competência são obrigatórios.">
          <div className="grid gap-4 tablet:grid-cols-3">
            <SelectField scope="prereq" name="target" label="Competência a desbloquear" required>{options}</SelectField>
            <SelectField scope="prereq" name="required" label="Competência necessária" required>{options}</SelectField>
            <DsField scope="prereq" name="minimum" label="Score mínimo" type="number" min="1" max="100" defaultValue="60" required/>
          </div>
          <div><Button type="submit">Adicionar requisito</Button></div>
          {/* Requisitos já criados: outra família, markup preservado. */}
          {doc.unlocks.map(u=><div key={u.target} className="mt-4 border-t border-white/10 pt-3 text-sm"><strong>{doc.competencies.find(c=>c.id===u.target)?.name}</strong><p className="mt-1 text-slate-400">{requirements(u.rule).map(r=>`${doc.competencies.find(c=>c.id===r.competency)?.name} ≥ ${r.minimum}`).join(' + ')}</p><button type="button" className="mt-2 text-xs text-red-300" onClick={()=>mutate(d=>{d.unlocks=d.unlocks.filter(x=>x.target!==u.target);})}>Remover requisitos</button></div>)}
        </FormSection>
      </form>
      <form className="flex flex-col gap-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);mutate(d=>{const id=str(f,'step');if(!d.path.includes(id))d.path.push(id);});}}>
        <FormSection title="Caminho de aprendizagem">
          <SelectField scope="caminho" name="step" label="Próxima etapa" className="max-w-md">{options}</SelectField>
          <div><Button type="submit">Adicionar ao caminho</Button></div>
          {/* Etapas já definidas: outra família, markup preservado. */}
          <ol className="mt-4 space-y-2">{doc.path.map((id,i)=><li key={id} className="flex items-center gap-3 text-sm"><span>{i+1}. {doc.competencies.find(c=>c.id===id)?.name}</span><button type="button" className="text-xs text-red-300" onClick={()=>mutate(d=>{d.path.splice(i,1);})}>Remover</button></li>)}</ol>
        </FormSection>
      </form>
    </div>}
    {tab==='pratica'&&<form className={panel} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const id=requestId||crypto.randomUUID();setRequestId(id);setBusy(true);const r=await recordPracticalEvidence({userId:str(f,'student'),competency:str(f,'competency'),dimension:str(f,'dimension'),group:str(f,'group'),units:num(f,'units'),quality:num(f,'quality')/100,advanced:f.get('advanced')==='on',label:str(f,'label'),requestId:id});setBusy(false);setNotice(r.ok?'Evidência registrada. O aluno verá o resultado ao atualizar seu universo.':r.error);if(r.ok)setRequestId('');}}><h2 className="text-lg font-medium">Registrar evidência revisada pelo instrutor</h2><p className="my-4 text-sm text-slate-400">Use somente para atividades verificadas. O registro entra no histórico com a data atual; grupos equivalentes não acumulam pontos repetidos.</p><div className="grid gap-4 sm:grid-cols-2"><Field title="Aluno"><select name="student" required className={input}>{students.map(s=><option key={s.id} value={s.id}>{s.full_name||'Aluno sem nome'}</option>)}</select></Field><Field title="Competência publicada"><select name="competency" required className={input}>{options}</select></Field><Field title="Tipo"><select name="dimension" className={input}><option value="exercise">Exercício</option><option value="challenge">Desafio prático</option><option value="retention">Revisão espaçada</option></select></Field><Field title="Referência / grupo de equivalência"><input name="group" required maxLength={80} className={input}/></Field><Field title="Unidades demonstradas"><input name="units" type="number" min="0" max="10000" defaultValue="100" required className={input}/></Field><Field title="Qualidade da evidência (%)"><input name="quality" type="number" min="0" max="100" defaultValue="100" required className={input}/></Field><Field title="Descrição da entrega verificada"><input name="label" required maxLength={240} className={input}/></Field><label className="flex items-center gap-2 text-sm"><input name="advanced" type="checkbox"/>Atividade de nível avançado</label></div><button disabled={busy||!versions.length} className={`${button} mt-5`}>Registrar evidência</button></form>}
    {tab==='acessos'&&<div className="space-y-5"><form className={panel} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const r=await grantKnowledgeAccess(str(f,'email'),str(f,'expires')?new Date(str(f,'expires')+'T23:59:59').toISOString():null);setBusy(false);setNotice(r.ok?'Acesso liberado para o aluno.':r.error);}}><h2 className="text-lg font-medium">Acesso ao produto</h2><p className="my-3 text-sm text-slate-400">Administradores e assinantes ativos da Academy têm acesso. Você também pode conceder acesso individual.</p><div className="grid gap-4 sm:grid-cols-2"><Field title="E-mail da conta do aluno"><input type="email" name="email" required className={input}/></Field><Field title="Válido até (vazio = sem vencimento)"><input type="date" name="expires" className={input}/></Field></div><button disabled={busy} className={`${button} mt-4`}>Liberar acesso</button></form><div className={panel}><h2 className="text-lg font-medium">Publicações recentes</h2><p className="mt-2 text-sm text-slate-400">Os registros antigos permanecem associados às suas versões.</p>{versions.map((v,i)=><p key={v.id} className="mt-3 border-t border-white/10 pt-3 text-sm">{i===0?'Versão atual':'Versão anterior'} · {new Date(v.published_at).toLocaleString('pt-BR')}</p>)}</div></div>}
    {tab==='pratica'&&practical.length>0&&<form className={panel} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const r=await retractPracticalEvidence(str(f,'event'),str(f,'reason'));setBusy(false);setNotice(r.ok?'Correção registrada. A evidência original permanece na auditoria e deixa de contar a partir de agora.':r.error);if(r.ok)router.refresh();}}><h2 className="mb-4 text-lg font-medium">Corrigir uma evidência prática</h2><Field title="Registro a desconsiderar"><select name="event" required className={input}>{practical.map(e=><option key={e.id} value={e.id}>{students.find(s=>s.id===e.userId)?.full_name??'Aluno'} · {e.label} · {new Date(e.at).toLocaleDateString('pt-BR')}</option>)}</select></Field><Field title="Motivo da correção"><input name="reason" required maxLength={240} className={input}/></Field><button className={`${secondary} mt-4`}>Registrar correção</button></form>}
    {tab==='acessos'&&<form className={panel} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const r=await revokeKnowledgeAccess(str(f,'student'));setBusy(false);setNotice(r.ok?'A concessão individual foi encerrada. Assinaturas ativas continuam dando acesso.':r.error);}}><h2 className="mb-4 text-lg font-medium">Encerrar uma concessão individual</h2><Field title="Aluno"><select name="student" required className={input}>{students.map(s=><option key={s.id} value={s.id}>{s.full_name??'Aluno sem nome'}</option>)}</select></Field><button className={`${secondary} mt-4`}>Encerrar concessão</button></form>}
    </fieldset>
  </div>;
}
