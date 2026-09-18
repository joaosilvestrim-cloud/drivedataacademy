import type {CSSProperties} from 'react';
import Avatar from '@/components/Avatar';
import {medalTier} from '@/lib/ranking';
import s from './community-medals.module.css';

/* Coroa do selo da casa. Fica no lugar do número da medalha. */
export function Coroa({size=11}:{size?:number}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 18.5h18a1 1 0 010 2H3a1 1 0 010-2zM2.6 6.6a1.4 1.4 0 012.2-1.1L8.6 8l2.3-4.2a1.3 1.3 0 012.2 0L15.4 8l3.8-2.5a1.4 1.4 0 012.2 1.4l-2 9.1H4.6l-2-9.4z"/></svg>;
}

/* A moldura tem duas camadas de mérito e uma vence a outra: quem é da casa
   (fundação da Academy) usa a moldura dourada com coroa, mesmo estando em
   qualquer posição do ranking. Sem selo da casa, vale a medalha do ranking. */
/* Escudo da conta oficial. Fica no lugar da coroa. */
export function Escudo({size=11}:{size?:number}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5l8.5 3.2v6.1c0 5.3-3.6 9.9-8.5 11.7-4.9-1.8-8.5-6.4-8.5-11.7V4.7L12 1.5zm-1.3 13.7l5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4 3.4 3.4z"/></svg>;
}

export default function MedalAvatar({name,src,rank,size='sm',className='',casa=null}:{name:string;src?:string|null;rank?:number|null;size?:'xs'|'sm'|'md';className?:string;casa?:string|null}){
  if(casa){
    const oficial=casa==='Oficial';
    const label=oficial?`${name} · Conta oficial da DriveData Academy`:`${name} · ${casa} da DriveData Academy`;
    const icone=size==='xs'?9:size==='md'?12:10;
    return <span className={`${s.avatar} ${oficial?s.oficial:s.casa} ${s[size]} ${className}`} role="img" aria-label={label} title={label} style={{'--phase':'0s'} as CSSProperties}>
      <span className={s.ring} aria-hidden="true"/><span className={s.spark} aria-hidden="true"/>
      <span className={s.photo} aria-hidden="true"><Avatar name={name} src={src} size={size}/></span>
      <span className={`${s.crown} ${oficial?s.escudo:''}`} aria-hidden="true">{oficial?<Escudo size={icone}/>:<Coroa size={icone}/>}</span>
    </span>;
  }
  const medal=rank?medalTier(rank):null;
  if(!medal)return <Avatar name={name} src={src} size={size} className={className}/>;
  const label=`${name} · ${medal.name} · ${rank}º lugar no ranking`;
  return <span className={`${s.avatar} ${s[medal.key]} ${s[size]} ${className}`} role="img" aria-label={label} title={label} style={{'--phase':`${-(rank!%7)}s`} as CSSProperties}>
    <span className={s.ring} aria-hidden="true"/><span className={s.spark} aria-hidden="true"/>
    <span className={s.photo} aria-hidden="true"><Avatar name={name} src={src} size={size}/></span>
    <span className={s.badge} aria-hidden="true">{rank!<=99?rank:'★'}</span>
  </span>;
}
