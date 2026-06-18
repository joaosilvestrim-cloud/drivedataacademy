import { createAdminClient } from "@/lib/supabase/admin";
import ExportCsv from "../ExportCsv";
import AdminError from "../AdminError";
import LeadsList from "./LeadsList";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  let rows: any[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("enterprise_leads")
      .select("created_at, name, request_type, email, phone, message")
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Leads de empresas</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro desconhecido."} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Leads de empresas</h1>
          <p className="mt-1 text-sm text-slate-400">{rows.length} solicitação(ões).</p>
        </div>
        <ExportCsv rows={rows} filename="leads-empresas.csv" />
      </div>

      <LeadsList rows={rows} />
    </div>
  );
}
