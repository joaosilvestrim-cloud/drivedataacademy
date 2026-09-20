import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/admin";
import MatriculaForm from "./MatriculaForm";
import AjudaAssinatura from "@/components/AjudaAssinatura";
import { SUB_INCLUDES, parseIncludes, descontoAnual } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const KEYS = ["sub_price", "sub_price_annual", "full_access_price", "turma_nome", "turma_descricao", "sales_open", "sub_includes"];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// O caminho real de quem assina, na ordem em que acontece.
/* Função, e não constante: no servidor o tr() lê o cookie da requisição, e
   constante de módulo é avaliada uma vez só, antes de existir requisição
   nenhuma. Como constante, este texto nasceria em português e ficaria assim
   para todo mundo. */
const passos = () => [
  { titulo: tr("Escolha o plano"), texto: tr("Anual à vista no Pix ou cartão, ou mensal no cartão.") },
  { titulo: tr("Pague com segurança"), texto: tr("Você vai para a página do Asaas, nosso parceiro de pagamentos. O Pix confirma na hora.") },
  { titulo: tr("Receba o código"), texto: tr("Assim que o pagamento confirma, enviamos um código de acesso para o seu e-mail.") },
  { titulo: tr("Crie sua senha e entre"), texto: tr("Digite o código, escolha a senha e a área do aluno já abre para você.") },
];

/* Função, e não constante: no servidor o tr() lê o cookie da requisição, e
   constante de módulo é avaliada uma vez só, antes de existir requisição
   nenhuma. Como constante, este texto nasceria em português e ficaria assim
   para todo mundo. */
const perguntas = () => [
  {
    p: tr("Quando recebo o acesso?"),
    r: tr("No Pix, em poucos minutos depois de pagar. No cartão, assim que a operadora aprova. Não precisa criar conta antes: ela nasce com o pagamento."),
  },
  {
    p: tr("O e-mail não chegou. E agora?"),
    r: tr("Ele sai de acessos@drivedata.com.br. Confira o lixo eletrônico e a aba Promoções. Se não estiver lá, peça um código novo em Esqueci minha senha, com o mesmo e-mail da compra."),
  },
  {
    p: tr("Os treinamentos estão inclusos?"),
    r: tr("A assinatura dá agenda ao vivo, gravações, comunidade, ferramentas e certificados. Os treinamentos completos são comprados à parte, com preço exclusivo de assinante, e ficam com você."),
  },
  {
    p: tr("Posso cancelar?"),
    r: tr("O mensal pode ser cancelado quando quiser, sem multa. O anual é um pagamento único que vale por 12 meses."),
  },
  {
    p: tr("Por que pedem CPF?"),
    r: tr("O Asaas exige CPF para emitir a cobrança. Telefone e endereço são opcionais."),
  },
];

