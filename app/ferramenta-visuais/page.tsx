import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FerramentaVisuaisLP() {
  let price = 19.9;
  let video = "";
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("site_settings").select("key, value").in("key", ["tool_price", "tool_video_url"]);
    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    price = Number(map.tool_price || "19.90") || 19.9;
    video = map.tool_video_url || "";
  } catch { /* usa padrão */ }

  const features = [
    { t: "Dezenas de presets prontos", d: "Cards, velocímetros, storytelling, gráficos. Arraste, edite e pronto.", d2: "M4 5h16v6H4zM4 15h7v4H4zM14 15h6v4h-6z" },
    { t: "Aponte para suas medidas", d: "Marque cada elemento como dinâmico e ligue direto à sua medida do Power BI.", d2: "M3 3v18h18M7 13l3-3 4 4 5-6" },
    { t: "Gera o DAX pronto", d: "Um clique e você copia a medida DAX para colar no Power BI. Sem escrever código.", d2: "M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12" },
    { t: "Transições entre telas", d: "Crie páginas e transições para storytelling dentro do próprio visual.", d2: "M4 12h16M14 6l6 6-6 6" },
    { t: "Comunidade com upvotes", d: "Publique seu visual, veja os melhores e reaproveite o que a comunidade criou.", d2: "M12 4l3 6 6 .5-4.5 4 1.5 6-6-3.5L6 20.5 7.5 14.5 3 10.5 9 10z" },
    { t: "É como um Figma do BI", d: "Uma tela visual para prototipar e construir o visual do zero, do seu jeito.", d2: "M4 4h16v16H4zM4 9h16M9 9v11" },
  ];

  const steps = [
    { n: "1", t: "Escolha um preset", d: "Comece de um bloco pronto ou do zero." },
    { n: "2", t: "Configure e aponte", d: "Edite cores, textos e ligue os campos às suas medidas." },
    { n: "3", t: "Copie o DAX", d: "Leve a medida pronta para o Power BI e use no seu relatório." },
  ];

  return (
    <div className="relative min-h-screen bg-ink-900">
      <Background />
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        {/* Hero */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">Ferramenta de Visuais · DriveData</span>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Power BI sem limites. <span className="text-gradient">Crie visuais em HTML e SVG</span> sem escrever código.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Monte cards, velocímetros e dashboards que o Power BI nativo não faz, aponte para as suas medidas e leve a <b className="text-white">medida DAX pronta</b> para colar no seu relatório.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/matricula" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-7 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Assinar a Academy (inclui a ferramenta)</Link>
            <Link href="/ferramenta" className="rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-white hover:border-white/30">Já sou aluno</Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">A ferramenta está incluída na assinatura da Academy. Ou assine só a ferramenta por {brl(price)}/mês.</p>
        </div>

        {/* Vídeo / preview */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
          <div className="relative aspect-video">
            {video ? (
              <iframe className="absolute inset-0 h-full w-full" src={video} title="Ferramenta de Visuais" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-green/10 via-ink-800 to-brand-blue/10">
                <div className="text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  <p className="mt-3 text-sm text-slate-400">Demonstração em breve</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Como funciona */}
        <div className="mt-16">
          <h2 className="text-center font-display text-2xl font-bold text-white">Como funciona</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="glass rounded-2xl border border-white/8 p-6 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue font-display font-bold text-ink-900">{s.n}</span>
                <p className="mt-3 font-display text-lg font-bold text-white">{s.t}</p>
                <p className="mt-1 text-sm text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recursos */}
        <div className="mt-16">
          <h2 className="text-center font-display text-2xl font-bold text-white">O que dá pra fazer</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.t} className="glass rounded-2xl border border-white/8 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green/10 text-brand-green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d={f.d2} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <p className="mt-3 font-display text-base font-bold text-white">{f.t}</p>
                <p className="mt-1 text-sm text-slate-400">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Preço / CTA */}
        <div className="mt-16 overflow-hidden rounded-3xl border border-brand-green/25 bg-gradient-to-br from-brand-green/[0.10] via-ink-800 to-brand-blue/[0.10] p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Já vem na assinatura da Academy</h2>
          <p className="mt-2 text-slate-300">Assine a DriveData Academy e use a ferramenta, todos os cursos, a comunidade e as mentorias.</p>
          <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-8 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Assinar a Academy</Link>
          <p className="mt-3 text-xs text-slate-500">Prefere só a ferramenta? <Link href="/ferramenta/assinar" className="text-brand-teal hover:underline">assine por {brl(price)}/mês</Link></p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
