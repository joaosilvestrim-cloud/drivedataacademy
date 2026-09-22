import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { pedirDemonstracao } from "./actions";

export const dynamic = "force-dynamic";

/* Página que o QR code da live abre.

   Ela é lida no celular, em pé, com o apresentador falando. Por isso é uma
   coluna só, campo grande, e nada além do necessário: nome, e-mail, telefone
   e a palavra que está na tela. */

const campo =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default async function DemoPage({
  params, searchParams,
}: {
  params: { slug: string };
  searchParams: { erro?: string; ok?: string; nova?: string; codigo?: string };
}) {
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("demo_invites").select("titulo, palavra, dias, ativo").eq("slug", params.slug).maybeSingle();
  if (!c) notFound();

  if (searchParams.ok) {
    const nova = searchParams.nova === "1";
    const codigo = searchParams.codigo || "";
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">Acesso liberado</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          {c.dias} dias de DriveCanvas são seus.
        </h1>

        {nova && codigo ? (
          <>
            <p className="mt-5 text-slate-300">Guarde este código. Ele cria a sua senha:</p>
            <p className="mt-3 rounded-2xl border border-brand-green/40 bg-brand-green/10 px-6 py-6 text-center font-mono text-4xl font-bold tracking-[0.2em] text-brand-green">
              {codigo}
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Mandamos ele no seu e-mail também. Se sumir da tela, procure lá.
            </p>
            <a
              href="/redefinir-senha"
              className="mt-6 block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-4 text-center text-base font-semibold text-ink-900"
            >
              Criar minha senha
            </a>
          </>
        ) : (
          <>
            <p className="mt-5 text-slate-300">
              Esta conta já existia, então entre com a senha que você já usa.
            </p>
            <a
              href="/entrar"
              className="mt-6 block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-4 text-center text-base font-semibold text-ink-900"
            >
              Entrar agora
            </a>
          </>
        )}

        <p className="mt-8 text-sm leading-relaxed text-slate-500">
          Depois de entrar, abra <b className="text-slate-300">Ferramentas → DriveCanvas</b>. O resto da
          plataforma fica visível para você conhecer, mas só a ferramenta funciona nesses {c.dias} dias.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">{c.titulo}</p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white">
        {c.dias} dias de DriveCanvas, de graça.
      </h1>
      <p className="mt-3 text-slate-400">
        A ferramenta de visuais em HTML da DriveData. Preencha e o acesso sai na hora.
      </p>

      {!c.ativo && (
        <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Esta demonstração está encerrada.
        </p>
      )}

      {searchParams.erro && (
        <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {searchParams.erro}
        </p>
      )}

      {c.ativo && (
        <form action={pedirDemonstracao} className="mt-7 space-y-3">
          <input type="hidden" name="slug" value={params.slug} />
          <input name="name" required placeholder="Seu nome" autoComplete="name" className={campo} />
          <input name="email" type="email" required placeholder="Seu melhor e-mail" autoComplete="email" inputMode="email" className={campo} />
          <input name="phone" required placeholder="WhatsApp com DDD" autoComplete="tel" inputMode="tel" className={campo} />
          {c.palavra && (
            <input
              name="palavra"
              required
              placeholder="Palavra-chave da tela"
              autoCapitalize="none"
              autoComplete="off"
              className={campo}
            />
          )}
          <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm text-slate-400">
            <input type="checkbox" name="consent" defaultChecked className="mt-1 h-4 w-4 shrink-0 accent-brand-green" />
            <span>Aceito receber novidades da DriveData Academy.</span>
          </label>
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-4 text-base font-semibold text-ink-900"
          >
            Liberar meu acesso
          </button>
        </form>
      )}
    </main>
  );
}
