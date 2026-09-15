import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import ProximasMentorias from "@/components/mentorias/ProximasMentorias";
import MenuImersivo from "@/components/assinatura/MenuImersivo";

export const revalidate = 60;

export const metadata = {
  title: "Assinatura · DriveData Academy",
  description: "Lives, gravações, comunidade, ferramentas, certificados e treinamentos com preço de assinante. Tudo num lugar só.",
};

/* Página pública da assinatura. Os treinamentos não aparecem aqui nem com
   preço: o catálogo mora dentro da área do aluno. Aqui o trabalho é mostrar
   o que a pessoa ganha ao entrar. */

const PASSE = [
  "Lives e workshops ao vivo",
  "Gravações para rever quando quiser",
  "Comunidade de profissionais de dados",
  "Ferramentas para aplicar na prática",
  "Preço de assinante nos treinamentos",
  "Certificados das suas competências",
];

// A ordem aqui é real: é o caminho de quem assina.
const PASSOS = [
  { titulo: "Escolha o plano", texto: "Mensal no cartão, ou anual à vista no Pix ou no cartão." },
  { titulo: "Crie sua senha", texto: "Assim que o pagamento confirma, chega um email para você criar o acesso." },
  { titulo: "Entre e aproveite", texto: "Agenda, comunidade, ferramentas e o cardápio de treinamentos já esperam por você." },
];

const btnPrimario =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-7 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]";
const btnSecundario =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-brand-green/50 hover:text-brand-green";

export default function AssinaturaPage() {
  return (
    <>
      <Background />
      <Navbar />
      <main>
        {/* Abertura: o menu imersivo ocupa a tela toda e faz o papel de herói. */}
        <MenuImersivo />

        {/* Prova de que a agenda é real: os próximos encontros, direto do banco. */}
        <ProximasMentorias cta={{ label: "Assinar para participar", href: "/matricula" }} />

        {/* Como funciona */}
        <section className="relative mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Como começar</h2>
            <p className="mx-auto mt-3 max-w-md text-center text-slate-300/90">Três passos e o passe de assinante é seu.</p>
          </Reveal>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <ol className="grid gap-5">
            {PASSOS.map((p, i) => (
              <Reveal key={p.titulo} delay={i * 0.08}>
                <li className="glass relative h-full rounded-3xl border border-white/8 p-6">
                  <span className="font-display text-5xl font-bold text-gradient">{i + 1}</span>
                  <h3 className="mt-3 font-display text-lg font-bold text-white">{p.titulo}</h3>
                  <p className="mt-2 text-sm text-slate-300/90">{p.texto}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={0.1}>
          <div className="relative mx-auto max-w-md">
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-brand-green/20 blur-[90px] animate-pulse-glow" />
            <div className="glow-border relative rotate-[-2deg] rounded-[2rem] transition-transform duration-500 hover:rotate-0">
              <div className="glass-strong relative overflow-hidden rounded-[2rem] p-7">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-brand-green/30 to-brand-blue/30 blur-2xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-400">Passe de assinante</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">Acesso ao ecossistema</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/drivedata-symbol.png" alt="" className="h-10 w-10 shrink-0" />
                </div>
                <ul className="relative mt-6 space-y-3">
                  {PASSE.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-200">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-green/15 text-brand-green">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-7 flex items-center justify-between border-t border-dashed border-white/15 pt-5">
                  <span className="font-mono text-xs tracking-widest text-slate-500">DDA · MEMBRO</span>
                  <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-semibold text-brand-green">Ativo após o pagamento</span>
                </div>
              </div>
            </div>
          </div>
          </Reveal>
          </div>
        </section>

        {/* Fechamento */}
        <section className="relative mx-auto max-w-5xl px-6 pb-24">
          <Reveal>
            <div className="glow-border relative overflow-hidden rounded-[2.5rem]">
              <div className="glass-strong relative rounded-[2.5rem] px-8 py-14 text-center sm:px-14">
                <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-green/20 blur-[100px]" />
                <h2 className="relative font-display text-3xl font-bold sm:text-4xl">
                  Seu próximo nível em dados
                  <br />
                  <span className="text-gradient">começa com uma assinatura.</span>
                </h2>
                <p className="relative mx-auto mt-4 max-w-lg text-slate-300/90">Entre hoje e já participe da próxima live.</p>
                <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/matricula" className={btnPrimario}>Ver planos</Link>
                  <Link href="/entrar" className={btnSecundario}>Entrar</Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
