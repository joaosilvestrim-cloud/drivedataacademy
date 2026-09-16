"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarVotacao, aberta } from "@/lib/votacao";

/* Registro do voto. Sem conta: a enquete é aberta, o e-mail é a identidade.
   Votar de novo com o mesmo e-mail troca a resposta, em vez de dar erro. */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function votar(formData: FormData) {
  const slug = (formData.get("slug") as string) || "";
  const texto = (campo: string) => ((formData.get(campo) as string) || "").trim();
  const volta = (erro: string) => redirect(`/votacao/${slug}?erro=${encodeURIComponent(erro)}`);

  const admin = createAdminClient();
  const { votacao, opcoes } = await carregarVotacao(admin, slug);
  if (!votacao) volta("Não encontrei essa votação.");
  if (!aberta(votacao!)) volta("Esta votação está encerrada.");

  const name = texto("name");
  const email = texto("email").toLowerCase();
  if (name.length < 2) volta("Escreva seu nome.");
  if (!EMAIL_OK.test(email)) volta("Confira o e-mail digitado.");

  const validos = new Set(opcoes.map((o) => o.id));
  const escolhas = formData.getAll("opcao").map(String).filter((id) => validos.has(id));
  if (escolhas.length === 0) volta("Escolha pelo menos uma opção.");
  if (escolhas.length > votacao!.max_choices) {
    volta(`Escolha no máximo ${votacao!.max_choices} ${votacao!.max_choices === 1 ? "opção" : "opções"}.`);
  }

  const { error } = await admin.from("poll_votes").upsert(
    {
      poll_id: votacao!.id,
      email,
      name,
      options: escolhas,
      suggestion: texto("suggestion") || null,
    },
    { onConflict: "poll_id,email" }
  );
  if (error) volta("Não consegui registrar seu voto. Tente de novo.");

  redirect(`/votacao/${slug}?ok=1`);
}
