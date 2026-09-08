import { redirect } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/server";
import AssistantButton from "@/components/AssistantButton";
import ContaShell from "./ContaShell";

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  return (
    <>
      <Background />
      <ContaShell email={user.email || ""}>{children}</ContaShell>
      <AssistantButton />
    </>
  );
}
