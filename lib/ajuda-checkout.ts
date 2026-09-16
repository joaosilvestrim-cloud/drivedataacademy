/* Motivos do pedido de ajuda no checkout. Fica fora do arquivo de Server
   Action porque um módulo "use server" só pode exportar função assíncrona. */

export const MOTIVOS: Record<string, string> = {
  pagamento_falhou: "Tentei pagar e não consegui",
  sem_codigo: "Paguei e não recebi o código de acesso",
  cartao_recusado: "O cartão foi recusado",
  outro: "Outro assunto",
};
