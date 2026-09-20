import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarVotacao, apurar, aberta, encerrada, type Voto } from "@/lib/votacao";
import { votar } from "./actions";

export const dynamic = "force-dynamic";

const FUSO = "America/Sao_Paulo";
const dia = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { votacao } = await carregarVotacao(createAdminClient(), params.slug);
  if (!votacao) return { title: tr("Votação · DriveData Academy") };
  return {
    title: `${votacao.title} · DriveData Academy`,
    description: votacao.description || "Escolha os próximos temas da DriveData Academy.",
  };
}

export default async function VotacaoPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { ok?: string; erro?: string };
}) {
  const admin = createAdminClient();
  const { votacao, opcoes } = await carregarVotacao(admin, params.slug);
  if (!votacao || (!votacao.published && !searchParams.ok)) notFound();

  const { data: votosRaw } = await admin.from("poll_votes").select("email, name, options, suggestion, created_at").eq("poll_id", votacao.id);
  const votos = (votosRaw ?? []) as Voto[];
  const resultado = apurar(opcoes, votos);
  const votou = !!searchParams.ok;
  const fechada = !aberta(votacao);
  const mostrarResultado = (votou || fechada) && votacao.show_results;
  const umaSo = votacao.max_choices === 1;

  return (
    <main className="min-h-screen bg-ink-900 px-6 py-14">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label={tr("DriveData Academy")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={tr("DriveData Academy")} className="h-9 w-auto" />
          </Link>
          {/* Quem chega pelo menu do aluno precisa de um caminho de volta. */}
          <Link href="/conta" className="text-sm text-slate-400 transition-colors hover:text-white">
            {tr("← Voltar para a plataforma")}
          </Link>
        </div>

        <h1 className="mt-10 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{votacao.title}</h1>
        {votacao.description && <p className="mt-4 whitespace-pre-line text-slate-300/90">{votacao.description}</p>}

        <p className="mt-4 text-sm text-slate-400">
          {votos.length > 0 && (
            <>
              <span className="font-mono tabular-nums text-slate-300">{votos.length}</span> {votos.length === 1 ? "voto" : "votos"} até agora.{" "}
            </>
          )}
          {encerrada(votacao)
            ? tr("Votação encerrada.")
            : votacao.closes_at
              ? `Aberta até ${dia(votacao.closes_at)}.`
              : umaSo
                ? tr("Escolha uma opção.")
                : `Escolha até ${votacao.max_choices} opções.`}
        </p>

        {votou && (
          <p className="mt-8 rounded-2xl border border-brand-green/30 bg-brand-green/10 px-5 py-4 text-brand-green" role="status">
            {tr("Voto registrado. Obrigado por ajudar a montar a agenda.")}
          </p>
        )}

        {mostrarResultado ? (
          <section className="mt-10 flex flex-col gap-5" aria-label={tr("Resultado parcial")}>
            {resultado.map((o) => (
              <div key={o.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium text-white">{o.label}</p>
                  <p className="shrink-0 font-mono text-sm tabular-nums text-slate-400">{o.votos}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-brand-green" style={{ width: `${o.porcento}%` }} />
                </div>
                {o.description && <p className="mt-1.5 text-sm text-slate-500">{o.description}</p>}
              </div>
            ))}
            {!fechada && (
              <p className="mt-2 text-sm text-slate-500">
                {tr("Mudou de ideia? Vote de novo com o mesmo e-mail que a resposta é substituída.")}{" "}
                <Link href={`/votacao/${votacao.slug}`} className="text-brand-green underline underline-offset-4">{tr("Votar de novo")}</Link>.
              </p>
            )}
          </section>
        ) : fechada ? (
          <p className="mt-10 text-slate-400">{tr("Esta votação está encerrada. Obrigado a quem participou.")}</p>
        ) : (
          <form action={votar} className="mt-10 flex flex-col gap-6">
            <input type="hidden" name="slug" value={votacao.slug} />

            {searchParams.erro && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
                {searchParams.erro}
              </p>
            )}

            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">{tr("Opções")}</legend>
              {opcoes.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-ink-800/60 p-4 transition-colors hover:border-brand-green/40"
                >
                  <input
                    type={umaSo ? "radio" : "checkbox"}
                    name="opcao"
                    value={o.id}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand-green"
                  />
                  <span>
                    <span className="block font-medium text-white">{o.label}</span>
                    {o.description && <span className="mt-0.5 block text-sm text-slate-400">{o.description}</span>}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-200">{tr("Nome")} <span className="text-brand-green">*</span></span>
                <input name="name" required autoComplete="name" className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none transition-colors focus:border-brand-green" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-200">{tr("E-mail")} <span className="text-brand-green">*</span></span>
                <input name="email" type="email" required autoComplete="email" className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none transition-colors focus:border-brand-green" />
              </label>
            </div>
            <p className="-mt-3 text-xs text-slate-500">{tr("Um voto por e-mail. Serve só para não contar duas vezes.")}</p>

            {votacao.allow_suggestion && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-200">{tr("Tem outro tema em mente?")}</span>
                <textarea
                  name="suggestion"
                  rows={3}
                  className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none transition-colors focus:border-brand-green"
                />
                <span className="text-xs text-slate-500">{tr("Opcional. Lemos todas.")}</span>
              </label>
            )}

            <button type="submit" className="rounded-xl bg-brand-green px-6 py-3.5 font-semibold text-ink-900 transition-colors hover:bg-white">
              {tr("Enviar meu voto")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
