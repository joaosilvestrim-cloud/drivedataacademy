"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import {MEDAL_TYPES,medalTier} from '@/lib/ranking';
import RankMedal from './RankMedal';
import MedalAvatar from './MedalAvatar';
import s from './community-medals.module.css';

export default function MedalCatalog({myRank}:{myRank?:number|null}){
  const tr = usarTraducao();
  const mine=myRank?medalTier(myRank):null;
  return <section className={s.catalog} aria-labelledby="medal-catalog-title"><div className={s.catalogHeading}><div><p>{tr("RECONHECIMENTO NA COMUNIDADE")}</p><h2 id="medal-catalog-title">{tr("Conheça as medalhas do ranking")}</h2></div>{mine&&<span className={`${s.current} ${s[mine.key]}`}>{tr("Sua medalha:")} {mine.name}</span>}</div>
    <p className={s.description}>{tr("Sua colocação define a medalha e o aro animado do seu avatar no chat. Todos na comunidade podem ver esse destaque.")}</p>
    <div className={s.catalogGrid}>{MEDAL_TYPES.map(t=><article key={t.key} className={`${s.catalogCard} ${s[t.key]}`} data-current={mine?.key===t.key}><RankMedal rank={t.min} compact/><h3>{t.name}</h3><strong>{t.range}</strong><p>{t.caption}</p><div className={s.chatExample}><MedalAvatar name="Aluno exemplo" rank={t.min} size="xs"/><span>{tr("Assim no chat")}</span></div>{mine?.key===t.key&&<span className={s.yours}>{tr("SUA CATEGORIA ATUAL")}</span>}</article>)}</div>
    <p className={s.footnote}>{tr("Clique na medalha para explorá-la em 3D. Os números dos exemplos representam o início de cada faixa. O destaque acompanha a posição atual, não uma conquista permanente. Sem classificação, o avatar aparece sem medalha.")}</p>
  </section>;
}
