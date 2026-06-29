"use client";

import { useEffect, useState } from "react";
import { submitLead } from "./actions";

type Material = {
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  cta_text: string | null;
  ask_phone: boolean;
  ask_company: boolean;
  ask_role: boolean;
};

type Utm = { source: string; medium: string; campaign: string };

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function MaterialView({ material, utm }: { material: Material; utm: Utm }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ fileUrl: string | null; emailed: boolean } | null>(null);
  const [referrer, setReferrer] = useState("");

  useEffect(() => {
    setReferrer(document.referrer || "");
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("slug", material.slug);
    fd.set("utm_source", utm.source);
    fd.set("utm_medium", utm.medium);
    fd.set("utm_campaign", utm.campaign);
    fd.set("referrer", referrer);
    const res = await submitLead(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone({ fileUrl: res.fileUrl, emailed: res.emailed });
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
      <a href="/" className="w-fit transition-transform hover:scale-[1.03]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Drive Data Academy" className="h-10 w-auto" />
      </a>

      <div className="mt-10 grid flex-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Conteúdo */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Material gratuito</p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{material.title}</h1>
          {material.subtitle && <p className="mt-4 text-lg text-slate-300/90">{material.subtitle}</p>}
          {material.cover_url && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={material.cover_url} alt={material.title} className="w-full object-cover" />
            </div>
          )}
          {material.description && (
            <p className="mt-6 whitespace-pre-line text-slate-300/90">{material.description}</p>
          )}
        </div>

        {/* Formulário / sucesso */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-green/20 via-transparent to-brand-blue/20 blur-2xl" />
          <div className="glow-border relative overflow-hidden rounded-[2rem]">
            <div className="glass-strong relative rounded-[2rem] p-7 sm:p-9">
              {done ? (
                <div className="text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-green/20 text-brand-green">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-bold text-white">Tudo certo! 🎉</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {done.emailed
                      ? "Enviamos o material para o seu e-mail. Confira a caixa de entrada (e o spam)."
                      : "Seu material está pronto para download abaixo."}
                  </p>
                  {done.fileUrl && (
                    <a
                      href={done.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
                    >
                      Acessar o material
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold text-white">Receba o material gratuito</h2>
                  <p className="mt-1 text-sm text-slate-400">Preencha e enviamos para o seu e-mail.</p>
                  <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                    <input name="name" required placeholder="Seu nome" className={field} />
                    <input name="email" type="email" required placeholder="Seu melhor e-mail" className={field} />
                    {material.ask_phone && <input name="phone" type="tel" placeholder="Telefone / WhatsApp" className={field} />}
                    {material.ask_company && <input name="company" placeholder="Empresa" className={field} />}
                    {material.ask_role && <input name="role" placeholder="Cargo" className={field} />}
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_30px_-6px_rgba(52,232,160,0.6)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Enviando..." : material.cta_text || "Quero receber"}
                    </button>
                    <p className="text-center text-xs text-slate-500">
                      Seus dados estão seguros. Sem spam.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
