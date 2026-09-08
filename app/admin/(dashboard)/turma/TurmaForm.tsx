"use client";

import { saveTurma } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";

export default function TurmaForm({ initial }: { initial: Record<string, string> }) {
  return (
    <form action={saveTurma} className="glass max-w-2xl space-y-5 rounded-2xl border border-white/8 p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={label} htmlFor="turma_nome">Nome do plano</label>
          <input id="turma_nome" name="turma_nome" defaultValue={initial.turma_nome || ""} placeholder="DriveData Academy" className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="sub_price">Assinatura mensal (R$/mês)</label>
          <input id="sub_price" name="sub_price" defaultValue={initial.sub_price || ""} placeholder="129,90" inputMode="decimal" className={field} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="turma_descricao">Descrição curta (aparece na página de assinatura)</label>
        <textarea id="turma_descricao" name="turma_descricao" rows={3} defaultValue={initial.turma_descricao || ""} placeholder="Acesso a todos os cursos, comunidade, mentorias e certificados enquanto a assinatura estiver ativa." className={`${field} resize-y`} />
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="checkout_whatsapp">WhatsApp de contato (só números, com DDD)</label>
        <input id="checkout_whatsapp" name="checkout_whatsapp" defaultValue={initial.checkout_whatsapp || ""} placeholder="5535999999999" className={field} />
        <p className="text-xs text-slate-500">Usado como fallback caso o pagamento automático (Asaas) esteja fora.</p>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-200">
        <input type="checkbox" name="sales_open" defaultChecked={initial.sales_open === "1"} className="h-4 w-4 accent-emerald-400" />
        Vendas abertas (mostra a página pública de assinatura)
      </label>

      <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
        Salvar
      </button>
    </form>
  );
}
