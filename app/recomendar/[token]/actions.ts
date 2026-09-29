"use server";

import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBrandedEmail } from "@/lib/email";
import { limpar } from "@/lib/portfolio";

/* Quem escreve a recomendação não tem conta na Academy e não precisa ter.
   O link do convite é a autorização para escrever, e vale uma vez só. O
   e-mail confirmado é o que dá peso ao texto: sem ele, qualquer pessoa com o
   link, inclusive o próprio aluno, poderia escrever a própria recomendação. */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function escreverRecomendacao(token: string, dados: { nome: string; cargo: string; relacao: string; email: string; texto: string }) {
  const admin = createAdminClient();
  const { data: rec } = await admin.from("portfolio_recomendacoes").select("id, user_id, status").eq("token", token).maybeSingle();
  if (!rec) return { ok: false as const, erro: "Este convite não existe mais." };
  if (rec.status !== "convite") return { ok: false as const, erro: "Este convite já foi usado." };

  const nome = limpar(dados.nome, 100);
  const cargo = limpar(dados.cargo, 120);
  const relacao = limpar(dados.relacao, 120);
  const email = limpar(dados.email, 160).toLowerCase();
  const texto = (dados.texto || "").trim().slice(0, 1500);
  if (nome.length < 3) return { ok: false as const, erro: "Escreva seu nome." };
  if (!EMAIL.test(email)) return { ok: false as const, erro: "Informe um e-mail válido. Ele não aparece na página, serve só para confirmar que foi você." };
  if (texto.length < 80) return { ok: false as const, erro: "Escreva pelo menos algumas frases: o que a pessoa fez e como foi trabalhar com ela." };

  const codigo = String(randomInt(100000, 999999));
  await admin
    .from("portfolio_recomendacoes")
    .update({ autor_nome: nome, autor_cargo: cargo || null, relacao: relacao || null, autor_email: email, texto, codigo_email: codigo, status: "aguardando_email", escrito_em: new Date().toISOString() })
    .eq("id", rec.id);

  const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", rec.user_id).maybeSingle();
  const aluno = (perfil?.full_name || "o aluno").trim();
  const link = `${SITE}/recomendar/${token}/confirmar?c=${codigo}`;
  await sendBrandedEmail(
    email,
    `Confirme sua recomendação para ${aluno}`,
    "Confirme sua recomendação",
    `<p style="margin:0 0 16px;color:#cbd5e1">Olá, ${esc(nome.split(" ")[0])}! Obrigado por escrever sobre ${esc(aluno)}.</p>
     <p style="margin:0 0 20px;color:#cbd5e1">Para a recomendação valer, confirme que foi você quem escreveu. Depois disso ela vai para ${esc(aluno.split(" ")[0])} aprovar antes de aparecer no portfólio.</p>
     <a href="${link}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Confirmar que fui eu</a>
     <p style="margin:20px 0 0;color:#64748b;font-size:12px">Se você não escreveu nenhuma recomendação, ignore este e-mail.</p>`,
    { kind: "recomendacao-confirmar" },
  );
  return { ok: true as const };
}
