"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
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
            <h1 className="font-display text-2xl font-bold text-white">Entrar</h1>
            <p className="mt-1 text-sm text-slate-400">Acesse seus cursos e certificados.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              <input required type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-400">
              Ainda não tem conta?{" "}
              <Link href="/criar-conta" className="font-medium text-brand-green hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
