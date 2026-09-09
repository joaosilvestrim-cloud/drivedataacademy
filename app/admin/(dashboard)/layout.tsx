import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "./AdminShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  // Entregas aguardando correção, para o menu avisar sem precisar entrar na tela.
  let pendentes = 0;
  try {
    const { count } = await createAdminClient()
      .from("ku_challenge_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendentes = count ?? 0;
  } catch { /* a tabela pode ainda não existir */ }

  return <AdminShell email={user.email ?? ""} badges={{ "/admin/desafios": pendentes }}>{children}</AdminShell>;
}
