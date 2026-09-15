/* Definições dos funis de Representação.

   Antes viviam dentro do RepClient. Saíram porque Mentoria ganhou rota e
   item de menu próprios, e as três telas precisam da mesma
   fonte. O `key` continua sendo o `type` gravado em rep_requests, então nada
   muda para o admin. */

export type Field = { name: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[]; ph?: string };
// saibaMais: link opcional para conhecer o produto antes de preencher o funil.
export type Beneficio = { titulo: string; texto: string; icone: string };
export type Form = { key: string; icon: string; title: string; desc: string; cta: string; saibaMais?: { label: string; href: string }; beneficios?: Beneficio[]; fields: Field[] };

const FORMS: Form[] = [
  {
    key: "portal", icon: "M3 3v18h18M7 14l3-3 3 3 5-6", title: "Venda autorizada Portal BI",
    desc: "Revenda o Portal BI da DriveData e ganhe recorrência com a gente. Simule abaixo e registre seu interesse.",
    cta: "Quero revender",
    saibaMais: { label: "Conheça o Portal Fabric", href: "https://www.drivedata.com.br/portal-fabric" },
    beneficios: [
      { titulo: "Comissão recorrente", texto: "Ganhe comissão na instalação e também mensalmente sobre o faturamento de cada cliente ativo que você trouxer para a plataforma.", icone: "M12 3v18M16.5 7H10a3 3 0 000 6h4a3 3 0 010 6H7" },
      { titulo: "Painel de acompanhamento", texto: "Dashboard exclusivo para monitorar seus clientes, indicações e comissões em tempo real.", icone: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
      { titulo: "Suporte técnico dedicado", texto: "Time especializado para dar suporte a você e aos seus clientes durante toda a jornada.", icone: "M4 14v-2a8 8 0 0116 0v2M4 14a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zm16 0a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2zM17 16v1a3 3 0 01-3 3h-2" },
    ],
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
      { name: "assunto", label: "Assunto", type: "select", options: ["Engenharia de Dados", "DAX", "Modelagem", "Automações", "IA", "Design", "Outro"] },
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
];


export const FUNIL = Object.fromEntries(FORMS.map((f) => [f.key, f])) as Record<string, Form>;

// Os que continuam em /conta/representacao. Mentoria saiu para rota própria.
export const FUNIS_REPRESENTACAO = FORMS.filter((f) => f.key === "portal" || f.key === "parceria" || f.key === "candidatura");

export { FORMS };
