import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import ProximasMentorias from "@/components/mentorias/ProximasMentorias";
import MenuImersivo from "@/components/assinatura/MenuImersivo";
import PasseTicket from "@/components/assinatura/PasseTicket";

export const revalidate = 60;

export function generateMetadata() {
  return {
  title: `${tr("Assinatura")} · DriveData Academy`,
  description: tr("Lives, gravações, comunidade, ferramentas, certificados e treinamentos com preço de assinante. Tudo num lugar só."),
};
}

/* Página pública da assinatura. Os treinamentos não aparecem aqui nem com
   preço: o catálogo mora dentro da área do aluno. Aqui o trabalho é mostrar
   o que a pessoa ganha ao entrar. */

// A ordem aqui é real: é o caminho de quem assina.
/* Função, e não constante: no servidor o tr() lê o cookie da requisição, e
   constante de módulo é avaliada uma vez só, antes de existir requisição
   nenhuma. Como constante, este texto nasceria em português e ficaria assim
   para todo mundo. */
const passos = () => [
  { titulo: tr("Escolha o plano"), texto: tr("Mensal no cartão, ou anual à vista no Pix ou no cartão.") },
  { titulo: tr("Crie sua senha"), texto: tr("Assim que o pagamento confirma, chega um email para você criar o acesso.") },
  { titulo: tr("Entre e aproveite"), texto: tr("Agenda, comunidade, ferramentas e o cardápio de treinamentos já esperam por você.") },
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
        <ProximasMentorias cta={{ label: tr("Assinar para participar"), href: "/matricula" }} />

        {/* Como funciona */}
        <section className="relative mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">{tr("Como começar")}</h2>
            <p className="mt-3 max-w-md text-slate-400">{tr("Três passos entre você e o seu ingresso.")}</p>
          </Reveal>
          <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <ol className="border-t border-white/10">
            {passos().map((p, i) => (
              <Reveal key={p.titulo} delay={i * 0.08}>
                <li className="grid grid-cols-[3rem_1fr] gap-x-5 border-b border-white/10 py-7">
                  <span className="font-mono text-sm tabular-nums text-brand-teal">0{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">{p.titulo}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{p.texto}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={0.1}>
            <PasseTicket />
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
                  {tr("Seu próximo nível em dados")}
                  <br />
                  <span className="text-gradient">{tr("começa com uma assinatura.")}</span>
                </h2>
                <p className="relative mx-auto mt-4 max-w-lg text-slate-300/90">{tr("Entre hoje e já participe da próxima live.")}</p>
                <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/matricula" className={btnPrimario}>{tr("Ver planos")}</Link>
                  <Link href="/entrar" className={btnSecundario}>{tr("Entrar")}</Link>
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
