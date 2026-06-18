"use client";

import { useMemo, useState } from "react";

type Lead = {
  created_at: string;
  name: string;
  request_type: string | null;
  email: string;
  phone: string | null;
  message: string | null;
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function waLink(phone: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}`;
}

export default function LeadsList({ rows }: { rows: Lead[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.name, r.request_type, r.email, r.phone, r.message]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(t))
    );
  }, [q, rows]);

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome, empresa, e-mail, tipo..."
        className="mt-6 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
      />

      <div className="mt-4 space-y-4">
        {filtered.map((r, i) => (
          <div key={i} className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">{r.name}</p>
              <span className="text-xs text-slate-500">{fmt(r.created_at)}</span>
            </div>
            {r.request_type && (
              <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-teal">
                {r.request_type}
              </span>
            )}
            {r.message && <p className="mt-3 text-sm text-slate-400">{r.message}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`mailto:${r.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-brand-teal/50 hover:text-brand-teal"
              >
                ✉ {r.email}
              </a>
              {r.phone && (
                <a
                  href={waLink(r.phone)!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green"
                >
                  WhatsApp: {r.phone}
                </a>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">
            {rows.length === 0 ? "Nenhum lead ainda." : "Nada encontrado para a busca."}
          </div>
        )}
      </div>
    </>
  );
}
