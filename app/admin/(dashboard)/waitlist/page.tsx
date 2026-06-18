import { createAdminClient } from "@/lib/supabase/admin";
import ExportCsv from "../ExportCsv";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/8">
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
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-slate-200">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmt(r.created_at)}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.whatsapp}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  Nenhum inscrito ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
