import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, ErrorState, Alert } from "@/components/ui/layout";
import ExportCsv from "../ExportCsv";
import StudentsList from "./StudentsList";
import { acessoVigente } from "@/lib/acesso-vigente";

export const dynamic = "force-dynamic";

// O Auth devolve no máximo 1000 por chamada. Mantemos a chamada única, que era
// o comportamento anterior, mas agora o truncamento é DECLARADO em vez de
// silencioso: antes a tela dizia "N usuários cadastrados" com N errado.
const PER_PAGE = 1000;

const ROTULO_ACESSO: Record<string, string> = {
  ativo: "ativo",
  cancelado: "cancelado, com acesso",
  encerrado: "cancelado, acesso encerrado",
  reembolsado: "reembolsado",
  reembolso_pendente: "reembolso pendente",
  sem: "sem acesso",
};

export default async function AlunosPage() {
  let rows: any[] = [];
  let truncado = false;

  try {
    const supabase = createAdminClient();
    const [{ data: userData }, { data: enr }, { data: profs }, { data: memb }, { data: devolvidos }, { data: cancels }] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: PER_PAGE }),
      supabase.from("enrollments").select("user_id"),
      supabase.from("profiles").select("id, full_name, linkedin_url"),
      // Status de acesso: o fato mais operacional desta tela, e que faltava.
      // Uma consulta resolve todos os alunos de uma vez.
      supabase.from("memberships").select("user_id, status, expires_at"),
      // Saídas: reembolso (pedido devolvido) e cancelamento (pedido do aluno).
      supabase.from("orders").select("user_id, email, created_at").eq("status", "refunded").order("created_at", { ascending: false }),
      supabase.from("subscription_cancellations").select("user_id, email, detalhe, created_at").order("created_at", { ascending: false }),
    ]);

    const counts: Record<string, number> = {};
    for (const e of enr ?? []) counts[e.user_id] = (counts[e.user_id] || 0) + 1;

    const names: Record<string, string> = {};
    const linkedins: Record<string, string> = {};
    for (const p of profs ?? []) {
      names[p.id] = p.full_name || "";
      if (p.linkedin_url) linkedins[p.id] = p.linkedin_url;
    }

    /* Mesma regra do lib/access.ts (lib/acesso-vigente.ts): ativa, ou cancelada
       com o período pago correndo. Quem cancelou aparece como Cancelado, com a
       data em que o acesso acaba; quem teve o dinheiro devolvido, Reembolsado. */
    const agora = Date.now();
    const ativos = new Set<string>();
    const canceladoAte = new Map<string, string | null>();
    for (const m of memb ?? []) {
      if (m.status === "canceled") canceladoAte.set(m.user_id, m.expires_at);
      if (acessoVigente(m, agora) && m.status === "active") ativos.add(m.user_id);
    }
    const reembolsadoEm = new Map<string, string>();
    for (const o of devolvidos ?? []) {
      const chave = o.user_id || o.email;
      if (chave && !reembolsadoEm.has(chave)) reembolsadoEm.set(chave, o.created_at);
    }
    // Reembolso que o próprio aluno pediu pela tela (e se o Asaas recusou).
    const pedidoReembolso = new Map<string, { em: string; falhou: boolean }>();
    const cancelouEm = new Map<string, string>();
    for (const c of cancels ?? []) {
      const chave = c.user_id || c.email;
      if (!chave) continue;
      if (!cancelouEm.has(chave)) cancelouEm.set(chave, c.created_at);
      const texto = String(c.detalhe || "");
      if (texto.includes("Reembolso pedido pelo aluno") && !pedidoReembolso.has(chave)) {
        pedidoReembolso.set(chave, { em: c.created_at, falhou: texto.includes("falhou no Asaas") });
      }
    }
    const dia = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "");

    function situacao(u: any): { access: string; nota: string | null } {
      const de = <T,>(m: Map<string, T>) => m.get(u.id) ?? (u.email ? m.get(u.email) : undefined);
      if (ativos.has(u.id)) return { access: "ativo", nota: null };
      const pediu = de(pedidoReembolso);
      const devolvido = de(reembolsadoEm);
      if (devolvido || (pediu && !pediu.falhou)) {
        return { access: "reembolsado", nota: pediu ? `pediu pela plataforma em ${dia(pediu.em)}` : "devolvido pelo Asaas" };
      }
      if (pediu?.falhou) return { access: "reembolso_pendente", nota: `pediu em ${dia(pediu.em)}, fazer no Asaas` };
      if (canceladoAte.has(u.id)) {
        const ate = canceladoAte.get(u.id) ?? null;
        const vigente = ate && Date.parse(ate) > agora;
        const quando = de(cancelouEm);
        return {
          access: vigente ? "cancelado" : "encerrado",
          nota: vigente ? `acesso até ${dia(ate)}` : quando ? `cancelou em ${dia(quando)}` : null,
        };
      }
      return { access: "sem", nota: null };
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
      ...situacao(u),
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
              acesso: ROTULO_ACESSO[r.access] ?? r.access,
              acesso_obs: r.nota || "",
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
