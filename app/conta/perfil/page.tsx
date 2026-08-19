"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";

export default function PerfilPage() {
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", country: "", linkedin_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, country, linkedin_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setForm({ full_name: data.full_name || "", phone: data.phone || "", country: data.country || "", linkedin_url: data.linkedin_url || "" });
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        country: form.country.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
      }).eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return <p className="text-slate-400">Carregando...</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Perfil</h1>
      <p className="mt-1 text-sm text-slate-400">Seus dados de aluno.</p>

      <form onSubmit={save} className="mt-6 max-w-lg space-y-5">
        <div className="space-y-1.5">
          <label className={label}>E-mail</label>
          <input value={email} disabled className={`${field} cursor-not-allowed opacity-60`} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="full_name">Nome completo</label>
          <input id="full_name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={field} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={label} htmlFor="phone">Telefone / WhatsApp</label>
            <input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="country">País</label>
            <input id="country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="Brasil" className={field} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="linkedin_url">LinkedIn</label>
          <input id="linkedin_url" value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/seu-perfil" className={field} />
          <p className="text-xs text-slate-500">Entra no banco de talentos da DriveData.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {saved && <span className="text-sm text-brand-green">Salvo!</span>}
        </div>
      </form>
    </div>
  );
}
