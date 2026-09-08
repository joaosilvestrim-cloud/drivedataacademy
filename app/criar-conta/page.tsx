import Link from "next/link";
import Background from "@/components/Background";

export const dynamic = "force-dynamic";

// A conta só é criada após a confirmação do pagamento da assinatura.
// Cadastro aberto foi desativado: aqui direcionamos para a assinatura ou o login.
export default function CriarContaPage() {
  return (
    <>
      <Background />
      <main className="relative grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mx-auto mb-8 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Drive Data Academy" className="h-10 w-auto" />
          </Link>
          <div className="glass-strong rounded-3xl border border-white/10 p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-green/15 text-brand-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">Sua conta vem com a assinatura</h1>
            <p className="mt-2 text-sm text-slate-300">
              A conta na plataforma é criada automaticamente assim que sua assinatura é confirmada. É só assinar e você recebe um e-mail para definir a senha.
            </p>
            <Link href="/matricula" className="mt-6 inline-block w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              Assinar agora
            </Link>
            <p className="mt-5 text-sm text-slate-400">
              Já tem conta? <Link href="/entrar" className="font-medium text-brand-green hover:underline">Entrar</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
