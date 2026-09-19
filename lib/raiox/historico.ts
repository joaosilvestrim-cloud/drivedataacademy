import { chaveAchado, PESO, PESO_DIMENSAO, VERSAO_MOTOR, type Laudo, type LaudoSalvo, type Plano } from "./tipos";

export type ResumoHistorico = { id: string; criadoEm: string; projeto: string; arquivo: string; nota: number; parcial: boolean; versao: string };
export const nomeProjeto = (nome: string) => nome.replace(/\.(pbix|pbit)$/i, "").trim().slice(0, 100);
const texto = (s: unknown, max = 1500): s is string => typeof s === "string" && s.length <= max;
const inteiro = (n: unknown, max: number) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= max;
const dimensoes = ["estrutura", "design", "clareza", "modelo", "dax"];
const severidades = ["alta", "media", "baixa"];

/** Limita o contrato recebido pelo servidor. O diagnóstico continua sendo autodeclarado. */
export function validarLaudo(entrada: unknown): Laudo {
  if (!entrada || typeof entrada !== "object" || JSON.stringify(entrada).length > 700000) throw new Error("O laudo ultrapassa o limite de salvamento.");
  const l = entrada as Laudo;
  if (!texto(l.arquivo, 200) || !l.arquivo.trim() || !["layout", "pbir", "pbit"].includes(l.formato) || l.versao !== VERSAO_MOTOR || typeof l.parcial !== "boolean") throw new Error("Formato de laudo inválido. Faça uma nova análise.");
  if (!inteiro(l.nota, 100) || !Array.isArray(l.notas) || l.notas.length < 3 || l.notas.length > 5 || !Array.isArray(l.achados) || l.achados.length > 2000) throw new Error("Notas ou achados inválidos.");
  if (!l.resumo || !inteiro(l.resumo.paginas, 100) || l.resumo.paginas < 1 || !inteiro(l.resumo.visuais, 3000) || l.resumo.visuais < 1 || !inteiro(l.resumo.tabelas, 10000) || !inteiro(l.resumo.medidas, 100000)) throw new Error("Resumo do relatório inválido.");
  for (const a of l.achados) {
    if (!a || !texto(a.regra, 80) || !/^[a-z_]+$/.test(a.regra) || !dimensoes.includes(a.dimensao) || !severidades.includes(a.severidade) || ![a.titulo,a.onde,a.porque,a.comoArrumar].every(x=>texto(x))) throw new Error("Um achado está inválido.");
    if (a.alvo && (!texto(a.alvo.paginaId,500) || !Array.isArray(a.alvo.visuais) || a.alvo.visuais.length > 3000 || !a.alvo.visuais.every(x=>texto(x,500)))) throw new Error("Localização de achado inválida.");
  }
  if (new Set(l.notas.map(n=>n.dimensao)).size !== l.notas.length) throw new Error("Dimensões repetidas.");
  for (const n of l.notas) {
    if (!n || !dimensoes.includes(n.dimensao) || !inteiro(n.nota,100) || !inteiro(n.achados,2000) || typeof n.completa !== "boolean" || (n.motivo !== undefined && !texto(n.motivo,200))) throw new Error("Dimensão inválida.");
    const achados=l.achados.filter(a=>a.dimensao===n.dimensao);
    const regras=[...new Set(achados.map(a=>a.regra))];
    const perda=regras.reduce((sum,regra)=>{const lista=achados.filter(a=>a.regra===regra);return sum+Math.max(...lista.map(a=>PESO[a.severidade]))*Math.min(2,1+(lista.length-1)/3);},0);
    if(n.achados!==achados.length || n.nota!==Math.round(100*Math.exp(-perda/85))) throw new Error("A nota não corresponde aos achados. Analise novamente.");
  }
  if (!["estrutura","design","clareza"].every(d=>l.notas.some(n=>n.dimensao===d && n.completa))) throw new Error("Laudo sem cobertura mínima.");
  const validas=l.notas.filter(n=>n.completa);
  const media=validas.reduce((s,n)=>s+n.nota*PESO_DIMENSAO[n.dimensao],0)/validas.reduce((s,n)=>s+PESO_DIMENSAO[n.dimensao],0);
  if(l.nota!==Math.round(Math.min(media,Math.min(...validas.map(n=>n.nota))+12))) throw new Error("Nota geral inconsistente.");
  if (!Array.isArray(l.paginas) || l.paginas.length !== l.resumo.paginas) throw new Error("Mapa do relatório inválido.");
  let total=0;
  for (const p of l.paginas) {
    if (!p || !texto(p.id,500) || !texto(p.nome,500) || ![p.largura,p.altura].every(n=>Number.isFinite(n)&&n>0&&n<=100000) || !Array.isArray(p.visuais)) throw new Error("Página inválida.");
    total+=p.visuais.length;
    for(const v of p.visuais) if(!v || !texto(v.id,500) || !texto(v.tipo,200) || ![v.x,v.y,v.largura,v.altura].every(n=>Number.isFinite(n)&&Math.abs(n)<=100000) || v.largura<0 || v.altura<0 || (v.oculto!==undefined && typeof v.oculto!=="boolean")) throw new Error("Visual inválido.");
  }
  if(total!==l.resumo.visuais || total>3000) throw new Error("Contagem de visuais inconsistente.");
  // Reconstrói a lista permitida: nenhum campo extra, fórmula ou dado bruto é persistido.
  return {arquivo:l.arquivo,formato:l.formato,parcial:l.parcial,nota:l.nota,versao:l.versao,
    notas:l.notas.map(n=>({dimensao:n.dimensao,nota:n.nota,achados:n.achados,completa:n.completa,...(n.motivo?{motivo:n.motivo}:{})})),
    achados:l.achados.map(a=>({regra:a.regra,dimensao:a.dimensao,severidade:a.severidade,titulo:a.titulo,onde:a.onde,porque:a.porque,comoArrumar:a.comoArrumar,...(a.alvo?{alvo:{paginaId:a.alvo.paginaId,visuais:a.alvo.visuais}}:{})})),
    resumo:{paginas:l.resumo.paginas,visuais:l.resumo.visuais,tabelas:l.resumo.tabelas,medidas:l.resumo.medidas},
    paginas:l.paginas.map(p=>({id:p.id,nome:p.nome,largura:p.largura,altura:p.altura,visuais:p.visuais.map(v=>({id:v.id,tipo:v.tipo,x:v.x,y:v.y,largura:v.largura,altura:v.altura,oculto:!!v.oculto}))}))};
}

