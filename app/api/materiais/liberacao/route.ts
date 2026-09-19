import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/sessao";
import { consultarLiberacoes } from "@/lib/materiais-liberacao";
import { demoAtual } from "@/lib/demo";
export const dynamic="force-dynamic";
export async function GET() {
  const user=await usuarioAtual();
  if(!user)return NextResponse.json({erro:"Entre na sua conta."},{status:401,headers:{"Cache-Control":"private, no-store"}});
  try{const dados=await demoAtual(user.id)?{agora:Date.now(),rows:[]}:await consultarLiberacoes(user.id);return NextResponse.json({userId:user.id,agora:dados.agora,itens:dados.rows.map(({userId,aluno,email,...item})=>item)},{headers:{"Cache-Control":"private, no-store"}});}catch{return NextResponse.json({erro:"Consulta indisponível."},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
