import { redirect } from "next/navigation";
import Background from "@/components/Background";
import AssistantButton from "@/components/AssistantButton";
import { usuarioAtual, treinamentosAVenda, proximosEventos } from "@/lib/sessao";
import ContaShell from "./ContaShell";
import { estadoDaComunidade } from "@/lib/comunidade-leitura";

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  /* Selo verde ao lado de "Cursos" no menu: quantos treinamentos estão abertos
     para compra e o aluno ainda não tem. A leitura é memoizada por requisição,
     então a página que também precisar disso não paga a ida de novo. */
  const [cursosAVenda, eventos, comunidade] = await Promise.all([treinamentosAVenda(user.id), proximosEventos(), estadoDaComunidade(user.id, user.email)]);
  // Selo do item "Comunidade": para a equipe, o que espera resposta; para o aluno, o que ele não viu.
  const avisoComunidade = comunidade.souEquipe && comunidade.totalAguardando > 0
    ? { n: comunidade.totalAguardando, urgente: true }
    : { n: comunidade.totalNaoLidas, urgente: false };

  return (
    <>
      <Background />
      <ContaShell email={user.email || ""} cursosAVenda={cursosAVenda} eventos={eventos} avisoComunidade={avisoComunidade}>{children}</ContaShell>
      <AssistantButton />
    </>
  );
}
