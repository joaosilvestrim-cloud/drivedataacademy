'use client';
import {useState} from 'react';
import Link from 'next/link';
import RankingPodium from './RankingPodium';
import RankMedal from './RankMedal';
import s from './medals.module.css';
import MedalCatalog from './MedalCatalog';
const examples=[{id:'demo-1',name:'Aluno Exemplo 1',pts:180},{id:'demo-2',name:'Aluno Exemplo 2',pts:140},{id:'demo-3',name:'Aluno Exemplo 3',pts:110}];
export default function MedalPreview(){
  const [count,setCount]=useState(3);
  return <main className={s.preview}><Link href="/conta/ranking" className="text-sm text-slate-400">← Voltar ao ranking</Link><h1 className="mt-6">Medalhas da comunidade</h1><p>Demonstração visual com participantes fictícios. Clique nas medalhas para girar e explorar os dois lados.</p><div className={s.previewControls}>{[1,2,3].map(n=><button key={n} aria-pressed={count===n} onClick={()=>setCount(n)}>{n} {n===1?'participante':'participantes'}</button>)}</div><MedalCatalog myRank={1}/><RankingPodium participants={examples.slice(0,count)}/><div className={s.previewCompact}><RankMedal rank={4} compact/><span>4º ao 10º · Esmeralda</span><RankMedal rank={11} compact/><span>A partir do 11º · Safira</span></div><p>As medalhas indicam a colocação atual. A pontuação e as regras de premiação continuam sendo as do ranking.</p></main>;
}
