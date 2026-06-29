"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LanguageProvider";

const PERK_ICONS = [
  "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
];

export default function EnterpriseSection() {
  const t = useT();
  const perks = t.enterprise.perks.map((p, i) => ({ ...p, icon: PERK_ICONS[i] }));

  return (
    <section id="empresas" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="glow-border overflow-hidden rounded-[2.5rem]">
          <div className="glass-strong relative grid gap-10 rounded-[2.5rem] p-8 sm:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-blue/15 blur-[110px]" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{t.enterprise.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                {t.enterprise.titlePre} <span className="text-gradient">{t.enterprise.titleGrad}</span>
              </h2>
              <p className="mt-4 max-w-lg text-slate-300/90">{t.enterprise.desc}</p>

              <div className="mt-8 space-y-4">
                {perks.map((p) => (
                  <div key={p.title} className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-green">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d={p.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-white">{p.title}</p>
                      <p className="text-sm text-slate-400">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enterprise form */}
            <div className="relative rounded-3xl border border-white/8 bg-white/[0.03] p-6 sm:p-7">
              <h3 className="font-display text-lg font-bold text-white">{t.enterprise.formTitle}</h3>
              <p className="mt-1 text-sm text-slate-400">{t.enterprise.formSubtitle}</p>
              <EnterpriseForm />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function EnterpriseForm() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    request_type: "",
    email: "",
    phone: "",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("enterprise_leads").insert({
      name: form.name.trim(),
      request_type: form.request_type,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      message: form.message.trim(),
    });

    setLoading(false);
    if (error) {
      setError(t.enterprise.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/10 px-5 py-6 text-sm text-slate-200">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-green/20 text-brand-green">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-white">{t.enterprise.okTitle}</p>
          <p className="text-slate-400">{t.enterprise.okText}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3">
      <input
        required
        placeholder={t.enterprise.fName}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
      />
      <select
        required
        value={form.request_type}
        onChange={(e) => setForm((f) => ({ ...f, request_type: e.target.value }))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-green/60 [&>option]:bg-ink-900"
      >
        <option value="" disabled>
          {t.enterprise.fSelect}
        </option>
        {t.enterprise.requestTypes.map((rt) => (
          <option key={rt} value={rt}>
            {rt}
          </option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          type="email"
          placeholder={t.enterprise.fEmail}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
        />
        <input
          required
          type="tel"
          placeholder={t.enterprise.fPhone}
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
        />
      </div>
      <textarea
        rows={3}
        placeholder={t.enterprise.fMessage}
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_30px_-6px_rgba(52,232,160,0.6)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t.enterprise.sending : t.enterprise.submit}
      </button>
    </form>
  );
}
