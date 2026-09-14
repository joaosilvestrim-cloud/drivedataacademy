import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import ProximasMentorias from "@/components/mentorias/ProximasMentorias";

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

type Beneficio = { titulo: string; texto: string; icon: string; destaque?: boolean; tag?: string };

const BENEFICIOS: Beneficio[] = [
  {
    titulo: "Agenda ao vivo",
    texto: "Lives, workshops e mentorias com quem faz dados de verdade no mercado. Você acompanha a próxima pelo cronômetro e entra com um clique.",
    icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
    destaque: true,
    tag: "Toda semana",
  },
  {
    titulo: "Gravações",
    texto: "Perdeu o horário? Cada encontro fica gravado na sua agenda para assistir quando puder.",
    icon: "M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM10 9l5 3-5 3V9z",
  },
  {
    titulo: "Ferramentas",
    texto: "Knowledge Universe 4D, DataFlow Lab, Decision Lab e a ferramenta de visuais. Recursos para aplicar o que aprendeu no seu trabalho.",
    icon: "M4 5h16v10H4zM2 19h20M9 9l2 2 4-4",
  },
  {
    titulo: "Treinamentos com preço de assinante",
    texto: "Os treinamentos completos saem por um valor especial, pago uma vez só. O curso fica com você, com aulas, materiais e avaliação.",
    icon: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 2 6 2s6-1 6-2v-5",
    destaque: true,
    tag: "Exclusivo",
  },
  {
    titulo: "Materiais prontos",
    texto: "Cases reais, arquivos de Power BI e aceleradores para baixar dentro dos treinamentos e adaptar ao seu projeto.",
    icon: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  },
  {
    titulo: "Certificados",
    texto: "Comprovação das competências que você desenvolveu, com carga horária e o seu nome.",
    icon: "M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5",
  },
  {
    titulo: "Comunidade",
    texto: "Troca de experiências e dúvidas com outros profissionais, em canais por assunto.",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  },
  {
    titulo: "Ranking e prêmios",
    texto: "Sua participação vira pontos. Quem mais contribui aparece no topo e o primeiro lugar leva prêmio.",
    icon: "M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3",
  },
  {
    titulo: "Vitrine de talentos",
    texto: "Seu perfil, suas skills e seus projetos à mostra para a rede DriveData.",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  },
  {
    titulo: "Mentoria com especialistas",
    texto: "Agende uma conversa com o time para destravar um desafio do seu dia a dia.",
    icon: "M12 14l9-5-9-5-9 5 9 5zM12 14v7M5 11v4c0 1 3 2 7 2s7-1 7-2v-4",
  },
  {
    titulo: "Parcerias e negócios",
    texto: "Oportunidades de participar do ecossistema B2B da DriveData: revenda, projetos e time.",
    icon: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  },
];

// A ordem aqui é real: é o caminho de quem assina.
const PASSOS = [
  { titulo: "Escolha o plano", texto: "Mensal no cartão, ou anual à vista no Pix ou no cartão." },
  { titulo: "Crie sua senha", texto: "Assim que o pagamento confirma, chega um email para você criar o acesso." },
  { titulo: "Entre e aproveite", texto: "Agenda, comunidade, ferramentas e o cardápio de treinamentos já esperam por você." },
];

function Icone({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
        {/* Abertura: a promessa à esquerda, o passe de assinante à direita. */}
        <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-36 sm:pt-44">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Assinatura DriveData Academy</p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                Pare de estudar sozinho.
                <br />
                <span className="text-gradient">Entre para o ecossistema.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-300/90">
                Uma assinatura abre a agenda ao vivo, as gravações, a comunidade e as ferramentas. E coloca os treinamentos
                completos ao seu alcance, com preço de assinante.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/matricula" className={btnPrimario}>
                  Quero assinar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
                <Link href="/entrar" className={btnSecundario}>Já sou assinante</Link>
              </div>
            </Reveal>

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

        {/* O que está incluso: dois benefícios em destaque ocupam mais espaço. */}
        <section className="relative mx-auto max-w-7xl px-6 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">O que você ganha</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
                Tudo para evoluir, <span className="text-gradient">do dado à decisão</span>
              </h2>
              <p className="mt-4 text-slate-300/90">Aprender, praticar, ser visto e crescer junto com quem já está no mercado.</p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFICIOS.map((b, i) => (
              <Reveal key={b.titulo} delay={(i % 4) * 0.06} className={b.destaque ? "sm:col-span-2" : ""}>
                <article
                  className={`card-hover relative flex h-full flex-col rounded-3xl border p-6 ${
                    b.destaque ? "glass-strong border-brand-green/30" : "glass border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl ${b.destaque ? "bg-gradient-to-br from-brand-green to-brand-blue text-ink-900" : "bg-white/5 text-brand-green"}`}>
                      <Icone d={b.icon} />
                    </span>
                    {b.tag && <span className="rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-[0.7rem] font-semibold text-brand-green">{b.tag}</span>}
                  </div>
                  <h3 className={`mt-5 font-display font-bold text-white ${b.destaque ? "text-2xl" : "text-lg"}`}>{b.titulo}</h3>
                  <p className="mt-2 text-sm text-slate-300/90">{b.texto}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Prova de que a agenda é real: os próximos encontros, direto do banco. */}
        <ProximasMentorias cta={{ label: "Assinar para participar", href: "/matricula" }} />

        {/* Como funciona */}
        <section className="relative mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Como começar</h2>
          </Reveal>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
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
