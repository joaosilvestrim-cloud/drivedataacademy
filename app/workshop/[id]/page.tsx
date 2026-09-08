import Link from "next/link";
import { notFound } from "next/navigation";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFullAccess } from "@/lib/access";
import WorkshopBuyForm from "./WorkshopBuyForm";

export const dynamic = "force-dynamic";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function WorkshopPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: ev } = await admin.from("live_events").select("id, title, description, starts_at, duration_min, price, cover_url, published").eq("id", params.id).maybeSingle();
  if (!ev || !ev.published) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSubscriber = user ? await hasFullAccess(admin, user.id) : false;
  const price = Number(ev.price) || 0;
  const paid = price > 0;

  return (
    <div className="relative min-h-screen bg-ink-900">
      <Background />
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Workshop ao vivo</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white">{ev.title}</h1>
            <p className="mt-2 text-brand-teal">{fmt(ev.starts_at)}{ev.duration_min ? ` · ${ev.duration_min} min` : ""}</p>
            {ev.description && <p className="mt-4 text-lg text-slate-300">{ev.description}</p>}
            {paid && (
              <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-brand-green/[0.08] to-transparent px-5 py-4">
                <div>
                  <span className="block text-xs uppercase tracking-wide text-slate-400">Ingresso avulso</span>
                  <span className="font-display text-3xl font-bold text-white">{brl(price)}</span>
                </div>
                <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-semibold text-brand-green">Grátis para assinantes</span>
              </div>
            )}
          </div>

          <div className="glow-border rounded-2xl">
            <div className="glass rounded-2xl p-6 sm:p-8">
              {isSubscriber ? (
                <div className="text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-green/20 text-brand-green">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <p className="text-lg font-semibold text-white">Você já tem acesso!</p>
                  <p className="mt-1 text-sm text-slate-300">Como assinante, este workshop está incluso. Ele aparece na sua Agenda e o link libera no horário.</p>
                  <Link href="/conta/agenda" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Ver na agenda</Link>
                </div>
              ) : paid ? (
                <>
                  <h2 className="font-display text-xl font-bold text-white">Garanta sua vaga</h2>
                  <p className="mt-1 text-sm text-slate-400">Ingresso avulso. Já é assinante? <Link href="/entrar" className="text-brand-teal hover:underline">entre</Link> e participe de graça.</p>
                  <div className="mt-6"><WorkshopBuyForm eventId={ev.id} title={ev.title} /></div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">Workshop exclusivo para assinantes</p>
                  <p className="mt-1 text-sm text-slate-300">Assine a DriveData Academy e participe deste e de todos os encontros ao vivo.</p>
                  <Link href="/matricula" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Ver assinatura</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
