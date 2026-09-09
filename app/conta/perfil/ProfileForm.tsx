"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { signAvatarUpload, saveProfile } from "../actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";

type Form = { full_name: string; phone: string; country: string; linkedin_url: string; headline: string; bio: string; skills: string; cv_url: string; avatar_url: string; portfolio_url: string };
const EMPTY: Form = { full_name: "", phone: "", country: "", linkedin_url: "", headline: "", bio: "", skills: "", cv_url: "", avatar_url: "", portfolio_url: "" };

export default function ProfileForm() {
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || ""); setUid(user.id);
      const { data } = await supabase.from("profiles").select("full_name, phone, country, linkedin_url, headline, bio, skills, cv_url, avatar_url, portfolio_url").eq("id", user.id).maybeSingle();
      if (data) setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])) } as Form);
      setLoading(false);
    })();
  }, []);

  async function persist(patch: Partial<Form>) {
    const res = await saveProfile(patch as any);
    if (!res?.ok) throw new Error(res?.error || "Não consegui salvar.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      await persist(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveErr(err?.message || "Não consegui salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  async function onCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    if (file.type !== "application/pdf") { setAiMsg("Envie um PDF."); return; }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${uid}/cv-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("cv").upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (error) throw error;
      const { data } = supabase.storage.from("cv").getPublicUrl(path);
      const url = data.publicUrl;
      setForm((f) => ({ ...f, cv_url: url }));
      await persist({ cv_url: url });
    } catch {
      setAiMsg("Não consegui subir o CV. Tente de novo.");
    } finally {
      setUploading(false);
    }
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const s = await signAvatarUpload(ext);
      if (!s.ok) throw new Error();
      const supabase = createClient();
      const { error } = await supabase.storage.from("avatars").uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
      if (error) throw error;
      const url = s.url + `?v=${Date.now()}`;
      setForm((f) => ({ ...f, avatar_url: url }));
      await persist({ avatar_url: url });
    } catch {
      setAiMsg("Não consegui subir a foto. Tente uma imagem menor.");
    } finally {
      setUploading(false);
    }
  }

  async function aiFill() {
    if (aiText.trim().length < 20) { setAiMsg("Cole mais detalhes (seu LinkedIn ou currículo)."); return; }
    setAiLoading(true); setAiMsg("");
    try {
      const res = await fetch("/api/profile/ai-fill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: aiText }) });
      const data = await res.json();
      if (!res.ok) { setAiMsg(data.error || "Não consegui processar."); return; }
      setForm((f) => ({ ...f, headline: data.headline || f.headline, bio: data.bio || f.bio, skills: data.skills || f.skills }));
      setAiMsg("Prontinho! Confira os campos e salve.");
    } catch {
      setAiMsg("Falha de conexão.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return <p className="text-slate-400">Carregando...</p>;

  return (
    <>
      {/* Cabeçalho com avatar */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/8 bg-gradient-to-r from-brand-green/[0.08] to-brand-blue/[0.05] p-5">
        <button type="button" onClick={() => avatarRef.current?.click()} className="group relative shrink-0 rounded-full" title="Trocar foto">
          <Avatar name={form.full_name || email} src={form.avatar_url || null} size="lg" className="ring-2 ring-white/10" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white"><path d="M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>
        <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatar} className="hidden" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-white">{form.full_name || "Complete seu nome"}</p>
          {form.headline && <p className="truncate text-sm text-brand-teal">{form.headline}</p>}
          <p className="truncate text-sm text-slate-400">{email}</p>
          <button type="button" onClick={() => avatarRef.current?.click()} disabled={uploading} className="mt-1 text-xs text-brand-teal hover:underline disabled:opacity-60">{uploading ? "enviando..." : "trocar foto"}</button>
        </div>
      </div>

      {/* Trajetória com IA */}
      <div className="mt-6 glow-border rounded-2xl">
        <div className="glass rounded-2xl p-5">
          <p className="font-display text-base font-bold text-white">Monte sua trajetória com IA</p>
          <p className="mt-1 text-sm text-slate-400">Cole o texto do seu LinkedIn (seção "Sobre" + experiências) ou do seu currículo. A IA organiza seu título, resumo e habilidades. Você revisa e salva.</p>
          <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={4} placeholder="Cole aqui seu LinkedIn/currículo..." className={`${field} mt-3 resize-y`} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={aiFill} disabled={aiLoading} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
              {aiLoading ? "Processando..." : "Preencher com IA"}
            </button>
            {aiMsg && <span className="text-xs text-slate-400">{aiMsg}</span>}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <div className="space-y-1.5">
          <label className={label} htmlFor="full_name">Nome completo</label>
          <input id="full_name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="headline">Título profissional</label>
          <input id="headline" value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} placeholder="Ex.: Analista de Dados | Power BI" className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="bio">Sobre você / trajetória</label>
          <textarea id="bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={3} className={`${field} resize-y`} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="skills">Habilidades</label>
          <input id="skills" value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} placeholder="Power BI, SQL, Python, Storytelling..." className={field} />
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
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={label} htmlFor="linkedin_url">LinkedIn</label>
            <input id="linkedin_url" value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/seu-perfil" className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="portfolio_url">Portfólio</label>
            <input id="portfolio_url" value={form.portfolio_url} onChange={(e) => setForm((f) => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://seu-portfolio.com" className={field} />
            <p className="text-xs text-slate-500">Aparece na Vitrine de alunos.</p>
          </div>
        </div>

        {/* CV */}
        <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <label className={label}>Currículo (PDF)</label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-lg border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green disabled:opacity-60">
              {uploading ? "Enviando..." : "Enviar CV"}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={onCv} className="hidden" />
            {form.cv_url && <a href={form.cv_url} target="_blank" rel="noreferrer" className="text-sm text-brand-teal hover:underline">Ver CV enviado ↗</a>}
          </div>
          <p className="text-xs text-slate-500">Entra no seu perfil do banco de talentos da DriveData.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar perfil"}
          </button>
          {saved && <span className="text-sm text-brand-green">Salvo!</span>}
          {saveErr && <span className="text-sm text-red-300">{saveErr}</span>}
        </div>
      </form>
    </>
  );
}
