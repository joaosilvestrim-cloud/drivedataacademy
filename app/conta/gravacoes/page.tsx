import { listaTraduzida } from "@/lib/i18n/conteudo";
import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/* Biblioteca de gravações. Toda live, workshop ou mentoria com gravação
   cadastrada aparece aqui, da mais recente para a mais antiga. É benefício da
   assinatura, então quem não tem acesso ativo vai para a página de assinatura. */

const FUSO = "America/Sao_Paulo";
const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: FUSO }).format(new Date(iso));

function primeiraLinha(desc: string | null) {
  const linhas = (desc || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return linhas.length > 1 ? linhas.slice(1).join(" ") : linhas[0] || null;
}

export default async function GravacoesPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/matricula");

  const { data: lives } = await admin
    .from("live_events")
    .select("id, title, description, starts_at, duration_min, kind, cover_url, recording_url")
    .eq("published", true)
    .not("recording_url", "is", null)
    .order("starts_at", { ascending: false });

  const gravacoes = await listaTraduzida("live_events", (lives ?? []).filter((l) => (l.recording_url || "").trim()));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">{tr("Gravações")}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {tr("As lives e mentorias que já aconteceram, para assistir quando der. Incluídas na assinatura.")}
      </p>

      {gravacoes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-medium text-white">{tr("Nenhuma gravação publicada ainda")}</p>
          <p className="mt-2 text-sm text-slate-400">
            Assim que o time subir a gravação de um encontro, ela aparece aqui.{" "}
            <Link href="/conta/agenda" className="text-brand-green underline underline-offset-4">{tr("Ver a agenda")}</Link>
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gravacoes.map((l) => (
            <li key={l.id}>
              <Link
                href={`/conta/gravacoes/${l.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-brand-green/40 hover:bg-white/[0.04]"
              >
                <span className="relative block aspect-video bg-ink-800">
                  {l.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink-900 transition-transform group-hover:scale-105">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-4">
                  <span className="text-xs text-slate-400">
                    {data(l.starts_at)}
                    {l.kind === "mentoria" ? " · Mentoria" : " · Live"}
                    {l.duration_min ? ` · ${l.duration_min} min` : ""}
                  </span>
                  <span className="mt-1 font-display text-lg font-bold leading-snug text-white">{l.title}</span>
                  {primeiraLinha(l.description) && (
                    <span className="mt-1 text-sm text-slate-400">{primeiraLinha(l.description)}</span>
                  )}
                  <span className="mt-3 text-sm font-semibold text-brand-green group-hover:underline">{tr("Assistir →")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
