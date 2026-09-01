"use client";

import { useMemo, useState } from "react";
import { grantToolAccess } from "./actions";

type Student = { id: string; name: string; email: string };

export default function ToolGrantForm({ students }: { students: Student[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Student | null>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term ? students.filter((s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)) : students;
    return base.slice(0, 8);
  }, [q, students]);

  const field = "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

  return (
    <form action={grantToolAccess} className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <input type="hidden" name="user_id" value={picked?.id ?? ""} />
      <p className="text-sm font-semibold text-white">Liberar de cortesia (brinde)</p>
      <p className="mt-1 text-xs text-slate-400">Dá acesso à ferramenta sem cobrança. Use para brindes, parceiros ou testes.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPicked(null); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={students.length ? "Buscar aluno por nome ou e-mail..." : "Nenhum aluno cadastrado"}
            className={`${field} w-full`}
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-xl">
              {results.map((s) => (
                <li key={s.id}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); setPicked(s); setQ(s.name ? `${s.name} · ${s.email}` : s.email); setOpen(false); }} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/5">
                    <span className="text-sm text-white">{s.name || "(sem nome)"}</span>
                    <span className="text-xs text-slate-400">{s.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <select name="term" defaultValue="none" className={`${field} [&>option]:bg-ink-900`}>
          <option value="none">Sem expirar</option>
          <option value="12m">12 meses</option>
          <option value="6m">6 meses</option>
          <option value="1m">1 mês</option>
        </select>
        <button disabled={!picked} className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-50">Liberar cortesia</button>
      </div>
    </form>
  );
}
