import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "./AdminShell";
import { contarPendencias } from "@/lib/admin-pendencias";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  // Badges do menu: o que está na fila do time e o que chegou de novo desde a
  // última vez que ESTA pessoa olhou cada tela. O menu continua atualizando
  // sozinho depois, por /api/admin/pendencias.
  const pendencias = await contarPendencias(createAdminClient(), user.id);

  return <AdminShell email={user.email ?? ""} badges={pendencias}>{children}</AdminShell>;
}
