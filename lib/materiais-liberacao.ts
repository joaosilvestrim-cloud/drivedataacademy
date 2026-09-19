import "server-only";
import { createAdminClient } from "./supabase/admin";
import { agendaDeMateriais, type MaterialAgenda, type ItemLiberacao } from "./carencia-core";

export type LinhaLiberacao=ItemLiberacao & {userId:string;aluno:string;email:string};
async function todasAsPaginas(criarConsulta:()=>any):Promise<any[]> {
  const rows:any[]=[];
  for(let inicio=0;inicio<100000;inicio+=500){
    const {data,error}=await criarConsulta().order("id").range(inicio,inicio+499);
    if(error)throw new Error("Não foi possível consultar as liberações de materiais.");
    rows.push(...(data||[]));
    if(!data || data.length<500)return rows;
  }
  throw new Error("A consulta atingiu o limite operacional. Nenhum resultado parcial foi apresentado.");
}
export async function consultarLiberacoes(userId?:string) {
  const db=createAdminClient();
  const memberships=()=>{const q=db.from("memberships").select("user_id,status,starts_at,expires_at").eq("status","active");return userId?q.eq("user_id",userId):q;};
  const enrollments=()=>{const q=db.from("enrollments").select("user_id,course_id,source,created_at").neq("source","free");return userId?q.eq("user_id",userId):q;};
  const [materiaisRows,membros,matriculas]=await Promise.all([
    todasAsPaginas(()=>db.from("ready_materials").select("id,title,created_at,file_path,external_url,lessons!inner(id,course_id,course_modules!inner(available_at),courses!inner(id,title,slug,subscriber_price,access_mode))").eq("published",true)),
    todasAsPaginas(memberships),todasAsPaginas(enrollments),
  ]);
  const materiais:MaterialAgenda[]=materiaisRows.filter(m=>m.file_path||m.external_url).map((m:any)=>{const aula=Array.isArray(m.lessons)?m.lessons[0]:m.lessons;const curso=Array.isArray(aula.courses)?aula.courses[0]:aula.courses;const modulo=Array.isArray(aula.course_modules)?aula.course_modules[0]:aula.course_modules;return {id:m.id,titulo:m.title,criadoEm:m.created_at,cursoId:curso.id,curso:curso.title,slug:curso.slug,subscriberPrice:curso.subscriber_price==null?null:Number(curso.subscriber_price),accessMode:curso.access_mode,moduloEm:modulo.available_at,aulaId:aula.id};});
  const agora=Date.now();
  const ids:string[]=userId?[userId]:[...new Set<string>([...membros.map(m=>m.user_id),...matriculas.map(e=>e.user_id)])];
  const nomes=new Map<string,{nome:string;email:string}>();
  if(!userId) {
    // Pagina Auth para não omitir alunos depois do milésimo registro.
    for(let page=1;page<=100;page++) {
      const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
      if(error)throw new Error("Não foi possível carregar os nomes dos alunos.");
      for(const u of data.users)nomes.set(u.id,{nome:u.user_metadata?.full_name||u.email||"Aluno",email:u.email||""});
      if(data.users.length<1000)break;
      if(page===100)throw new Error("A consulta de alunos atingiu o limite operacional.");
    }
  }
  const rows:LinhaLiberacao[]=ids.flatMap(id=>agendaDeMateriais(materiais,membros.filter(m=>m.user_id===id),matriculas.filter(e=>e.user_id===id),agora).map(item=>({...item,userId:id,aluno:nomes.get(id)?.nome||"Aluno",email:nomes.get(id)?.email||""})));
  return {agora,rows};
}
