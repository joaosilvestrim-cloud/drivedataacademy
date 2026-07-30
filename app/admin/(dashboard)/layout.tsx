import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import AdminShell from "./AdminShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
