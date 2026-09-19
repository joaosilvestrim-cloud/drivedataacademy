"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { appendPracticalEvidence } from "@/lib/knowledge/practical";
import { usuarioAtual } from "@/lib/sessao";
import { demoAtual } from "@/lib/demo";
import { registroParaLaudo, validarLaudo, validarPlano } from "@/lib/raiox/historico";

const uuid = (s:string) => {const h=createHash("sha256").update(s).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const idValido=(id:string)=>/^[0-9a-f-]{36}$/i.test(id);

export async function salvarLaudo(entrada: unknown, projeto: string, assinatura: string) {
  const user=await usuarioAtual();
  if(!user) return {ok:false as const,erro:"Entre na sua conta para salvar o diagnóstico."};
  if(await demoAtual(user.id)) return {ok:false as const,erro:"O acesso de demonstração não permite salvar diagnósticos."};
  try {
    const laudo=validarLaudo(entrada);
    if(typeof projeto!=="string" || !projeto.trim() || projeto.length>100 || !/^[a-f0-9]{64}$/.test(assinatura)) throw new Error("Informe um projeto válido e analise o arquivo novamente.");
    const admin=createAdminClient();
    const projetoLimpo=projeto.trim();
    const id=uuid(`${user.id}:${assinatura}:${laudo.versao}:${projetoLimpo.toLocaleLowerCase()}`);
    const existente=await admin.from("raiox_reports").select("*").eq("id",id).eq("user_id",user.id).maybeSingle();
    if(existente.data) return {ok:true as const,salvo:registroParaLaudo(existente.data),mensagem:"Esta versão já está no histórico. Seu plano foi preservado."};
    const limite=await admin.from("raiox_reports").select("id",{count:"exact",head:true}).eq("user_id",user.id).gte("created_at",new Date(Date.now()-3600000).toISOString());
    if(limite.error) throw new Error("O histórico está indisponível. Seu diagnóstico continua disponível nesta tela.");
    if((limite.count||0)>=30) throw new Error("Você já salvou 30 análises nesta hora. Continue analisando localmente e salve mais tarde.");
    const {data,error}=await admin.from("raiox_reports").insert({id,user_id:user.id,arquivo:laudo.arquivo,formato:laudo.formato,nota:laudo.nota,parcial:laudo.parcial,notas:laudo.notas,achados:laudo.achados,resumo:{...laudo.resumo,versao:laudo.versao,mapa:laudo.paginas,projeto:projetoLimpo,assinatura,plano:{},origem:"analise-local-autodeclarada"}}).select("*").single();
    if(error?.code==="23505") {
      const repetido=await admin.from("raiox_reports").select("*").eq("id",id).eq("user_id",user.id).single();
      if(repetido.data) return {ok:true as const,salvo:registroParaLaudo(repetido.data),mensagem:"Esta versão já estava salva."};
    }
    if(error || !data) throw new Error("Não foi possível salvar. Você pode exportar o laudo e tentar novamente.");
    // Diagnóstico local é autodeclarado: participação diária não comprova proficiência.
    const dia=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date());
    const evidencia=await appendPracticalEvidence({userId:user.id,competency:"power-bi",dimension:"exercise",group:"raio-x",units:1,quality:0,advanced:false,label:"Revisão de relatório no Raio-X (prática autodeclarada)",requestId:uuid(`raiox-participacao:${user.id}:${dia}`)});
    revalidatePath("/conta/ferramentas/raio-x");
    return {ok:true as const,salvo:registroParaLaudo(data),mensagem:evidencia.ok?"Diagnóstico salvo. Participação registrada no universo, sem atribuir proficiência pela nota.":"Diagnóstico salvo. O registro de participação no universo não foi concluído."};
  } catch(e) {return {ok:false as const,erro:e instanceof Error?e.message:"Não foi possível salvar o diagnóstico."};}
}

export async function abrirLaudo(id:string) {
  const user=await usuarioAtual();
  if(!user || !idValido(id)) return {ok:false as const,erro:"Diagnóstico indisponível."};
  if(await demoAtual(user.id)) return {ok:false as const,erro:"Diagnóstico indisponível no acesso de demonstração."};
  const {data,error}=await createAdminClient().from("raiox_reports").select("*").eq("id",id).eq("user_id",user.id).maybeSingle();
  if(error || !data) return {ok:false as const,erro:"Não foi possível abrir este diagnóstico."};
  return {ok:true as const,salvo:registroParaLaudo(data)};
}

export async function salvarPlano(id:string, entrada:unknown) {
  const user=await usuarioAtual();
  if(!user || !idValido(id)) return {ok:false as const,erro:"Entre na conta para guardar o plano."};
  if(await demoAtual(user.id)) return {ok:false as const,erro:"O acesso de demonstração não permite guardar planos."};
  try {
    const admin=createAdminClient();
    const {data,error}=await admin.from("raiox_reports").select("*").eq("id",id).eq("user_id",user.id).single();
    if(error || !data) throw new Error("Diagnóstico indisponível.");
    const plano=validarPlano(entrada,registroParaLaudo(data).laudo);
    const resultado=await admin.from("raiox_reports").update({resumo:{...data.resumo,plano}}).eq("id",id).eq("user_id",user.id);
    if(resultado.error) throw new Error("O plano não foi salvo. Tente novamente.");
    return {ok:true as const};
  } catch(e) {return {ok:false as const,erro:e instanceof Error?e.message:"Não foi possível salvar o plano."};}
}
