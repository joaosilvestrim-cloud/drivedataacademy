'use client';

import {useEffect,useId,useRef,useState,type PointerEvent} from 'react';
import Image from 'next/image';
import {RotateCcw,RotateCw,X} from 'lucide-react';
import s from './medals.module.css';

export function medalTier(rank:number){
  if(rank===1)return {key:'gold',name:'Ouro',caption:'Liderança da comunidade'};
  if(rank===2)return {key:'silver',name:'Prata',caption:'Conhecimento que inspira'};
  if(rank===3)return {key:'bronze',name:'Bronze',caption:'Contribuição que transforma'};
  if(rank<=10)return {key:'emerald',name:'Esmeralda',caption:'Entre os 10 primeiros'};
  return {key:'sapphire',name:'Safira',caption:'Construindo conhecimento'};
}

function Engraving({rank}:{rank:number}){
  const id=useId().replace(/:/g,'');
  return <svg className={s.engraving} viewBox="0 0 200 200" aria-hidden="true">
    <defs><path id={`arc-${id}`} d="M 36,99 A 64,64 0 0,1 164,99"/></defs>
    <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".7"/>
    {Array.from({length:60},(_,i)=><path key={i} d={`M100 12V${i%5===0?19:15}`} transform={`rotate(${i*6} 100 100)`} stroke="currentColor" strokeWidth={i%5===0?1.3:.6} opacity=".65"/>)}
    <text className={s.arcText}><textPath href={`#arc-${id}`} startOffset="50%" textAnchor="middle">DRIVEDATA ACADEMY</textPath></text>
    {[false,true].map(mirror=><g key={String(mirror)} transform={mirror?'translate(200 0) scale(-1 1)':undefined}>
      <path d="M79 163C49 149 39 123 47 93" fill="none" stroke="currentColor" strokeWidth="1.3"/>
      {[0,1,2,3,4,5].map(i=><g key={i} transform={`translate(${49+i*i*.7} ${98+i*10}) rotate(${-35+i*9})`}><ellipse cx="-4" cy="-4" rx="3.5" ry="8" fill="currentColor"/><ellipse cx="5" cy="2" rx="3.2" ry="7" transform="rotate(62 5 2)" fill="currentColor"/></g>)}
    </g>)}
    <path d="M100 42l2.5 5.2 5.7.8-4.1 4 .9 5.7-5-2.7-5 2.7.9-5.7-4.1-4 5.7-.8z" fill="currentColor"/>
    <text x="100" y="128" textAnchor="middle" className={rank>9?s.rankSmall:s.rankNumber}>{rank}</text>
    <text x="100" y="145" textAnchor="middle" className={s.placeText}>LUGAR</text>
    <path d="M82 171h36M89 175h22" stroke="currentColor" strokeWidth="1"/>
  </svg>;
}

function Coin({rank,rotation}:{rank:number;rotation?:{x:number;y:number}}){
  const tier=medalTier(rank);
  return <div className={`${s.coin} ${s[tier.key]} ${rotation?s.controlled:s.idle}`} style={rotation?{transform:`rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`}:undefined} aria-hidden="true">
    {Array.from({length:11},(_,i)=><div key={i} className={s.edge} style={{transform:`translateZ(${i*1.4-7}px)`}}/>)}
    <div className={s.front}><div className={s.face}><Engraving rank={rank}/><div className={s.sheen}/></div></div>
    <div className={s.reverse}><div className={s.reverseFace}><Image src="/drivedata-symbol.png" alt="" width={56} height={56}/><strong>DriveData</strong><span>ACADEMY</span><i>APRENDER · COMPARTILHAR<br/>TRANSFORMAR</i></div></div>
  </div>;
}

export default function RankMedal({rank,name,points,compact=false}:{rank:number;name?:string;points?:number;compact?:boolean}){
  const tier=medalTier(rank),id=useId();
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const drag=useRef<{x:number;y:number;rx:number;ry:number}|null>(null);
  const [open,setOpen]=useState(false),[rotation,setRotation]=useState({x:-10,y:-18});
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  const close=()=>{setOpen(false);trigger.current?.focus();};
  const move=(e:PointerEvent<HTMLDivElement>)=>{if(!drag.current)return;setRotation({x:Math.max(-60,Math.min(60,drag.current.rx-(e.clientY-drag.current.y)*.45)),y:drag.current.ry+(e.clientX-drag.current.x)*.65});};
  if(!Number.isSafeInteger(rank)||rank<1)return null;
  return <>
    <button ref={trigger} type="button" className={`${s.medalButton} ${s[tier.key]} ${compact?s.compact:''}`} aria-label={`Explorar medalha ${tier.name} de ${rank}º lugar${name?` de ${name}`:''}`} onClick={()=>{setRotation({x:-10,y:-18});setOpen(true);}}>
      {!compact&&<><div className={s.ribbon} aria-hidden="true"/><div className={s.halo} aria-hidden="true"/></>}
      <div className={s.perspective}><Coin rank={rank}/></div>
      {!compact&&<span className={s.explore}>EXPLORAR MEDALHA <span>↗</span></span>}
    </button>
    <dialog ref={dialog} className={`${s.dialog} ${s[tier.key]}`} aria-labelledby={id} onCancel={e=>{e.preventDefault();close();}} onClose={()=>setOpen(false)}>
      {open&&<><button type="button" className={s.close} aria-label="Fechar medalha" onClick={close}><X size={20}/></button>
        <p className={s.kicker}>DRIVEDATA ACADEMY · COMUNIDADE</p><h2 id={id}>Medalha de {tier.name}</h2><p className={s.caption}>{tier.caption}</p>
        <div className={s.showcase}><div className={s.orbit} aria-hidden="true"/><div className={s.interactive} tabIndex={0} role="group" aria-label="Medalha 3D. Arraste ou use as setas para girar." onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,rx:rotation.x,ry:rotation.y};}} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setRotation(r=>({x:Math.max(-60,Math.min(60,r.x+(e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0))),y:r.y+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0)}));}}}><Coin rank={rank} rotation={rotation}/></div></div>
        <p className={s.instruction}>Arraste para girar · use as setas do teclado</p>
        <div className={s.actions}><button type="button" onClick={()=>setRotation(r=>({...r,y:r.y+180}))}><RotateCw size={15}/>Ver outro lado</button><button type="button" onClick={()=>setRotation({x:-10,y:-18})}><RotateCcw size={15}/>Restaurar</button></div>
        <div className={s.recipient}><strong>{name||`${rank}º lugar`}</strong><span>{rank}º lugar{points!==undefined?` · ${points.toLocaleString('pt-BR')} pontos`:''}</span></div>
        <p className={s.disclaimer}>Representa a posição atual no ranking. A medalha acompanha as mudanças de colocação; não é um prêmio permanente.</p>
      </>}
    </dialog>
  </>;
}
