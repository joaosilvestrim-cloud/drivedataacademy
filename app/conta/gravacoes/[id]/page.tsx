import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { youtubeId } from "@/lib/youtube";
import ProtectedPlayer from "@/app/aprender/[slug]/ProtectedPlayer";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

// YouTube vira embed. Panda aceita o iframe colado, a URL de embed ou só o id.
function embed(raw: string): string | null {
  let v = (raw || "").trim();
  const iframe = v.match(/src=["']([^"']+)["']/i);
  if (iframe) v = iframe[1];
  const yt = youtubeId(v);
  if (yt) return `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`;
  if (/^https?:\/\/[^ ]*pandavideo[^ ]*\/embed/i.test(v)) return v;
  const host = process.env.NEXT_PUBLIC_PANDA_PLAYER_HOST;
  if (host && /^[\w-]{20,}$/.test(v)) return `https://${host}/embed/?v=${v}`;
  return null;
}

/* Gravação de live, workshop ou mentoria. É benefício da assinatura: quem não
   tem acesso ativo vai para a página de assinatura. */
export default async function GravacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/matricula");

  const { data: ev } = await admin
    .from("live_events")
    .select("id, title, description, starts_at, duration_min, kind, recording_url, published")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev || !ev.published || !ev.recording_url) notFound();

  const src = embed(ev.recording_url);

  return (
    <div className="max-w-4xl">
      <Link href="/conta/agenda" className="text-sm text-slate-400 hover:text-white">← Voltar para a agenda</Link>
      <p className="mt-5 text-sm font-medium uppercase tracking-wide text-brand-green">Gravação{ev.kind === "mentoria" ? " · Mentoria" : ""}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{ev.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{fmt(ev.starts_at)}{ev.duration_min ? ` · ${ev.duration_min} min` : ""}</p>

      <div className="mt-6">
        {src ? (
          <ProtectedPlayer>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <div className="relative aspect-video">
                <iframe className="absolute inset-0 h-full w-full" src={src} title={ev.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
            </div>
          </ProtectedPlayer>
        ) : (
          <a href={ev.recording_url} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">
            Abrir gravação ↗
          </a>
        )}
      </div>

      {ev.description && <p className="mt-6 whitespace-pre-line text-slate-300">{ev.description}</p>}
    </div>
  );
}
