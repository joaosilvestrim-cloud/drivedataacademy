import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasToolAccess } from "@/lib/tool";

export const dynamic = "force-dynamic";

type Tool = {
  key: string;
  name: string;
  tag: string;
  desc: string;
  href?: string;
  icon: string;
  from: string;
  to: string;
  available: boolean;
  sameTab?: boolean;
  demo?: boolean;
};

export default async function FerramentasHub() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  const liberado = await hasToolAccess(admin, user.id, user.email);

  const tools: Tool[] = [
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
      demo: false,
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
    },
  ];

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Ferramentas</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Escolha uma ferramenta</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">Abre em uma nova aba, sem sair do portal.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const usable = tool.available && !!tool.href;
          const CardInner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl text-ink-900 shadow-lg" style={{ backgroundImage: `linear-gradient(135deg, ${tool.from}, ${tool.to})` }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={tool.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase ${tool.available ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{tool.tag}</span>
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-white">{tool.name}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-400">{tool.desc}</p>
              {usable ? (
                <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">
                  {tool.key === "knowledge-universe" ? "Explorar meu universo" : tool.demo ? "Explorar demonstração" : liberado ? "Abrir" : "Desbloquear"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              ) : (
                <span className="mt-4 inline-flex w-fit items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-500">Em breve</span>
              )}
            </>
          );

          const base = "group flex flex-col rounded-3xl border border-white/8 bg-white/[0.02] p-6 transition-all duration-300";
          return usable ? (
            <a key={tool.key} href={tool.href} {...(tool.sameTab ? {} : { target: "_blank", rel: "noreferrer" })} className={`${base} hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-[0_24px_60px_-24px_rgba(52,232,160,0.45)]`}>
              {CardInner}
            </a>
          ) : (
            <div key={tool.key} className={`${base} opacity-70`}>{CardInner}</div>
          );
        })}
      </div>

      {!liberado && (
        <div className="mt-8 max-w-2xl rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 text-sm text-slate-300">
          A Ferramenta de Visuais está <b className="text-white">incluída na assinatura da Academy</b>. Se ainda não tem acesso, ao abrir você verá a opção de assinar.
        </div>
      )}
    </div>
  );
}