export default async function MatriculaPage() {
  let cfg: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("site_settings").select("key, value").in("key", KEYS);
    cfg = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  } catch {
    cfg = {};
  }

  const open = cfg.sales_open === "1";
  const nome = cfg.turma_nome || "DriveData Academy";
  const descricao =
    cfg.turma_descricao ||
    tr("Agenda ao vivo, gravações, comunidade, ferramentas e certificados. E os treinamentos completos com preço de assinante.");
  const price = Number(cfg.sub_price || cfg.full_access_price || "0") || 0;
  const anual = Number(cfg.sub_price_annual || "0") || 0;
  // Calculado dos dois preços configurados no admin, nunca digitado à mão.
  const desconto = descontoAnual(price, anual);
  const temAnual = anual > 0 && desconto > 0;

  const picked = parseIncludes(cfg.sub_includes);
  const beneficios = SUB_INCLUDES.filter((i) => picked.includes(i.key)).map((i) => tr(i.label));

  return (
    <div className="relative min-h-screen bg-ink-900">
      <Background />
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        {!open ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Matrículas")}</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white">{tr("Inscrições fechadas no momento")}</h1>
            <p className="mt-3 text-slate-300">{tr("Enquanto isso, acompanhe as aulas abertas ao vivo.")}</p>
            <Link href="/#ao-vivo" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">{tr("Ver as próximas lives")}</Link>
          </div>
        ) : (
          <>
            {/* Como funciona: vem antes do formulário para ninguém pagar sem saber o que acontece depois. */}
            <section aria-labelledby="como-funciona" className="mb-10">
              <h2 id="como-funciona" className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{tr("Como funciona")}</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {passos().map((s, i) => (
                  <li key={s.titulo} className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue font-display text-sm font-bold text-ink-900">{i + 1}</span>
                    <p className="mt-3 font-semibold text-white">{s.titulo}</p>
                    <p className="mt-1 text-sm text-slate-400">{s.texto}</p>
                  </li>
                ))}
              </ol>
            </section>

            <div className="grid items-start gap-10 lg:grid-cols-2">
              {/* Oferta */}
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Assinatura")}</p>
                <h1 className="mt-2 font-display text-4xl font-bold text-white">{tr("Assine a DriveData Academy")}</h1>
                <p className="mt-4 text-lg text-slate-300">{descricao}</p>

                <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-slate-400">{tr("O que a assinatura inclui")}</p>
                <ul className="mt-3 space-y-3">
                  {beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-slate-200">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {b}
                    </li>
                  ))}
                </ul>

                {price > 0 && (
                  <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-brand-green/[0.08] to-transparent px-5 py-4">
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-400">{tr("Assinatura mensal")}</span>
                      <span className="font-display text-3xl font-bold text-white">{brl(price)}<span className="text-base font-normal text-slate-400">{tr("/mês")}</span></span>
                      <span className="mt-0.5 block text-xs text-brand-teal">{tr("no cartão de crédito · cancele quando quiser")}</span>
                    </div>
                  </div>
                )}

                {temAnual && (
                  <div className="relative mt-3 flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-brand-teal/30 bg-gradient-to-r from-brand-blue/[0.12] to-transparent px-5 py-4">
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-400">{tr("Plano anual · Pix ou cartão, pagamento único")}</span>
                      <span className="font-display text-3xl font-bold text-white">{brl(anual)}</span>
                      <span className="mt-0.5 block text-xs text-brand-teal">
                        {tr("equivale a")} {brl(anual / 12)}/mês · economia de {brl(price * 12 - anual)} {tr("no ano")}
                      </span>
                    </div>
                    <span className="rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-3 py-1 text-xs font-bold text-ink-900">{desconto}% OFF</span>
                  </div>
                )}

                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand-teal"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                  <span>{tr("Pagamento processado pelo Asaas. Não guardamos dados do seu cartão.")}</span>
                </div>
              </div>

              {/* Form */}
              <div className="glow-border rounded-2xl" id="assinar">
                <div className="glass rounded-2xl p-6 sm:p-8">
                  <h2 className="font-display text-xl font-bold text-white">{tr("Assine agora")}</h2>
                  <p className="mt-1 text-sm text-slate-400">{tr("Leva um minuto. Sua conta é criada quando o pagamento confirma.")}</p>
                  <div className="mt-6">
                    <MatriculaForm turmaNome={nome} mensal={price} anual={temAnual ? anual : 0} desconto={desconto} />
                  </div>
                </div>
              </div>
            </div>

            {/* Dúvidas comuns */}
            <section aria-labelledby="duvidas" className="mt-16">
              <h2 id="duvidas" className="font-display text-2xl font-bold text-white">{tr("Dúvidas comuns")}</h2>
              <div className="mt-5 divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
                {perguntas().map((q) => (
                  <details key={q.p} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
                      {q.p}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </summary>
                    <p className="mt-2 text-sm text-slate-400">{q.r}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />

      {/* Quem trava no pagamento precisa falar com gente, não com robô. */}
      <AjudaAssinatura />
    </div>
  );
}
