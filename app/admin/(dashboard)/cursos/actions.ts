"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { duracaoNoProvedor } from "@/lib/duracao";
import { BUCKET_MATERIAIS } from "@/lib/materiais";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

// "Título | https://..." por linha -> [{title, url}]
function parseMaterials(raw: string) {
  return (raw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("|").map((s) => s.trim());
      return parts[1] ? { title: parts[0], url: parts[1] } : { title: "Material", url: parts[0] };
    });
}

function refresh(courseId?: string) {
  revalidatePath("/admin/cursos");
  if (courseId) revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath("/cursos");
}

// ---------- Curso ----------
export async function saveCourse(formData: FormData) {
  const supabase = await admin();
  const id = (formData.get("id") as string) || null;
  const title = (formData.get("title") as string).trim();
  const slugInput = (formData.get("slug") as string).trim();
  const slug = slugInput ? slugify(slugInput) : slugify(title);

  // Vazio: fora de venda. 0: incluso na assinatura. Acima de zero, mínimo do Asaas.
  const subRaw = ((formData.get("subscriber_price") as string) || "").trim().replace(",", ".");
  const subscriber_price = subRaw === "" ? null : Number(subRaw);
  if (subscriber_price != null && (isNaN(subscriber_price) || subscriber_price < 0 || (subscriber_price > 0 && subscriber_price < 5))) {
    redirect(`/admin/cursos${id ? `/${id}` : ""}?error=${encodeURIComponent("Preço para assinante: deixe vazio, use 0 para incluso ou um valor a partir de R$ 5.")}`);
  }

  const payload = {
    title,
    slug,
    subtitle: ((formData.get("subtitle") as string) || "").trim() || null,
    description: ((formData.get("description") as string) || "").trim() || null,
    cover_url: ((formData.get("cover_url") as string) || "").trim() || null,
    level: ((formData.get("level") as string) || "").trim() || null,
    instructor_name: ((formData.get("instructor_name") as string) || "").trim() || null,
    price: Number((formData.get("price") as string) || "0") || 0,
    subscriber_price,
    workload: ((formData.get("workload") as string) || "").trim() || null,
    certificate_enabled: formData.get("certificate_enabled") === "on",
    published: formData.get("published") === "on",
    coming_soon: formData.get("coming_soon") === "on",
    access_mode: (formData.get("access_mode") as string) === "in_company" ? "in_company" : "catalogo",
    client_name: ((formData.get("client_name") as string) || "").trim() || null,
  };

  if (id) {
    await supabase.from("courses").update(payload).eq("id", id);
    refresh(id);
    redirect(`/admin/cursos/${id}`);
  } else {
    const { data } = await supabase.from("courses").insert(payload).select("id").single();
    refresh();
    redirect(`/admin/cursos/${data?.id ?? ""}`);
  }
}

/* Duplica um curso com módulos, aulas e arquivos de material. Serve para o
   caso in company: a mesma trilha vira duas, uma fechada na empresa e outra no
   catálogo. A cópia nasce despublicada e sem aluno nenhum: matrícula,
   progresso, certificado e avaliação não são copiados. */
