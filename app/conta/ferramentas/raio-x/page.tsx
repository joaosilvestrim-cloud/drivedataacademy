import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/sessao";
import { nomeDaFerramenta } from "@/lib/ferramentas-nomes";
import { nomeProjeto, type ResumoHistorico } from "@/lib/raiox/historico";
import RaioX from "./RaioX";

export const dynamic="force-dynamic";
export default async function RaioXPage() {
  const user=await usuarioAtual();
  if(!user) redirect("/entrar");
  let historico:ResumoHistorico[]=[];
  try {
    const {data}=await createAdminClient().from("raiox_reports").select("id,arquivo,nota,parcial,created_at,projeto:resumo->>projeto,versao:resumo->>versao").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30);
    historico=(data||[]).map(r=>({id:r.id,arquivo:r.arquivo,nota:r.nota,parcial:r.parcial,criadoEm:r.created_at,projeto:r.projeto || nomeProjeto(r.arquivo),versao:r.versao || "1.0.0"}));
  } catch { /* O diagnóstico local funciona mesmo sem histórico. */ }
  return <RaioX nome={await nomeDaFerramenta("raio-x")} historicoInicial={historico}/>;
}
