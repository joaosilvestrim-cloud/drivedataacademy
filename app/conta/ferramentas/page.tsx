import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasToolAccess } from "@/lib/tool";
import { usuarioAtual } from "@/lib/sessao";
import CartaoFerramenta, { type Ferramenta } from "@/components/ferramentas/CartaoFerramenta";

export const dynamic = "force-dynamic";

/* Vitrine das ferramentas.

   A ordem não é por data nem por nome: é por quanto a ferramenta muda o dia do
   aluno. O que acabou de nascer sobe para a primeira posição com o selo de
   novidade, porque ferramenta nova que ninguém vê não serve para nada. */

export default async function FerramentasHub() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  const liberado = await hasToolAccess(admin, user.id, user.email);

  const ferramentas: Ferramenta[] = [
    {
      key: "raio-x",
      name: "Raio-X do Dashboard",
      tag: "Novo",
      desc: "Suba seu .pbix e receba a revisão que um consultor faria: o que está errado, por que importa e como arrumar. O arquivo não sai do seu navegador.",
      href: "/conta/ferramentas/raio-x",
      sameTab: true,
      icon: "M12 3a9 9 0 100 18 9 9 0 000-18M12 8v4l3 2M3 12h3M18 12h3",
      from: "#f6d68c",
      to: "#34e8a0",
      available: true,
      novo: true,
      cta: "Analisar meu relatório",
    },
    {
      key: "dataflow-lab",
      name: "DataFlow Lab",
      tag: "Dados · 4D",
      desc: "Importe CSVs, trate dados e execute SQL. Explore as transformações em 3D, reproduza cada etapa e compare resultados.",
      href: "/dataflow-lab",
      sameTab: true,
      icon: "M4 6h5v5H4zM15 13h5v5h-5zM9 8h8v5M6 11v6h9",
      from: "#6ce6c7",
      to: "#70a9ef",
      available: true,
      cta: "Explorar meus dados",
    },
    {
      key: "decision-lab",
      name: "Decision Lab",
      tag: "Simulador de negócios",
      desc: "Assuma uma empresa interativa em 3D. Decida preços, estoque e equipe, simule 30 dias e aprenda com os resultados da sua estratégia.",
      href: "/decision-lab",
      sameTab: true,
      icon: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
      from: "#edb98f",
      to: "#8fc8b6",
      available: true,
      cta: "Assumir minha empresa",
    },
    {
      key: "knowledge-universe",
      name: "Knowledge Universe 4D",
      tag: "Conhecimento · 4D",
      desc: "Suas atividades viram um mapa de competências em 3D. Comece pelo diagnóstico, abra seu universo e evolua entregando desafios.",
      href: "/conta/universo",
      sameTab: true,
      icon: "M12 3a9 9 0 100 18 9 9 0 000-18M3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18",
      from: "#6be9ce",
      to: "#9c9cff",
      available: true,
      cta: "Explorar meu universo",
    },
    {
      key: "visuais",
      name: "Ferramenta de Visuais",
      tag: "Power BI",
      desc: "Crie cards em HTML e SVG para o Power BI e gere a medida DAX pronta, sem escrever código.",
      href: "/ferramenta",
      icon: "M4 5h16v10H4zM2 19h20M9 9l2 2 4-4",
      from: "#34e8a0",
      to: "#22d3ee",
      available: true,
      cta: liberado ? "Abrir" : "Desbloquear",
    },
    {
      key: "em-breve",
      name: "Novas ferramentas",
      tag: "Em breve",
      desc: "Estamos preparando mais ferramentas DriveData para acelerar o seu dia a dia.",
      icon: "M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z",
      from: "#3b9dff",
      to: "#a78bfa",
      available: false,
      cta: "Em breve",
    },
  ];

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Ferramentas</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Escolha uma ferramenta</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">Escolha uma experiência e comece a praticar.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ferramentas.map((f, i) => (
          <CartaoFerramenta key={f.key} t={f} ordem={i} />
        ))}
      </div>

      {!liberado && (
        <div className="mt-8 max-w-2xl rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 text-sm text-slate-300">
          A Ferramenta de Visuais está <b className="text-white">incluída na assinatura da Academy</b>. Se ainda não tem acesso, ao abrir você verá a opção de assinar.
        </div>
      )}
    </div>
  );
}
