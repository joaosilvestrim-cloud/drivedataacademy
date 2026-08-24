import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { createTurma } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function fmt(d: string | null) {
  if (!d) return "—";
  try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d + "T00:00:00")); } catch { return "—"; }
}

export default async function TurmasPage() {
  let turmas: any[] = [];
  const counts: Record<string, number> = {};
  try {
    const admin = createAdminClient();
    const [{ data, error }, { data: mem }] = await Promise.all([
      admin.from("turmas").select("id, name, starts_at, access_days, price, status").order("created_at", { ascending: false }),
      admin.from("memberships").select("turma_id").eq("status", "active"),
    ]);
    if (error) throw new Error(error.message);
    turmas = data ?? [];
    for (const m of mem ?? []) if (m.turma_id) counts[m.turma_id] = (counts[m.turma_id] || 0) + 1;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Turmas</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de turmas no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Turmas</h1>
      <p className="mt-1 text-sm text-slate-400">Crie turmas e libere acesso em lote para os alunos de cada lançamento.</p>

      {/* Nova turma */}
      <form action={createTurma} className="mt-6 grid gap-3 rounded-2xl border border-dashed border-white/10 p-4 sm:grid-cols-[1fr_160px_140px_140px_auto]">
        <input name="name" required placeholder="Nome da turma (ex.: Setembro 2026)" className={field} />
        <input name="starts_at" type="date" className={field} />
        <input name="access_days" type="number" placeholder="Dias de acesso" className={field} />
        <input name="price" placeholder="Preço (R$)" className={field} />
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">+ Criar</button>
      </form>

      <div className="mt-6 space-y-3">
        {turmas.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nenhuma turma ainda.</p>}
        {turmas.map((t) => (
          <Link key={t.id} href={`/admin/turmas/${t.id}`} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 p-4 transition-colors hover:border-brand-green/40">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase ${t.status === "open" ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{t.status === "open" ? "Aberta" : "Fechada"}</span>
                <span className="font-medium text-white">{t.name}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Início {fmt(t.starts_at)} · {t.access_days ? `${t.access_days} dias de acesso` : "sem expiração"}{t.price ? ` · R$ ${Number(t.price).toFixed(2)}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{counts[t.id] || 0} aluno(s) com acesso</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
