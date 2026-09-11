import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, ErrorState, Alert } from "@/components/ui/layout";
import ExportCsv from "../ExportCsv";
import StudentsList from "./StudentsList";

export const dynamic = "force-dynamic";

// O Auth devolve no máximo 1000 por chamada. Mantemos a chamada única, que era
// o comportamento anterior, mas agora o truncamento é DECLARADO em vez de
// silencioso: antes a tela dizia "N usuários cadastrados" com N errado.
const PER_PAGE = 1000;

export default async function AlunosPage() {
  let rows: any[] = [];
  let truncado = false;

  try {
    const supabase = createAdminClient();
    const [{ data: userData }, { data: enr }, { data: profs }, { data: memb }] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: PER_PAGE }),
      supabase.from("enrollments").select("user_id"),
      supabase.from("profiles").select("id, full_name, linkedin_url"),
      // Status de acesso: o fato mais operacional desta tela, e que faltava.
      // Uma consulta resolve todos os alunos de uma vez.
      supabase.from("memberships").select("user_id, status, expires_at"),
    ]);

    const counts: Record<string, number> = {};
    for (const e of enr ?? []) counts[e.user_id] = (counts[e.user_id] || 0) + 1;

    const names: Record<string, string> = {};
    const linkedins: Record<string, string> = {};
    for (const p of profs ?? []) {
      names[p.id] = p.full_name || "";
      if (p.linkedin_url) linkedins[p.id] = p.linkedin_url;
    }

    // Mesma regra do lib/access.ts: ativo, e sem expiração ou expiração futura.
    const agora = Date.now();
    const ativos = new Set<string>();
    for (const m of memb ?? []) {
      if (m.status !== "active") continue;
      if (!m.expires_at || new Date(m.expires_at).getTime() > agora) ativos.add(m.user_id);
    }

    const users = userData?.users ?? [];
    truncado = users.length >= PER_PAGE;

    rows = users.map((u: any) => ({
      id: u.id,
      name: names[u.id] || u.user_metadata?.full_name || "",
      email: u.email || "",
      created_at: u.created_at,
      enrollments: counts[u.id] || 0,
      linkedin_url: linkedins[u.id] || null,
      access: ativos.has(u.id) ? "ativo" : "sem",
    }));
  } catch (e) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader context="Administração" title="Alunos" />
        <ErrorState
          title="Não foi possível carregar os alunos"
          description={e instanceof Error ? e.message : "Tente novamente em alguns instantes."}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context="Administração"
        title="Alunos"
        action={
          <ExportCsv
            rows={rows.map((r) => ({
              nome: r.name,
              email: r.email,
              cadastro: r.created_at,
              acesso: r.access === "ativo" ? "ativo" : "sem acesso",
              cursos: r.enrollments,
              linkedin: r.linkedin_url || "",
            }))}
            filename="alunos.csv"
          />
        }
      />

      {truncado && (
        <Alert tone="attention" title="Lista parcial">
          O Auth devolve no máximo {PER_PAGE} contas por consulta, então esta tela mostra as{" "}
          {PER_PAGE} primeiras. A exportação segue o mesmo limite.
        </Alert>
      )}

      <StudentsList rows={rows} />
    </div>
  );
}
