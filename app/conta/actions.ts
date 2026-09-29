"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WORKSHOP_OPTIONS } from "./workshop";

// URL assinada para o aluno subir a foto de perfil (bucket público "avatars").
export async function signAvatarUpload(ext: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Faça login." };
  const admin = createAdminClient();
  const bucket = "avatars";
  await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
  const clean = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}-${Date.now()}.${clean}`;
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "falha" };
  const url = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { ok: true as const, path: data.path, token: data.token, url };
}

// Campos do perfil que o próprio aluno pode editar.
const PROFILE_FIELDS = [
  "full_name", "phone", "country", "linkedin_url",
  // cv_url saiu: o envio de currículo foi removido do perfil. A coluna
  // continua no banco com o que já foi enviado, mas ninguém escreve nela.
  "headline", "bio", "skills", "avatar_url", "portfolio_url",
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

// Grava o perfil pelo servidor (service role). Evita depender da RLS/sessão do
// navegador, que fazia o update "passar" sem alterar nenhuma linha.
export async function saveProfile(patch: Partial<Record<ProfileField, string>>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Faça login novamente." };

  const payload: Record<string, string | null> = {};
  for (const key of PROFILE_FIELDS) {
    if (!(key in patch)) continue;
    const v = patch[key];
    payload[key] = typeof v === "string" && v.trim() ? v.trim() : null;
  }
  if (Object.keys(payload).length === 0) return { ok: true as const };

  // upsert, não update: contas criadas sem o trigger de perfil não têm linha em
  // profiles, e um update nessas contas afeta 0 linhas sem retornar erro nenhum.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .upsert({ id: user.id, ...payload, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!data?.length) return { ok: false as const, error: "Não foi possível gravar o perfil." };

  revalidatePath("/conta/perfil");
  revalidatePath("/conta/vitrine");
  revalidatePath("/conta/comunidade");
  return { ok: true as const };
}

/* Voto da enquete dentro da conta. O aluno clica na opção e pronto: o e-mail
   vem da sessão, então não existe formulário de identificação. É a mesma
   tabela da página pública, para as duas telas mostrarem o mesmo número. */
export async function votarEnquete(formData: FormData) {
  const optionId = ((formData.get("option_id") as string) || "").trim();
  if (!optionId) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();

  const { data: opcao } = await admin.from("poll_options").select("id, poll_id").eq("id", optionId).maybeSingle();
  if (!opcao) return;
  const { data: enquete } = await admin.from("polls").select("id, slug, max_choices, published, closes_at").eq("id", opcao.poll_id).maybeSingle();
  if (!enquete || !enquete.published) return;
  if (enquete.closes_at && new Date(enquete.closes_at).getTime() < Date.now()) return;

  const email = (user.email || "").toLowerCase();
  const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { data: voto } = await admin.from("poll_votes").select("options").eq("poll_id", enquete.id).eq("email", email).maybeSingle();

  const atuais: string[] = voto?.options ?? [];
  let escolhas: string[];
  if (enquete.max_choices <= 1) {
    // Clicar na opção já marcada desmarca: o aluno pode tirar o voto.
    escolhas = atuais.includes(optionId) ? [] : [optionId];
  } else if (atuais.includes(optionId)) {
    escolhas = atuais.filter((id) => id !== optionId);
  } else {
    escolhas = [...atuais, optionId].slice(-enquete.max_choices);
  }

  if (escolhas.length === 0) {
    await admin.from("poll_votes").delete().eq("poll_id", enquete.id).eq("email", email);
  } else {
    await admin.from("poll_votes").upsert(
      { poll_id: enquete.id, email, name: perfil?.full_name || user.email, options: escolhas },
      { onConflict: "poll_id,email" }
    );
  }

  revalidatePath("/conta");
  revalidatePath(`/votacao/${enquete.slug}`);
}

export async function voteWorkshop(formData: FormData) {
  const option = ((formData.get("option") as string) || "").trim();
  if (!WORKSHOP_OPTIONS.includes(option)) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  await admin.from("workshop_votes").upsert(
    { user_id: user.id, option, created_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  revalidatePath("/conta");
}

/* Dados para a nota fiscal (lib/dados-fiscais).

   O aluno preenche no perfil, a Academy guarda, atualiza o endereço no
   cliente do Asaas e leva tudo ao cadastro dele no Conta Azul, onde a nota é
   emitida. O CPF de quem pagou pelo Asaas não passa por aqui: já está lá. */
export async function consultarCep(cep: string) {
  const { enderecoDoCep } = await import("@/lib/dados-fiscais");
  return enderecoDoCep(cep);
}

export async function salvarDadosFiscais(entrada: Record<string, string>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, erro: "Faça login novamente." };

  const { clienteAsaasPorEmail, faltandoParaNota, sincronizarAluno, SEM_DADOS } = await import("@/lib/dados-fiscais");
  const { documentoValido } = await import("@/lib/conta-azul-venda");
  const { tabelaAusente } = await import("@/lib/portfolio-carreira");

  const limpo = (k: string, max: number) => String(entrada?.[k] ?? "").trim().slice(0, max);
  const d = {
    ...SEM_DADOS,
    cpf: limpo("cpf", 20).replace(/\D/g, ""),
    rg: limpo("rg", 20),
    cep: limpo("cep", 12).replace(/\D/g, ""),
    logradouro: limpo("logradouro", 120),
    numero: limpo("numero", 20),
    complemento: limpo("complemento", 60),
    bairro: limpo("bairro", 60),
    cidade: limpo("cidade", 60),
    uf: limpo("uf", 2).toUpperCase(),
  };

  const asaas = await clienteAsaasPorEmail(user.email);
  // Quem pagou pelo Asaas já tem CPF lá; só quem pagou por fora informa aqui.
  const cpf = asaas?.cpf || d.cpf;
  if (!asaas?.cpf && !documentoValido(d.cpf)) return { ok: false as const, erro: "Confira o CPF: os números não formam um CPF válido." };
  const falta = faltandoParaNota({ ...d, cpf });
  if (falta.length) return { ok: false as const, erro: `Falta preencher: ${falta.join(", ")}.` };

  const admin = createAdminClient();
  const { error } = await admin.from("dados_fiscais").upsert(
    { user_id: user.id, ...d, cpf: asaas?.cpf ? null : d.cpf, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) {
    return { ok: false as const, erro: tabelaAusente(error) ? "Essa parte ainda está sendo ligada pelo time. Tente de novo mais tarde." : error.message };
  }

  // O endereço também vai para o cliente do Asaas, para as duas fontes não divergirem.
  if (asaas?.id && process.env.ASAAS_API_KEY) {
    await fetch(`${process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3"}/customers/${asaas.id}`, {
      method: "PUT",
      headers: { access_token: process.env.ASAAS_API_KEY, "User-Agent": "drivedata-academy", "Content-Type": "application/json" },
      body: JSON.stringify({ postalCode: d.cep, address: d.logradouro, addressNumber: d.numero, complement: d.complemento || undefined, province: d.bairro }),
    }).catch(() => null);
  }

  const r = await sincronizarAluno(admin, user.id, user.email);
  revalidatePath("/conta/perfil");
  return { ok: true as const, mensagem: r.mensagem };
}
