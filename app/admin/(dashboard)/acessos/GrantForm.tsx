"use client";

import { grantFullAccess } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function GrantForm() {
  return (
    <form action={grantFullAccess} className="glass rounded-2xl border border-white/8 p-5">
      <p className="text-sm font-semibold text-white">Liberar acesso full</p>
      <p className="mt-1 text-xs text-slate-400">
        Dá acesso a todos os cursos. Use para vendas fechadas na mão, cortesias ou testes. O aluno precisa já ter conta criada.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <input name="email" type="email" required placeholder="email@aluno.com" className={field} />
        <select name="term" defaultValue="none" className={`${field} [&>option]:bg-ink-900`}>
          <option value="none">Sem expiração</option>
          <option value="1y">Expira em 1 ano</option>
          <option value="6m">Expira em 6 meses</option>
        </select>
        <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
          Liberar
        </button>
      </div>
    </form>
  );
}