export async function duplicarCurso(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;

  const { data: curso } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (!curso) redirect("/admin/cursos?error=" + encodeURIComponent("Curso não encontrado."));

  const { id: _id, created_at, updated_at, ...campos } = curso as any;
  let slug = slugify(`${curso.slug}-copia`);
  const { data: existe } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (existe) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: novo, error } = await supabase
    .from("courses")
    .insert({ ...campos, slug, title: `${curso.title} (cópia)`, published: false })
    .select("id")
    .single();
  if (error || !novo) redirect("/admin/cursos?error=" + encodeURIComponent(error?.message || "Não consegui duplicar."));

  const { data: modulos } = await supabase.from("course_modules").select("*").eq("course_id", id).order("position");
  const mapaModulo: Record<string, string> = {};
  for (const m of modulos ?? []) {
    const { id: mid, created_at: _c, course_id: _cc, ...mc } = m as any;
    const { data: novoModulo } = await supabase.from("course_modules").insert({ ...mc, course_id: novo.id }).select("id").single();
    if (novoModulo) mapaModulo[mid] = novoModulo.id;
  }

  const { data: aulas } = await supabase.from("lessons").select("*").eq("course_id", id).order("position");
  for (const a of aulas ?? []) {
    const { id: aid, created_at: _c, course_id: _cc, module_id, ...ac } = a as any;
    const { data: novaAula } = await supabase
      .from("lessons")
      .insert({ ...ac, course_id: novo.id, module_id: mapaModulo[module_id] ?? null })
      .select("id")
      .single();
    if (!novaAula) continue;

    // Arquivos da aula de materiais apontam para o mesmo objeto no Storage.
    const { data: arquivos } = await supabase.from("ready_materials").select("*").eq("lesson_id", aid);
    for (const arq of arquivos ?? []) {
      const { id: _fid, created_at: _fc, lesson_id, ...fc } = arq as any;
      await supabase.from("ready_materials").insert({ ...fc, lesson_id: novaAula.id });
    }
  }

  refresh(novo.id);
  redirect(`/admin/cursos/${novo.id}?ok=` + encodeURIComponent("Cópia criada. Ela nasce despublicada e sem alunos."));
}

export async function deleteCourse(formData: FormData) {
  const supabase = await admin();
  await supabase.from("courses").delete().eq("id", formData.get("id") as string);
  refresh();
  redirect("/admin/cursos");
}

async function findUserByEmail(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) break;
    page++;
  }
  return null;
}

