import { consultarLiberacoes } from "@/lib/materiais-liberacao";
import LiberacoesAdmin from "./LiberacoesAdmin";
import {getAdminUser} from "@/lib/auth";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export default async function DownloadsAdmin(){if(!await getAdminUser())redirect("/admin/login");try{const dados=await consultarLiberacoes();return <LiberacoesAdmin inicial={dados}/>;}catch(e){return <div><h1 className="font-display text-2xl font-bold text-white">Liberação de downloads</h1><p className="mt-4 text-red-200" role="alert">{e instanceof Error?e.message:"Consulta indisponível."}</p></div>;}}
