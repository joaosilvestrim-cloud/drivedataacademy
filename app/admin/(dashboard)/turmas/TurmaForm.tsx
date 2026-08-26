"use client";

import { useState } from "react";
import { updateTurma } from "./actions";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const flabel = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500";

type Course = { id: string; title: string };
type Turma = any;

function toDate(d: string | null) { return d ? d.slice(0, 10) : ""; }

export default function TurmaForm({ turma, courses }: { turma: Turma; courses: Course[] }) {
  const [includes, setIncludes] = useState(turma.includes || "full");
  const selected = new Set((turma.course_ids || "").split(",").map((s: string) => s.trim()).filter(Boolean));
  const methods = new Set((turma.methods || "pix,card,boleto").split(","));

  return (
    <form action={updateTurma} className="space-y-6">
      <input type="hidden" name="id" value={turma.id} />

      {/* Básico */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Nome da turma</label><input name="name" defaultValue={turma.name} className={field} /></div>
        <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Descrição (aparece na matrícula)</label><input name="description" defaultValue={turma.description ?? ""} className={field} /></div>
        <div className="space-y-1.5"><label className={flabel}>Início</label><input name="starts_at" type="date" defaultValue={toDate(turma.starts_at)} className={field} /></div>
        <div className="space-y-1.5"><label className={flabel}>Status</label>
          <select name="status" defaultValue={turma.status} className={`${field} [&>option]:bg-ink-900`}><option value="open">Aberta</option><option value="closed">Fechada</option></select>
        </div>
      </div>

      {/* O que inclui */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-3 text-sm font-semibold text-white">Quais treinamentos esta turma libera</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setIncludes("full")} className={`rounded-xl border p-3 text-left transition-colors ${includes === "full" ? "border-brand-green/50 bg-brand-green/10" : "border-white/10 hover:border-white/25"}`}>
            <p className={`text-sm font-semibold ${includes === "full" ? "text-brand-green" : "text-white"}`}>Todos os treinamentos</p>
            <p className="mt-0.5 text-[0.7rem] text-slate-400">Acesso full (inclusive cursos futuros).</p>
          </button>
          <button type="button" onClick={() => setIncludes("selected")} className={`rounded-xl border p-3 text-left transition-colors ${includes === "selected" ? "border-brand-green/50 bg-brand-green/10" : "border-white/10 hover:border-white/25"}`}>
            <p className={`text-sm font-semibold ${includes === "selected" ? "text-brand-green" : "text-white"}`}>Escolher treinamentos</p>
            <p className="mt-0.5 text-[0.7rem] text-slate-400">Só os cursos que você marcar.</p>
          </button>
        </div>
        <input type="hidden" name="includes" value={includes} />

        {includes === "selected" && (
          <div className="mt-3 grid gap-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:grid-cols-2">
            {courses.length === 0 && <p className="text-xs text-slate-500">Nenhum curso cadastrado.</p>}
            {courses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" name="course_ids" value={c.id} defaultChecked={selected.has(c.id)} className="h-4 w-4 accent-emerald-400" /> {c.title}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Cobrança */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="mb-3 text-sm font-semibold text-white">Cobrança da turma</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><label className={flabel}>Preço (R$)</label><input name="price" defaultValue={turma.price ?? ""} placeholder="1600" className={field} /></div>
          <div className="space-y-1.5"><label className={flabel}>Dias de acesso</label><input name="access_days" type="number" defaultValue={turma.access_days ?? ""} placeholder="365 (vazio = sem expirar)" className={field} /></div>
          <div className="space-y-1.5"><label className={flabel}>Máx. parcelas (cartão)</label><input name="max_installments" type="number" defaultValue={turma.max_installments ?? 12} className={field} /></div>
        </div>
        <div className="mt-3 space-y-1.5">
          <label className={flabel}>Formas de pagamento</label>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <label className="flex items-center gap-1.5"><input type="checkbox" name="m_pix" defaultChecked={methods.has("pix")} className="h-4 w-4 accent-emerald-400" /> PIX</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" name="m_card" defaultChecked={methods.has("card")} className="h-4 w-4 accent-emerald-400" /> Cartão</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" name="m_boleto" defaultChecked={methods.has("boleto")} className="h-4 w-4 accent-emerald-400" /> Boleto</label>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200">
          <input type="checkbox" name="online_sale" defaultChecked={turma.online_sale} className="h-4 w-4 accent-emerald-400" />
          Vender esta turma na página pública de matrícula
        </label>
      </div>

      <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-6 py-2.5 text-sm font-semibold text-ink-900">Salvar turma</button>
    </form>
  );
}