// Aloca (matricula) um aluno neste curso, na hora. Aceita user_id (do dropdown) ou e-mail.
export async function enrollInCourse(formData: FormData) {
  const supabase = await admin();
  const courseId = formData.get("course_id") as string;
  const userId = ((formData.get("user_id") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const back = (m: string, ok = true) => redirect(`/admin/cursos/${courseId}?${ok ? "ok" : "error"}=` + encodeURIComponent(m));

  let target: any = null;
  if (userId) {
    const { data } = await supabase.auth.admin.getUserById(userId);
    target = data?.user ?? null;
  } else if (email) {
    target = await findUserByEmail(supabase, email);
  } else {
    back("Selecione um aluno.", false);
  }
  if (!target) back("Aluno não encontrado. Crie a conta em Acessos primeiro.", false);

  const { data: existing } = await supabase.from("enrollments").select("user_id").eq("course_id", courseId).eq("user_id", target.id).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("enrollments").insert({ user_id: target.id, course_id: courseId, source: "admin" });
    if (error) back(error.message, false);
  }
  refresh(courseId);
  back(`Aluno alocado: ${target.email || ""}`);
}

// Remove a matrícula de um aluno neste curso.
export async function unenrollFromCourse(formData: FormData) {
  const supabase = await admin();
  const courseId = formData.get("course_id") as string;
  const userId = formData.get("user_id") as string;
  await supabase.from("enrollments").delete().eq("course_id", courseId).eq("user_id", userId);
  refresh(courseId);
  redirect(`/admin/cursos/${courseId}?ok=` + encodeURIComponent("Aluno removido do curso."));
}

export async function togglePublishCourse(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  await supabase.from("courses").update({ published: formData.get("next") === "true" }).eq("id", id);
  refresh(id);
}

// ---------- Módulo ----------
export async function addModule(formData: FormData) {
  const supabase = await admin();
  const course_id = formData.get("course_id") as string;
  const { count } = await supabase.from("course_modules").select("*", { count: "exact", head: true }).eq("course_id", course_id);
  await supabase.from("course_modules").insert({ course_id, title: (formData.get("title") as string).trim(), position: count ?? 0 });
  refresh(course_id);
}

export async function renameModule(formData: FormData) {
  const supabase = await admin();
  await supabase.from("course_modules").update({ title: (formData.get("title") as string).trim() }).eq("id", formData.get("id") as string);
  refresh(formData.get("course_id") as string);
}

export async function deleteModule(formData: FormData) {
  const supabase = await admin();
  await supabase.from("course_modules").delete().eq("id", formData.get("id") as string);
  refresh(formData.get("course_id") as string);
}

// ---------- Aula ----------
export async function addLesson(formData: FormData) {
  const supabase = await admin();
  const module_id = formData.get("module_id") as string;
  const course_id = formData.get("course_id") as string;
  const { count } = await supabase.from("lessons").select("*", { count: "exact", head: true }).eq("module_id", module_id);
  const tipo = (formData.get("type") as string) || "video";
  const provedor = (formData.get("video_provider") as string) || "youtube";
  const video = ((formData.get("video_id") as string) || "").trim() || null;
  // Em branco, a duração vem do próprio YouTube ou Panda. Digitada à mão, vale o que foi digitado.
  const duracao = ((formData.get("duration") as string) || "").trim() || (tipo === "video" ? await duracaoNoProvedor(provedor, video) : null);
  await supabase.from("lessons").insert({
    module_id,
    course_id,
    title: (formData.get("title") as string).trim(),
    type: (formData.get("type") as string) || "video",
    video_provider: (formData.get("video_provider") as string) || "youtube",
    video_id: ((formData.get("video_id") as string) || "").trim() || null,
    duration: duracao,
    is_preview: formData.get("is_preview") === "on",
    materials: parseMaterials(formData.get("materials") as string),
    position: count ?? 0,
  });
  refresh(course_id);
}

export async function saveLesson(formData: FormData) {
  const supabase = await admin();
  const tipo = (formData.get("type") as string) || "video";
  const provedor = (formData.get("video_provider") as string) || "youtube";
  const video = ((formData.get("video_id") as string) || "").trim() || null;
  // Em branco, a duração vem do próprio YouTube ou Panda. Digitada à mão, vale o que foi digitado.
  const duracao = ((formData.get("duration") as string) || "").trim() || (tipo === "video" ? await duracaoNoProvedor(provedor, video) : null);
  await supabase.from("lessons").update({
    title: (formData.get("title") as string).trim(),
    type: (formData.get("type") as string) || "video",
    video_provider: (formData.get("video_provider") as string) || "youtube",
    video_id: ((formData.get("video_id") as string) || "").trim() || null,
    content: ((formData.get("content") as string) || "").trim() || null,
    duration: duracao,
    is_preview: formData.get("is_preview") === "on",
    materials: parseMaterials(formData.get("materials") as string),
  }).eq("id", formData.get("id") as string);
  const courseId = formData.get("course_id") as string;
  refresh(courseId);
  redirect(`/admin/cursos/${courseId}?ok=Aula+salva`);
}

export async function deleteLesson(formData: FormData) {
  const supabase = await admin();
  await supabase.from("lessons").delete().eq("id", formData.get("id") as string);
  refresh(formData.get("course_id") as string);
}

// ---------- Reordenar (módulo ou aula) ----------
export async function moveItem(formData: FormData) {
  const supabase = await admin();
  const table = formData.get("table") as string; // course_modules | lessons
  const filterCol = formData.get("filter_col") as string; // course_id | module_id
  const filterVal = formData.get("filter_val") as string;
  const id = formData.get("id") as string;
  const dir = Number(formData.get("dir"));
  const course_id = formData.get("course_id") as string;

  const { data: rows } = await supabase.from(table).select("id, position").eq(filterCol, filterVal).order("position");
  if (!rows) return;
  const idx = rows.findIndex((r: any) => r.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= rows.length) return;
  const a: any = rows[idx];
  const b: any = rows[j];
  await supabase.from(table).update({ position: b.position }).eq("id", a.id);
  await supabase.from(table).update({ position: a.position }).eq("id", b.id);
  refresh(course_id);
}

/* Preenche a duração das aulas que estão em branco, buscando no YouTube ou no
   Panda. Não sobrescreve duração digitada à mão. Serve para os cursos que já
   existiam antes da busca automática. */
export async function recalcularDuracoes(formData: FormData) {
  const supabase = await admin();
  const courseId = formData.get("course_id") as string;
  const { data: aulas } = await supabase.from("lessons").select("id, video_provider, video_id, duration").eq("course_id", courseId);
  let preenchidas = 0;
  let semLeitura = 0;
  for (const a of aulas ?? []) {
    if ((a.duration || "").trim() || !a.video_id) continue;
    const d = await duracaoNoProvedor(a.video_provider, a.video_id);
    if (d) {
      await supabase.from("lessons").update({ duration: d }).eq("id", a.id);
      preenchidas++;
    } else {
      semLeitura++;
    }
  }
  refresh(courseId);
  const msg = semLeitura
    ? `${preenchidas} aula(s) ganharam duração. ${semLeitura} não puderam ser lidas no provedor e seguem em branco.`
    : `${preenchidas} aula(s) ganharam duração.`;
  redirect(`/admin/cursos/${courseId}?ok=${encodeURIComponent(msg)}`);
}

// ---------- Aula de materiais para download ----------
function nomeSeguro(nome: string) {
  return (nome || "arquivo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/* URL de envio assinada. O navegador sobe o arquivo direto no Storage, sem
   passar pelo servidor: um .pbix passa fácil de dezenas de MB e estouraria o
   limite de corpo da Vercel. O bucket é privado e nasce aqui se não existir. */
export async function assinarUploadMaterial(nomeArquivo: string) {
  const supabase = await admin();
  await supabase.storage.createBucket(BUCKET_MATERIAIS, { public: false }).catch(() => {});
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro(nomeArquivo)}`;
  const { data, error } = await supabase.storage.from(BUCKET_MATERIAIS).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "Não consegui preparar o envio." };
  return { ok: true as const, path: data.path, token: data.token };
}

/* Chamada pelo MaterialUpload assim que o arquivo termina de subir: o arquivo já
   entra na aula, sem um segundo passo de formulário. O nome vem do arquivo. */
export async function registrarArquivoDaAula(lessonId: string, courseId: string, arquivo: { path: string; name: string; size: number }) {
  const supabase = await admin();
  const title = arquivo.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || arquivo.name;
  const { count } = await supabase.from("ready_materials").select("*", { count: "exact", head: true }).eq("lesson_id", lessonId);
  const { error } = await supabase.from("ready_materials").insert({
    lesson_id: lessonId,
    title,
    description: null,
    category: "outro",
    file_path: arquivo.path,
    file_name: arquivo.name,
    file_size: arquivo.size || null,
    external_url: null,
    published: true,
    position: count ?? 0,
  });
  if (error) return { ok: false as const, error: error.message };
  refresh(courseId);
  return { ok: true as const };
}

export async function salvarMaterialDaAula(formData: FormData) {
  const supabase = await admin();
  const lesson_id = formData.get("lesson_id") as string;
  const courseId = formData.get("course_id") as string;
  const title = ((formData.get("title") as string) || "").trim();
  const file_path = ((formData.get("file_path") as string) || "").trim() || null;
  const external_url = ((formData.get("external_url") as string) || "").trim() || null;
  const volta = (msg: string, erro = false) =>
    redirect(`/admin/cursos/${courseId}?${erro ? "error" : "ok"}=${encodeURIComponent(msg)}`);

  if (!title) volta("Informe o nome do material.", true);
  if (!file_path && !external_url) volta("Envie um arquivo ou informe um link.", true);

  const { count } = await supabase.from("ready_materials").select("*", { count: "exact", head: true }).eq("lesson_id", lesson_id);
  const { error } = await supabase.from("ready_materials").insert({
    lesson_id,
    title,
    description: ((formData.get("description") as string) || "").trim() || null,
    category: "outro",
    file_path,
    file_name: ((formData.get("file_name") as string) || "").trim() || null,
    file_size: Number(formData.get("file_size") || 0) || null,
    external_url,
    published: true,
    position: count ?? 0,
  });
  if (error) volta(error.message, true);
  refresh(courseId);
  volta("Material adicionado à aula.");
}

export async function excluirMaterialDaAula(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const courseId = formData.get("course_id") as string;
  const { data: m } = await supabase.from("ready_materials").select("file_path").eq("id", id).maybeSingle();
  await supabase.from("ready_materials").delete().eq("id", id);
  if (m?.file_path) await supabase.storage.from(BUCKET_MATERIAIS).remove([m.file_path]);
  refresh(courseId);
  redirect(`/admin/cursos/${courseId}?ok=Material+removido`);
}
