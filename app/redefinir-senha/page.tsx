"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/client";
import { enviarCodigoAcesso } from "../esqueci-senha/actions";
import CampoSenha from "@/components/CampoSenha";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

/* Primeiro acesso e troca de senha com código enviado por e-mail.
   O código abre a sessão (verifyOtp) e, na mesma ação, a senha nova é salva.
   Não depende de link de uso único, que filtros de e-mail costumam gastar. */
function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(params.get("enviado") ? "Enviamos o código para o seu e-mail. Confira também o lixo eletrônico." : null);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function reenviar() {
    setError(null);
    if (!email.trim()) {
      setError("Preencha o e-mail para receber um código.");
      return;
    }
    setEspera(60);
    const res = await enviarCodigoAcesso(email);
    if (!res.ok) {
      setError(res.error || "Não foi possível enviar agora.");
      setEspera(0);
      return;
    }
    setAviso("Enviamos um código novo. Use sempre o último que chegou.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = codigo.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Digite o código que chegou no seu e-mail.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: erroCodigo } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "recovery" });
    if (erroCodigo) {
      setLoading(false);
      setError("Código inválido ou expirado. Peça um novo código abaixo.");
      return;
    }
    const { error: erroSenha } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (erroSenha) {
      setError(/different|same/i.test(erroSenha.message) ? "Escolha uma senha diferente da anterior." : "Não foi possível salvar a senha. Tente de novo.");
      return;
    }
    router.push("/conta");
    router.refresh();
  }

  return (
    <div className="glass-strong rounded-3xl border border-white/10 p-8">
      <h1 className="font-display text-2xl font-bold text-white">Defina sua senha</h1>
      <p className="mt-1 text-sm text-slate-400">Primeiro acesso ou troca de senha: digite o código do e-mail e escolha a sua senha.</p>
      {aviso && <p role="status" className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-xs text-brand-green">{aviso}</p>}
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label htmlFor="senha-email" className="sr-only">E-mail</label>
        <input id="senha-email" required type="email" autoComplete="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        <label htmlFor="senha-codigo" className="sr-only">Código do e-mail</label>
        <input
          id="senha-codigo"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Código do e-mail"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
          className={`${field} font-mono tracking-[0.3em]`}
        />
        <label htmlFor="senha-nova" className="sr-only">Nova senha</label>
        <CampoSenha id="senha-nova" required autoComplete="new-password" placeholder="Nova senha (mínimo 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
          {loading ? "Salvando..." : "Salvar e entrar"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">
        Não chegou ou expirou?{" "}
        <button type="button" onClick={reenviar} disabled={espera > 0} className="font-medium text-brand-green hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline">
          {espera > 0 ? `Enviar de novo em ${espera}s` : "Enviar novo código"}
        </button>
      </p>
      <p className="mt-2 text-center text-sm text-slate-400">
        <Link href="/entrar" className="font-medium text-brand-green hover:underline">Voltar ao login</Link>
      </p>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <>
      <Background />
      <main className="relative grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mx-auto mb-8 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Drive Data Academy" className="h-10 w-auto" />
          </Link>
          <Suspense fallback={<div className="glass-strong h-96 rounded-3xl border border-white/10" />}>
            <Formulario />
          </Suspense>
        </div>
      </main>
    </>
  );
}
