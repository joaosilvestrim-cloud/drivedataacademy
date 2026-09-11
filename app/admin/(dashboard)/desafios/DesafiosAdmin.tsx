"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button, ICON } from "@/components/ui/primitives";
import { Field, TextareaField, SelectField, CheckboxField, FormActions } from "@/components/ui/form";
import { Alert } from "@/components/ui/layout";
import { saveChallenge, reviewSubmission, saveDiagnosticQuestion, deleteDiagnosticQuestion, toggleChallengePublished, deleteChallenge } from "./actions";

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

type Question = {
  id: string; competency: string; prompt: string; options: string[];
  answer: number; credits: number; position: number; published: boolean;
};

// Esta tela não envia FormData: os campos são controlados e o payload vai como
// objeto para a Server Action. Os componentes do Design System funcionam assim
// porque `value` e `onChange` passam direto para o controle nativo. O `name`
// continua sendo o que dá id previsível ao par rótulo e campo.

// Botão de ação de linha. Mesmo desenho do gerenciador de vídeos em settings.
const acaoLinha =
  "grid h-10 w-10 shrink-0 place-items-center rounded-ctl border border-ds-line text-ds-text-2 transition-colors duration-fast ease-ds hover:border-ds-text-3 hover:text-ds-text";

function QuestionEditor({ competencies, editing, onDone }: { competencies: Competency[]; editing: Question | null; onDone: () => void }) {
  const [competency, setCompetency] = useState(editing?.competency ?? competencies[0]?.id ?? "");
  const [prompt, setPrompt] = useState(editing?.prompt ?? "");
  const [options, setOptions] = useState<string[]>(editing?.options ?? ["", "", "", ""]);
  const [answer, setAnswer] = useState(editing?.answer ?? 0);
  const [credits, setCredits] = useState(String(editing?.credits ?? 1));
  const [position, setPosition] = useState(String(editing?.position ?? 0));
  const [published, setPublished] = useState(editing?.published ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const scope = editing ? `pergunta-${editing.id}` : "pergunta-nova";

  async function save() {
    setBusy(true); setErr("");
    const res = await saveDiagnosticQuestion({
      id: editing?.id, competency, prompt, options, answer,
      credits: Number(credits), position: Number(position), published,
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    if (!editing) { setPrompt(""); setOptions(["", "", "", ""]); setAnswer(0); }
    onDone();
  }

  return (
    <section className="flex flex-col gap-5">
      <h3 className="border-b border-ds-line pb-2 font-display text-component font-semibold text-ds-text">
        {editing ? "Editar pergunta" : "Nova pergunta"}
      </h3>

      <div className="grid gap-4 tablet:grid-cols-2">
        <SelectField scope={scope} name="competency" label="Competência avaliada" value={competency} onChange={(e) => setCompetency(e.target.value)}>
          {competencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <Field scope={scope} name="credits" label="Créditos" value={credits} onChange={(e) => setCredits(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" />
          <Field scope={scope} name="position" label="Ordem" value={position} onChange={(e) => setPosition(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" />
        </div>
      </div>

      <TextareaField
        scope={scope}
        name="prompt"
        label="Pergunta"
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
        description={`Até 500 caracteres. Restam ${500 - prompt.length}.`}
      />

      {/* Lista dinâmica com uma alternativa correta. É controle próprio, não um
          Field solto: cada linha tem rótulo e o rádio à esquerda diz qual vale.
          O `name` compartilhado é o que faz o navegador tratar as opções como um
          grupo de verdade, com navegação por setas. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-label font-medium text-ds-text-2">Alternativas</legend>
        <p className="text-caption text-ds-text-3">O círculo à esquerda marca qual é a alternativa correta.</p>
        <ul className="mt-1 flex flex-col gap-3">
          {options.map((opt, i) => {
            const id = `${scope}-alt-${i}`;
            return (
              <li key={i} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-label font-medium text-ds-text-2">Alternativa {i + 1}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`${scope}-correta`}
                    checked={answer === i}
                    onChange={() => setAnswer(i)}
                    aria-label={`Alternativa ${i + 1} é a correta`}
                    className="h-4 w-4 shrink-0 accent-[color:var(--ds-accent)]"
                  />
                  <input
                    id={id}
                    value={opt}
                    onChange={(e) => setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
                    className="h-10 w-full rounded-ctl border border-ds-line bg-ds-surface px-3 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds hover:border-ds-text-3"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => { setOptions((o) => o.filter((_, j) => j !== i)); if (answer >= i && answer > 0) setAnswer(answer - 1); }}
                      aria-label={`Remover alternativa ${i + 1}`}
                      className={`${acaoLinha} hover:border-ds-danger/50 hover:text-ds-danger`}
                    >
                      <X size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {options.length < 6 && (
          <div className="mt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOptions((o) => [...o, ""])}>
              <Plus size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" />
              Adicionar alternativa
            </Button>
          </div>
        )}
      </fieldset>

      <CheckboxField
        scope={scope}
        name="published"
        label="Publicada no diagnóstico"
        checked={published}
        onChange={(e) => setPublished(e.target.checked)}
      />

      {err && <Alert tone="danger" title="Não foi possível salvar">{err}</Alert>}

      <FormActions>
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Salvando" : editing ? "Salvar alterações" : "Adicionar pergunta"}
        </Button>
        {editing && <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>}
      </FormActions>
    </section>
  );
}

const TIPOS = [
  { value: "challenge", label: "Desafio" },
  { value: "exercise", label: "Exercício" },
  { value: "retention", label: "Revisão" },
];

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
  const scope = editing ? `desafio-${editing.id}` : "desafio-novo";

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
    <section className="flex flex-col gap-5">
      <h3 className="border-b border-ds-line pb-2 font-display text-component font-semibold text-ds-text">
        {editing ? "Editar desafio" : "Novo desafio"}
      </h3>

      <div className="grid gap-4 tablet:grid-cols-2">
        <SelectField scope={scope} name="competency" label="Competência" value={competency} onChange={(e) => setCompetency(e.target.value)}>
          {competencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField scope={scope} name="dimension" label="Tipo" value={dimension} onChange={(e) => setDimension(e.target.value)}>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </SelectField>
      </div>

      <Field
        scope={scope}
        name="title"
        label="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={160}
        placeholder="Construir um dashboard de vendas com DAX"
      />

      <TextareaField
        scope={scope}
        name="brief"
        label="Enunciado"
        rows={4}
        value={brief}
        onChange={(e) => setBrief(e.target.value.slice(0, 4000))}
        placeholder="O que o aluno deve entregar e como será avaliado."
        description={`Até 4000 caracteres. Restam ${4000 - brief.length}.`}
      />

      <div className="grid gap-4 tablet:grid-cols-2">
        <Field
          scope={scope}
          name="group_key"
          label="Grupo de equivalência"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          maxLength={80}
          placeholder="dax-pratica"
          description="Desafios que medem a mesma evidência usam o mesmo grupo. Só o melhor conta."
        />
        <Field
          scope={scope}
          name="credits"
          label="Créditos"
          value={credits}
          onChange={(e) => setCredits(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          description="Comparado ao alvo da competência nessa dimensão."
        />
      </div>

      <div className="flex flex-col gap-3 tablet:flex-row tablet:gap-x-8">
        <CheckboxField
          scope={scope}
          name="advanced"
          label="Conta como avançado"
          checked={advanced}
          onChange={(e) => setAdvanced(e.target.checked)}
        />
        <CheckboxField
          scope={scope}
          name="published"
          label="Publicado para os alunos"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
      </div>
      <p className="text-caption text-ds-text-3">
        Avançado só destrava acima de 79 pontos junto com uma avaliação avançada aprovada, e exige
        qualidade a partir de 80%.
      </p>

      {err && <Alert tone="danger" title="Não foi possível salvar">{err}</Alert>}

      <FormActions>
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Salvando" : editing ? "Salvar alterações" : "Criar desafio"}
        </Button>
        {editing && <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>}
      </FormActions>
    </section>
  );
}

function Review({ sub }: { sub: Submission }) {
  const [quality, setQuality] = useState("80");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState(sub.status);
  const scope = `entrega-${sub.id}`;

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
        <div className="mt-5 flex flex-col gap-4">
          <Field
            scope={scope}
            name="quality"
            label="Qualidade"
            value={quality}
            onChange={(e) => setQuality(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            className="max-w-[12rem]"
            description="Em porcentagem. A partir de 70% a evidência conta como qualificada."
          />
          <TextareaField
            scope={scope}
            name="feedback"
            label="Retorno para o aluno"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
            description="O aluno recebe este texto por e-mail."
          />

          {err && <Alert tone="danger" title="Não foi possível registrar">{err}</Alert>}

          <FormActions>
            <Button type="button" onClick={() => decide("approved")} disabled={busy}>
              {busy ? "Processando" : "Aprovar e registrar evidência"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => decide("rejected")} disabled={busy}>
              Pedir revisão
            </Button>
          </FormActions>
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium text-slate-300">
          {status === "approved" ? `Aprovado${sub.quality !== null ? ` com ${Math.round((sub.quality ?? 0) * 100)}%` : ""}. Evidência registrada.` : "Devolvido para revisão."}
        </p>
      )}
    </div>
  );
}

export default function DesafiosAdmin({ competencies, challenges, submissions, diagnostic }: { competencies: Competency[]; challenges: Challenge[]; submissions: Submission[]; diagnostic: Question[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [tab, setTab] = useState<"correcao" | "catalogo" | "diagnostico">("correcao");
  const [actErr, setActErr] = useState("");

  async function act(promise: Promise<{ ok: boolean; error?: string }>) {
    setActErr("");
    const res = await promise;
    if (!res.ok) { setActErr(res.error || "Não consegui aplicar."); return; }
    router.refresh();
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <div className="max-w-4xl">
      <p className="text-xs uppercase tracking-widest text-brand-green">Knowledge Universe</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">Desafios</h1>
      <p className="mt-2 text-sm text-slate-400">Aprovar uma entrega registra a evidência prática no universo do aluno.</p>

      <div className="mt-6 flex gap-2">
        {(["correcao", "catalogo", "diagnostico"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>
            {t === "correcao" ? `Correção${pending.length ? ` (${pending.length})` : ""}` : t === "catalogo" ? "Desafios" : "Diagnóstico"}
          </button>
        ))}
      </div>

      {tab === "diagnostico" ? (
        <div className="mt-6 space-y-5">
          <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
            O diagnóstico é respondido uma vez por aluno e corrigido no servidor. Acertos viram evidência
            na dimensão Exercícios, no grupo <code className="text-slate-300">diagnostico</code>, nunca como avançado.
            Erro não registra nada.
          </p>
          <QuestionEditor competencies={competencies} editing={editingQuestion} onDone={() => setEditingQuestion(null)} />
          <div className="space-y-3">
            {diagnostic.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{q.prompt}</p>
                  <p className="text-xs text-slate-500">{competencies.find((x) => x.id === q.competency)?.name ?? q.competency} · {q.options.length} alternativas · ordem {q.position}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${q.published ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{q.published ? "Publicada" : "Rascunho"}</span>
                  <button onClick={() => setEditingQuestion(q)} className="text-xs text-brand-teal hover:underline">editar</button>
                  <button onClick={() => { if (confirm("Excluir esta pergunta?")) act(deleteDiagnosticQuestion(q.id)); }} className="text-xs text-slate-500 hover:text-red-300">excluir</button>
                </div>
              </div>
            ))}
            {diagnostic.length === 0 && <p className="text-sm text-slate-500">Nenhuma pergunta cadastrada ainda.</p>}
          </div>
        </div>
      ) : tab === "correcao" ? (
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
                  <p className="text-xs text-slate-500">{competencies.find((x) => x.id === c.competency)?.name ?? c.competency} · {c.credits} créditos · grupo {c.group_key}{c.advanced ? " · avançado" : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${c.published ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{c.published ? "Publicado" : "Rascunho"}</span>
                  <button onClick={() => setEditing(c)} className="text-xs text-brand-teal hover:underline">editar</button>
                  <button onClick={() => act(toggleChallengePublished(c.id, !c.published))} className="text-xs text-slate-400 hover:text-white">{c.published ? "despublicar" : "publicar"}</button>
                  <button onClick={() => { if (confirm(`Excluir "${c.title}"?`)) act(deleteChallenge(c.id)); }} className="text-xs text-slate-500 hover:text-red-300">excluir</button>
                </div>
              </div>
            ))}
            {actErr && <p className="text-sm text-red-300">{actErr}</p>}
            {challenges.length === 0 && <p className="text-sm text-slate-500">Nenhum desafio criado ainda.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
