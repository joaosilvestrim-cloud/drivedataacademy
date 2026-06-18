"use client";

import { useMemo, useState } from "react";

type Row = { created_at: string; name: string; email: string; whatsapp: string | null };

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function waLink(phone: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}`;
}

export default function WaitlistTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(t) ||
        r.email?.toLowerCase().includes(t) ||
        (r.whatsapp ?? "").toLowerCase().includes(t)
    );
  }, [q, rows]);

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome, e-mail ou WhatsApp..."
        className="mt-6 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
      />

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-slate-200 hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmt(r.created_at)}</td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${r.email}`} className="text-brand-teal hover:underline">{r.email}</a>
                </td>
                <td className="px-4 py-3">
                  {r.whatsapp ? (
                    <a href={waLink(r.whatsapp)!} target="_blank" rel="noreferrer" className="text-brand-green hover:underline">
                      {r.whatsapp}
                    </a>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0 ? "Nenhum inscrito ainda." : "Nada encontrado para a busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
