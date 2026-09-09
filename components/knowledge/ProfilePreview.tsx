import Link from 'next/link';
import { ArrowUpRight, Orbit } from 'lucide-react';
import { knowledgeAccess, loadUniverse } from '@/lib/knowledge/server';
import { universe } from '@/lib/knowledge/engine';

export default async function ProfilePreview({userId,email}:{userId:string;email?:string|null}) {
  let summary='Conheça suas competências e acompanhe como seu conhecimento evolui.';
  try {if(await knowledgeAccess(userId,email)) {const data=await loadUniverse(userId);const scores=universe(data.catalog,data.events,data.end);const count=Object.values(scores).filter(s=>s.score>0).length;summary=count?`${count} competências com evidências registradas. Explore seu histórico e descubra os próximos caminhos.`:'Seu universo está pronto para receber as primeiras evidências de aprendizagem.';}}catch{summary='A integração do seu histórico está sendo preparada. Seus cursos e certificados permanecem disponíveis.';}
  return <section className="relative mt-8 overflow-hidden rounded-2xl border border-teal-300/20 bg-gradient-to-br from-teal-900/20 via-slate-900 to-slate-950 p-6">
    <svg aria-hidden="true" viewBox="0 0 240 150" className="pointer-events-none absolute right-0 top-2 h-40 w-60 opacity-35"><g stroke="#5fe6cc" strokeWidth=".6">{[[30,80,80,40],[80,40,145,60],[145,60,200,20],[145,60,200,110],[80,40,95,120],[95,120,200,110],[30,80,95,120],[145,60,95,120]].map(([x1,y1,x2,y2],i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}</g>{[[30,80],[80,40],[145,60],[200,20],[200,110],[95,120]].map(([cx,cy],i) => <g key={i}><circle cx={cx} cy={cy} r={i === 2 ? 14 : 8} fill="#5fe6cc" opacity=".1" /><circle cx={cx} cy={cy} r={i === 2 ? 5 : 3} fill="#8cf8db" /></g>)}</svg>
    <div className="relative"><Orbit className="mb-4 text-teal-200" size={24} /><p className="text-[10px] uppercase tracking-[.2em] text-teal-200/70">Meu universo de conhecimento</p><h2 className="mt-2 text-xl font-semibold text-white">Knowledge Universe 4D</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">Seus estudos viram um mapa de competências em 3D. A quarta dimensão é o tempo: acompanhe o que você desenvolveu e descubra o que aprender a seguir.</p><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{summary}</p><Link href="/universo" className="mt-5 inline-flex items-center gap-3 rounded-lg bg-teal-200 px-4 py-2.5 text-xs font-semibold text-slate-950">Explorar meu universo<ArrowUpRight size={15} /></Link></div>
  </section>;
}
