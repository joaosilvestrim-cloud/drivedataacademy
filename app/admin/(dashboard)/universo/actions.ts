'use server';

import { revalidatePath } from 'next/cache';
import { getAdminUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateDocument } from '@/lib/knowledge/catalog';
import { catalogVersions } from '@/lib/knowledge/server';
import { universe } from '@/lib/knowledge/engine';

function message(error:unknown) { const text=error instanceof Error?error.message:String(error); return /KU_CONFLICT/.test(text)?'Outro administrador alterou o rascunho. Recarregue a página antes de salvar.':text.slice(0,240); }
async function authorized() { const user=await getAdminUser(); if(!user) throw new Error('Acesso administrativo necessário.'); return {user,db:createAdminClient()}; }
export async function saveKnowledgeDraft(input:unknown,revision:number) {
  try { const {db}=await authorized(); const document=validateDocument(input); if(!Number.isInteger(revision)||revision<0) throw new Error('Revisão inválida.');
    const {data,error}=await db.rpc('ku_save_draft',{p_document:document,p_revision:revision}); if(error) throw new Error(error.message);
    revalidatePath('/admin/universo'); return {ok:true as const,revision:Number(data)};
  } catch(error) {return {ok:false as const,error:message(error)};}
}
export async function publishKnowledgeDraft(revision:number) {
  try { const {db,user}=await authorized(); const {data:draft,error:readError}=await db.from('ku_catalog_draft').select('document,revision').eq('id',1).single();
    if(readError) throw new Error(readError.message); if(draft.revision!==revision) throw new Error('KU_CONFLICT');
    const document=validateDocument(draft.document,true);
    const previous=(await catalogVersions()).at(-1)?.document;
    if(previous&&document.mappings.some(m=>{const old=previous.mappings.find(x=>x.courseId===m.courseId&&x.competency===m.competency);return old&&old.group!==m.group;}))throw new Error('Preserve o grupo de equivalência de associações já publicadas para não duplicar evidências históricas.');
    const courses=await db.from('courses').select('id'); if(courses.error) throw new Error(courses.error.message);
    const courseIds=new Set((courses.data??[]).map(c=>c.id)); if(document.mappings.some(m=>!courseIds.has(m.courseId))) throw new Error('Um treinamento associado não existe mais.');
    const {error}=await db.rpc('ku_publish_catalog',{p_revision:revision,p_author:user.id}); if(error) throw new Error(error.message);
    revalidatePath('/admin/universo');revalidatePath('/universo');revalidatePath('/conta/perfil');return {ok:true as const};
  } catch(error) {return {ok:false as const,error:message(error)};}
}
export async function grantKnowledgeAccess(email:string,expiresAt:string|null) {
  try { const {db,user}=await authorized(); const normalized=email.trim().toLowerCase(); if(!normalized.includes('@')) throw new Error('Informe um e-mail válido.');
    if(expiresAt && (!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.now())) throw new Error('Escolha uma validade futura.');
    // Busca direta no banco. O fallback paginado cobre a janela entre publicar
    // esta versão e rodar a migração que cria a função.
    let target:string|undefined;
    const lookup=await db.rpc('user_id_by_email',{p_email:normalized});
    if(!lookup.error) target=(lookup.data as string|null)??undefined;
    else for(let page=1;page<=100;page++) {const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error) throw new Error(error.message);target=data.users.find(u=>u.email?.toLowerCase()===normalized)?.id;if(target||data.users.length<1000)break;}
    if(!target) throw new Error('Aluno não encontrado. Crie a conta pelo painel de alunos.');
    const {error}=await db.from('ku_entitlements').upsert({user_id:target,expires_at:expiresAt,granted_by:user.id});if(error)throw new Error(error.message);
    return {ok:true as const};
  }catch(error){return {ok:false as const,error:message(error)};}
}
export async function recordPracticalEvidence(input:{userId:string;competency:string;dimension:string;group:string;units:number;quality:number;advanced:boolean;label:string;requestId:string}) {
  try {const {db}=await authorized();const version=(await catalogVersions()).at(-1);if(!version)throw new Error('Publique um catálogo primeiro.');
    if(!version.document.competencies.some(c=>c.id===input.competency)||!['exercise','challenge','retention'].includes(input.dimension))throw new Error('Competência ou tipo de evidência inválido.');
    if(!/^[0-9a-f-]{36}$/i.test(input.userId)||!/^[0-9a-f-]{36}$/i.test(input.requestId))throw new Error('Identificador inválido.');
    if(!Number.isFinite(input.units)||input.units<0||input.units>10000||!Number.isFinite(input.quality)||input.quality<0||input.quality>1)throw new Error('Pontuação inválida.');
    if(!input.group.trim()||input.group.length>80||!input.label.trim()||input.label.length>240)throw new Error('Preencha a referência e a descrição.');
    const {error}=await db.rpc('ku_append_activity',{p_user:input.userId,p_course:null,p_kind:input.dimension,p_key:`practical:${input.requestId}`,
      p_payload:{competency:input.competency,group:input.group,units:input.units,quality:input.quality,qualified:input.units>0&&input.quality>=.7,advanced:input.advanced,label:input.label},p_at:new Date().toISOString(),p_precision:'exact',p_version:version.id});
    if(error)throw new Error(error.message);revalidatePath('/universo');return {ok:true as const};
  }catch(error){return {ok:false as const,error:message(error)};}
}
export async function simulateKnowledgeDraft(input:unknown) {
  try {await authorized();const document=validateDocument(input,true);
    // Empty evidence is intentional; this catches inconsistent prerequisites and
    // proves that publishing a catalog never grants mastery on its own.
    const scores=universe(document,[],new Date().toISOString());return {ok:true as const,competencies:Object.keys(scores).length,mappedCourses:new Set(document.mappings.map(m=>m.courseId)).size};
  }catch(error){return {ok:false as const,error:message(error)};}
}
export async function retractPracticalEvidence(eventId:string,reason:string) {
  try {const {db,user}=await authorized();if(!reason.trim()||reason.length>240)throw new Error('Informe o motivo da correção.');
    const {data:event,error:readError}=await db.from('ku_activity_events').select('id,user_id,kind,catalog_version').eq('id',eventId).single();
    if(readError||!event||!['exercise','challenge','retention'].includes(event.kind))throw new Error('Evidência prática não encontrada.');
    const {error}=await db.rpc('ku_append_activity',{p_user:event.user_id,p_course:null,p_kind:'retraction',p_key:`retract:${event.id}`,p_payload:{targetId:event.id,reason:reason.trim(),reviewedBy:user.id},p_at:new Date().toISOString(),p_precision:'exact',p_version:event.catalog_version});
    if(error)throw new Error(error.message);revalidatePath('/universo');revalidatePath('/admin/universo');return {ok:true as const};
  }catch(error){return {ok:false as const,error:message(error)};}
}
export async function revokeKnowledgeAccess(userId:string) {
  try{const {db}=await authorized();if(!/^[0-9a-f-]{36}$/i.test(userId))throw new Error('Aluno inválido.');
    const {error}=await db.from('ku_entitlements').update({expires_at:new Date().toISOString()}).eq('user_id',userId);if(error)throw new Error(error.message);
    return {ok:true as const};
  }catch(error){return {ok:false as const,error:message(error)};}
}
