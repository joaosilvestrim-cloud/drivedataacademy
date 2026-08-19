"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Student = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  enrollments: number;
  linkedin_url?: string | null;
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
}

export default function StudentsList({ rows }: { rows: Student[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.name?.toLowerCase().includes(t) || r.email?.toLowerCase().includes(t));
  }, [q, rows]);

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome ou e-mail..."
        className="mt-6 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
      />
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
              <th className="px-4 py-3 font-medium">Cursos</th>
              <th className="px-4 py-3 font-medium">LinkedIn</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-white/5 text-slate-200 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium">{r.name || "—"}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmt(r.created_at)}</td>
                <td className="px-4 py-3">{r.enrollments}</td>
                <td className="px-4 py-3">
                  {r.linkedin_url ? (
                    <a href={r.linkedin_url} target="_blank" rel="noreferrer" className="text-brand-teal hover:underline">Perfil ↗</a>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/alunos/${r.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{rows.length === 0 ? "Nenhum aluno ainda." : "Nada encontrado."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
