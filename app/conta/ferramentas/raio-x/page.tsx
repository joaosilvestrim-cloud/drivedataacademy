import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/sessao";
import RaioX from "./RaioX";
import { nomeDaFerramenta } from "@/lib/ferramentas-nomes";

export const dynamic = "force-dynamic";

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

const corDaNota = (n: number) => (n >= 85 ? "text-brand-green" : n >= 65 ? "text-amber-300" : "text-red-300");

export default async function RaioXPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  /* Histórico é opcional: sem a tabela criada, a ferramenta funciona igual e a
     lista simplesmente não aparece. */
  let historico: any[] = [];
  try {
    const { data } = await createAdminClient()
      .from("raiox_reports")
      .select("id, arquivo, formato, nota, parcial, achados, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    historico = data ?? [];
  } catch {
    historico = [];
  }

  const ultimaNota = historico[0]?.nota ?? null;

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Ferramentas</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{await nomeDaFerramenta("raio-x")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Suba o seu relatório do Power BI e receba o mesmo tipo de revisão que um consultor faria: o que está errado, por que
        isso importa e como arrumar. Sem achismo: cada achado aponta a página, o visual ou a medida.
      </p>

      <RaioX ultimaNota={ultimaNota} />

      {historico.length > 0 && (
        <section data-tour="raiox-historico" className="mt-12">
          <h2 className="font-display text-lg font-bold text-white">Seus laudos</h2>
          <p className="mt-1 text-sm text-slate-400">A curva que interessa é esta: o mesmo arquivo, melhor a cada volta.</p>
          <ul className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {historico.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className={`w-12 shrink-0 font-display text-xl font-bold tabular-nums ${corDaNota(h.nota)}`}>{h.nota}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{h.arquivo}</span>
                  <span className="block text-xs text-slate-500">
                    {quando(h.created_at)} · {(h.achados ?? []).length} achados · {h.parcial ? "só relatório" : "relatório, modelo e DAX"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 rounded-3xl border border-white/8 bg-white/[0.02] p-6">
        <h2 className="font-display text-lg font-bold text-white">Como o Raio-X funciona</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-brand-green">Nada sobe</p>
            <p className="mt-1 text-sm text-slate-400">
              O arquivo é aberto e lido dentro do seu navegador. O que é guardado aqui é o laudo: nota e achados.
              Nenhum dado de cliente sai da sua máquina.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-green">Regra explicada</p>
            <p className="mt-1 text-sm text-slate-400">
              Não tem IA adivinhando nota. Cada achado vem de uma regra que você consegue conferir no seu arquivo,
              com o nome da página, do visual ou da medida.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-green">Conta no seu universo</p>
            <p className="mt-1 text-sm text-slate-400">
              Cada laudo vira evidência prática no seu{" "}
              <Link href="/conta/universo" className="text-brand-teal underline decoration-white/20 underline-offset-4">Knowledge Universe</Link>,
              com o peso da nota que o seu trabalho tirou.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
