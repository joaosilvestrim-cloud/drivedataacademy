import { redirect } from "next/navigation";
import Background from "@/components/Background";
import AssistantButton from "@/components/AssistantButton";
import { usuarioAtual, treinamentosAVenda } from "@/lib/sessao";
import ContaShell from "./ContaShell";

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  /* Selo verde ao lado de "Cursos" no menu: quantos treinamentos estão abertos
     para compra e o aluno ainda não tem. A leitura é memoizada por requisição,
     então a página que também precisar disso não paga a ida de novo. */
  const cursosAVenda = await treinamentosAVenda(user.id);

  return (
    <>
      <Background />
      <ContaShell email={user.email || ""} cursosAVenda={cursosAVenda}>{children}</ContaShell>
      <AssistantButton />
    </>
  );
}
