"use client";

import { createStudent } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function CreateStudentForm() {
  return (
    <form action={createStudent} className="glass rounded-2xl border border-white/8 p-5">
      <p className="text-sm font-semibold text-white">Criar aluno na mão</p>
      <p className="mt-1 text-xs text-slate-400">Cria a conta já confirmada. Deixe a senha em branco para gerar uma temporária (aparece na confirmação para você repassar).</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto]">
        <input name="name" placeholder="Nome completo" className={field} />
        <input name="email" type="email" required placeholder="email@aluno.com" className={field} />
        <input name="password" placeholder="Senha (opcional)" className={field} />
        <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Criar</button>
      </div>
    </form>
  );
}
