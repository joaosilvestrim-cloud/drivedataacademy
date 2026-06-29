import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../../AdminError";
import ExportCsv from "../../ExportCsv";
import MaterialLeadsList from "./MaterialLeadsList";

export const dynamic = "force-dynamic";

export default async function MaterialLeadsPage() {
  let rows: any[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("material_leads")
      .select("created_at, material_title, name, email, phone, company, role, utm_campaign, utm_source, utm_medium, referrer")
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Leads de materiais</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro desconhecido."} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/materiais" className="text-xs text-slate-500 hover:text-white">← Materiais</Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Leads de materiais</h1>
          <p className="mt-1 text-sm text-slate-400">{rows.length} lead(s) capturado(s).</p>
        </div>
        <ExportCsv rows={rows} filename="leads-materiais.csv" />
      </div>

      <MaterialLeadsList rows={rows} />
    </div>
  );
}
