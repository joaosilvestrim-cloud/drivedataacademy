"use client";

import { useMemo, useState } from "react";
import { submitRepRequest } from "./actions";

type Field = { name: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[]; ph?: string };
type Form = { key: string; icon: string; title: string; desc: string; cta: string; fields: Field[] };

const FORMS: Form[] = [
  {
    key: "portal", icon: "M3 3v18h18M7 14l3-3 3 3 5-6", title: "Venda autorizada Portal BI",
    desc: "Revenda o Portal BI da DriveData e ganhe recorrência com a gente. Simule abaixo e registre seu interesse.",
    cta: "Quero revender",
    fields: [
      { name: "clientes", label: "Quantos clientes você pretende levar?", type: "number", ph: "10" },
      { name: "mensalidade", label: "Mensalidade estimada por cliente (R$)", type: "number", ph: "300" },
      { name: "observacao", label: "Conta um pouco do seu público", type: "textarea", ph: "Segmento, região, como pretende vender..." },
    ],
  },
  {
    key: "parceria", icon: "M17 20h5v-2a4 4 0 00-3-3.9M9 20H4v-2a4 4 0 013-3.9m6-2a4 4 0 10-4-4 4 4 0 004 4z", title: "Parceria em projetos",
    desc: "Tem um projeto e precisa de braço? Descreva que a gente entra em contato.",
    cta: "Enviar projeto",
    fields: [
      { name: "escopo", label: "Escopo do projeto", type: "textarea", ph: "O que precisa ser feito" },
      { name: "prazo", label: "Prazo", type: "text", ph: "Ex.: 6 semanas" },
      { name: "budget", label: "Budget (R$)", type: "text", ph: "Ex.: 15.000" },
      { name: "segmento", label: "Segmento da empresa", type: "text", ph: "Ex.: Varejo" },
      { name: "tipo_projeto", label: "Tipo de projeto", type: "select", options: ["Dashboard/BI", "Engenharia de Dados", "Automação", "IA", "App/Fabric", "Outro"] },
    ],
  },
  {
    key: "mentoria", icon: "M12 14l9-5-9-5-9 5 9 5zM12 14v7M5 11v4c0 1 3 2 7 2s7-1 7-2v-4", title: "Agendar mentoria",
    desc: "Marque uma mentoria 1:1 com o time. Escolha o assunto.",
    cta: "Solicitar mentoria",
    fields: [
      { name: "assunto", label: "Assunto", type: "select", options: ["Engenharia de Dados", "DAX", "Modelagem", "Automações", "IA", "Design"] },
      { name: "descricao", label: "O que você quer resolver?", type: "textarea", ph: "Contexto da sua dúvida ou desafio" },
      { name: "horario", label: "Preferência de horário", type: "text", ph: "Ex.: manhãs, ou uma data" },
    ],
  },
  {
    key: "candidatura", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a6 6 0 016-6h6a6 6 0 016 6v2", title: "Candidatar-se na DriveData",
    desc: "Quer ser consultor(a) DriveData? Preencha e entra na nossa triagem.",
    cta: "Me candidatar",
    fields: [
      { name: "area", label: "Área de atuação", type: "select", options: ["Power BI / BI", "Engenharia de Dados", "Automação", "IA", "Design", "Gestão de Projetos", "Outra"] },
      { name: "senioridade", label: "Senioridade", type: "select", options: ["Júnior", "Pleno", "Sênior", "Especialista"] },
      { name: "linkedin", label: "LinkedIn ou portfólio", type: "text", ph: "https://..." },
      { name: "sobre", label: "Fale sobre você", type: "textarea", ph: "Experiência, tecnologias, o que te move" },
    ],
  },
  {
    key: "marketplace", icon: "M3 3h18v4H3zM5 7v13h14V7M9 11h6", title: "Marketplace DriveData",
    desc: "Suba um projeto (dashboard, automação, template) para vender na plataforma.",
    cta: "Enviar para o marketplace",
    fields: [
      { name: "titulo", label: "Título do produto", type: "text", ph: "Ex.: Dashboard de Vendas em HTML" },
      { name: "tipo", label: "Tipo", type: "select", options: ["Dashboard", "Automação", "Template", "Modelo de dados", "Outro"] },
      { name: "descricao", label: "Descrição", type: "textarea", ph: "O que faz, o que entrega" },
      { name: "preco", label: "Preço sugerido (R$)", type: "text", ph: "Ex.: 199" },
      { name: "link", label: "Link do material / demonstração", type: "text", ph: "https://..." },
    ],
  },
];

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RepClient() {
  const [active, setActive] = useState<string>("portal");
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = FORMS.find((f) => f.key === active)!;

  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));

  // simulador do portal
  const sim = useMemo(() => {
    const c = Number(values.clientes || 0);
    const m = Number(values.mensalidade || 0);
    const receita = c * m;
    return { receita, recorrencia: Math.round(receita * 0.3) }; // exemplo 30%
  }, [values.clientes, values.mensalidade]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await submitRepRequest(active, JSON.stringify(values));
    setLoading(false);
    if (res.ok) { setSent(active); setValues({}); }
  }

  function switchTo(k: string) {
    setActive(k);
    setValues({});
    setSent(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Menu dos funis */}
      <div className="space-y-2">
        {FORMS.map((f) => {
          const on = f.key === active;
          return (
            <button key={f.key} onClick={() => switchTo(f.key)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? "border-brand-green/40 bg-brand-green/[0.07]" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${on ? "bg-gradient-to-br from-brand-green to-brand-blue text-ink-900" : "bg-white/5 text-slate-300"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={f.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className={`text-sm font-semibold ${on ? "text-white" : "text-slate-300"}`}>{f.title}</span>
            </button>
          );
        })}
      </div>

      {/* Form ativo */}
      <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-white">{form.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{form.desc}</p>

        {sent === active ? (
          <div className="mt-6 rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-green/20 text-brand-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-lg font-semibold text-white">Recebemos! 🎉</p>
            <p className="mt-1 text-sm text-slate-300">Nosso time vai analisar e entrar em contato. Você pode enviar outra solicitação quando quiser.</p>
            <button onClick={() => setSent(null)} className="mt-4 rounded-xl border border-white/10 px-5 py-2 text-sm text-slate-300 hover:border-white/30 hover:text-white">Enviar outra</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {form.fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} rows={3} placeholder={f.ph} className={`${field} resize-y`} />
                ) : f.type === "select" ? (
                  <select value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} required className={`${field} [&>option]:bg-ink-900`}>
                    <option value="">Selecione...</option>
                    {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} inputMode={f.type === "number" ? "numeric" : undefined} value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.ph} className={field} />
                )}
              </div>
            ))}

            {active === "portal" && (Number(values.clientes) > 0 && Number(values.mensalidade) > 0) && (
              <div className="rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Simulação</p>
                <div className="mt-2 flex flex-wrap gap-6">
                  <div><p className="text-xs text-slate-400">Receita mensal dos clientes</p><p className="font-display text-xl font-bold text-white">{brl(sim.receita)}</p></div>
                  <div><p className="text-xs text-slate-400">Sua recorrência (exemplo)</p><p className="font-display text-xl font-bold text-brand-green">{brl(sim.recorrencia)}/mês</p></div>
                </div>
                <p className="mt-2 text-[0.7rem] text-slate-500">Exemplo ilustrativo. Os percentuais reais são combinados na parceria.</p>
              </div>
            )}

            <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.01] disabled:opacity-60 sm:w-auto sm:px-10">
              {loading ? "Enviando..." : form.cta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
