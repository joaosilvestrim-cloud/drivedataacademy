import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { resolverVideo } from "@/lib/video";
import { demoAtual } from "@/lib/demo";
import ProtectedPlayer from "@/app/aprender/[slug]/ProtectedPlayer";
import AvisoLegendas from "@/components/AvisoLegendas";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}



/* Gravação de live, workshop ou mentoria. É benefício da assinatura: quem não
   tem acesso ativo vai para a página de assinatura. */
export default async function GravacaoPage({ params }: { params: { id: string } }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/matricula");
  // Demonstração vê a lista de gravações, mas não assiste.
  if (await demoAtual(user.id)) redirect("/conta/gravacoes?demo=1");

  const { data: ev } = await admin
    .from("live_events")
    .select("id, title, description, starts_at, duration_min, kind, recording_url, recording_url_2, published, subtitle_langs")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev || !ev.published) notFound();

  /* Uma live as vezes vem em dois arquivos, quando a conexao cai no meio ou
     quando ha intervalo. Com uma parte so a tela fica identica a de antes: o
     rotulo "Parte 1" nao aparece, porque numerar coisa unica confunde mais do
     que ajuda. */
  const host = process.env.NEXT_PUBLIC_PANDA_PLAYER_HOST;
  const partes = [ev.recording_url, ev.recording_url_2]
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .map((url) => ({ url, src: resolverVideo(url, host)?.src ?? null }));
  if (!partes.length) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/conta/agenda" className="text-sm text-slate-400 hover:text-tinta">{tr("← Voltar para a agenda")}</Link>
      <p className="mt-5 text-sm font-medium uppercase tracking-wide text-acento">{tr("Gravação")}{ev.kind === "mentoria" ? " · Mentoria" : ""}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-tinta">{ev.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{fmt(ev.starts_at)}{ev.duration_min ? ` · ${ev.duration_min} min` : ""}</p>

      <div className="mt-6 space-y-6">
        {partes.map((parte, i) => (
          <div key={i}>
            {partes.length > 1 && (
              <p className="mb-2 text-sm font-semibold text-tinta">{i === 0 ? tr("Parte 1") : tr("Parte 2")}</p>
            )}
            {parte.src ? (
              <ProtectedPlayer>
                <div className="overflow-hidden rounded-2xl border border-tinta/10 bg-black">
                  <div className="relative aspect-video">
                    <iframe className="absolute inset-0 h-full w-full" src={parte.src} title={ev.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                  </div>
                </div>
              </ProtectedPlayer>
            ) : (
              <a href={parte.url} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-marca-verde px-6 py-3 text-sm font-semibold text-sobre-acento">
                {tr("Abrir gravação ↗")}
              </a>
            )}
          </div>
        ))}
        {partes.some((x) => x.src) && <AvisoLegendas idiomas={ev.subtitle_langs} />}
      </div>

      {ev.description && <p className="mt-6 whitespace-pre-line text-slate-300">{ev.description}</p>}
    </div>
  );
}
