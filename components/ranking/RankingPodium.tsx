import Avatar from '@/components/Avatar';
import RankMedal from './RankMedal';
import s from './medals.module.css';

type Participant={id:string;name:string;pts:number};
export default function RankingPodium({participants}:{participants:Participant[]}){
  const top=participants.slice(0,3);
  if(!top.length)return null;
  const ordered=top.length===1?[{person:top[0],rank:1}]:[1,0,2].filter(i=>top[i]).map(i=>({person:top[i],rank:i+1}));
  return <section className={s.podiumSection} aria-label="Pódio do ranking">
    <div className={s.podiumHeading}><span>DESTAQUES DA COMUNIDADE</span><p>Conhecimento compartilhado merece reconhecimento.</p></div>
    <div className={`${s.podium} ${top.length===1?s.solo:''}`}>
      {ordered.map(({person,rank})=><article key={person.id} className={`${s.podiumCard} ${rank===1?s.first:rank===2?s.second:s.third}`}>
        <div className={s.positionTag}>{rank===1?'OURO':rank===2?'PRATA':'BRONZE'} <span>· {rank}º LUGAR</span></div>
        <RankMedal rank={rank} name={person.name} points={person.pts}/>
        <div className={s.student}><Avatar name={person.name} size="sm"/><div><h3 title={person.name}>{person.name}</h3><p>{person.pts.toLocaleString('pt-BR')} <span>pontos</span></p></div></div>
        <div className={s.pedestal}><span>0{rank}</span><i/>{rank===1?'Liderando pelo exemplo':rank===2?'Inspirando a comunidade':'Compartilhando para crescer'}</div>
      </article>)}
    </div>
    <p className={s.podiumHint}>Toque em uma medalha para explorar os dois lados em 3D.</p>
  </section>;
}
