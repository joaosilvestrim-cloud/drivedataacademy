import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasFullAccess } from '@/lib/access';
import { isAdminEmail } from '@/lib/community';
import { liveData } from './project';
import { universe } from './engine';
import { validateDocument } from './catalog';
import type { ActivityRecord, CatalogVersion, UniverseData } from './types';

export class KnowledgeSetupError extends Error { constructor() { super('A estrutura do Knowledge Universe ainda precisa ser instalada no banco.'); } }
function failure(error: { code?: string; message?: string } | null) {
  if(!error) return;
  if(['42P01','PGRST205','PGRST202','42883'].includes(error.code??'')) throw new KnowledgeSetupError();
  throw new Error('Não foi possível carregar o universo. Tente novamente em instantes.');
}
export async function catalogVersions(): Promise<CatalogVersion[]> {
  const admin=createAdminClient();
  const {data,error}=await admin.from('ku_catalog_versions').select('id,published_at,document').order('sequence');
  failure(error);
  if(!Array.isArray(data)) throw new KnowledgeSetupError();
  return data.map(v=>({...v,published_at:new Date(v.published_at).toISOString(),document:validateDocument(v.document,true)}));
}
export async function knowledgeAccess(userId: string, email?: string | null) {
  const admin=createAdminClient();
  if(isAdminEmail(email)||await hasFullAccess(admin,userId)) return true;
  const {data,error}=await admin.from('ku_entitlements').select('expires_at').eq('user_id',userId).maybeSingle();
  failure(error);
  return !!data && (!data.expires_at||Date.parse(data.expires_at)>Date.now());
}
export async function loadUniverse(userId:string): Promise<UniverseData> {
  const admin=createAdminClient(),versions=await catalogVersions();
  const version=versions.at(-1);
  if(version) {
    // The SQL function imports each historical source only once per published
    // version and stores mutable progress at import time, never at a guessed date.
    const imported=await admin.rpc('ku_import_history',{p_user:userId,p_version:version.id}); failure(imported.error);
  }
  const records:ActivityRecord[]=[];
  let cursor=0;
  while(true) {
    const {data,error}=await admin.from('ku_activity_events').select('id,sequence,course_id,kind,source_key,payload,occurred_at,recorded_at,precision,catalog_version')
      .eq('user_id',userId).gt('sequence',cursor).order('sequence').limit(1000);
    failure(error); if(!Array.isArray(data)) throw new KnowledgeSetupError();
    records.push(...data); if(data.length<1000) break;
    cursor=data[data.length-1].sequence;
    if(records.length>=50000) throw new Error('Histórico muito extenso. Entre em contato com o suporte para otimizar seu universo.');
  }
  const now=new Date().toISOString();
  const result=liveData(records,versions,now);
  const {data:courses,error}=await admin.from('courses').select('id,title,slug').eq('published',true); failure(error);
  result.training=(courses??[]).map(c=>({...c,competencies:version?.document.mappings.filter(m=>m.courseId===c.id).map(m=>m.competency)??[]}));
  if(version) {
    const snapshot=await admin.from('ku_score_snapshots').upsert({user_id:userId,catalog_version:version.id,source_cursor:records.at(-1)?.sequence??0,
      as_of:now,scores:universe(result.catalog,result.events,now)},{onConflict:'user_id,catalog_version,source_cursor',ignoreDuplicates:true});
    failure(snapshot.error);
  }
  return result;
}
