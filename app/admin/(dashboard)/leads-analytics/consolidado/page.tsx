import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../../AdminError";
import ContactsTable from "./ContactsTable";

export const dynamic = "force-dynamic";

type C = { name: string; email: string; phone: string; sourceSet: Set<string>; materials: number; inWaitlist: boolean; inMaterial: boolean; first: string; last: string };

export default async function ConsolidadoPage() {
  let mats: any[] = [], wait: any[] = [];
  try {
    const admin = createAdminClient();
    const [m, w] = await Promise.all([
      admin.from("material_leads").select("created_at, material_title, name, email, phone"),
      admin.from("waitlist").select("created_at, name, email, whatsapp"),
    ]);
    mats = m.data ?? []; wait = w.data ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Contatos consolidados</h1>
        <div className="mt-6"><AdminError message={e instanceof Error ? e.message : "Erro."} /></div>
      </div>
    );
  }

  const map = new Map<string, C>();
  function add(email: string, name: string, phone: string, source: string, date: string, kind: "waitlist" | "material") {
    const key = (email || "").trim().toLowerCase();
    if (!key || !key.includes("@")) return;
    let c = map.get(key);
    if (!c) { c = { name: "", email: key, phone: "", sourceSet: new Set(), materials: 0, inWaitlist: false, inMaterial: false, first: date, last: date }; map.set(key, c); }
    if (!c.name && name) c.name = name.trim();
    if (!c.phone && phone) c.phone = String(phone).trim();
    c.sourceSet.add(source);
    if (kind === "waitlist") c.inWaitlist = true;
    if (kind === "material") { c.inMaterial = true; c.materials++; }
    if (date && date < c.first) c.first = date;
    if (date && date > c.last) c.last = date;
  }

  for (const r of wait) add(r.email, r.name, r.whatsapp, "Lista de espera", r.created_at, "waitlist");
  for (const r of mats) add(r.email, r.name, r.phone, `Material: ${r.material_title || "—"}`, r.created_at, "material");

  const rows = Array.from(map.values())
    .map((c) => ({ name: c.name, email: c.email, phone: c.phone, sources: Array.from(c.sourceSet).join(" · "), materials: c.materials, inWaitlist: c.inWaitlist, inMaterial: c.inMaterial, first: c.first, last: c.last }))
    .sort((a, b) => (b.last || "").localeCompare(a.last || ""));

  const total = rows.length;
  const onlyWait = rows.filter((r) => r.inWaitlist && !r.inMaterial).length;
  const onlyMat = rows.filter((r) => r.inMaterial && !r.inWaitlist).length;
  const both = rows.filter((r) => r.inWaitlist && r.inMaterial).length;

  const kpis = [
    { label: "Contatos únicos", value: total },
    { label: "Só lista de espera", value: onlyWait },
    { label: "Só materiais", value: onlyMat },
    { label: "Nos dois", value: both },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/leads-analytics" className="text-xs text-slate-500 hover:text-white">← Analytics</Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Contatos consolidados</h1>
          <p className="mt-1 text-sm text-slate-400">Lista de espera + leads de materiais, unificados por e-mail (sem duplicar).</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl border border-white/8 p-4">
            <p className="font-display text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-slate-400">{k.label}</p>
          </div>
        ))}
      </div>

      <ContactsTable rows={rows} />
    </div>
  );
}
