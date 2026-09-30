"use client";

import CampoSenha from "@/components/CampoSenha";
import { createStudent } from "./actions";

const field =
  "w-full rounded-xl border border-tinta/10 bg-tinta/5 px-4 py-3 text-sm text-tinta placeholder:text-slate-500 outline-none focus:border-acento/60";

export default function CreateStudentForm() {
  return (
    <form action={createStudent} className="glass rounded-2xl border border-tinta/8 p-5">
      <p className="text-sm font-semibold text-tinta">Criar aluno na mão</p>
      <p className="mt-1 text-xs text-slate-400">Cria a conta já confirmada. Deixe a senha em branco para gerar uma temporária (aparece na confirmação para você repassar).</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto]">
        <input name="name" placeholder="Nome completo" className={field} />
        <input name="email" type="email" required placeholder="email@aluno.com" className={field} />
        <CampoSenha name="password" autoComplete="new-password" placeholder="Senha (opcional)" className={field} />
        <button className="rounded-xl bg-marca-verde px-5 py-3 text-sm font-semibold text-sobre-acento transition-transform hover:scale-[1.02]">Criar</button>
      </div>
    </form>
  );
}
