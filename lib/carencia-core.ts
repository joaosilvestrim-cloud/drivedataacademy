export const DIAS_CARENCIA=7;
export type AssinaturaCarencia={status:string;starts_at:string;expires_at:string|null};
export type Liberacao={liberado:boolean;liberaEm:string|null};
export function calcularCarencia(assinaturas:AssinaturaCarencia[],matriculado:boolean,agora:number):Liberacao {
  if(matriculado)return {liberado:true,liberaEm:null};
  const ativa=assinaturas.filter(m=>m.status==="active"&&Number.isFinite(Date.parse(m.starts_at))&&Date.parse(m.starts_at)<=agora&&(!m.expires_at||Date.parse(m.expires_at)>agora)).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at))[0];
  if(!ativa)return {liberado:false,liberaEm:null};
  const alvo=Date.parse(ativa.starts_at)+DIAS_CARENCIA*86400000;
  return {liberado:agora>=alvo,liberaEm:new Date(alvo).toISOString()};
}

export type MaterialAgenda={id:string;titulo:string;criadoEm:string;cursoId:string;curso:string;slug:string;subscriberPrice:number|null;accessMode:string;moduloEm:string|null;aulaId?:string};
export type MatriculaAgenda={user_id:string;course_id:string;source:string;created_at:string};
export type ItemLiberacao={id:string;titulo:string;curso:string;cursoId:string;href:string;liberaEm:string;liberado:boolean;chave:string};
export function agendaDeMateriais(materiais:MaterialAgenda[],assinaturas:AssinaturaCarencia[],matriculas:MatriculaAgenda[],agora:number):ItemLiberacao[] {
  const carencia=calcularCarencia(assinaturas,false,agora);
  return materiais.flatMap(m=>{
    const matricula=matriculas.find(e=>e.course_id===m.cursoId&&e.source!=="free");
    if(!matricula&&(m.accessMode==="in_company"||m.subscriberPrice!==0||!carencia.liberaEm))return [];
    const base=matricula?Date.parse(matricula.created_at):Date.parse(carencia.liberaEm!);
    const modulo=m.moduloEm?Date.parse(m.moduloEm):0;
    const criado=Date.parse(m.criadoEm);
    if(![base,modulo,criado].every(Number.isFinite))return [];
    const alvo=Math.max(base,modulo,criado);
    const iso=new Date(alvo).toISOString();
    return [{id:m.id,titulo:m.titulo,curso:m.curso,cursoId:m.cursoId,href:`/aprender/${encodeURIComponent(m.slug)}${m.aulaId?`?l=${encodeURIComponent(m.aulaId)}`:""}`,liberaEm:iso,liberado:agora>=alvo,chave:`${m.id}:${iso}`}];
  }).sort((a,b)=>Date.parse(a.liberaEm)-Date.parse(b.liberaEm));
}