export function validarPlano(entrada: unknown, laudo: Laudo): Plano {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new Error("Plano inválido.");
  const chaves = new Set(laudo.achados.map(chaveAchado));
  const pares = Object.entries(entrada);
  if(pares.length>2000 || pares.some(([k,v])=>!chaves.has(k)||!["pendente","revisando","ajustado"].includes(v))) throw new Error("O plano contém itens que não pertencem ao laudo.");
  return Object.fromEntries(pares) as Plano;
}

export function registroParaLaudo(r: any): LaudoSalvo {
  return {id:r.id,criadoEm:r.created_at,projeto:r.resumo?.projeto || nomeProjeto(r.arquivo),assinatura:r.resumo?.assinatura || "",plano:r.resumo?.plano || {},laudo:{arquivo:r.arquivo,formato:r.formato,nota:r.nota,parcial:r.parcial,notas:Array.isArray(r.notas)?r.notas:[],achados:Array.isArray(r.achados)?r.achados:[],resumo:{paginas:r.resumo?.paginas||0,visuais:r.resumo?.visuais||0,tabelas:r.resumo?.tabelas||0,medidas:r.resumo?.medidas||0},versao:r.resumo?.versao || "1.0.0",paginas:r.resumo?.mapa || []}};
}

export function compararLaudos(atual: LaudoSalvo, anterior: LaudoSalvo) {
  const cobertura=(l:Laudo)=>l.notas.filter(n=>n.completa).map(n=>n.dimensao).sort().join(",");
  if(atual.id===anterior.id || atual.projeto.trim().toLocaleLowerCase()!==anterior.projeto.trim().toLocaleLowerCase() || atual.laudo.versao!==anterior.laudo.versao || cobertura(atual.laudo)!==cobertura(anterior.laudo)) return null;
  const atuais=new Set(atual.laudo.achados.map(chaveAchado));
  const antigos=new Set(anterior.laudo.achados.map(chaveAchado));
  return {diferenca:atual.laudo.nota-anterior.laudo.nota,novos:atual.laudo.achados.filter(a=>!antigos.has(chaveAchado(a))),resolvidos:anterior.laudo.achados.filter(a=>!atuais.has(chaveAchado(a))),persistentes:atual.laudo.achados.filter(a=>antigos.has(chaveAchado(a)))};
}
