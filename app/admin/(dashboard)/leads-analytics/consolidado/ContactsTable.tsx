"use client";

import { useMemo, useState } from "react";

type Contact = {
  name: string;
  email: string;
  phone: string;
  sources: string;
  materials: number;
  inWaitlist: boolean;
  inMaterial: boolean;
  first: string;
  last: string;
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "waitlist", label: "Só lista de espera" },
  { key: "material", label: "Só materiais" },
  { key: "both", label: "Nos dois" },
];

function fmt(iso: string) {
  return iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso)) : "—";
}

function toCsv(rows: Contact[]) {
  const head = ["nome", "email", "whatsapp", "fontes", "materiais", "lista_espera", "primeiro_contato", "ultimo_contato"];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.name, r.email, r.phone, r.sources, r.materials, r.inWaitlist ? "sim" : "não", fmt(r.first), fmt(r.last)].map(esc).join(","));
  return [head.join(","), ...lines].join("\n");
}

export default function ContactsTable({ rows }: { rows: Contact[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "waitlist" && !(r.inWaitlist && !r.inMaterial)) return false;
      if (filter === "material" && !(r.inMaterial && !r.inWaitlist)) return false;
      if (filter === "both" && !(r.inWaitlist && r.inMaterial)) return false;
      if (!t) return true;
      return r.name?.toLowerCase().includes(t) || r.email?.toLowerCase().includes(t) || (r.phone || "").includes(t);
    });
  }, [rows, q, filter]);

  function download() {
    const blob = new Blob(["﻿" + toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contatos-consolidados.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${filter === f.key ? "border-brand-green/50 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-300 hover:border-white/30"}`}>{f.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, e-mail, WhatsApp..." className="w-64 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
          <button onClick={download} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">Exportar CSV</button>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-400">{filtered.length} contato(s){filtered.length !== rows.length ? ` de ${rows.length}` : ""}</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Fontes</th>
              <th className="px-4 py-3">Último contato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((r) => (
              <tr key={r.email} className="text-slate-200 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-white">{r.name || "—"}</td>
                <td className="px-4 py-3 text-slate-300">{r.email}</td>
                <td className="px-4 py-3 text-slate-400">{r.phone || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.inWaitlist && <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[0.6rem] font-semibold text-brand-cyan">Lista de espera</span>}
                    {r.inMaterial && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold text-brand-green">{r.materials} material(is)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">{fmt(r.last)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Nada encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
