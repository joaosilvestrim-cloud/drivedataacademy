import type {CSSProperties} from 'react';
import Avatar from '@/components/Avatar';
import {medalTier} from '@/lib/ranking';
import s from './community-medals.module.css';

export default function MedalAvatar({name,src,rank,size='sm',className=''}:{name:string;src?:string|null;rank?:number|null;size?:'xs'|'sm'|'md';className?:string}){
  const medal=rank?medalTier(rank):null;
  if(!medal)return <Avatar name={name} src={src} size={size} className={className}/>;
  const label=`${name} · ${medal.name} · ${rank}º lugar no ranking`;
  return <span className={`${s.avatar} ${s[medal.key]} ${s[size]} ${className}`} role="img" aria-label={label} title={label} style={{'--phase':`${-(rank!%7)}s`} as CSSProperties}>
    <span className={s.ring} aria-hidden="true"/><span className={s.spark} aria-hidden="true"/>
    <span className={s.photo} aria-hidden="true"><Avatar name={name} src={src} size={size}/></span>
    <span className={s.badge} aria-hidden="true">{rank!<=99?rank:'★'}</span>
  </span>;
}
