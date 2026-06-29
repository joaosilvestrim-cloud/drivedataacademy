"use client";

import { useEffect, useState } from "react";
import CopyButton from "./CopyButton";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function CampaignLink({ slug, published }: { slug: string; published: boolean }) {
  const [origin, setOrigin] = useState("");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [medium, setMedium] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const base = origin ? `${origin}/materiais/${slug}` : `/materiais/${slug}`;
  const params = new URLSearchParams();
  if (source.trim()) params.set("utm_source", source.trim());
  if (medium.trim()) params.set("utm_medium", medium.trim());
  if (campaign.trim()) params.set("utm_campaign", campaign.trim());
  const qs = params.toString();
  const full = qs ? `${base}?${qs}` : base;

  return (
    <div className="glass rounded-2xl border border-brand-green/20 p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-green/15 text-brand-green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M10 14a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 5.5M14 10a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 007.07 7.07L12.5 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="font-display text-lg font-bold text-white">Link de divulgação</h2>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Este é o endereço da página. Compartilhe nas suas campanhas — cada lead já é registrado
        com o conteúdo baixado. Preencha os campos abaixo para também identificar a campanha.
      </p>

      {!published && (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Este material está como <strong>rascunho</strong> — publique para o link abrir para o público.
        </div>
      )}

      {/* Link base */}
      <div className="mt-4">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Link da página</label>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-200">
            {base}
          </code>
          <CopyButton text={base} />
          <a
            href={base}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white"
          >
            Abrir
          </a>
        </div>
      </div>

      {/* Construtor de campanha */}
      <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="text-sm font-medium text-white">Rastrear campanha (opcional)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-400">Origem (rede/canal)</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="instagram" className={field} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Campanha</label>
            <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="lancamento-bi" className={field} />
          </div>
          <div>
            <label className="text-xs text-slate-400">Mídia (opcional)</label>
            <input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="post, ads, email" className={field} />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Link com rastreio</label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-brand-teal">
              {full}
            </code>
            <CopyButton text={full} label="Copiar link" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Use um link diferente por canal (ex.: um para o Instagram, outro para e-mail) — assim você
            vê na aba <strong>Leads</strong> de onde veio cada cadastro.
          </p>
        </div>
      </div>
    </div>
  );
}
