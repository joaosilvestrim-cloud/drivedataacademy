"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("waitlist").insert({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      whatsapp: form.whatsapp.trim(),
    });

    setLoading(false);
    if (error) {
      setError(t.waitlist.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/10 px-5 py-6 text-sm text-slate-200">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-green/20 text-brand-green">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-white">{t.waitlist.okTitle}</p>
          <p className="text-slate-400">{t.waitlist.okText}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        type="text"
        placeholder={t.waitlist.name}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
      />
      <input
        required
        type="email"
        placeholder={t.waitlist.email}
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
      />
      <div className="flex items-stretch gap-2">
        <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-300">
          🇧🇷 +55
        </span>
        <input
          required
          type="tel"
          placeholder={t.waitlist.whatsapp}
          value={form.whatsapp}
          onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
        />
      </div>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_30px_-6px_rgba(52,232,160,0.6)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t.waitlist.sending : t.waitlist.submit}
      </button>
      <p className={`text-center text-xs text-slate-500 ${compact ? "hidden" : ""}`}>
        {t.waitlist.note}
      </p>
    </form>
  );
}
