"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { liveDePresenca, normalizarCodigo, emitirCertificadoDeParticipacao } from "@/lib/presenca";
import { sendLiveCertificateEmail } from "@/lib/email";

/* Confirmação de presença na live. Não exige conta: o objetivo é justamente
   receber quem ainda não é aluno. O certificado sai na hora e o cadastro fica
   guardado em live_attendances. */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function registrarPresenca(formData: FormData) {
  const liveId = (formData.get("live_id") as string) || "";
  const texto = (campo: string) => ((formData.get(campo) as string) || "").trim();
  const volta = (erro: string) => redirect(`/presenca?live=${liveId}&erro=${encodeURIComponent(erro)}`);

  const admin = createAdminClient();
  const { live, aberta } = await liveDePresenca(admin, liveId);
  if (!live) volta("Não encontrei essa live.");
  if (!aberta) volta("A confirmação de presença desta live já foi encerrada.");

  const name = texto("name");
  const email = texto("email").toLowerCase();
  if (name.length < 3 || !name.includes(" ")) volta("Escreva seu nome completo, do jeito que deve sair no certificado.");
  if (!EMAIL_OK.test(email)) volta("Confira o e-mail digitado.");

  if (live!.attendance_code && normalizarCodigo(texto("code")) !== normalizarCodigo(live!.attendance_code)) {
    volta("A palavra-chave não confere. Ela é dita durante a live.");
  }

  const { error } = await admin.from("live_attendances").upsert(
    {
      live_id: live!.id,
      name,
      email,
      phone: texto("phone") || null,
      company: texto("company") || null,
      role: texto("role") || null,
      goal: texto("goal") || null,
      consent: formData.get("consent") === "on",
    },
    { onConflict: "live_id,email" }
  );
  if (error) volta("Não consegui registrar sua presença. Tente de novo.");

  const { code } = await emitirCertificadoDeParticipacao(admin, live!, { name, email });
  await admin.from("live_attendances").update({ certificate_code: code }).eq("live_id", live!.id).eq("email", email);

  // O e-mail é o que faz o certificado sobreviver ao fechar a aba.
  await sendLiveCertificateEmail(email, name, live!.title, code);

  redirect(`/certificado/${code}?novo=1`);
}
