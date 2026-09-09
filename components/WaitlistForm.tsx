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
  const [ddi, setDdi] = useState("+55");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const num = form.whatsapp.trim();
    // guarda com o DDI escolhido; "outro" (ou número já com "+") usa o que a pessoa digitou
    const whatsapp = ddi === "+" || num.startsWith("+") ? num : `${ddi} ${num}`.trim();

    const supabase = createClient();
    const { error } = await supabase.from("waitlist").insert({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      whatsapp,
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
        <select
          value={ddi}
          onChange={(e) => setDdi(e.target.value)}
          aria-label="Código do país"
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-2 text-sm text-slate-200 outline-none focus:border-brand-green/60 [&>option]:bg-ink-900"
        >
          <option value="+55">🇧🇷 +55 Brasil</option>
          <option value="+351">🇵🇹 +351 Portugal</option>
          <option value="+244">🇦🇴 +244 Angola</option>
          <option value="+258">🇲🇿 +258 Moçambique</option>
          <option value="+238">🇨🇻 +238 Cabo Verde</option>
          <option value="+245">🇬🇼 +245 Guiné-Bissau</option>
          <option value="+239">🇸🇹 +239 São Tomé e Príncipe</option>
          <option value="+670">🇹🇱 +670 Timor-Leste</option>
          <option value="+1">🇺🇸 +1 EUA / Canadá</option>
          <option value="+52">🇲🇽 +52 México</option>
          <option value="+54">🇦🇷 +54 Argentina</option>
          <option value="+56">🇨🇱 +56 Chile</option>
          <option value="+57">🇨🇴 +57 Colômbia</option>
          <option value="+51">🇵🇪 +51 Peru</option>
          <option value="+58">🇻🇪 +58 Venezuela</option>
          <option value="+593">🇪🇨 +593 Equador</option>
          <option value="+591">🇧🇴 +591 Bolívia</option>
          <option value="+595">🇵🇾 +595 Paraguai</option>
          <option value="+598">🇺🇾 +598 Uruguai</option>
          <option value="+34">🇪🇸 +34 Espanha</option>
          <option value="+44">🇬🇧 +44 Reino Unido</option>
          <option value="+33">🇫🇷 +33 França</option>
          <option value="+49">🇩🇪 +49 Alemanha</option>
          <option value="+39">🇮🇹 +39 Itália</option>
          <option value="+31">🇳🇱 +31 Holanda</option>
          <option value="+41">🇨🇭 +41 Suíça</option>
          <option value="+353">🇮🇪 +353 Irlanda</option>
          <option value="+27">🇿🇦 +27 África do Sul</option>
          <option value="+234">🇳🇬 +234 Nigéria</option>
          <option value="+971">🇦🇪 +971 Emirados Árabes</option>
          <option value="+61">🇦🇺 +61 Austrália</option>
          <option value="+81">🇯🇵 +81 Japão</option>
          <option value="+86">🇨🇳 +86 China</option>
          <option value="+91">🇮🇳 +91 Índia</option>
          <option value="+">🌎 Outro país</option>
        </select>
        <input
          required
          type="tel"
          placeholder={t.waitlist.whatsapp}
          value={form.whatsapp}
          onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
        />
      </div>
      {ddi === "+" && <p className="text-xs text-slate-500">Selecionou "outro": digite o número completo com o código do país (ex.: +244 923 000 000).</p>}
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
