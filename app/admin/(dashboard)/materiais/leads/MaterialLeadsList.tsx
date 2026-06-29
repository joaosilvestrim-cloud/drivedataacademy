"use client";

import { useMemo, useState } from "react";

type Lead = {
  created_at: string;
  material_title: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default function MaterialLeadsList({ rows }: { rows: Lead[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.material_title, r.name, r.email, r.company, r.utm_campaign, r.utm_source]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(t))
    );
  }, [q, rows]);

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por conteúdo, nome, e-mail, empresa, campanha..."
        className="mt-6 w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
      />

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Conteúdo baixado</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Campanha</th>
              <th className="px-4 py-3 font-medium">Origem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-slate-200 hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmt(r.created_at)}</td>
                <td className="px-4 py-3">{r.material_title || "—"}</td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3"><a href={`mailto:${r.email}`} className="text-brand-teal hover:underline">{r.email}</a></td>
                <td className="px-4 py-3">{r.company || "—"}</td>
                <td className="px-4 py-3">{r.utm_campaign || "—"}</td>
                <td className="px-4 py-3">{r.utm_source || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0 ? "Nenhum lead capturado ainda." : "Nada encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
