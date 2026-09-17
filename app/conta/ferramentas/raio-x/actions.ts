"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { appendPracticalEvidence } from "@/lib/knowledge/practical";
import { usuarioAtual } from "@/lib/sessao";
import type { Dimensao, Laudo } from "@/lib/raiox/tipos";

/* Guarda o laudo, nunca o arquivo.

   A leitura do .pbix acontece no navegador do aluno. O que chega aqui é o
   resultado: nota, achados e o tamanho do relatório. É o suficiente para o
   histórico, para a curva de evolução e para a evidência no Knowledge
   Universe, e não tira um único dado de cliente da máquina dele. */

const notaDe = (laudo: Laudo, d: Dimensao) => laudo.notas.find((n) => n.dimensao === d);

/* De qual competência do catálogo cada parte do laudo fala. Auditar o próprio
   relatório é prática, e a qualidade da evidência é a nota que o trabalho
   tirou: quem entrega um painel ruim não ganha crédito de quem entrega um bom. */
function evidencias(laudo: Laudo) {
  const design = notaDe(laudo, "design")?.nota ?? null;
  const clareza = notaDe(laudo, "clareza")?.nota ?? null;
  const modelo = notaDe(laudo, "modelo");
  const dax = notaDe(laudo, "dax");
  const lista: { competency: string; quality: number; label: string }[] = [
    { competency: "power-bi", quality: laudo.nota / 100, label: `Raio-X de ${laudo.arquivo}: nota ${laudo.nota}` },
  ];
  if (design != null && clareza != null) {
    lista.push({
      competency: "visualizacao",
      quality: (design + clareza) / 200,
      label: `Raio-X de ${laudo.arquivo}: design ${design}, clareza ${clareza}`,
    });
  }
  if (modelo?.completa) lista.push({ competency: "modelagem", quality: modelo.nota / 100, label: `Raio-X de ${laudo.arquivo}: modelo ${modelo.nota}` });
  if (dax?.completa) lista.push({ competency: "dax", quality: dax.nota / 100, label: `Raio-X de ${laudo.arquivo}: DAX ${dax.nota}` });
  return lista;
}

export async function salvarLaudo(laudo: Laudo) {
  const user = await usuarioAtual();
  if (!user) return { ok: false as const, erro: "Faça login para salvar o laudo." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("raiox_reports")
    .insert({
      user_id: user.id,
      arquivo: String(laudo.arquivo || "").slice(0, 200),
      formato: laudo.formato,
      nota: laudo.nota,
      parcial: laudo.parcial,
      notas: laudo.notas,
      achados: laudo.achados,
      resumo: laudo.resumo,
    })
    .select("id")
    .single();

  if (error) {
    // Sem a tabela, a ferramenta continua funcionando: só não guarda histórico.
    console.error("[raio-x] laudo não salvo", error.message);
    return { ok: false as const, erro: "Analisei o arquivo, mas não consegui guardar no histórico." };
  }

  /* Evidência no Knowledge Universe. Falhar aqui não derruba o laudo: o aluno
     já recebeu o que importa na tela. */
  for (const e of evidencias(laudo)) {
    try {
      await appendPracticalEvidence({
        userId: user.id,
        competency: e.competency,
        dimension: "exercise",
        group: "raio-x",
        units: 1,
        quality: Math.max(0, Math.min(1, e.quality)),
        advanced: false,
        label: e.label.slice(0, 240),
        requestId: crypto.randomUUID(),
      });
    } catch {
      /* segue o jogo */
    }
  }

  revalidatePath("/conta/ferramentas/raio-x");
  return { ok: true as const, id: data?.id as string | undefined };
}
