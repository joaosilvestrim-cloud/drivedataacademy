"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Não foi possível salvar. O link pode ter expirado.");
      return;
    }
    router.push("/conta");
    router.refresh();
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
            <h1 className="font-display text-2xl font-bold text-white">Defina sua senha</h1>
            <p className="mt-1 text-sm text-slate-400">Primeiro acesso ou troca de senha: escolha a senha que você vai usar para entrar.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input required type="password" placeholder="Senha (mínimo 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              {error && (
                <p className="text-xs text-red-400">
                  {error} <Link href="/esqueci-senha" className="font-medium underline underline-offset-2">Pedir um novo link</Link>
                </p>
              )}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
                {loading ? "Salvando..." : "Salvar e entrar"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
