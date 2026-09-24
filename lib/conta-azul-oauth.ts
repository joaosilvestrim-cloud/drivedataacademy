import "server-only";
import { createHmac, randomBytes } from "crypto";

/* Peças do fluxo OAuth que as duas rotas dividem.

   Ficam aqui, e não no route.ts, porque um arquivo de rota do App Router só
   pode exportar os handlers HTTP e a configuração. Exportar uma função dali
   passa no tsc e quebra no build, que é o pior lugar para descobrir. */

export const NOME_COOKIE = "ca_oauth_state";

/* O state é assinado e carimbado com a hora.

   Sem assinatura, qualquer pessoa forjaria um retorno e mandaria a Academy
   trocar um `code` de outra conta, conectando a DriveData ao Conta Azul de
   terceiro. O segredo usado é o service role, que já é o segredo mais forte
   que esta aplicação tem e nunca sai do servidor. */
function mac(bruto: string): string {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY || "").update(bruto).digest("hex").slice(0, 32);
}

export function assinarState(): string {
  const bruto = `${Date.now()}.${randomBytes(12).toString("hex")}`;
  return `${bruto}.${mac(bruto)}`;
}

export function stateValido(state: string): boolean {
  const partes = (state || "").split(".");
  if (partes.length !== 3) return false;
  const [hora, aleatorio, assinatura] = partes;
  if (assinatura !== mac(`${hora}.${aleatorio}`)) return false;
  // Dez minutos é bastante para logar no Conta Azul e autorizar.
  return Date.now() - Number(hora) < 600_000;
}

export function enderecoDeRetorno(req: Request): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  return `${base}/api/oauth/conta-azul/callback`;
}
