import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import ExportCsv from "../ExportCsv";
import StudentsList from "./StudentsList";

export const dynamic = "force-dynamic";

export default async function AlunosPage() {
  let rows: any[] = [];
  try {
    const supabase = createAdminClient();
    const [{ data: userData }, { data: enr }, { data: profs }] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from("enrollments").select("user_id"),
      supabase.from("profiles").select("id, full_name, linkedin_url"),
    ]);

    const counts: Record<string, number> = {};
    for (const e of enr ?? []) counts[e.user_id] = (counts[e.user_id] || 0) + 1;
    const names: Record<string, string> = {};
    const linkedins: Record<string, string> = {};
    for (const p of profs ?? []) {
      names[p.id] = p.full_name || "";
      if (p.linkedin_url) linkedins[p.id] = p.linkedin_url;
    }

    rows = (userData?.users ?? []).map((u: any) => ({
      id: u.id,
      name: names[u.id] || u.user_metadata?.full_name || "",
      email: u.email || "",
      created_at: u.created_at,
      enrollments: counts[u.id] || 0,
      linkedin_url: linkedins[u.id] || null,
    }));
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Alunos</h1>
        <div className="mt-6"><AdminError message={e instanceof Error ? e.message : "Erro."} /></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Alunos</h1>
          <p className="mt-1 text-sm text-slate-400">{rows.length} usuário(s) cadastrado(s).</p>
        </div>
        <ExportCsv rows={rows.map((r) => ({ nome: r.name, email: r.email, cadastro: r.created_at, cursos: r.enrollments, linkedin: r.linkedin_url || "" }))} filename="alunos.csv" />
      </div>
      <StudentsList rows={rows} />
    </div>
  );
}
