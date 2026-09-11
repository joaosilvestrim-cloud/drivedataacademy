import {MEDAL_TYPES,medalTier} from '@/lib/ranking';
import RankMedal from './RankMedal';
import MedalAvatar from './MedalAvatar';
import s from './community-medals.module.css';

export default function MedalCatalog({myRank}:{myRank?:number|null}){
  const mine=myRank?medalTier(myRank):null;
  return <section className={s.catalog} aria-labelledby="medal-catalog-title"><div className={s.catalogHeading}><div><p>RECONHECIMENTO NA COMUNIDADE</p><h2 id="medal-catalog-title">Conheça as medalhas do ranking</h2></div>{mine&&<span className={`${s.current} ${s[mine.key]}`}>Sua medalha: {mine.name}</span>}</div>
    <p className={s.description}>Sua colocação define a medalha e o aro animado do seu avatar no chat. Todos na comunidade podem ver esse destaque.</p>
    <div className={s.catalogGrid}>{MEDAL_TYPES.map(t=><article key={t.key} className={`${s.catalogCard} ${s[t.key]}`} data-current={mine?.key===t.key}><RankMedal rank={t.min} compact/><h3>{t.name}</h3><strong>{t.range}</strong><p>{t.caption}</p><div className={s.chatExample}><MedalAvatar name="Aluno exemplo" rank={t.min} size="xs"/><span>Assim no chat</span></div>{mine?.key===t.key&&<span className={s.yours}>SUA CATEGORIA ATUAL</span>}</article>)}</div>
    <p className={s.footnote}>Clique na medalha para explorá-la em 3D. Os números dos exemplos representam o início de cada faixa. O destaque acompanha a posição atual, não uma conquista permanente. Sem classificação, o avatar aparece sem medalha.</p>
  </section>;
}
