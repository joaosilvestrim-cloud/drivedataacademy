"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { signAvatarUpload, saveProfile } from "../actions";

/* O perfil do aluno, feito para ser preenchido com gosto.

   Três ideias guiam a tela:
   - o aluno vê, enquanto digita, o cartão que os outros vão ver (na Vitrine,
     na comunidade e no portfólio);
   - o que falta está dito com nome e leva direto ao campo;
   - nada se perde: a barra de salvar acende quando há mudança, e Ctrl+S
     também salva. */

const field =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors hover:border-white/20 focus:border-brand-green/70 focus:bg-white/[0.06]";
const label = "block text-sm font-medium text-slate-200";
const dica = "text-xs leading-relaxed text-slate-500";

type Form = { full_name: string; phone: string; country: string; linkedin_url: string; headline: string; bio: string; skills: string; avatar_url: string; portfolio_url: string };
const EMPTY: Form = { full_name: "", phone: "", country: "", linkedin_url: "", headline: "", bio: "", skills: "", avatar_url: "", portfolio_url: "" };

const LIMITE_TITULO = 220; // o mesmo do título do LinkedIn
const LIMITE_BIO = 2600; // o mesmo do "Sobre" do LinkedIn

const SUGESTOES = [
  "Power BI", "DAX", "Power Query", "SQL", "Excel", "Python", "Microsoft Fabric", "Snowflake", "Looker Studio",
  "Modelagem de dados", "Engenharia de dados", "Estatística", "Storytelling com dados", "IA generativa", "Prompting",
  "Gestão de projetos", "Scrum", "Kanban", "OKRs", "Stakeholders",
];

const PAISES = ["Brasil", "Portugal", "Canadá", "Estados Unidos", "Angola", "Moçambique", "Espanha", "México", "Argentina", "Chile", "Colômbia"];

const separar = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const juntar = (l: string[]) => l.join(", ");

const linkedinOk = (u: string) => !u.trim() || /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^/\s]+/i.test(u.trim());
const urlOk = (u: string) => !u.trim() || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u.trim());

/* Fora do componente de propósito: definido dentro, cada letra digitada
   recriaria a seção e o campo perderia o foco. */
function Secao({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
      <legend className="sr-only">{titulo}</legend>
      <div>
        <p className="font-display text-base font-semibold text-white">{titulo}</p>
        <p className={`mt-0.5 ${dica}`}>{texto}</p>
      </div>
      {children}
    </fieldset>
  );
}

function Contador({ n, max }: { n: number; max: number }) {
  return <span className={`font-mono text-xs tabular-nums ${n > max ? "text-red-300" : n > max * 0.9 ? "text-amber-200" : "text-slate-500"}`}>{n}/{max}</span>;
}

