import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { consultarLiberacoes } from "@/lib/materiais-liberacao";
export const dynamic="force-dynamic";
export async function GET(){if(!await getAdminUser())return NextResponse.json({erro:"Acesso restrito."},{status:403});try{return NextResponse.json(await consultarLiberacoes(),{headers:{"Cache-Control":"private, no-store"}});}catch{return NextResponse.json({erro:"Não foi possível atualizar as liberações."},{status:503});}}
