/* Definições dos funis de Representação.

   Antes viviam dentro do RepClient. Saíram porque Mentoria e Marketplace
   ganharam rota e item de menu próprios, e as três telas precisam da mesma
   fonte. O `key` continua sendo o `type` gravado em rep_requests, então nada
   muda para o admin. */

export type Field = { name: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[]; ph?: string };
export type Form = { key: string; icon: string; title: string; desc: string; cta: string; fields: Field[] };

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


export const FUNIL = Object.fromEntries(FORMS.map((f) => [f.key, f])) as Record<string, Form>;

// Os que continuam em /conta/representacao. Mentoria e Marketplace saíram.
export const FUNIS_REPRESENTACAO = FORMS.filter((f) => f.key === "portal" || f.key === "parceria" || f.key === "candidatura");

export { FORMS };
