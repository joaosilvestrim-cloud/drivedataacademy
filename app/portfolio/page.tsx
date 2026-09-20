import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import { vitrine } from "@/lib/portfolio-servidor";

export const revalidate = 300;

export function generateMetadata() {
  return {
  title: tr("Projetos dos alunos · DriveData Academy"),
  description:
    tr("O que os alunos da DriveData Academy construíram: painéis, automações e modelos de dados que resolveram problemas reais de empresas."),
};
}

/* Vitrine pública. É a prova social da Academy: em vez de dizer que ensina,
   mostra o que a turma entregou. Só entra projeto aprovado pelo time e que o
   aluno marcou como público. */

const primeiroNome = (nome: string) => (nome || "").split(" ").slice(0, 2).join(" ");

export default async function PortfolioPublico() {
  const admin = createAdminClient();
  const { projetos } = await vitrine(admin, { publico: true, limite: 48 });
  const ids = [...new Set(projetos.map((p) => p.user_id))];
  const { nameById } = await loadProfiles(admin, ids);

  const ferramentas = [...new Set(projetos.flatMap((p) => p.ferramentas))].slice(0, 14);

  return (
    <>
      <Background />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Portfólio")}</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {tr("O que os alunos construíram")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            {tr("Painel que trocou doze planilhas, automação que devolveu a sexta-feira de alguém, modelo que fez o número finalmente bater. Projetos reais, feitos por quem estuda na Academy.")}
          </p>
        </Reveal>

        {ferramentas.length > 0 && (
          <Reveal>
            <div className="mt-8 flex flex-wrap gap-2">
              {ferramentas.map((f) => (
                <span key={f} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{f}</span>
              ))}
            </div>
          </Reveal>
        )}

        {projetos.length === 0 ? (
          <div className="mt-14 rounded-3xl border border-dashed border-white/10 px-6 py-20 text-center">
            <p className="font-display text-xl font-bold text-white">{tr("Os primeiros projetos estão sendo preparados")}</p>
            <p className="mx-auto mt-3 max-w-lg text-slate-400">
              {tr("A turma acabou de começar. Em breve esta página mostra o que saiu das aulas e do trabalho de cada um.")}
            </p>
            <Link href="/matricula" className="mt-8 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">
              {tr("Quero fazer parte")}
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map((p) => (
              <Reveal key={p.id}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-brand-green/40">
                  <div className="relative aspect-video overflow-hidden bg-ink-800">
                    {p.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_url} alt={`Projeto ${p.titulo}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : null}
                    {p.destaque && (
                      <span className="absolute left-3 top-3 rounded-full bg-[#f6d68c] px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink-900">{tr("Destaque")}</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h2 className="font-display text-lg font-bold leading-snug text-white">{p.titulo}</h2>
                    <p className="text-sm leading-relaxed text-slate-400">{p.resumo}</p>
                    {p.resultado && <p className="text-sm text-brand-teal">{p.resultado}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      {p.ferramentas.slice(0, 4).map((f) => (
                        <span key={f} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.68rem] text-slate-300">{f}</span>
                      ))}
                      <span className="ml-auto text-xs text-slate-500">{primeiroNome(displayName(nameById, p.user_id))}</span>
                    </div>
                    {p.link_url && (
                      <a href={p.link_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-green hover:underline">{tr("Ver o projeto ↗")}</a>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal>
          <section className="mt-20 rounded-3xl border border-white/10 bg-gradient-to-r from-brand-green/[0.08] to-brand-blue/[0.06] px-6 py-10 text-center sm:px-12">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{tr("O próximo projeto aqui pode ser o seu")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              {tr("Na Academy você aprende construindo, com as ferramentas, os desafios e a comunidade do lado. O que sai daqui vira portfólio, e portfólio é o que abre porta.")}
            </p>
            <Link href="/matricula" className="mt-7 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-7 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              {tr("Começar agora")}
            </Link>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
