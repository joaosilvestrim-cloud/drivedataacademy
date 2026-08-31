"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Sobe a imagem de capa para o Storage (bucket público "covers") e devolve a URL pública.
// Retorna null se não veio arquivo (aí mantém a URL digitada).
async function uploadCover(supabase: ReturnType<typeof createAdminClient>, file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  const f = file as File;
  if (!f.size) return null;
  const bucket = "covers";
  await supabase.storage.createBucket(bucket, { public: true }).catch(() => {}); // ignora se já existe
  const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await f.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buf, { contentType: f.type || "image/jpeg", upsert: false });
  if (error) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
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

  // Se veio arquivo de capa, faz upload e usa a URL dele; senão mantém a URL digitada.
  const uploadedCover = await uploadCover(supabase, formData.get("cover_file"));

  const payload = {
    title,
    slug,
    subtitle: ((formData.get("subtitle") as string) || "").trim() || null,
    description: ((formData.get("description") as string) || "").trim() || null,
    cover_url: uploadedCover || ((formData.get("cover_url") as string) || "").trim() || null,
    level: ((formData.get("level") as string) || "").trim() || null,
    instructor_name: ((formData.get("instructor_name") as string) || "").trim() || null,
    price: Number((formData.get("price") as string) || "0") || 0,
    workload: ((formData.get("workload") as string) || "").trim() || null,
    certificate_enabled: formData.get("certificate_enabled") === "on",
    published: formData.get("published") === "on",
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

// Aloca (matricula) um aluno neste curso, na hora.
export async function enrollInCourse(formData: FormData) {
  const supabase = await admin();
  const courseId = formData.get("course_id") as string;
  const email = ((formData.get("email") as string) || "").trim();
  const back = (m: string, ok = true) => redirect(`/admin/cursos/${courseId}?${ok ? "ok" : "error"}=` + encodeURIComponent(m));
  if (!email) back("Informe o e-mail do aluno.", false);

  const target = await findUserByEmail(supabase, email);
  if (!target) back("Nenhum aluno com esse e-mail. Crie a conta em Acessos primeiro.", false);

  const { data: existing } = await supabase.from("enrollments").select("user_id").eq("course_id", courseId).eq("user_id", target!.id).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("enrollments").insert({ user_id: target!.id, course_id: courseId, source: "admin" });
    if (error) back(error.message, false);
  }
  refresh(courseId);
  back(`Aluno alocado: ${email}`);
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
  await supabase.from("lessons").insert({
    module_id,
    course_id,
    title: (formData.get("title") as string).trim(),
    type: (formData.get("type") as string) || "video",
    video_provider: (formData.get("video_provider") as string) || "youtube",
    video_id: ((formData.get("video_id") as string) || "").trim() || null,
    duration: ((formData.get("duration") as string) || "").trim() || null,
    is_preview: formData.get("is_preview") === "on",
    materials: parseMaterials(formData.get("materials") as string),
    position: count ?? 0,
  });
  refresh(course_id);
}

export async function saveLesson(formData: FormData) {
  const supabase = await admin();
  await supabase.from("lessons").update({
    title: (formData.get("title") as string).trim(),
    type: (formData.get("type") as string) || "video",
    video_provider: (formData.get("video_provider") as string) || "youtube",
    video_id: ((formData.get("video_id") as string) || "").trim() || null,
    content: ((formData.get("content") as string) || "").trim() || null,
    duration: ((formData.get("duration") as string) || "").trim() || null,
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
