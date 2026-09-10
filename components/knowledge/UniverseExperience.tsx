'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { ArrowLeft, ArrowUpRight, Orbit, Search, Play, Pause, RotateCcw, Plus, Minus, X, ChevronRight, Sparkles, Route, Target, Trophy, Network, List, SlidersHorizontal, Clock3, Check, LockKeyhole, Info, CheckCircle2 } from 'lucide-react';
import { DEMO_CATALOG, DEMO_EVENTS, DEMO_START, DEMO_END, DEMO_CHALLENGE, demoChallengeEvidence } from '@/lib/knowledge/demo';
import { achievements, DAY, LABELS, universe, WEIGHTS } from '@/lib/knowledge/engine';
import type { Dimension, Evidence, Requirement, UniverseData } from '@/lib/knowledge/types';
import styles from './universe.module.css';
import UniverseGuide from './UniverseGuide';

const UniverseCanvas = dynamic(() => import('./UniverseCanvas'), { ssr: false, loading: () => <div className={styles.loading}><Orbit size={32} /><span>Organizando as constelações…</span></div> });
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const flatten = (rule: Requirement): { competency: string; minimum: number }[] => 'competency' in rule ? [rule] : ('all' in rule ? rule.all : rule.any).flatMap(flatten);
type Tab = 'explorar' | 'conexoes' | 'caminhos' | 'desafios' | 'conquistas';
const tabs = [{ id: 'explorar', label: 'Explorar', icon: Orbit }, { id: 'conexoes', label: 'Próximas conexões', icon: Network }, { id: 'caminhos', label: 'Caminhos', icon: Route }, { id: 'desafios', label: 'Desafios', icon: Target }, { id: 'conquistas', label: 'Conquistas', icon: Trophy }] as const;

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export default function UniverseExperience({data}:{data?:UniverseData}) {
  const isDemo=!data||data.mode==='demo';
  const start=data?.start??DEMO_START,end=data?.end??DEMO_END;
  const lastDay=Math.max(1,Math.ceil((Date.parse(end)-Date.parse(start))/DAY));
  const stamp=(day:number)=>new Date(Math.min(Date.parse(end),Date.parse(start)+day*DAY)).toISOString();
  const [tab, setTab] = useState<Tab>('explorar');
  const [selected, setSelected] = useState<string | null>(null);
  const [area, setArea] = useState('all'); const [search, setSearch] = useState('');
  const [opportunities, setOpportunities] = useState(true);
  const [day, setDay] = useState(lastDay); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<'3d' | 'list'>('3d'); const [reduced, setReduced] = useState(false);
  const [reset, setReset] = useState(0); const [zoom, setZoom] = useState(0); const [help, setHelp] = useState(false);
  const [showIntroduction, setShowIntroduction] = useState(true);
  const introductionKey = `knowledge-universe-introduction-v1:${isDemo?'demo':'live'}`;
  const dismissIntroduction = () => {
    setShowIntroduction(false);
    try { localStorage.setItem(introductionKey, 'read'); } catch { /* Keep exploring when browser storage is unavailable. */ }
  };
  const [filters, setFilters] = useState(false); const [answer, setAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null); const [extra, setExtra] = useState<Evidence[]>([]);
  const helpRef = useRef<HTMLElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const previousDay = useRef(day);
  const asOf = stamp(day); const events = useMemo(() => [...(data?.events??DEMO_EVENTS), ...(isDemo?extra:[])], [data,extra,isDemo]);
  const catalog=data?.history?.filter(v=>v.at<=asOf).at(-1)?.catalog??data?.history?.[0]?.catalog??data?.catalog??DEMO_CATALOG;
  const weights=catalog.weights??WEIGHTS;
  const scores = useMemo(() => universe(catalog, events, asOf), [catalog, events, asOf]);
  const allAchievements = useMemo(() => achievements(data?.catalog??DEMO_CATALOG, events, end,data?.history), [events,end,data]);
  const earned = allAchievements.filter(a => a.at <= asOf);
  const term = search.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const visible = catalog.competencies.filter(c => (area === 'all' || c.area === area) && (opportunities || scores[c.id].score > 0) && c.name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
  const learned = Object.values(scores).filter(s => s.score > 0); const advanced = learned.filter(s => s.raw >= 80);
  const comp = catalog.competencies.find(c => c.id === selected); const score = comp ? scores[comp.id] : null;
  const color = catalog.areas.find(a => a.id === comp?.area)?.color ?? '#56e7cf';
  const qualified = score?.evidence.filter(e => e.dimension === 'assessment') ?? [];
  const best = qualified.length ? Math.max(...qualified.map(e => e.assessmentScore??e.units * e.quality)) : null;
  const courses = [...new Set(score?.evidence.map(e => e.course).filter(Boolean))];
  const completed = new Set(score?.evidence.filter(e => e.completed).map(e => e.course));
  const relatedTraining=(data?.training??[]).filter(c=>c.competencies.includes(comp?.id??''));
  useEffect(() => {
    try { setShowIntroduction(localStorage.getItem(introductionKey) !== 'read'); } catch { setShowIntroduction(true); }
  }, [introductionKey]);
  useEffect(() => {
    const previous = previousDay.current; previousDay.current = day;
    if (!playing || day <= previous) return;
    const reached = allAchievements.find(a => a.at > stamp(previous) && a.at <= asOf);
    if (reached) setMilestone(reached.label);
  }, [day, asOf, playing, allAchievements]);
  useEffect(() => { if (!milestone) return; const timer = window.setTimeout(() => setMilestone(null), 2600); return () => window.clearTimeout(timer); }, [milestone]);
  useEffect(() => {
    if (!help) return;
    setPlaying(false);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = helpRef.current;
    const close = dialog?.querySelector<HTMLButtonElement>('button'); close?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      document.body.style.overflow = previousOverflow;
      (previousFocus?.isConnected ? previousFocus : helpButtonRef.current)?.focus();
    };
  }, [help]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(mq.matches);
    update(); mq.addEventListener('change', update); return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setDay(d => Math.min(lastDay, d + speed)), 90);
    return () => window.clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => { if (day === lastDay) setPlaying(false); }, [day]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelected(null); setHelp(false); setFilters(false); } };
    const visibility = () => { if (document.hidden) setPlaying(false); };
    window.addEventListener('keydown', key); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const select = (id: string) => { setSelected(id); setTab('explorar'); setArea('all'); setSearch(''); setOpportunities(true); };
  const togglePlay = () => { if (day === lastDay) setDay(0); setPlaying(p => !p); };
  const submit = () => {
    if(!isDemo)return;
    if (answer === null) return;
    if (answer === DEMO_CHALLENGE.correct) { setFeedback('correct'); setExtra([demoChallengeEvidence()]); setDay(lastDay); setPlaying(false); }
    else setFeedback('wrong');
  };
  const list = <div className={styles.listGrid}>{visible.length ? visible.map(c => <button key={c.id} className={styles.listNode} onClick={() => select(c.id)} style={{ '--area': catalog.areas.find(a => a.id === c.area)!.color } as CSSProperties}>
    <span className={styles.listOrb} /><span><strong>{c.name}</strong><small>{scores[c.id].level}</small></span><b>{scores[c.id].score}<small>/100</small></b><ChevronRight size={16} />
  </button>) : <p className={styles.empty}>Nenhuma competência corresponde aos filtros. <button onClick={() => { setSearch(''); setArea('all'); setOpportunities(true); }}>Limpar filtros</button></p>}</div>;

  return <div className={styles.app}>
    <header className={styles.header}>
      <Link href="/conta/ferramentas" className={styles.brand} aria-label="DriveData Academy — voltar às ferramentas"><Image className={styles.brandLogo} src="/drivedata-symbol.png" alt="" width={40} height={40} priority/><span>DriveData<span className={styles.academy}>ACADEMY</span></span></Link>
      <span className={styles.headerDivider} /><span className={styles.productName}>Knowledge Universe <b>4D</b></span>
      <div className={styles.headerRight}><span className={styles.demoBadge}><i /> {isDemo?'DEMONSTRAÇÃO':'MEU CONHECIMENTO'}</span><button ref={helpButtonRef} className={styles.helpButton} onClick={() => setHelp(true)} aria-haspopup="dialog"><Info size={17} />Como funciona</button><span className={styles.avatar}>DD</span></div>
    </header>
    <div className={styles.workspace}>
      <aside className={`${styles.sidebar} ${filters ? styles.sidebarOpen : ''}`}>
        <p className={styles.eyebrow}>SEU ESPAÇO DE DESCOBERTA</p>
        <nav aria-label="Modos do universo">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`${styles.navButton} ${tab === id ? styles.navActive : ''}`} onClick={() => { setTab(id); setFilters(false); setSelected(null); }}><Icon size={18} /><span>{label}</span>{id === 'conquistas' && <em>{earned.length}</em>}</button>)}</nav>
        <div className={styles.sidebarRule} />
        <p className={styles.eyebrow}>CONSTELAÇÕES</p>
        <button className={`${styles.areaButton} ${area === 'all' ? styles.areaActive : ''}`} onClick={() => { setArea('all'); setSelected(null); setTab('explorar'); }}><span className={styles.allDot} />Todas as áreas<span>{catalog.competencies.length}</span></button>
        {catalog.areas.map(a => <button key={a.id} className={`${styles.areaButton} ${area === a.id ? styles.areaActive : ''}`} onClick={() => { setArea(a.id); setSelected(null); setTab('explorar'); }}><i style={{ background: a.color }} />{a.name}<span>{catalog.competencies.filter(c => c.area === a.id).length}</span></button>)}
        <label className={styles.check}><input type="checkbox" checked={opportunities} onChange={e => setOpportunities(e.target.checked)} />Mostrar oportunidades</label>
        <div className={styles.sidebarBottom}><span className={styles.smallOrbit}><Sparkles size={20} /></span><strong>Seu próximo passo começa<br />com uma conexão.</strong><p>Explore o que você já desenvolveu e descubra novos caminhos.</p><Link href="/cursos">Conhecer treinamentos <ArrowUpRight size={15} /></Link>{!isDemo && <Link href="/conta/diagnostico">Diagnóstico de entrada <ArrowUpRight size={15} /></Link>}</div>
        <Link className={styles.back} href="/conta"><ArrowLeft size={14} /> Voltar ao portal</Link>
      </aside>
      <main className={styles.main}>
        <div className={styles.titleBar}><div><p className={styles.eyebrow}>APRENDIZADO EM MOVIMENTO</p><h1>Seu universo de conhecimento<span>.</span></h1><p className={styles.subtitle}>Veja as competências que você desenvolveu, como se conectam e o que aprender a seguir.</p></div><button className={`${styles.iconButton} ${styles.mobileFilter}`} onClick={() => setFilters(v => !v)} aria-label="Abrir navegação e filtros"><SlidersHorizontal size={20} /></button></div>
        {showIntroduction && <section className={styles.introduction} aria-labelledby="universe-introduction-title"><div><p className={styles.eyebrow}>CONHEÇA SEU MAPA</p><h2 id="universe-introduction-title">Suas atividades viram evidências de conhecimento.</h2><p>Cada estrela com nome representa uma competência. Explore seu domínio registrado e use a linha do tempo para acompanhar sua evolução — essa é a quarta dimensão.</p><button className={styles.introductionLink} onClick={() => setHelp(true)} aria-haspopup="dialog">Entender meu score e começar <ArrowUpRight size={15}/></button></div><button className={styles.closeIntroduction} onClick={dismissIntroduction} aria-label="Dispensar apresentação; a explicação continua disponível em Como funciona"><X size={18}/></button></section>}
        <div className={styles.stats}><div><strong>{learned.length.toString().padStart(2,'0')}</strong><span>competências em evolução</span></div><div><strong>{advanced.length.toString().padStart(2,'0')}</strong><span>em nível avançado</span></div><div><strong>{catalog.areas.filter(a => learned.some(s => catalog.competencies.find(c => c.id === s.id)?.area === a.id)).length.toString().padStart(2,'0')}</strong><span>áreas exploradas</span></div><span className={styles.dateBadge}><Clock3 size={13} />{date(asOf)}</span></div>
        <div className={styles.surface}>
          {milestone && <div className={styles.milestone} role="status"><Trophy size={20} /><span><small>{isDemo?'MARCO DA EVOLUÇÃO DEMONSTRATIVA':'MARCO DO SEU APRENDIZADO'}</small><strong>{milestone}</strong></span><button aria-label="Fechar marco" onClick={() => setMilestone(null)}><X size={14} /></button></div>}
          {tab === 'explorar' && <>
            {!isDemo&&!events.length&&<div className={styles.milestone}><Sparkles size={20}/><span><small>O COMEÇO DA SUA JORNADA</small><strong>Suas primeiras evidências farão este universo crescer.</strong></span></div>}
            <div className={styles.toolbar}><label className={styles.search}><Search size={16} /><input placeholder="Encontrar uma competência…" aria-label="Buscar competência" value={search} onChange={e => { setSearch(e.target.value); setArea('all'); setOpportunities(true); setSelected(null); }} />{search && <button onClick={() => setSearch('')} aria-label="Limpar busca"><X size={14} /></button>}</label><div className={styles.segmented}><button aria-pressed={view === '3d'} onClick={() => setView('3d')}><Orbit size={14} />Universo 3D</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={15} />Lista</button></div></div>
            <div className={`${styles.scene} ${selected ? styles.sceneSelected : ''}`}>
              {view === '3d' ? <SceneBoundary fallback={<div className={styles.fallback}><p>O modo 3D não está disponível neste dispositivo. Explore todas as competências pela lista.</p>{list}</div>}><UniverseCanvas catalog={catalog} scores={scores} visible={visible.map(c => c.id)} selected={selected} onSelect={select} onArea={id => { setArea(id); setSelected(null); }} reduced={reduced} reset={reset} zoom={zoom} /></SceneBoundary> : list}
              {view === '3d' && visible.length === 0 && <div className={styles.noResults}>Nenhuma competência encontrada. <button onClick={() => { setSearch(''); setArea('all'); setOpportunities(true); }}>Limpar filtros</button></div>}
            </div>
            {!selected && view === '3d' && <div className={styles.sceneCaption}><span className={styles.captionLine} /><span>CONHECIMENTOS QUE SE CONECTAM</span><small>Selecione uma estrela para explorar sua competência.</small></div>}
            <div className={styles.sceneFooter}><span><i />Em desenvolvimento <i className={styles.hollow} />Oportunidade</span><div><button onClick={() => { setReset(n => n+1); setSelected(null); }} aria-label="Centralizar universo" title="Centralizar"><RotateCcw size={16} /></button><button onClick={() => setZoom(n => n-1)} aria-label="Afastar"><Minus size={16} /></button><button onClick={() => setZoom(n => n+1)} aria-label="Aproximar"><Plus size={16} /></button></div></div>
            {comp && score && <aside className={styles.detail} style={{ '--area': color } as CSSProperties} aria-label={`Detalhes de ${comp.name}`}>
              <div className={styles.detailTop}><span>{catalog.areas.find(a => a.id === comp.area)?.name}</span><button className={styles.iconButton} onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X size={17} /></button></div>
              {comp.parent && <button className={styles.breadcrumb} onClick={() => select(comp.parent!)}>{catalog.competencies.find(c => c.id === comp.parent)?.name}<ChevronRight size={12} /></button>}
              <h2>{comp.name}</h2><p className={styles.description}>{comp.description}</p>
              <div className={styles.scoreRow}><strong>{score.score}<small>/100</small></strong><span>{score.level}</span></div><p className={styles.scoreLabel}>DOMÍNIO EVIDENCIADO</p>
              <div className={styles.bar}><span style={{ width: `${score.score}%`, background: color }} /></div>
              <div className={styles.freshness}><span><Clock3 size={13} />Atualidade</span><b>{score.freshness === null ? 'Sem validação' : `${score.freshness}%`}</b></div>
              <dl className={styles.facts}><div><dt>Última atividade</dt><dd>{score.lastActivity ? date(score.lastActivity) : 'Ainda não iniciada'}</dd></div><div><dt>Treinamentos com evidências</dt><dd>{courses.length}</dd></div><div><dt>Concluídos</dt><dd>{completed.size}</dd></div><div><dt>Melhor avaliação</dt><dd>{best === null ? '—' : `${Math.round(best)}%`}</dd></div></dl>
              <details className={styles.breakdown}><summary>Como este score é calculado <Plus size={13} /></summary>{(Object.keys(WEIGHTS) as Dimension[]).map(d => <div key={d}><span>{LABELS[d]}</span><b>{score.parts[d].toFixed(1)} / {weights[d]}</b></div>)}{!score.advanced && <p>O nível avançado exige avaliação e desafio prático avançados aprovados.</p>}</details>
              <div className={styles.nextAction}><span className={styles.eyebrow}>PRÓXIMA OPORTUNIDADE</span><strong>{score.ready && score.score === 0 ? 'Você já pode começar' : score.score >= 80 ? 'Mantenha o conhecimento ativo' : `Aprofunde ${comp.name}`}</strong><p>{score.ready ? 'Os pré-requisitos desta competência foram atendidos.' : 'Explore treinamentos e novas atividades práticas.'}</p><Link href={relatedTraining[0]?`/cursos/${relatedTraining[0].slug}`:'/cursos'}>{relatedTraining[0]?.title??'Ver treinamentos'} <ArrowUpRight size={15} /></Link>{relatedTraining.slice(1).map(t=><Link key={t.id} href={`/cursos/${t.slug}`}>{t.title}<ArrowUpRight size={13}/></Link>)}</div>
              <details className={styles.evidence}><summary>Evidências neste período ({score.evidence.length})</summary>{[...score.evidence].reverse().map(e => <p key={e.id}><span>{date(e.at)}{e.imported?' · Histórico importado':''}</span>{e.label}</p>)}</details>
            </aside>}
          </>}
          {tab === 'conexoes' && <section className={styles.contentView}><p className={styles.eyebrow}>EXPANDA SUAS POSSIBILIDADES</p><h2>Próximas conexões</h2><p>O que você já sabe pode abrir um novo caminho. Os requisitos acompanham a data da timeline.</p><div className={styles.opportunityGrid}>{catalog.unlocks.map(u => { const s = scores[u.target]; const c = catalog.competencies.find(c => c.id === u.target)!; return <article key={u.target} className={styles.opportunity}><span className={s.ready ? styles.ready : styles.waiting}>{s.ready ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}{s.ready ? 'Pronto para começar' : 'Construindo a base'}</span><h3>{c.name}</h3><p>{c.description}</p><div className={styles.bar}><span style={{ width: `${s.readiness*100}%` }} /></div>{flatten(u.rule).map(r => <button key={r.competency} onClick={() => select(r.competency)}><span>{catalog.competencies.find(c => c.id === r.competency)?.name}</span><b>{scores[r.competency].score} / {r.minimum} {scores[r.competency].raw >= r.minimum && <Check size={13} />}</b></button>)}<button className={styles.primary} onClick={() => select(c.id)}>Explorar competência <ArrowUpRight size={15} /></button></article>; })}</div></section>}
          {tab === 'caminhos' && <section className={styles.contentView}><p className={styles.eyebrow}>KNOWLEDGE PATH</p><h2>{isDemo?'Da análise à engenharia de dados':'Seu caminho de aprendizagem'}</h2><p>{isDemo?'Uma trajetória demonstrativa. Cada etapa pede domínio evidenciado de 60/100.':catalog.path.length?'Caminho configurado pela equipe acadêmica. Cada etapa pede domínio evidenciado de 60/100.':'A equipe acadêmica ainda não publicou um caminho para este catálogo.'}</p><div className={styles.path}>{catalog.path.map((id,i) => { const c = catalog.competencies.find(c => c.id === id)!; return <button key={id} onClick={() => select(id)}><span className={scores[id].raw >= 60 ? styles.pathDone : styles.pathNumber}>{scores[id].raw >= 60 ? <Check size={19} /> : `0${i+1}`}</span><div><small>ETAPA {i+1}</small><h3>{c.name}</h3><p>{c.description}</p></div><b>{scores[id].score}<small>/100</small></b><ChevronRight size={20} /></button>; })}</div></section>}
          {tab === 'desafios' && isDemo && <section className={styles.contentView}><p className={styles.eyebrow}>APLIQUE SEU CONHECIMENTO</p><h2>Uma nova evidência para DAX</h2><p>Exercício demonstrativo corrigido por uma regra local. O resultado altera apenas esta demonstração.</p><article className={styles.challenge}><span className={styles.ready}><Target size={14} />DAX · Contexto de filtro</span><h3>{DEMO_CHALLENGE.title}</h3><p>{DEMO_CHALLENGE.question}</p><fieldset disabled={feedback === 'correct'}><legend className={styles.srOnly}>Escolha uma resposta</legend>{DEMO_CHALLENGE.options.map((option,i) => <label key={option} className={answer === i ? styles.answerSelected : ''}><input type="radio" name="challenge" value={i} checked={answer === i} onChange={() => { setAnswer(i); setFeedback(null); }} /><span>{String.fromCharCode(65+i)}</span>{option}</label>)}</fieldset><button className={styles.primary} disabled={answer === null || feedback === 'correct'} onClick={submit}>{feedback === 'correct' ? 'Evidência adicionada à demonstração' : 'Verificar resposta'}<ChevronRight size={16} /></button>{feedback && <div className={feedback === 'correct' ? styles.correct : styles.wrong} role="status"><strong>{feedback === 'correct' ? 'Nova conexão consolidada.' : 'Ainda não. Experimente outra opção.'}</strong><p>{feedback === 'correct' ? DEMO_CHALLENGE.explanation : 'Procure a função que avalia uma expressão após alterar os filtros.'}</p>{feedback === 'correct' && <button onClick={() => select('dax')}>Ver evolução de DAX <ArrowUpRight size={15} /></button>}</div>}</article></section>}
          {tab === 'desafios' && !isDemo && <section className={styles.contentView}><p className={styles.eyebrow}>APRENDIZADO NA PRÁTICA</p><h2>Suas evidências práticas</h2><p>Exercícios, desafios e revisões validados por um instrutor aparecem aqui. Faça as atividades dos seus treinamentos para desenvolver novas competências.</p><div className={styles.achievements}>{events.filter(e=>['exercise','challenge','retention'].includes(e.dimension)&&e.at<=asOf&&(e.effectiveAt??e.at)<=asOf&&(!e.invalidatedAt||e.invalidatedAt>asOf)).map(e=><button key={e.id} onClick={()=>select(e.competency)}><Target size={20}/><div><strong>{e.label}</strong><small>{date(e.at)}</small></div></button>)}</div><Link className={styles.primary} href="/conta/desafios">Fazer uma entrega <ArrowUpRight size={15}/></Link><Link className={styles.secondaryAction} href="/cursos">Ver treinamentos <ArrowUpRight size={15}/></Link></section>}
          {tab === 'conquistas' && <section className={styles.contentView}><p className={styles.eyebrow}>MARCOS DA SUA JORNADA</p><h2>Conhecimento que merece ser celebrado</h2><p>Marcos calculados pelas evidências disponíveis até {date(asOf)}.</p><div className={styles.achievements}>{earned.length ? earned.map(a => <button key={a.id} onClick={() => select(a.competency)}><span><Trophy size={22} /></span><div><strong>{a.label}</strong><small>{date(a.at)}</small></div><ArrowUpRight size={16} /></button>) : <p className={styles.empty}>Os primeiros marcos aparecem quando uma competência alcança 50/100. Avance a timeline para acompanhar.</p>}</div></section>}
        </div>
        <footer className={styles.timeline}>
          <div className={styles.timelineTop}><button className={styles.play} onClick={togglePlay} aria-label={playing ? 'Pausar evolução' : 'Reproduzir minha evolução'}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}<span>{playing ? 'Pausar evolução' : 'Reproduzir minha evolução'}</span></button><button className={styles.speed} onClick={() => setSpeed(s => s === 4 ? 1 : s*2)} aria-label={`Velocidade ${speed} vezes. Alterar velocidade`}>{speed}×</button><span className={styles.timelineLabel}>{isDemo?'12 MESES DE DESCOBERTAS':'SEU HISTÓRICO DE APRENDIZAGEM'}</span><button className={styles.today} onClick={() => { setDay(lastDay); setPlaying(false); }}>Voltar ao presente <ChevronRight size={13} /></button></div>
          <input className={styles.range} aria-label="Data da evolução" aria-valuetext={date(asOf)} type="range" min={0} max={lastDay} value={day} onChange={e => { setDay(Number(e.target.value)); setPlaying(false); }} style={{ '--progress': `${day / lastDay * 100}%` } as CSSProperties} />
          <div className={styles.months}>{[0,1,2,3,4,5,6].map(i=><span key={i}>{new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(stamp(Math.round(lastDay*i/6)))).toLocaleUpperCase('pt-BR')}</span>)}</div>
        </footer>
        <div className={styles.demoNote}><Info size={12} /><span>{isDemo?'Universo demonstrativo · Perfil fictício · Nenhum dado acadêmico é alterado.':'Seus dados acadêmicos · Histórico importado identificado nas evidências · Mudanças de configuração são versionadas.'} Período: {date(start)} a {date(end)}.</span>{extra.length > 0 && <button onClick={() => { setExtra([]); setAnswer(null); setFeedback(null); }}>Reiniciar demonstração</button>}</div>
      </main>
    </div>
    {help && <div className={styles.modalBackdrop} onClick={() => setHelp(false)}><section ref={helpRef} className={styles.help} role="dialog" aria-modal="true" aria-labelledby="universe-help-title" aria-describedby="universe-help-description" onClick={e => e.stopPropagation()}><button className={styles.closeHelp} onClick={() => setHelp(false)} aria-label="Fechar ajuda"><X size={20} /></button><Orbit size={32} /><UniverseGuide isDemo={isDemo}/><label className={styles.check}><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} />Reduzir animações</label><button className={styles.primary} onClick={() => {setHelp(false);dismissIntroduction();}}>Entendi, explorar meu universo <ArrowUpRight size={16} /></button></section></div>}
  </div>;
}
