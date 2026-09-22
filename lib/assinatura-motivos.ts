/* Os motivos de cancelamento, em arquivo separado e sem "server-only".

   Eles são lidos dos dois lados: o formulário do aluno desenha a lista no
   navegador, e a action confere no servidor que o motivo recebido é um destes.
   Se ficassem junto do lib/assinatura.ts, que é server-only por causa da
   chave do Asaas, o build quebra ao importar do componente de cliente.

   Mesma ideia do lib/i18n/conteudo-tabelas.ts: dado puro num arquivo que
   qualquer lado pode importar. */

export const MOTIVOS = [
  { id: "preco", label: "Está caro para o meu momento" },
  { id: "tempo", label: "Não estou conseguindo usar" },
  { id: "conteudo", label: "O conteúdo não é o que eu esperava" },
  { id: "aprendi", label: "Já aprendi o que precisava" },
  { id: "tecnico", label: "Tive problemas técnicos na plataforma" },
  { id: "empresa", label: "Vou usar por outra empresa ou conta" },
  { id: "outro", label: "Outro motivo" },
] as const;

export type MotivoId = (typeof MOTIVOS)[number]["id"];

export const MOTIVOS_VALIDOS: Set<string> = new Set(MOTIVOS.map((m) => m.id));
