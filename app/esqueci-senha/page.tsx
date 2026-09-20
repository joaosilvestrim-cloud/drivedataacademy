"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Background from "@/components/Background";
import { enviarCodigoAcesso } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function EsqueciSenhaPage() {
  const tr = usarTraducao();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const limpo = email.trim().toLowerCase();
    const res = await enviarCodigoAcesso(limpo);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || tr("Não foi possível enviar agora."));
      return;
    }
    router.push(`/redefinir-senha?email=${encodeURIComponent(limpo)}&enviado=1`);
  }

  return (
    <>
      <Background />
      <main className="relative grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mx-auto mb-8 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={tr("Drive Data Academy")} className="h-10 w-auto" />
          </Link>
          <div className="glass-strong rounded-3xl border border-white/10 p-8">
            <h1 className="font-display text-2xl font-bold text-white">{tr("Criar ou trocar senha")}</h1>
            <p className="mt-1 text-sm text-slate-400">{tr("Enviamos um código para o seu e-mail. Com ele você cria uma senha nova.")}</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <label htmlFor="esqueci-email" className="sr-only">{tr("Seu e-mail")}</label>
              <input id="esqueci-email" required type="email" autoComplete="email" placeholder={tr("Seu e-mail")} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
                {loading ? "Enviando..." : tr("Enviar código")}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-400">
              {tr("Já tem um código?")} <Link href="/redefinir-senha" className="font-medium text-brand-green hover:underline">{tr("Digitar código")}</Link>
            </p>
            <p className="mt-2 text-center text-sm text-slate-400">
              <Link href="/entrar" className="font-medium text-brand-green hover:underline">{tr("Voltar ao login")}</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
