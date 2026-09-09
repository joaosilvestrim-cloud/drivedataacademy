import Link from 'next/link';
import { getAdminUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { emptyDocument } from '@/lib/knowledge/catalog';
import KnowledgeAdmin from './KnowledgeAdmin';

export const dynamic='force-dynamic';
export default async function KnowledgeAdminPage() {
  if(!await getAdminUser())redirect('/admin/login');
  const db=createAdminClient();
  const [{data:draft,error},{data:courses},{data:versions},{data:students},{data:practical}]=await Promise.all([
    db.from('ku_catalog_draft').select('document,revision').eq('id',1).maybeSingle(),
    db.from('courses').select('id,title,slug').order('title'),
    db.from('ku_catalog_versions').select('id,published_at').order('sequence',{ascending:false}).limit(10),
    db.from('profiles').select('id,full_name').order('full_name').limit(1000),
    db.from('ku_activity_events').select('id,user_id,payload,occurred_at').in('kind',['exercise','challenge','retention']).order('sequence',{ascending:false}).limit(100),
  ]);
  if(error||!draft)return <div className="max-w-2xl"><p className="text-xs uppercase tracking-widest text-brand-green">Knowledge Universe 4D</p><h1 className="mt-2 text-3xl font-semibold">Preparar o banco de dados</h1><p className="mt-5 text-sm leading-relaxed text-slate-300">A integração está disponível no código. Execute a migração <code>20260909_knowledge_universe.sql</code> no banco deste projeto para habilitar o catálogo, os registros de aprendizagem e a administração.</p><p className="mt-3 text-sm text-slate-400">Os dados acadêmicos atuais permanecem preservados. Após a instalação, retorne a esta página.</p><Link className="mt-6 inline-block text-brand-green" href="/universo/demo">Abrir demonstração →</Link></div>;
  return <KnowledgeAdmin initial={draft.document??emptyDocument()} revision={draft.revision} courses={courses??[]} versions={versions??[]} students={students??[]} practical={(practical??[]).map(e=>({id:e.id,userId:e.user_id,label:String(e.payload?.label??'Evidência prática'),at:e.occurred_at}))} />;
}
