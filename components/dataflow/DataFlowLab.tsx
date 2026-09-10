'use client';
import {Component,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowLeft,Play,Pause,RotateCcw,Download,Upload,Database,GitMerge,Braces,Layers,CheckCircle2,HelpCircle,Save,FolderOpen,Plus,Trash2} from 'lucide-react';
import {DEFAULT_CONFIG,DEFAULT_SQL,parseCSV,pipeline,quality,sample,toCSV,type Table,type Stage,type Config} from '@/lib/dataflow/engine';
import {traceOrder,type TraceStep} from '@/lib/dataflow/trace';
import {MISSIONS} from '@/lib/dataflow/missions';
import {completeMission} from '@/app/(dataflow)/dataflow-lab/actions';
import {MAX_PROJECTS,newProject,readSave,recipeSummary,type Project,type Save as ProjectSave} from '@/lib/dataflow/storage';
import s from './dataflow.module.css';
const Scene=dynamic(()=>import('./FlowScene'),{ssr:false,loading:()=> <div className={s.loading}>Preparando o laboratório 3D…</div>});
const titles=['Fontes','Limpeza','Filtro','Junção','SQL'];
type Run={sources:ReturnType<typeof sample>;stages:Stage[];config:Config;sql:string;truncated:boolean;name:string;at:string};
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className={s.loading}>3D indisponível neste dispositivo. Continue pela visão 2D ou pelos botões das etapas abaixo.</div>:this.props.children;}}
function download(name:string,text:string,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function DataTable({table,label,onPick,picked}:{table:Table;label:string;onPick?:(index:number)=>void;picked?:number|null}) {
  const [page,setPage]=useState(0);useEffect(()=>setPage(0),[table]);const pages=Math.max(1,Math.ceil(table.rows.length/30));const safePage=Math.min(page,pages-1);
  return <section className={s.tablePanel}><div className={s.tableHead}><strong>{label}</strong><span>{table.rows.length.toLocaleString('pt-BR')} linhas · {table.columns.length} colunas</span></div><div className={s.tableScroll}><table><thead><tr>{table.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{table.rows.slice(safePage*30,safePage*30+30).map((row,i)=>{const real=safePage*30+i;return <tr key={i} onClick={onPick?()=>onPick(real):undefined} className={onPick?(picked===real?s.rowPicked:s.rowPickable):undefined} title={onPick?'Clique para rastrear este pedido':undefined}>{row.map((v,j)=><td key={j} title={v===null?'NULL':String(v)}>{v===null?<em>NULL</em>:String(v)}</td>)}</tr>;})}</tbody></table>{!table.rows.length&&<p className={s.empty}>Nenhum registro nesta etapa.</p>}</div><div className={s.pagination}><button disabled={safePage===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{safePage+1} / {pages}</span><button disabled={safePage>=pages-1} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></section>;
}
function Chart({table}:{table:Table}) {
  const ni=table.columns.findIndex((_,i)=>table.rows.some(r=>typeof r[i]==='number'));
  const valueIndex=table.columns.findIndex((c,i)=>i>ni&&table.rows.some(r=>typeof r[i]==='number'));
  const metric=valueIndex<0?ni:valueIndex;
  const label=table.columns.findIndex((_,i)=>table.rows.some(r=>typeof r[i]==='string'));
  if(metric<0||label<0||!table.rows.length)return <p className={s.hint}>Retorne uma coluna de texto e uma numérica no SQL para visualizar barras.</p>;
  const max=Math.max(1,...table.rows.slice(0,12).map(r=>Math.abs(Number(r[metric])||0)));
  return <div className={s.chart}><div className={s.eyebrow}>{table.columns[metric]} · primeiras 12 linhas</div>{table.rows.slice(0,12).map((r,i)=><div className={s.barRow} key={i}><span>{String(r[label]??'NULL')}</span><div><i style={{width:`${Math.abs(Number(r[metric])||0)/max*100}%`}}/></div><b>{Number(r[metric]||0).toLocaleString('pt-BR')}</b></div>)}</div>;
}
export default function DataFlowLab({userId='',demo=false}:{userId?:string;demo?:boolean}) {
  const [data,setData]=useState(sample),[config,setConfig]=useState<Config>(DEFAULT_CONFIG),[sql,setSql]=useState(DEFAULT_SQL),[name,setName]=useState('Caso Aurora · vendas'),[run,setRun]=useState<Run|null>(null),[previous,setPrevious]=useState<Run|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[dirty,setDirty]=useState(false),[selected,setSelected]=useState(0),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[view,setView]=useState<'3d'|'2d'>('3d'),[reset,setReset]=useState(0),[help,setHelp]=useState(false),[reduced,setReduced]=useState(false),[hidden,setHidden]=useState(false);
  const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>>(),runRef=useRef<Run|null>(null),helpRef=useRef<HTMLDialogElement>(null);
  const [projects,setProjects]=useState<Project[]>([]),[activeId,setActiveId]=useState(''),[saveMsg,setSaveMsg]=useState('');
  const [trace,setTrace]=useState<{index:number;steps:TraceStep[]}|null>(null),[traceErr,setTraceErr]=useState('');
  const [firstRun,setFirstRun]=useState(false);
  const [missionId,setMissionId]=useState(MISSIONS[MISSIONS.length-1].id),[missionMsg,setMissionMsg]=useState(''),[claiming,setClaiming]=useState(false),[claimed,setClaimed]=useState<string[]>([]);
  const projectFile=useRef<HTMLInputElement>(null);
  const storeKey=`dataflow-lab:v1:${demo?'demo':userId||'anon'}`;
  const active=projects.find(p=>p.id===activeId)||null;
  // Persistimos a receita, nunca os dados: o CSV do aluno nao sai do navegador.
  const persist=useCallback((list:Project[],current:string)=>{
    setProjects(list);setActiveId(current);
    try{localStorage.setItem(storeKey,JSON.stringify({version:1,activeId:current,projects:list} satisfies ProjectSave));}
    catch{setSaveMsg('O navegador nao permitiu salvar. Use Exportar projetos.');}
  },[storeKey]);

  const execute=useCallback((input:typeof data,c:Config,query:string,label:string)=>{
    worker.current?.terminate();clearTimeout(timer.current);setBusy(true);setError('');setPlaying(false);
    try {
      const stages=pipeline(input.orders,input.customers,c);const w=new Worker('/dataflow-worker.js');worker.current=w;
      const finish=()=>{w.terminate();if(worker.current===w)worker.current=null;clearTimeout(timer.current);setBusy(false);};
      timer.current=setTimeout(()=>{finish();setError('A consulta excedeu 8 segundos. Simplifique o SQL ou reduza os dados.');},8000);
      w.onerror=()=>{finish();setError('Não foi possível iniciar o SQL local. Recarregue a página e tente novamente.');};
      w.onmessage=({data:result}:{data:{error?:string;table:Table;truncated:boolean}})=>{finish();if(result.error){setError(result.error);return;}const next:Run={sources:input,stages:[...stages,{title:'SQL',table:result.table,note:result.truncated?'Resultado limitado a 1.000 linhas, inclusive na exportação. Refine a consulta.':'Consulta executada sobre a tabela fluxo após a junção.'}],config:{...c},sql:query,truncated:result.truncated,name:label,at:new Date().toLocaleTimeString('pt-BR')};setPrevious(runRef.current);runRef.current=next;setRun(next);setDirty(false);setTime(0);setSelected(0);};
      w.postMessage({tables:{pedidos:input.orders,clientes:stages[1].table,fluxo:stages[3].table},sql:query});
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível executar.');setBusy(false);}
  },[]);
  useEffect(()=>{execute(sample(),DEFAULT_CONFIG,DEFAULT_SQL,'Caso Aurora · vendas');return()=>{worker.current?.terminate();clearTimeout(timer.current);};},[execute]);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);const visibility=()=>{setHidden(document.hidden);if(document.hidden)setPlaying(false);};update();media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[]);
  useEffect(()=>{if(!playing)return;const id=setInterval(()=>setTime(t=>{const next=Math.min(100,t+speed);if(next===100)setPlaying(false);setSelected(Math.min(4,Math.floor(next/25)));return next;}),120);return()=>clearInterval(id);},[playing,speed]);
  useEffect(()=>{if(help)helpRef.current?.showModal();else helpRef.current?.close();},[help]);
  // Carrega os projetos salvos. Se o arquivo estiver corrompido nao sobrescrevemos.
  useEffect(()=>{
    let raw:string|null=null;
    try{raw=localStorage.getItem(storeKey);}catch{return;}
    if(raw){
      try{const save=readSave(raw);setProjects(save.projects);setActiveId(save.activeId);
        const p=save.projects.find(x=>x.id===save.activeId);
        if(p){setConfig({...p.config});setSql(p.sql);setName(p.name);setDirty(true);}
      }catch{setSaveMsg('Nao consegui ler os projetos salvos. Eles nao serao sobrescritos ate voce salvar um novo.');}
      return;
    }
    const first=newProject('Caso Aurora · vendas',DEFAULT_CONFIG,DEFAULT_SQL);
    persist([first],first.id);
  },[storeKey,persist]);

  // Toda execucao bem sucedida grava a receita do projeto ativo.
  useEffect(()=>{
    if(!run||!activeId)return;
    persist(projects.map(p=>p.id===activeId?{...p,config:{...run.config},sql:run.sql,updatedAt:new Date().toISOString()}:p),activeId);
    setSaveMsg(`Receita salva as ${new Date().toLocaleTimeString('pt-BR')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[run]);

  // Primeiro acesso: um guia curto, dispensavel, que nao cobre a cena 3D.
  useEffect(()=>{
    try{if(!localStorage.getItem(`${storeKey}:intro`))setFirstRun(true);}catch{}
  },[storeKey]);
  function dismissIntro(){setFirstRun(false);try{localStorage.setItem(`${storeKey}:intro`,'lido');}catch{}}

  function pickRow(index:number){
    setTraceErr('');
    if(!run){setTraceErr('Execute o fluxo antes de rastrear.');return;}
    if(trace?.index===index){setTrace(null);return;}
    try{setTrace({index,steps:traceOrder(run.sources.orders,run.sources.customers,run.config,index)});}
    catch(e){setTrace(null);setTraceErr(e instanceof Error?e.message:'Nao consegui rastrear esta linha.');}
  }
  useEffect(()=>{setTrace(null);setTraceErr('');},[run]);

  function openProject(id:string){
    const p=projects.find(x=>x.id===id);if(!p)return;
    setActiveId(id);setConfig({...p.config});setSql(p.sql);setName(p.name);setDirty(true);setError('');
    setSaveMsg('Receita aplicada. Os dados nao sao salvos: importe seu CSV ou use o caso de exemplo.');
    persist(projects,id);
  }
  function createProject(){
    if(projects.length>=MAX_PROJECTS){setSaveMsg(`Limite de ${MAX_PROJECTS} projetos. Exclua um antes de criar outro.`);return;}
    const p=newProject(`Fluxo ${projects.length+1}`,config,sql);
    persist([...projects,p],p.id);setName(p.name);setSaveMsg('Projeto criado.');
  }
  function renameProject(value:string){
    if(!active)return;const nome=value.slice(0,80);setName(nome);
    persist(projects.map(p=>p.id===active.id?{...p,name:nome.trim()||p.name,updatedAt:new Date().toISOString()}:p),active.id);
  }
  function removeProject(){
    if(!active||projects.length<2){setSaveMsg('Mantenha ao menos um projeto.');return;}
    const rest=projects.filter(p=>p.id!==active.id);persist(rest,rest[0].id);
    setConfig({...rest[0].config});setSql(rest[0].sql);setName(rest[0].name);setDirty(true);setSaveMsg('Projeto excluido.');
  }
  async function importProjects(file:File|undefined){
    if(!file)return;
    try{
      if(file.size>200000)throw new Error('Arquivo muito grande. O limite e 200 KB.');
      const save=readSave(await file.text());
      persist(save.projects,save.activeId);
      const p=save.projects.find(x=>x.id===save.activeId)!;
      setConfig({...p.config});setSql(p.sql);setName(p.name);setDirty(true);setSaveMsg('Projetos importados.');
    }catch(e){setSaveMsg(e instanceof Error?e.message:'Arquivo de projetos invalido.');}
  }

  const change=(patch:Partial<Config>)=>{setConfig(c=>({...c,...patch}));setDirty(true);};
  const select=(i:number)=>{setSelected(i);setTime(i*25);setPlaying(false);};
  async function importFile(file:File|undefined,target:'orders'|'customers') {
    if(!file)return;setError('');try {if(file.size>1024*1024)throw new Error('Use um CSV de até 1 MB.');const table=parseCSV(await file.text());setData(d=>({...d,[target]:table}));setName('Arquivos próprios');setDirty(true);if(target==='orders'){change({leftKey:table.columns[0],filterKey:table.columns[0],filter:false});setSql('SELECT * FROM fluxo LIMIT 100');}else change({rightKey:table.columns[0],dedupKey:table.columns[0],dedup:false});}catch(e){setError(e instanceof Error?e.message:'Arquivo inválido.');}
  }
  const stages=run?.stages,stage=stages?.[selected];const before=stages?(selected===1?run!.sources.customers:selected===2?stages[0].table:selected>0?stages[selected-1].table: null):null;
  const counts=stages?.map(v=>v.table.rows.length)||[];
  const q=useMemo(()=>quality(data.customers),[data.customers]);
  const mission=MISSIONS.find(m=>m.id===missionId)!;
  // So conta como cumprida sobre o caso de exemplo, que e o que o servidor consegue refazer.
  const onSample=run?.name==='Caso Aurora · vendas';
  const missionDone=!!(run&&onSample&&mission.check(run.stages,run.config));
  const alreadyClaimed=claimed.includes(mission.id);
  async function claim(){
    if(!run||!missionDone||claiming)return;
    setClaiming(true);setMissionMsg('');
    const res=await completeMission(mission.id,run.config);
    setClaiming(false);
    if(!res.ok){setMissionMsg(res.error);return;}
    setClaimed(c=>[...c,mission.id]);setMissionMsg('Evidência registrada no seu Knowledge Universe.');
  }
  return <main className={s.app}>
    <header className={s.header}><Link href="/conta/ferramentas" className={s.back} aria-label="Voltar às ferramentas"><ArrowLeft size={18}/></Link><Image src="/drivedata-symbol.png" width={38} height={38} alt="DriveData Academy"/><div className={s.brand}>DataFlow <b>Lab</b><small>LABORATÓRIO DE DADOS · 4D</small></div><div className={s.headerRight}><span className={s.badge}>{demo?'DEMONSTRAÇÃO':'LABORATÓRIO'}</span><button aria-label="Como funciona" onClick={()=>setHelp(true)}><HelpCircle size={16}/><span>Como funciona</span></button></div></header>
    <div className={s.intro}><div><p className={s.eyebrow}>CONSTRUA. EXECUTE. INVESTIGUE.</p><h1>Veja seus dados <span>em movimento.</span></h1><p>Explore cada transformação. Descubra onde o resultado muda.</p></div><button className={s.primary} disabled={busy} onClick={()=>execute(data,config,sql,name)}><Play size={17}/>{busy?'Processando…':'Executar fluxo'}</button></div>
    {firstRun&&<section className={s.firstRun}><div><p className={s.eyebrow}>PRIMEIROS PASSOS</p><h2>Bem-vindo ao laboratório</h2><p>Você começa com o caso Aurora carregado: 24 pedidos e uma tabela de clientes com um problema escondido.</p><ol><li>Clique em <b>Executar fluxo</b> e veja as contagens de cada estação.</li><li>Abra a estação <b>Fontes</b> e clique em um pedido para seguir o caminho dele.</li><li>Resolva a missão mexendo na limpeza e no filtro, à esquerda.</li></ol></div><div className={s.firstRunActions}><button className={s.primary} onClick={dismissIntro}>Começar</button><button onClick={()=>{setHelp(true);}}>Ler o manual</button></div></section>}{error&&<div role="alert" className={s.error}>{error} {run&&'A execução anterior continua disponível abaixo.'}</div>}
    <div className={s.workspace}>
      <aside className={s.sidebar}><div className={s.sideTitle}><Layers size={17}/><h2>Seu pipeline</h2><span>01—05</span></div>
        <section className={s.configSection}><h3><FolderOpen size={16}/>Meus projetos</h3>
          <p className={s.hint}>Guardamos a receita do fluxo, nunca os seus dados. Ao abrir um projeto, reimporte o CSV ou carregue o caso de exemplo.</p>
          <label className={s.field}>Projeto aberto<select value={activeId} onChange={e=>openProject(e.target.value)} disabled={busy||!projects.length}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className={s.field}>Nome<input value={name} maxLength={80} onChange={e=>renameProject(e.target.value)} disabled={busy||!active}/></label>
          {active&&<p className={s.hint}>{recipeSummary(active)}</p>}
          <div className={s.fields}>
            <button type="button" onClick={createProject} disabled={busy}><Plus size={14}/>Novo</button>
            <button type="button" onClick={removeProject} disabled={busy||projects.length<2}><Trash2 size={14}/>Excluir</button>
          </div>
          <div className={s.fields}>
            <button type="button" onClick={()=>download('projetos-dataflow.json',JSON.stringify({version:1,activeId,projects},null,2),'application/json')} disabled={!projects.length}><Save size={14}/>Exportar</button>
            <button type="button" onClick={()=>projectFile.current?.click()} disabled={busy}><Upload size={14}/>Importar</button>
          </div>
          <input ref={projectFile} type="file" accept="application/json,.json" hidden aria-label="Importar projetos" onChange={e=>{void importProjects(e.target.files?.[0]);e.target.value='';}}/>
          {saveMsg&&<p className={s.hint} role="status">{saveMsg}</p>}
          <p className={s.hint}>Ate {MAX_PROJECTS} projetos ficam neste navegador, separados por conta. Limpar os dados do navegador remove o salvamento local.</p>
        </section>
        <fieldset disabled={busy}><section className={s.configSection}><h3><Database size={16}/>01 · Fontes de dados</h3><p className={s.hint}>CSV até 1 MB · 5.000 linhas · 40 colunas. Processado neste navegador.</p>{(['orders','customers'] as const).map((target,i)=><label className={s.upload} key={target}><span><strong>{i===0?'Pedidos':'Clientes'}</strong><small>{data[target].rows.length} linhas · {data[target].columns.length} colunas</small></span><Upload size={16}/><input type="file" accept=".csv,text/csv" aria-label={`Importar CSV de ${i===0?'pedidos':'clientes'}`} onChange={e=>{void importFile(e.target.files?.[0],target);e.target.value='';}}/></label>)}<p className={s.hint}>Clientes: {q.duplicates} linhas idênticas repetidas · {q.empty} células vazias.</p></section>
        <section className={s.configSection}><h3>02 · Limpeza de clientes</h3><label className={s.toggle}><input type="checkbox" checked={config.dedup} onChange={e=>change({dedup:e.target.checked})}/>Remover repetições pela chave</label><label className={s.field}>Chave única<select value={config.dedupKey} onChange={e=>change({dedupKey:e.target.value})}>{data.customers.columns.map(c=><option key={c}>{c}</option>)}</select></label></section>
        <section className={s.configSection}><h3>03 · Filtro de pedidos</h3><label className={s.toggle}><input type="checkbox" checked={config.filter} onChange={e=>change({filter:e.target.checked})}/>Manter somente registros iguais a</label><div className={s.fields}><select aria-label="Coluna do filtro" value={config.filterKey} onChange={e=>change({filterKey:e.target.value})}>{data.orders.columns.map(c=><option key={c}>{c}</option>)}</select><input aria-label="Valor do filtro" value={config.filterValue} onChange={e=>change({filterValue:e.target.value})}/></div></section>
        <section className={s.configSection}><h3><GitMerge size={16}/>04 · Junção</h3><label className={s.toggle}><input type="checkbox" checked={config.join} onChange={e=>change({join:e.target.checked})}/>Conectar pedidos aos clientes</label><div className={s.fields}><label className={s.field}>Pedidos<select value={config.leftKey} onChange={e=>change({leftKey:e.target.value})}>{data.orders.columns.map(c=><option key={c}>{c}</option>)}</select></label><label className={s.field}>Clientes<select value={config.rightKey} onChange={e=>change({rightKey:e.target.value})}>{data.customers.columns.map(c=><option key={c}>{c}</option>)}</select></label></div><p className={s.hint}>LEFT JOIN · preserva todos os pedidos. Tipos das chaves devem coincidir.</p></section></fieldset>
        <div className={s.mission}><span className={s.eyebrow}>MISSÕES</span><label className={s.field}>Desafio<select value={missionId} onChange={e=>{setMissionId(e.target.value);setMissionMsg('');}} disabled={busy}>{MISSIONS.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><p>{mission.brief}</p>{missionDone?<strong><CheckCircle2 size={16}/> {mission.done}</strong>:<small>Dica: {mission.hint}</small>}{!onSample&&<small>As missões valem sobre o caso de exemplo. Carregue-o para registrar.</small>}{missionDone&&onSample&&(alreadyClaimed?<small>Evidência já registrada.</small>:<button type="button" disabled={claiming} onClick={()=>void claim()}>{claiming?'Registrando…':'Registrar no meu universo'}</button>)}{missionMsg&&<small role="status">{missionMsg}</small>}<button disabled={busy} onClick={()=>{const fresh=sample();setData(fresh);setConfig({...DEFAULT_CONFIG});setSql(DEFAULT_SQL);setName('Caso Aurora · vendas');setDirty(true);setError('');}}>Carregar caso de exemplo</button></div>
      </aside>
      <div className={s.mainColumn}><section className={s.scenePanel}><div className={s.sceneToolbar}><div><span className={s.dot}/><strong>{run?.name||name}</strong><small>{busy?'Executando':dirty?'Alterações ainda não executadas':run?`Execução às ${run.at}`:'Preparando'}</small></div><div className={s.segment}><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D</button><button aria-pressed={view==='2d'} onClick={()=>setView('2d')}>2D</button><button aria-label="Restaurar câmera" onClick={()=>setReset(r=>r+1)}><RotateCcw size={15}/></button></div></div>
        <div className={s.scene}>{view==='3d'?<SceneBoundary><Scene counts={counts} selected={selected} onSelect={select} time={time} reset={reset} reduced={reduced||hidden}/></SceneBoundary>:<div className={s.flatFlow}>{titles.map((t,i)=><button key={t} onClick={()=>select(i)} aria-pressed={selected===i}><span>0{i+1}</span><Database size={28}/><b>{t}</b><small>{counts[i]??'—'} linhas</small></button>)}</div>}<div className={s.sceneCaption}>{view==='3d'?'Arraste para girar · role para aproximar · clique nas estações':'Selecione uma estação para inspecionar'}<br/>Partículas ilustrativas · contagens reais por etapa</div></div>
        <div className={s.steps}>{titles.map((t,i)=><button key={t} aria-pressed={selected===i} onClick={()=>select(i)}><small>0{i+1}</small>{t}<b>{counts[i]??'—'}</b></button>)}</div>
        <div className={s.timeline}><button disabled={!run||busy} aria-label={playing?'Pausar reprodução':'Reproduzir execução'} onClick={()=>{if(time===100)setTime(0);setPlaying(p=>!p);}}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><div><label htmlFor="flow-time">REPRODUÇÃO DA EXECUÇÃO <span>{Math.round(time)}%</span></label><input id="flow-time" type="range" min={0} max={100} value={time} onChange={e=>{const v=Number(e.target.value);setTime(v);setSelected(Math.min(4,Math.floor(v/25)));setPlaying(false);}}/></div><select aria-label="Velocidade de reprodução" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option><option value={2}>2×</option></select></div>
      </section>
      <section className={s.inspector}><div className={s.inspectorTitle}><div><p className={s.eyebrow}>INSPEÇÃO / {selected+1} DE 5</p><h2>{stage?.title||'Carregando dados'}</h2></div>{stage&&<button onClick={()=>download(`dataflow-${stage.title.toLowerCase()}.csv`,toCSV(stage.table),'text/csv;charset=utf-8')}><Download size={15}/>CSV da etapa</button>}</div><p className={s.note}>{stage?.note}</p>{stage&&<>{selected===1?<p className={s.hint}>Entrada: {stages?.[0].note} A limpeza atua somente na tabela de clientes.</p>:null}{before&&<details><summary>Ver entrada desta etapa ({before.rows.length} linhas)</summary><DataTable table={before} label="Antes da transformação"/></details>}<DataTable table={stage.table} label={selected===0?'Pedidos de origem':'Saída da etapa'} onPick={selected===0?pickRow:undefined} picked={selected===0?trace?.index??null:null}/>{selected===0&&<p className={s.hint}>Clique em um pedido para seguir o caminho dele pelas etapas.</p>}{traceErr&&<p className={s.hint} role="alert">{traceErr}</p>}{trace&&<section className={s.trace}><div className={s.traceHead}><p className={s.eyebrow}>TRAJETÓRIA DO PEDIDO {trace.index+1}</p><button onClick={()=>setTrace(null)}>fechar</button></div>{trace.steps.map(step=><div key={step.stage} className={s.traceStep} data-status={step.status}><b>{step.stage}</b><span>{step.status==='removed'?'removido':step.status==='multiplied'?`${step.count} linhas`:step.status==='ok'?`${step.count} linha`:'contexto'}</span><p>{step.note}</p></div>)}</section>}{selected===4&&<Chart table={stage.table}/>}</>}
      </section></div>
      <aside className={s.sqlPanel}><h2><Braces size={19}/>SQL Workbench</h2><p className={s.hint}>SQLite · consultas SELECT e WITH. A tabela <code>fluxo</code> recebe a saída da junção.</p><label htmlFor="flow-sql" className={s.eyebrow}>CONSULTA DO RESULTADO</label><textarea id="flow-sql" value={sql} disabled={busy} spellCheck={false} onChange={e=>{setSql(e.target.value);setDirty(true);}}/><button className={s.primary} disabled={busy} onClick={()=>execute(data,config,sql,name)}><Play size={15}/>{busy?'Executando…':'Executar fluxo + SQL'}</button><button onClick={()=>download('consulta-dataflow.sql',sql)}>Baixar SQL</button><div className={s.schema}><h3>Tabelas disponíveis</h3>{[{label:'pedidos',table:data.orders},{label:'clientes',table:data.customers},{label:'fluxo',table:stages?.[3].table}].map(({label,table})=><details key={label} open={label==='fluxo'}><summary><Database size={13}/>{label}</summary><p>{table?.columns.join(' · ')||'Execute o fluxo para ver as colunas.'}</p></details>)}<p className={s.hint}>clientes = após limpeza · pedidos = fonte original. O esquema de fluxo corresponde à última execução.</p></div>
      <section className={s.compare}><p className={s.eyebrow}>ANTES × AGORA</p><h3>Compare as execuções</h3>{previous&&run?<><p>{previous.at} → {run.at}</p><div><span>Linhas na junção</span><b>{previous.stages[3].table.rows.length} → {run.stages[3].table.rows.length}</b></div><div><span>Linhas no SQL</span><b>{previous.stages[4].table.rows.length} → {run.stages[4].table.rows.length}</b></div><details><summary>Ver SQL e resultado anteriores</summary><pre>{previous.sql}</pre><DataTable table={previous.stages[4].table} label={`${previous.name} · ${previous.at}`}/></details></>:<p>Execute uma mudança para comparar com o resultado anterior.</p>}</section><p className={s.hint}>A receita do fluxo fica salva no seu projeto; os dados, não. Baixe os resultados antes de sair. Nenhum arquivo é enviado ao servidor. Exportação CSV neutraliza fórmulas de planilha.</p></aside>
    </div>
    <dialog ref={helpRef} className={s.help} onCancel={()=>setHelp(false)} onClose={()=>setHelp(false)}><h2>Manual do laboratório</h2><p>Cada estação é uma transformação real dos seus dados. A linha do tempo reproduz uma execução já concluída para você investigar etapa por etapa; ela não mede o tempo de processamento.</p><h3>O básico</h3><ol><li>Comece pelo caso Aurora ou importe seus CSVs de pedidos e clientes.</li><li>Escolha as chaves, ative a limpeza e configure o filtro na coluna da esquerda.</li><li>Escreva SQL sobre a tabela <code>fluxo</code> e clique em Executar.</li><li>Clique nas estações, no 3D ou na lista, para inspecionar a tabela de cada etapa.</li><li>Compare com a execução anterior e baixe o CSV de qualquer etapa.</li></ol><h3>Rastrear um pedido</h3><p>Na estação <b>Fontes</b>, clique em qualquer linha da tabela. O laboratório mostra o que aconteceu com aquele pedido em cada etapa: se passou no filtro, se sumiu, ou se a junção o transformou em várias linhas. É a forma mais rápida de enxergar um faturamento inflado.</p><h3>Missões</h3><p>As missões são problemas para resolver mexendo na configuração. Elas valem sobre o caso de exemplo, porque aí o servidor consegue refazer o mesmo fluxo e conferir sozinho. Cumprida a missão, você registra a evidência no seu Knowledge Universe.</p><h3>Projetos</h3><p>Guardamos a <b>receita</b> do seu fluxo: as etapas configuradas e o SQL. Os dados não são salvos, porque nenhum arquivo seu sai deste navegador. Ao reabrir um projeto, reimporte o CSV ou carregue o caso de exemplo. Use Exportar para levar seus projetos a outro computador.</p><h3>Detalhes que evitam surpresa</h3><p>A limpeza mantém o primeiro cliente de cada chave. O CSV aceita vírgula ou ponto e vírgula, e decimais usam ponto. Valores como 001 continuam texto, para não perder o zero à esquerda.</p><p>Limites: 5.000 linhas por fonte, 10.000 na junção e 1.000 no resultado SQL. Consultas têm 8 segundos. O SQL roda dentro do seu navegador, em modo somente leitura.</p><button className={s.primary} onClick={()=>setHelp(false)}>Voltar ao laboratório</button></dialog>
  </main>;
}
