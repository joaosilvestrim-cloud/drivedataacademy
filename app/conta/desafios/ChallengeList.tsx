"use client";

import { useState } from "react";
import { submitChallenge } from "./actions";

type Submission = {
  content: string; link: string | null; status: "pending" | "approved" | "rejected";
  quality: number | null; feedback: string | null; reviewed_at: string | null;
};
type Item = {
  id: string; competency: string; competencyName: string; dimension: string;
  title: string; brief: string; credits: number; advanced: boolean;
  submission: Submission | null;
};

const DIMENSION_LABEL: Record<string, string> = { challenge: "Desafio", exercise: "Exercício", retention: "Revisão" };

const STATUS = {
  pending: { label: "Em correção", cls: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  approved: { label: "Aprovado", cls: "border-brand-green/40 bg-brand-green/10 text-brand-green" },
  rejected: { label: "Revisar e reenviar", cls: "border-red-400/30 bg-red-400/10 text-red-200" },
} as const;

function Card({ item }: { item: Item }) {
  const sub = item.submission;
  const aprovado = sub?.status === "approved";
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(sub?.content ?? "");
  const [link, setLink] = useState(sub?.link ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true); setErr("");
    const res = await submitChallenge(item.id, content, link);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setDone(true); setOpen(false);
  }

  const status = sub ? STATUS[sub.status] : null;
  const enviado = done || !!sub;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase text-brand-teal">
              {DIMENSION_LABEL[item.dimension] || item.dimension}
            </span>
            <span className="text-xs text-slate-400">{item.competencyName}</span>
            {item.advanced && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-amber-300">Avançado</span>}
          </div>
          <h2 className="mt-2 font-display text-lg font-bold text-white">{item.title}</h2>
        </div>
        {status && <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>}
        {!status && done && <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">Enviado</span>}
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{item.brief}</p>

      {sub?.feedback && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold text-slate-300">Retorno da equipe</p>
          <p className="mt-1 text-sm text-slate-400">{sub.feedback}</p>
          {aprovado && sub.quality !== null && (
            <p className="mt-2 text-xs text-brand-green">Qualidade avaliada: {Math.round(sub.quality * 100)}%</p>
          )}
        </div>
      )}

      {aprovado ? (
        <p className="mt-4 text-sm text-brand-green">Evidência registrada no seu universo.</p>
      ) : open ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 4000))}
            rows={5}
            placeholder="Conte o que você fez, as decisões que tomou e o resultado."
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
          />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link do arquivo, repositório ou publicação (opcional)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={send} disabled={busy} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60">
              {busy ? "Enviando..." : "Enviar entrega"}
            </button>
            <button onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
            {err && <span className="text-sm text-red-300">{err}</span>}
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-4 rounded-xl border border-white/12 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green">
          {enviado ? "Reenviar entrega" : "Fazer minha entrega"}
        </button>
      )}
    </div>
  );
}

export default function ChallengeList({ items }: { items: Item[] }) {
  if (!items.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
        <p className="font-medium text-white">Nenhum desafio aberto no momento.</p>
        <p className="mt-1 text-sm text-slate-400">A equipe publica novos desafios conforme as turmas avançam.</p>
      </div>
    );
  }
  return <div className="mt-8 space-y-4">{items.map((i) => <Card key={i.id} item={i} />)}</div>;
}
