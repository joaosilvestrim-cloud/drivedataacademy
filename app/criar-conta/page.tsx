"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function CriarContaPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: { data: { full_name: form.full_name.trim() } },
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("registered")
          ? "Este e-mail já tem conta. Tente entrar."
          : "Não foi possível criar a conta agora. Tente novamente."
      );
      return;
    }
    // Se a confirmação de e-mail estiver ativa, não vem sessão.
    if (data.session) {
      router.push("/conta");
      router.refresh();
    } else {
      setConfirmSent(true);
    }
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
            {confirmSent ? (
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-green/20 text-brand-green">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h1 className="mt-4 font-display text-2xl font-bold text-white">Confirme seu e-mail</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Enviamos um link de confirmação para <strong>{form.email}</strong>. Depois é só entrar.
                </p>
                <Link href="/entrar" className="mt-6 inline-block text-sm font-medium text-brand-green hover:underline">
                  Ir para o login
                </Link>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-white">Criar conta</h1>
                <p className="mt-1 text-sm text-slate-400">Comece sua jornada em dados e IA.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                  <input required placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={field} />
                  <input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={field} />
                  <input required type="password" placeholder="Senha (mín. 6 caracteres)" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={field} />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Criando..." : "Criar conta"}
                  </button>
                </form>
                <p className="mt-5 text-center text-sm text-slate-400">
                  Já tem conta?{" "}
                  <Link href="/entrar" className="font-medium text-brand-green hover:underline">
                    Entrar
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
