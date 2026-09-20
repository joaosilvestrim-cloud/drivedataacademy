import { tr } from "@/lib/i18n/traduzir-servidor";
import { listaTraduzida, comTraducao, traducoesDe } from "@/lib/i18n/conteudo";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessCourse, hasFullAccess } from "@/lib/access";
import { enrollFree, comprarCurso } from "./actions";
import { VALOR_MINIMO_CURSO, brl, descontoCurso, parcelasPossiveis } from "@/lib/precoCurso";
import { cargaHoraria, minutosDoTexto } from "@/lib/duracao";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params, searchParams }: { params: { slug: string }; searchParams: { erro?: string } }) {
  // Os treinamentos saíram da área pública: o cardápio mora dentro da conta.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/cursos");

  const pub = createPublicClient();
  const { data: course } = await pub
    .from("courses")
    .select("id, slug, title, subtitle, description, cover_url, level, price, instructor_name, certificate_enabled, coming_soon, subscriber_price, workload, access_mode, client_name")
    .eq("slug", params.slug)
    .eq("published", true)
    .maybeSingle();

  if (!course) notFound();

  const [{ data: modsRaw }, { data: lessonsRaw }] = await Promise.all([
    pub.from("course_modules").select("id, title").eq("course_id", course.id).order("position"),
    pub.from("lessons").select("id, module_id, title, duration, is_preview, type").eq("course_id", course.id).order("position"),
  ]);

  /* Esta é a página de venda do treinamento, então é a que mais precisa da
     tradução: quem chega em inglês decide aqui se assina. */
  const [traduzido, mods, lessons] = await Promise.all([
    traducoesDe("courses", [course.id]),
    listaTraduzida("course_modules", (modsRaw ?? []) as any[]),
    listaTraduzida("lessons", (lessonsRaw ?? []) as any[]),
  ]);
  Object.assign(course, comTraducao(course as any, traduzido));

  const modules = (mods ?? []).map((m: any) => ({ ...m, lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id) }));
  const lessonCount = (lessons ?? []).length;
  // Curso feito só de aulas de materiais: é uma biblioteca de arquivos, não um curso em vídeo.
  const soArquivos = lessonCount > 0 && (lessons ?? []).every((l: any) => l.type === "materiais");
  // Carga digitada no admin vence. Sem ela, soma a duração das aulas.
  const carga = course.workload || cargaHoraria((lessons ?? []).reduce((t: number, l: any) => t + minutosDoTexto(l.duration), 0));

  // Estado da matrícula
  const enrolled = await canAccessCourse(createAdminClient(), user.id, course.id);
  // Turma fechada de empresa: quem não está matriculado nem vê que existe.
  const inCompany = course.access_mode === "in_company";
  if (inCompany && !enrolled) notFound();
  // "Em breve" vence os outros estados do card. Quem já estiver matriculado
  // continua entrando por /aprender.
  const emBreve = course.coming_soon === true;
  // Só assinante compra. A assinatura não abre o curso sozinha: dá o preço de assinante.
  const assinaturaAtiva = user ? await hasFullAccess(createAdminClient(), user.id) : false;
  const precoCheio = Number(course.price) || 0;
  const precoAss = course.subscriber_price == null ? null : Number(course.subscriber_price);
  const incluso = precoAss === 0;
  const aVenda = !inCompany && precoAss != null && precoAss >= VALOR_MINIMO_CURSO;
  const desconto = descontoCurso(precoCheio, precoAss);

  return (
    <>
      <Background />
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-36 sm:pt-44">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            {emBreve && (
              <p className="mb-3 inline-block rounded-full bg-amber-400/90 px-3 py-1 text-[0.7rem] font-semibold text-ink-900">{tr("Em breve")}</p>
            )}
            {course.level && <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{course.level}</p>}
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="mt-3 text-lg text-slate-300/90">{course.subtitle}</p>}
            {course.description && <p className="mt-5 whitespace-pre-line text-slate-300/90">{course.description}</p>}
            {course.instructor_name && <p className="mt-5 text-sm text-slate-400">{tr("Com")} <strong className="text-white">{course.instructor_name}</strong></p>}

            {/* Currículo */}
            <div className="mt-10">
              <h2 className="font-display text-lg font-bold text-white">{tr("Conteúdo do curso")}</h2>
              <p className="mt-1 text-sm text-slate-500">{modules.length} módulo(s) · {lessonCount} aula(s)</p>
              <div className="mt-4 space-y-3">
                {modules.map((m: any, mi: number) => (
                  <details key={m.id} className="glass overflow-hidden rounded-2xl border border-white/8" open={mi === 0}>
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
                      <span className="flex items-center gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold text-brand-green">{mi + 1}</span>
                        <span className="font-semibold text-white">{m.title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{m.lessons.length} aula(s)</span>
                    </summary>
                    <ul className="space-y-2 border-t border-white/5 px-5 py-4">
                      {m.lessons.map((l: any) => (
                        <li key={l.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                          <span className="flex items-center gap-2">
                            <span className="text-slate-500">▶</span>
                            {l.title}
                            {l.is_preview && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">{tr("grátis")}</span>}
                          </span>
                          {l.duration && <span className="shrink-0 text-xs text-slate-500">{l.duration}</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* Card de matrícula */}
          <div className="lg:sticky lg:top-28">
            <div className="glow-border overflow-hidden rounded-[2rem]">
              <div className="glass-strong rounded-[2rem] p-6 sm:p-7">
                {course.cover_url && (
                  <div className="mb-5 aspect-[16/9] overflow-hidden rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={course.cover_url} alt={course.title} className="h-full w-full object-cover" />
                  </div>
                )}
                {/* Preço: o do assinante em destaque, o cheio riscado ao lado. */}
                {incluso ? (
                  <p className="font-display text-2xl font-bold text-white">{tr("Incluído na assinatura")}</p>
                ) : aVenda ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tr("Preço para assinantes")}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-3xl font-bold text-white">{brl(precoAss!)}</span>
                      {desconto > 0 && <span className="text-sm text-slate-500 line-through">{brl(precoCheio)}</span>}
                      {desconto > 0 && <span className="rounded-full bg-brand-green/15 px-2.5 py-0.5 text-xs font-semibold text-brand-green">{desconto}% OFF</span>}
                    </div>
                    {parcelasPossiveis(precoAss!) > 1 && (
                      <p className="mt-1 text-sm text-slate-400">
                        {tr("no Pix à vista ou em até")} {parcelasPossiveis(precoAss!)}x de {brl(precoAss! / parcelasPossiveis(precoAss!))} {tr("no cartão")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="font-display text-2xl font-bold text-white">{tr("Exclusivo para assinantes")}</p>
                )}

                {searchParams?.erro && (
                  <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{searchParams.erro}</p>
                )}

                <div className="mt-5" id="comprar">
                  {/* Matrícula vem antes do Em breve: marcar um curso como Em breve fecha a
                      venda, mas não tira o acesso de quem já estava matriculado. */}
                  {enrolled ? (
                    <Link href={`/aprender/${course.slug}`} className="block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-center text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                      {soArquivos ? "Abrir biblioteca" : "Continuar curso"}
                    </Link>
                  ) : emBreve ? (
                    <button disabled className="w-full cursor-not-allowed rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3.5 text-sm font-semibold text-amber-300">
                      {tr("Em breve")}
                    </button>
                  ) : !user ? (
                    <Link href="/entrar" className="block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-center text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                      {tr("Entre para comprar")}
                    </Link>
                  ) : !assinaturaAtiva ? (
                    <Link href="/matricula" className="block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-center text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                      {tr("Assine para comprar com desconto")}
                    </Link>
                  ) : incluso ? (
                    <form action={enrollFree}>
                      <input type="hidden" name="slug" value={course.slug} />
                      <button className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                        {tr("Liberar no meu acesso")}
                      </button>
                    </form>
                  ) : aVenda ? (
                    <form action={comprarCurso} className="space-y-3">
                      <input type="hidden" name="slug" value={course.slug} />
                      <div className="space-y-1.5">
                        <label htmlFor="compra-cpf" className="block text-sm font-medium text-slate-300">{tr("CPF para a cobrança")}</label>
                        <input id="compra-cpf" name="cpf" required inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="compra-pagamento" className="block text-sm font-medium text-slate-300">{tr("Forma de pagamento")}</label>
                        <select id="compra-pagamento" name="pagamento" defaultValue="pix" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-brand-green/60 [&>option]:bg-ink-900">
                          <option value="pix">{tr("Pix à vista ·")} {brl(precoAss!)}</option>
                          <option value="cartao-1">{tr("Cartão de crédito à vista ·")} {brl(precoAss!)}</option>
                          {Array.from({ length: parcelasPossiveis(precoAss!) - 1 }, (_, i) => i + 2).map((n) => (
                            <option key={n} value={`cartao-${n}`}>{tr("Cartão em")} {n}x de {brl(precoAss! / n)}</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">{tr("Parcelado sem juros. O acesso libera na confirmação da primeira parcela.")}</p>
                      </div>
                      <button className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                        {tr("Comprar por")} {brl(precoAss!)}
                      </button>
                    </form>
                  ) : (
                    <button disabled className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-slate-400">
                      {tr("Venda em breve")}
                    </button>
                  )}
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  {enrolled
                    ? "Você já tem este treinamento."
                    : emBreve
                    ? aVenda
                      ? `Estamos preparando as aulas. Quando abrir, assinantes compram por ${brl(precoAss!)}.`
                      : "Estamos preparando as aulas. Avisamos assim que abrir."
                    : !assinaturaAtiva
                    ? "Treinamentos são vendidos só para assinantes, com preço especial."
                    : aVenda
                    ? "Você vai para a página segura do Asaas. O acesso libera assim que o pagamento confirmar."
                    : "Acesso imediato."}
                </p>

                {/* O que você recebe */}
                <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tr("Este curso inclui")}</p>
                  {[
                    soArquivos ? { icon: "📁", label: tr("Arquivos prontos para download") } : { icon: "🎬", label: carga ? `${lessonCount} aula(s) · ${carga} de conteúdo` : `${lessonCount} aula(s) em vídeo` },
                    { icon: "♾️", label: tr("Acesso vitalício ao conteúdo") },
                    ...(course.certificate_enabled !== false ? [{ icon: "🎓", label: tr("Certificado de conclusão") }] : []),
                    { icon: "💬", label: tr("Comunidade de alunos") },
                  ].map((it) => (
                    <div key={it.label} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <span>{it.icon}</span>
                      {it.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
