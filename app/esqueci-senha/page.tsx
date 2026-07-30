"use client";

import { useState } from "react";
import Link from "next/link";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <>
      <Background />
      <main className="relative grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mx-auto mb-8 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Drive Data Academy" className="h-10 w-auto" />
          </Link>
          <div className="glass-strong rounded-3xl border border-white/10 p-8">
            {sent ? (
              <div className="text-center">
                <h1 className="font-display text-2xl font-bold text-white">Verifique seu e-mail</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Se existir uma conta com <strong>{email}</strong>, enviamos um link para redefinir a senha.
                </p>
                <Link href="/entrar" className="mt-6 inline-block text-sm font-medium text-brand-green hover:underline">Voltar ao login</Link>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-white">Esqueci minha senha</h1>
                <p className="mt-1 text-sm text-slate-400">Enviamos um link para você criar uma nova.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                  <input required type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                  <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
                    {loading ? "Enviando..." : "Enviar link"}
                  </button>
                </form>
                <p className="mt-5 text-center text-sm text-slate-400">
                  <Link href="/entrar" className="font-medium text-brand-green hover:underline">Voltar ao login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
