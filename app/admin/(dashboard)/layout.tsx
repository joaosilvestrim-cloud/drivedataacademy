import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "./AdminShell";
import { contarPendencias } from "@/lib/admin-pendencias";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  // Pendências por item do menu (chamados abertos, desafios, pagos sem acesso).
  // O menu continua atualizando sozinho depois, por /api/admin/pendencias.
  const pendencias = await contarPendencias(createAdminClient());

  return <AdminShell email={user.email ?? ""} badges={pendencias}>{children}</AdminShell>;
}
