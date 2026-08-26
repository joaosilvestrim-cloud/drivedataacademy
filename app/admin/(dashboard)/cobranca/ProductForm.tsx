"use client";

import { useState } from "react";
import { createProduct, saveProduct, deleteProduct } from "./actions";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const flabel = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500";

type Course = { id: string; title: string };
type Product = {
  id: string; name: string; description: string | null; price: number; kind: string;
  course_id: string | null; course_ids: string | null; access_days: number | null;
  max_installments: number; methods: string; active: boolean;
} | null;

const KINDS = [
  { k: "course", label: "Curso avulso", desc: "Vende 1 treinamento específico." },
  { k: "bundle", label: "Pacote", desc: "Você escolhe quais treinamentos entram." },
  { k: "full_access", label: "Acesso Full", desc: "Libera todos os treinamentos da plataforma." },
];

export default function ProductForm({ product, courses }: { product?: Product; courses: Course[] }) {
  const [kind, setKind] = useState(product?.kind || "full_access");
  const isEdit = !!product;
  const selectedBundle = new Set((product?.course_ids || "").split(",").map((s) => s.trim()).filter(Boolean));
  const methods = new Set((product?.methods || "pix,card,boleto").split(","));

  return (
    <form action={isEdit ? saveProduct : createProduct} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={product!.id} />}

      <div className="space-y-1.5">
        <label className={flabel}>Nome do produto</label>
        <input name="name" required defaultValue={product?.name ?? ""} placeholder="Ex.: Acesso Full - Turma Setembro" className={field} />
      </div>

      {isEdit && (
        <div className="space-y-1.5">
          <label className={flabel}>Descrição (aparece na compra)</label>
          <input name="description" defaultValue={product?.description ?? ""} className={field} />
        </div>
      )}

      {/* Tipo de venda */}
      <div className="space-y-1.5">
        <label className={flabel}>Como você quer precificar</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((o) => (
            <button
              type="button"
              key={o.k}
              onClick={() => setKind(o.k)}
              className={`rounded-xl border p-3 text-left transition-colors ${kind === o.k ? "border-brand-green/50 bg-brand-green/10" : "border-white/10 hover:border-white/25"}`}
            >
              <p className={`text-sm font-semibold ${kind === o.k ? "text-brand-green" : "text-white"}`}>{o.label}</p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-slate-400">{o.desc}</p>
            </button>
          ))}
        </div>
        <input type="hidden" name="kind" value={kind} />
      </div>

      {/* Seleção de cursos conforme o tipo */}
      {kind === "course" && (
        <div className="space-y-1.5">
          <label className={flabel}>Qual treinamento</label>
          <select name="course_id" defaultValue={product?.course_id ?? ""} className={`${field} [&>option]:bg-ink-900`}>
            <option value="">Selecione…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}

      {kind === "bundle" && (
        <div className="space-y-1.5">
          <label className={flabel}>Treinamentos incluídos no pacote</label>
          <div className="grid gap-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:grid-cols-2">
            {courses.length === 0 && <p className="text-xs text-slate-500">Nenhum curso cadastrado ainda.</p>}
            {courses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" name="course_ids" value={c.id} defaultChecked={selectedBundle.has(c.id)} className="h-4 w-4 accent-emerald-400" />
                {c.title}
              </label>
            ))}
          </div>
        </div>
      )}

      {kind === "full_access" && (
        <p className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400">Inclui <span className="text-slate-200">todos os treinamentos</span> da plataforma, inclusive os que forem adicionados depois.</p>
      )}

      {/* Valores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5"><label className={flabel}>Preço (R$)</label><input name="price" defaultValue={product?.price ?? ""} placeholder="1600" className={field} /></div>
        <div className="space-y-1.5"><label className={flabel}>Dias de acesso</label><input name="access_days" type="number" defaultValue={product?.access_days ?? ""} placeholder="365 (vazio = sem expirar)" className={field} /></div>
        <div className="space-y-1.5"><label className={flabel}>Máx. parcelas (cartão)</label><input name="max_installments" type="number" defaultValue={product?.max_installments ?? 12} className={field} /></div>
      </div>

      <div className="space-y-1.5">
        <label className={flabel}>Formas de pagamento</label>
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-1.5"><input type="checkbox" name="m_pix" defaultChecked={methods.has("pix")} className="h-4 w-4 accent-emerald-400" /> PIX</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="m_card" defaultChecked={methods.has("card")} className="h-4 w-4 accent-emerald-400" /> Cartão</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="m_boleto" defaultChecked={methods.has("boleto")} className="h-4 w-4 accent-emerald-400" /> Boleto</label>
        </div>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200"><input type="checkbox" name="active" defaultChecked={product?.active} className="h-4 w-4 accent-emerald-400" /> Produto ativo</label>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-sm font-semibold text-ink-900">{isEdit ? "Salvar" : "Criar produto"}</button>
        {isEdit && <button formAction={deleteProduct} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>}
      </div>
    </form>
  );
}