export default function ProfileForm({ siteDoPortfolio = null }: { siteDoPortfolio?: string | null }) {
  const tr = usarTraducao();
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [salvo, setSalvo] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avisoFoto, setAvisoFoto] = useState("");
  const [novaSkill, setNovaSkill] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase.from("profiles").select("full_name, phone, country, linkedin_url, headline, bio, skills, avatar_url, portfolio_url").eq("id", user.id).maybeSingle();
      const inicial = data
        ? ({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? juntar(v as string[]) : v ?? ""])) } as Form)
        : EMPTY;
      setForm(inicial);
      setSalvo(inicial);
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const skills = useMemo(() => separar(form.skills), [form.skills]);
  const alterado = (Object.keys(EMPTY) as (keyof Form)[]).some((k) => k !== "avatar_url" && form[k] !== salvo[k]);

  // O que falta, em ordem de importância para quem vai ler o perfil.
  const itens = [
    { id: "avatar", nome: tr("Foto"), feito: !!form.avatar_url },
    { id: "full_name", nome: tr("Nome completo"), feito: form.full_name.trim().split(/\s+/).length >= 2 },
    { id: "headline", nome: tr("Título profissional"), feito: form.headline.trim().length >= 10 },
    { id: "bio", nome: tr("Sobre você"), feito: form.bio.trim().length >= 80 },
    { id: "skills", nome: tr("Pelo menos 3 habilidades"), feito: skills.length >= 3 },
    { id: "linkedin_url", nome: tr("LinkedIn"), feito: !!form.linkedin_url.trim() && linkedinOk(form.linkedin_url) },
    { id: "portfolio_url", nome: tr("Portfólio"), feito: !!form.portfolio_url.trim() },
    { id: "country", nome: tr("País"), feito: !!form.country.trim() },
  ];
  const feitos = itens.filter((i) => i.feito).length;
  const faltam = itens.filter((i) => !i.feito);

  const irPara = (id: string) => {
    if (id === "avatar") return avatarRef.current?.click();
    const el = document.getElementById(id === "skills" ? "skills-nova" : id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => (el as HTMLInputElement | null)?.focus({ preventScroll: true }), 350);
  };

  async function persist(patch: Partial<Form>) {
    const res = await saveProfile(patch as any);
    if (!res?.ok) throw new Error(res?.error || tr("Não consegui salvar."));
  }

  const salvar = useCallback(async () => {
    setSaving(true); setSaved(false); setSaveErr("");
    try {
      await persist(form);
      setSalvo(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveErr(err?.message || tr("Não consegui salvar. Tente de novo."));
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Ctrl+S / Cmd+S salva, e sair da página com mudança pede confirmação.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (alterado && !saving) salvar();
      }
    };
    const sair = (e: BeforeUnloadEvent) => {
      if (alterado) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("beforeunload", sair);
    return () => { window.removeEventListener("keydown", tecla); window.removeEventListener("beforeunload", sair); };
  }, [alterado, saving, salvar]);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true); setAvisoFoto("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const s = await signAvatarUpload(ext);
      if (!s.ok) throw new Error();
      const supabase = createClient();
      const { error } = await supabase.storage.from("avatars").uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
      if (error) throw error;
      const url = s.url + `?v=${Date.now()}`;
      setForm((f) => ({ ...f, avatar_url: url }));
      setSalvo((f) => ({ ...f, avatar_url: url }));
      await persist({ avatar_url: url });
    } catch {
      setAvisoFoto(tr("Não consegui subir a foto. Tente uma imagem menor."));
    } finally {
      setUploading(false);
    }
  }

  // Aceita uma ou várias de uma vez: colar "SQL, Python, DAX" vira três etiquetas.
  const addSkill = (s: string) => {
    setNovaSkill("");
    setForm((f) => {
      const atuais = separar(f.skills);
      const novas = separar(s).filter((n, i, l) => l.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
      const somar = novas.filter((n) => !atuais.some((x) => x.toLowerCase() === n.toLowerCase()));
      return somar.length ? { ...f, skills: juntar([...atuais, ...somar]) } : f;
    });
  };
  const tirarSkill = (s: string) => setForm((f) => ({ ...f, skills: juntar(separar(f.skills).filter((x) => x !== s)) }));
  const sugestoes = SUGESTOES.filter(
    (s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()) && (!novaSkill || s.toLowerCase().includes(novaSkill.toLowerCase())),
  ).slice(0, 8);

  if (loading) {
    return (
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[32rem] animate-pulse rounded-2xl bg-white/[0.03]" />
        <div className="h-72 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  const bioLen = form.bio.trim().length;
  const bioDica =
    bioLen === 0
      ? tr("Três a cinco frases: o que você faz, onde já aplicou dados e o que busca agora.")
      : bioLen < 80
        ? tr("Está curto. Conte onde você aplicou dados e com que resultado.")
        : bioLen < 1200
          ? tr("Bom tamanho. Quem lê entende em poucos segundos.")
          : tr("Completo. Confira se o começo já diz o principal: muita gente só lê a primeira linha.");

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Prévia ao vivo: é assim que os outros alunos e quem visita veem. */}
      <aside className="order-first flex flex-col gap-4 lg:sticky lg:top-6 lg:order-last">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1424]">
          <div className="h-16 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(21,196,126,.32),transparent_60%),radial-gradient(120%_140%_at_100%_0%,rgba(59,130,246,.28),transparent_55%)]" />
          <div className="-mt-9 px-5 pb-5">
            <button type="button" onClick={() => avatarRef.current?.click()} className="group relative rounded-full" title={tr("Trocar foto")}>
              <Avatar name={form.full_name || email} src={form.avatar_url || null} size="lg" className="ring-4 ring-[#0b1424]" />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-[0.65rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? tr("enviando") : form.avatar_url ? tr("trocar") : tr("pôr foto")}
              </span>
            </button>
            <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatar} className="hidden" />
            {avisoFoto && <p className="mt-1 text-xs text-red-300">{avisoFoto}</p>}
            <p className="mt-2 font-display text-lg font-bold leading-tight text-white">{form.full_name || <span className="text-slate-500">{tr("Seu nome")}</span>}</p>
            <p className="mt-0.5 text-sm leading-snug text-brand-teal">{form.headline || <span className="text-slate-600">{tr("Seu título profissional")}</span>}</p>
            {form.country && <p className="mt-0.5 text-xs text-slate-500">{form.country}</p>}
            {form.bio && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-300">{form.bio}</p>}
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.slice(0, 8).map((s) => <span key={s} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-slate-200">{s}</span>)}
                {skills.length > 8 && <span className="px-1 py-0.5 text-xs text-slate-500">+{skills.length - 8}</span>}
              </div>
            )}
            {(form.linkedin_url || form.portfolio_url) && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {form.linkedin_url && <span className="text-[#6fb3ff]">LinkedIn</span>}
                {form.portfolio_url && <span className="text-brand-green">{tr("Portfólio")}</span>}
              </div>
            )}
            <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-slate-500">{tr("Prévia do seu cartão na Vitrine e na comunidade. Muda enquanto você digita.")}</p>
          </div>
        </div>

        {/* Quanto falta, com o nome de cada coisa. Clicar leva ao campo. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-white">{feitos === itens.length ? tr("Perfil completo") : tr("Seu perfil")}</p>
            <p className="font-mono text-xs tabular-nums text-slate-400">{feitos} {tr("de")} {itens.length}</p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-brand-green transition-[width] duration-500" style={{ width: `${(feitos / itens.length) * 100}%` }} />
          </div>
          {faltam.length > 0 ? (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {faltam.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => irPara(i.id)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm text-slate-300 hover:text-white">
                    {i.nome}
                    <span className="shrink-0 text-xs text-brand-green">{tr("preencher")} →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">{tr("Tudo preenchido. Seu cartão está pronto para quem visitar.")}</p>
          )}
        </div>
      </aside>

      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
        <div className="space-y-6">
          <Secao titulo={tr("Quem é você")} texto={tr("O nome sai no certificado e no portfólio. O título é a primeira linha que alguém lê.")}>
            <div className="space-y-1.5">
              <label className={label} htmlFor="full_name">{tr("Nome completo")}</label>
              <input id="full_name" value={form.full_name} onChange={set("full_name")} autoComplete="name" className={field} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label className={label} htmlFor="headline">{tr("Título profissional")}</label>
                <Contador n={form.headline.length} max={LIMITE_TITULO} />
              </div>
              <input id="headline" value={form.headline} onChange={set("headline")} maxLength={LIMITE_TITULO + 40} placeholder={tr("Ex.: Analista de Dados | Power BI")} className={field} />
              <p className={dica}>{tr("Cargo e especialidade bastam. Separe com | como no LinkedIn.")}</p>
            </div>
          </Secao>

          <Secao titulo={tr("Sua história")} texto={tr("Aparece no seu cartão e entra no prompt do seu site de portfólio.")}>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label className={label} htmlFor="bio">{tr("Sobre você / trajetória")}</label>
                <Contador n={bioLen} max={LIMITE_BIO} />
              </div>
              <textarea id="bio" value={form.bio} onChange={set("bio")} rows={5} maxLength={LIMITE_BIO} className={`${field} resize-y leading-relaxed`} />
              <p className={dica}>{bioDica}</p>
            </div>
          </Secao>

          <Secao titulo={tr("O que você sabe fazer")} texto={tr("Escreva e aperte Enter, ou toque numa sugestão.")}>
            <div>
              <label className="sr-only" htmlFor="skills-nova">{tr("Habilidades")}</label>
              <div
                className="flex cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 transition-colors hover:border-white/20 focus-within:border-brand-green/70"
                onClick={() => document.getElementById("skills-nova")?.focus()}
              >
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-white/[0.08] py-1 pl-2.5 pr-1 text-sm text-white">
                    {s}
                    <button type="button" onClick={() => tirarSkill(s)} className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-white/10 hover:text-white" aria-label={`${tr("Tirar")} ${s}`}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="skills-nova"
                  value={novaSkill}
                  onChange={(e) => (e.target.value.endsWith(",") ? addSkill(e.target.value) : setNovaSkill(e.target.value))}
                  onPaste={(e) => {
                    const t = e.clipboardData.getData("text");
                    if (/[,;\n]/.test(t)) { e.preventDefault(); addSkill(t); }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addSkill(novaSkill); }
                    if (e.key === "Backspace" && !novaSkill && skills.length) tirarSkill(skills[skills.length - 1]);
                  }}
                  onBlur={() => novaSkill && addSkill(novaSkill)}
                  placeholder={skills.length ? tr("adicionar...") : tr("Power BI, SQL, Python...")}
                  className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-white placeholder:text-slate-500 outline-none"
                />
              </div>
              {sugestoes.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addSkill(s)}
                      className="rounded-lg border border-dashed border-white/15 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-brand-green/60 hover:text-white"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Secao>

          <Secao titulo={tr("Contato e links")} texto={tr("O telefone não aparece para outros alunos: só o time usa, se precisar falar com você.")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={label} htmlFor="phone">{tr("Telefone / WhatsApp")}</label>
                <input id="phone" value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-0000" className={field} />
              </div>
              <div className="space-y-1.5">
                <label className={label} htmlFor="country">{tr("País")}</label>
                <input id="country" value={form.country} onChange={set("country")} list="paises" placeholder={tr("Brasil")} className={field} />
                <datalist id="paises">{PAISES.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="linkedin_url">{tr("LinkedIn")}</label>
              <input
                id="linkedin_url"
                value={form.linkedin_url}
                onChange={set("linkedin_url")}
                inputMode="url"
                placeholder="https://www.linkedin.com/in/seu-perfil"
                className={`${field} ${linkedinOk(form.linkedin_url) ? "" : "!border-amber-400/60"}`}
              />
              {!linkedinOk(form.linkedin_url) && <p className="text-xs text-amber-200">{tr("Use o endereço do seu perfil, no formato linkedin.com/in/seu-nome.")}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="portfolio_url">{tr("Portfólio")}</label>
              <input
                id="portfolio_url"
                value={form.portfolio_url}
                onChange={set("portfolio_url")}
                inputMode="url"
                placeholder="https://seu-portfolio.com"
                className={`${field} ${urlOk(form.portfolio_url) ? "" : "!border-amber-400/60"}`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={dica}>{urlOk(form.portfolio_url) ? tr("Aparece na Vitrine de alunos.") : tr("Comece com https:// para o link funcionar.")}</p>
                {siteDoPortfolio && form.portfolio_url !== siteDoPortfolio && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, portfolio_url: siteDoPortfolio }))} className="text-xs font-semibold text-brand-green hover:underline">
                    {tr("Usar meu site da Academy")}
                  </button>
                )}
              </div>
            </div>
          </Secao>
        </div>

        {/* A barra de salvar gruda no pé da tela quando há mudança. */}
        <div
          className={`z-10 mt-8 flex flex-wrap items-center gap-3 rounded-xl border py-3 transition-colors ${
            alterado ? "sticky bottom-3 border-brand-green/40 bg-[#0b1a1a] px-4 shadow-lg shadow-black/40" : "border-transparent"
          }`}
        >
          <button type="submit" disabled={saving || !alterado} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-2.5 text-sm font-semibold text-ink-900 transition-opacity disabled:opacity-40">
            {saving ? tr("Salvando...") : tr("Salvar perfil")}
          </button>
          {alterado && !saving && (
            <span className="text-sm text-slate-300">
              {tr("Alterações não salvas")} <span className="hidden text-xs text-slate-500 sm:inline">· Ctrl+S</span>
            </span>
          )}
          {!alterado && saved && <span className="text-sm text-brand-green">{tr("Salvo")}</span>}
          {!alterado && !saved && !saveErr && <span className="text-sm text-slate-500">{tr("Tudo salvo")}</span>}
          {saveErr && <span className="text-sm text-red-300">{saveErr}</span>}
        </div>
      </form>
    </div>
  );
}
