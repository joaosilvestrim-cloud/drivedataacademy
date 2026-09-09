"use client";

import { useState } from "react";
import { saveChallenge, reviewSubmission } from "./actions";

type Competency = { id: string; name: string };
type Challenge = {
  id: string; competency: string; dimension: string; title: string; brief: string;
  group_key: string; credits: number; advanced: boolean; published: boolean;
};
type Submission = {
  id: string; challenge_id: string; user_id: string; content: string; link: string | null;
  status: "pending" | "approved" | "rejected"; quality: number | null; feedback: string | null;
  created_at: string; studentName: string; challengeTitle: string;
};

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const label = "block text-xs font-medium text-slate-300";

function NewChallenge({ competencies, editing, onDone }: { competencies: Competency[]; editing: Challenge | null; onDone: () => void }) {
  const [competency, setCompetency] = useState(editing?.competency ?? competencies[0]?.id ?? "");
  const [dimension, setDimension] = useState(editing?.dimension ?? "challenge");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [brief, setBrief] = useState(editing?.brief ?? "");
  const [group, setGroup] = useState(editing?.group_key ?? "");
  const [credits, setCredits] = useState(String(editing?.credits ?? 1));
  const [advanced, setAdvanced] = useState(editing?.advanced ?? false);
  const [published, setPublished] = useState(editing?.published ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    const res = await saveChallenge({
      id: editing?.id, competency, dimension, title, brief,
      group_key: group, credits: Number(credits), advanced, published,
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    onDone();
  }

  return (
    <div className="glass space-y-4 rounded-2xl border border-white/8 p-5">
      <p className="text-sm font-semibold text-white">{editing ? "Editar desafio" : "Novo desafio"}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={label}>Competência</label>
          <select value={competency} onChange={(e) => setCompetency(e.target.value)} className={field}>
            {competencies.map((c) => <option key={c.id} value={c.id} className="bg-ink-900">{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={label}>Tipo</label>
          <select value={dimension} onChange={(e) => setDimension(e.target.value)} className={field}>
            <option value="challenge" className="bg-ink-900">Desafio</option>
            <option value="exercise" className="bg-ink-900">Exercício</option>
            <option value="retention" className="bg-ink-900">Revisão</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={label}>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={field} placeholder="Ex.: Construir um dashboard de vendas com DAX" />
      </div>

      <div className="space-y-1.5">
        <label className={label}>Enunciado</label>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value.slice(0, 4000))} rows={4} className={`${field} resize-y`} placeholder="O que o aluno deve entregar e como será avaliado." />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={label}>Grupo de equivalência</label>
          <input value={group} onChange={(e) => setGroup(e.target.value)} maxLength={80} className={field} placeholder="ex.: dax-pratica" />
          <p className="text-[0.7rem] text-slate-500">Desafios que medem a mesma evidência usam o mesmo grupo. Só o melhor conta.</p>
        </div>
        <div className="space-y-1.5">
          <label className={label}>Créditos</label>
          <input value={credits} onChange={(e) => setCredits(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={field} />
          <p className="text-[0.7rem] text-slate-500">Comparado ao alvo da competência nessa dimensão.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
          Conta como avançado
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
          Publicado para os alunos
        </label>
      </div>
      <p className="text-[0.7rem] text-slate-500">Avançado só destrava acima de 79 pontos junto com uma avaliação avançada aprovada, e exige qualidade a partir de 80%.</p>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60">
          {busy ? "Salvando..." : editing ? "Salvar alterações" : "Criar desafio"}
        </button>
        {editing && <button onClick={onDone} className="text-sm text-slate-400 hover:text-white">Cancelar</button>}
        {err && <span className="text-sm text-red-300">{err}</span>}
      </div>
    </div>
  );
}

function Review({ sub }: { sub: Submission }) {
  const [quality, setQuality] = useState("80");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState(sub.status);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true); setErr("");
    const res = await reviewSubmission(sub.id, decision, Number(quality), feedback);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setStatus(decision);
  }

  const tone = status === "approved" ? "border-brand-green/40 bg-brand-green/[0.06]"
    : status === "rejected" ? "border-red-400/30 bg-red-400/[0.05]"
    : "border-white/8 bg-white/[0.02]";

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{sub.studentName}</p>
          <p className="text-xs text-slate-400">{sub.challengeTitle}</p>
        </div>
        <span className="text-xs text-slate-500">{new Date(sub.created_at).toLocaleDateString("pt-BR")}</span>
      </div>

      <p className="mt-3 whitespace-pre-line rounded-xl border border-white/8 bg-ink-900/40 p-3 text-sm text-slate-300">{sub.content}</p>
      {sub.link && <a href={sub.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand-teal hover:underline">Abrir entrega ↗</a>}

      {status === "pending" ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className={label}>Qualidade (%)</label>
              <input value={quality} onChange={(e) => setQuality(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" className={`${field} w-28 tabular-nums`} />
            </div>
            <p className="pb-2 text-[0.7rem] text-slate-500">A partir de 70% a evidência conta como qualificada.</p>
          </div>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value.slice(0, 2000))} rows={3} className={`${field} resize-y`} placeholder="Retorno para o aluno." />
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => decide("approved")} disabled={busy} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60">
              {busy ? "Processando..." : "Aprovar e registrar evidência"}
            </button>
            <button onClick={() => decide("rejected")} disabled={busy} className="rounded-xl border border-white/12 px-4 py-2.5 text-sm text-slate-200 hover:border-red-400/50 hover:text-red-200 disabled:opacity-60">
              Pedir revisão
            </button>
            {err && <span className="text-sm text-red-300">{err}</span>}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium text-slate-300">
          {status === "approved" ? `Aprovado${sub.quality !== null ? ` com ${Math.round((sub.quality ?? 0) * 100)}%` : ""}. Evidência registrada.` : "Devolvido para revisão."}
        </p>
      )}
    </div>
  );
}

export default function DesafiosAdmin({ competencies, challenges, submissions }: { competencies: Competency[]; challenges: Challenge[]; submissions: Submission[] }) {
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [tab, setTab] = useState<"correcao" | "catalogo">("correcao");
  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <div className="max-w-4xl">
      <p className="text-xs uppercase tracking-widest text-brand-green">Knowledge Universe</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">Desafios</h1>
      <p className="mt-2 text-sm text-slate-400">Aprovar uma entrega registra a evidência prática no universo do aluno.</p>

      <div className="mt-6 flex gap-2">
        {(["correcao", "catalogo"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>
            {t === "correcao" ? `Correção${pending.length ? ` (${pending.length})` : ""}` : "Desafios"}
          </button>
        ))}
      </div>

      {tab === "correcao" ? (
        <div className="mt-6 space-y-4">
          {pending.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">Nenhuma entrega aguardando correção.</p>}
          {pending.map((s) => <Review key={s.id} sub={s} />)}
          {reviewed.length > 0 && (
            <>
              <p className="pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Já corrigidas</p>
              {reviewed.map((s) => <Review key={s.id} sub={s} />)}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <NewChallenge competencies={competencies} editing={editing} onDone={() => setEditing(null)} />
          <div className="space-y-3">
            {challenges.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{c.title}</p>
                  <p className="text-xs text-slate-500">{competencies.find((x) => x.id === c.competency)?.name ?? c.competency} · {c.credits} créditos · grupo {c.group_key}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${c.published ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{c.published ? "Publicado" : "Rascunho"}</span>
                  <button onClick={() => setEditing(c)} className="text-xs text-brand-teal hover:underline">editar</button>
                </div>
              </div>
            ))}
            {challenges.length === 0 && <p className="text-sm text-slate-500">Nenhum desafio criado ainda.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
