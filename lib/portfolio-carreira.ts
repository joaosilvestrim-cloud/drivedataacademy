import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* A carreira do aluno além dos projetos: trajetória, conquistas,
   recomendações, objetivo e os detalhes de cada projeto.

   Tudo mora em tabelas novas (migration 20260929_universo_da_carreira.sql).
   Enquanto elas não existirem, cada leitura devolve vazio em vez de erro: o
   portfólio, o site e o 4D seguem funcionando como antes, e as partes novas
   simplesmente não aparecem. */

export type Detalhe = { project_id: string; papel: string | null; time_tamanho: number | null; duracao_meses: number | null; aprendizado: string | null; setor: string | null };
export type Experiencia = { id: string; cargo: string; organizacao: string | null; setor: string | null; inicio: string | null; fim: string | null; descricao: string | null };
export type Conquista = { id: string; titulo: string; data: string | null; descricao: string | null; link_prova: string | null };
export type Recomendacao = {
  id: string;
  project_id: string | null;
  status: string;
  token: string;
  autor_nome: string | null;
  autor_cargo: string | null;
  relacao: string | null;
  texto: string | null;
  criado_em: string;
  aprovado_em: string | null;
};
export type Objetivo = { titulo: string; requeridas: { id: string; motivo: string }[] | null };

export type Carreira = {
  /** As tabelas novas existem. Sem elas, a tela do aluno esconde as seções novas. */
  pronta: boolean;
  detalhes: Record<string, Detalhe>;
  experiencias: Experiencia[];
  conquistas: Conquista[];
  recomendacoes: Recomendacao[];
  objetivo: Objetivo | null;
};

const VAZIA: Carreira = { pronta: false, detalhes: {}, experiencias: [], conquistas: [], recomendacoes: [], objetivo: null };

/** Tabela que ainda não existe: o PostgREST responde 42P01 ou "schema cache". */
export function tabelaAusente(erro: { code?: string; message?: string } | null | undefined): boolean {
  return !!erro && (erro.code === "42P01" || erro.code === "PGRST205" || /schema cache|does not exist/i.test(erro.message || ""));
}

export async function carreiraDoAluno(admin: SupabaseClient, userId: string, opcoes: { soPublico?: boolean } = {}): Promise<Carreira> {
  const [det, exp, con, rec, obj] = await Promise.all([
    admin.from("portfolio_projeto_detalhes").select("project_id, papel, time_tamanho, duracao_meses, aprendizado, setor").eq("user_id", userId),
    admin.from("portfolio_experiencias").select("id, cargo, organizacao, setor, inicio, fim, descricao").eq("user_id", userId).order("inicio", { ascending: true, nullsFirst: false }),
    admin.from("portfolio_conquistas").select("id, titulo, data, descricao, link_prova").eq("user_id", userId).order("data", { ascending: true, nullsFirst: false }),
    admin
      .from("portfolio_recomendacoes")
      .select("id, project_id, status, token, autor_nome, autor_cargo, relacao, texto, criado_em, aprovado_em")
      .eq("user_id", userId)
      .order("criado_em", { ascending: false }),
    admin.from("portfolio_objetivos").select("titulo, requeridas").eq("user_id", userId).maybeSingle(),
  ]);
  if (tabelaAusente(exp.error)) return VAZIA;

  const recomendacoes = ((rec.data ?? []) as Recomendacao[])
    // Na página pública só entra recomendação aprovada, e nunca o token.
    .filter((r) => !opcoes.soPublico || r.status === "aprovada")
    .map((r) => (opcoes.soPublico ? { ...r, token: "" } : r));

  return {
    pronta: true,
    detalhes: Object.fromEntries(((det.data ?? []) as Detalhe[]).map((d) => [d.project_id, d])),
    experiencias: (exp.data ?? []) as Experiencia[],
    conquistas: (con.data ?? []) as Conquista[],
    recomendacoes,
    objetivo: (obj.data as Objetivo) ?? null,
  };
}
