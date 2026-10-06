/* Quando uma assinatura ainda dá acesso.

   Cancelar não corta o acesso: o aluno pagou o mês e segue entrando até o fim
   dele. Por isso "canceled" com data no futuro conta como vigente. Reembolso e
   atraso de pagamento cortam na hora gravando expires_at = agora.

   Antes desta regra, a porta de acesso só aceitava "active": quem cancelava
   perdia o acesso no mesmo minuto, apesar da tela prometer "acesso até".
   Sem "server-only" de propósito: serve para tela de servidor e para lib. */

export type Assinatura = { status: string; expires_at: string | null };

export const STATUS_COM_ACESSO = ["active", "canceled"];

export function acessoVigente(m: Assinatura, agora = Date.now()): boolean {
  const fim = m.expires_at ? Date.parse(m.expires_at) : null;
  if (m.status === "active") return fim === null || fim > agora;
  if (m.status === "canceled") return fim !== null && fim > agora;
  return false;
}
