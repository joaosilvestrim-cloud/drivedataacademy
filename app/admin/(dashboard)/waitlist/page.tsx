import { createAdminClient } from "@/lib/supabase/admin";
import ExportCsv from "../ExportCsv";
import AdminError from "../AdminError";
import WaitlistTable from "./WaitlistTable";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  let rows: any[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("waitlist")
      .select("created_at, name, email, whatsapp")
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Lista de espera</h1>
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
          <h1 className="font-display text-2xl font-bold text-white">Lista de espera</h1>
          <p className="mt-1 text-sm text-slate-400">{rows.length} inscrito(s).</p>
        </div>
        <ExportCsv rows={rows} filename="lista-de-espera.csv" />
      </div>

      <WaitlistTable rows={rows} />
    </div>
  );
}
