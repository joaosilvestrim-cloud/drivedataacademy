import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasToolAccess } from "@/lib/tool";
import { usuarioAtual } from "@/lib/sessao";
import GradeFerramentas from "@/components/ferramentas/GradeFerramentas";
import { nomesDasFerramentas } from "@/lib/ferramentas-nomes";
import { type Ferramenta } from "@/components/ferramentas/CartaoFerramenta";

export const dynamic = "force-dynamic";

/* Vitrine das ferramentas.

   A ordem não é por data nem por nome: é por quanto a ferramenta muda o dia do
   aluno. O que acabou de nascer sobe para a primeira posição com o selo de
   novidade, porque ferramenta nova que ninguém vê não serve para nada. */

export default async function FerramentasHub() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  const [liberado, nomes] = await Promise.all([hasToolAccess(admin, user.id, user.email), nomesDasFerramentas()]);

  const ferramentas: Ferramenta[] = [
    {
      key: "raio-x",
      categoria: "Power BI",
      name: nomes["raio-x"].nome,
      tag: "Novo",
      desc: nomes["raio-x"].desc,
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
      key: "biblioteca",
      categoria: "Treino",
      name: nomes["biblioteca"].nome,
      tag: "Consulta",
      desc: nomes["biblioteca"].desc,
      href: "/conta/ferramentas/biblioteca",
      sameTab: true,
      icon: "M4 5a2 2 0 012-2h6v18H6a2 2 0 01-2-2zM12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6M7 7h2M7 11h2",
      from: "#70a9ef",
      to: "#a78bfa",
      available: true,
      cta: "Abrir a Biblioteca",
    },
    {
      key: "dojo",
      categoria: "Treino",
      name: nomes["dojo"].nome,
      tag: "Novo",
      desc: nomes["dojo"].desc,
      href: "/conta/ferramentas/dojo",
      sameTab: true,
      icon: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z",
      from: "#6ce6c7",
      to: "#f6d68c",
      available: true,
      novo: true,
      cta: "Começar o treino",
    },
    {
      key: "conciliacao",
      categoria: "Análise",
      name: nomes["conciliacao"].nome,
      tag: "Novo",
      desc: nomes["conciliacao"].desc,
      href: "/conta/ferramentas/conciliacao",
      sameTab: true,
      icon: "M3 6h18M3 12h18M3 18h10M17 15l3 3-3 3M20 18h-6",
      from: "#f87171",
      to: "#fbbf24",
      available: true,
      novo: true,
      cta: "Pegar um chamado",
    },
    {
      key: "caixa-preta",
      categoria: "IA",
      name: nomes["caixa-preta"].nome,
      tag: "Novo",
      desc: nomes["caixa-preta"].desc,
      href: "/conta/ferramentas/caixa-preta",
      sameTab: true,
      icon: "M4 5h16v14H4zM8 9h.01M12 9h.01M16 9h.01M8 13h8M8 17h5",
      from: "#a78bfa",
      to: "#3b9dff",
      available: true,
      novo: true,
      cta: "Abrir a caixa",
    },
    {
      key: "arena",
      categoria: "SQL",
      name: nomes["arena"].nome,
      tag: "Novo",
      desc: nomes["arena"].desc,
      href: "/conta/ferramentas/arena",
      sameTab: true,
      icon: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
      from: "#70a9ef",
      to: "#6ce6c7",
      available: true,
      novo: true,
      cta: "Entrar na Arena",
    },
    {
      key: "forja",
      categoria: "Power BI",
      name: nomes["forja"].nome,
      tag: "Novo",
      desc: nomes["forja"].desc,
      href: "/conta/ferramentas/forja",
      sameTab: true,
      icon: "M8 3h8M12 3v6M6 21h12M7 21l1.5-7h7L17 21M9.5 14a3 3 0 015 0",
      from: "#fbbf24",
      to: "#f6d68c",
      available: true,
      novo: true,
      cta: "Forjar meu calendário",
    },
    {
      key: "dataflow-lab",
      categoria: "Dados",
      name: nomes["dataflow-lab"].nome,
      tag: "Dados · 4D",
      desc: nomes["dataflow-lab"].desc,
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
      categoria: "Negócios",
      name: nomes["decision-lab"].nome,
      tag: "Simulador de negócios",
      desc: nomes["decision-lab"].desc,
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
      categoria: "Conhecimento",
      name: nomes["knowledge-universe"].nome,
      tag: "Conhecimento · 4D",
      desc: nomes["knowledge-universe"].desc,
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
      categoria: "Power BI",
      name: nomes["visuais"].nome,
      tag: "Power BI",
      desc: nomes["visuais"].desc,
      href: "/ferramenta",
      icon: "M4 5h16v10H4zM2 19h20M9 9l2 2 4-4",
      from: "#34e8a0",
      to: "#22d3ee",
      available: true,
      cta: liberado ? "Abrir" : "Desbloquear",
    },
    {
      key: "em-breve",
      categoria: "Em breve",
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

      <Link href="/conta/novidades" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-green/25 bg-brand-green/[.06] px-5 py-4 text-sm text-slate-200"><span><strong className="text-brand-green">O Raio-X está de cara nova.</strong> Mapa interativo, plano de revisão e comparação de versões.</span><span className="font-semibold text-brand-green">Ver as novidades →</span></Link>
      <GradeFerramentas ferramentas={ferramentas} />

      {!liberado && (
        <div className="mt-8 max-w-2xl rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 text-sm text-slate-300">
          A Ferramenta de Visuais está <b className="text-white">incluída na assinatura da Academy</b>. Se ainda não tem acesso, ao abrir você verá a opção de assinar.
        </div>
      )}
    </div>
  );
}
