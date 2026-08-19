// Rótulos compartilhados de suporte (sem "use server", pode exportar constantes).
export const CATEGORIES: Record<string, string> = {
  duvida: "Dúvida sobre o conteúdo",
  tecnico: "Problema técnico",
  financeiro: "Pagamento / acesso",
  certificado: "Certificado",
  outro: "Outro",
};

export const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-amber-400/15 text-amber-300" },
  answered: { label: "Respondido", cls: "bg-brand-green/15 text-brand-green" },
  resolved: { label: "Resolvido", cls: "bg-white/10 text-slate-400" },
};
