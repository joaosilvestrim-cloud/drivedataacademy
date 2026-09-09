import type { ActivityRecord, CatalogVersion, Evidence, UniverseData } from './types';
import { emptyDocument } from './catalog';

export function projectEvidence(records: ActivityRecord[], versions: CatalogVersion[]): Evidence[] {
  records=records.map(r=>({...r,occurred_at:new Date(r.occurred_at).toISOString(),recorded_at:new Date(r.recorded_at).toISOString()}));
  const ordered=[...versions].sort((a,b)=>a.published_at.localeCompare(b.published_at));
  const revoked=new Map<string,string>();
  const retracted=new Map<string,string>();
  for(const r of records.filter(r=>r.kind==='retraction')) {const id=String(r.payload.targetId);const old=retracted.get(id);if(!old||r.occurred_at<old)retracted.set(id,r.occurred_at);}
  for(const r of records.filter(r=>r.kind==='certificate_revoked')) { const id=String(r.payload.sourceId); const old=revoked.get(id); if(!old||r.occurred_at<old) revoked.set(id,r.occurred_at); }
  return records.flatMap<Evidence>(r=>{
    const version=ordered.find(v=>v.id===r.catalog_version)??ordered[0];
    if(!version || r.kind==='certificate_revoked'||r.kind==='retraction') return [];
    // First configuration may reconstruct legacy results. Later catalog changes
    // become effective at publication, never retroactively changing an old view.
    const publishedAt=new Date(version.published_at).toISOString();
    const effectiveAt=version.id!==ordered[0]?.id&&publishedAt>r.occurred_at?publishedAt:r.occurred_at;
    const maps=version.document.mappings.filter(m=>m.courseId===r.course_id);
    if(!['progress','assessment','certificate'].includes(r.kind)) {
      const competency=String(r.payload.competency??'');
      if(!version.document.competencies.some(c=>c.id===competency)||!['exercise','challenge','retention'].includes(r.kind)) return [];
      const units=Number(r.payload.units),quality=Number(r.payload.quality);
      if(!Number.isFinite(units)||!Number.isFinite(quality)) return [];
      return [{ id:r.id,competency,dimension:r.kind as 'exercise'|'challenge'|'retention',group:String(r.payload.group),units,quality,at:r.occurred_at,effectiveAt,label:String(r.payload.label),qualified:r.payload.qualified===true,advanced:r.payload.advanced===true,invalidatedAt:retracted.get(r.id) }];
    }
    return maps.map(m=>{
      const assessment=r.kind==='assessment';
      const value=Number(assessment?r.payload.score:r.payload.ratio);
      const ratio=Number.isFinite(value)?Math.max(0,Math.min(1,assessment?value/100:value)):0;
      return { id:`${r.id}:${m.competency}`,competency:m.competency,dimension:assessment?'assessment' as const:'learning' as const,
        group:`${assessment?'assessment':'learning'}:${m.group}`,units:m.credits*m.weight*ratio,quality:1,at:r.occurred_at,effectiveAt,
        label:`${r.kind==='progress'?'Progresso registrado':assessment?'Avaliação corrigida':'Conclusão certificada'} · ${String(r.payload.courseTitle??'Treinamento')}`,
        course:String(r.payload.courseTitle??'Treinamento'),courseId:r.course_id??undefined,courseSlug:String(r.payload.courseSlug??''),
        assessmentScore:assessment?ratio*100:undefined,completed:r.payload.completed===true,
        qualified:assessment&&r.payload.passed===true,advanced:assessment&&m.advanced&&r.payload.passed===true,
        imported:r.precision!=='exact'||!r.catalog_version,invalidatedAt:r.kind==='certificate'?revoked.get(String(r.payload.sourceId)):undefined,
      };
    });
  });
}
export function liveData(records: ActivityRecord[], versions: CatalogVersion[], now: string): UniverseData {
  const sorted=versions.map(v=>({...v,published_at:new Date(v.published_at).toISOString(),document:{...v.document,version:v.id}})).sort((a,b)=>a.published_at.localeCompare(b.published_at));
  const events=projectEvidence(records,sorted);
  const earliest=events.filter(e=>e.at<=now).reduce((min,e)=>e.at<min?e.at:min,now);
  // At least one day lets the timeline show an empty beginning, even for a new account.
  const start=new Date(Date.parse(earliest)-86400000).toISOString();
  return {mode:'live',catalog:sorted.at(-1)?.document??emptyDocument(),events,start,end:now,
    history:sorted.map(v=>({at:v.published_at,catalog:{...v.document,version:v.id}}))};
}
