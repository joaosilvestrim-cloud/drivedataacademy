import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/* Conexão da Academy com o Conta Azul.

   A Academy fala direto com a API, sem passar pelo DriveAzul. Os dois são
   produtos separados e cada um tem a sua autorização: o refresh token da
   Conta Azul rotaciona a cada renovação, e duas aplicações dividindo a mesma
   autorização se derrubariam em revezamento.

   O que este arquivo resolve, em ordem de chatice:

     1. guardar o token cifrado e devolver um access_token válido;
     2. renovar sem que duas requisições simultâneas queimem uma à outra;
     3. falar com a API respeitando o limite de vazão dela;
     4. nunca repetir um POST, porque lá não existe endpoint de apagar. */

const LOGIN = process.env.CONTAAZUL_LOGIN_URL || "https://login.contaazul.com";
const TOKEN_URL = process.env.CONTAAZUL_TOKEN_URL || "https://api-v2.contaazul.com/oauth/token";
const API = process.env.CONTAAZUL_API_URL || "https://api-v2.contaazul.com";
const ESCOPO = process.env.CONTAAZUL_SCOPE || "openid profile aws.cognito.signin.user.admin";

/* Margem antes de considerar o token vencido. A conta é simples: uma chamada
   pode levar segundos, e renovar cedo demais custa nada perto de tomar 401 no
   meio da criação de uma venda. */
const MARGEM_MS = 120_000;

// ------------------------------------------------------------------ cifra

/* A chave de cifra, em hex ou base64.

   O `trim` não é decoração. Valor colado em painel de deploy vem com espaço
   ou quebra de linha na ponta mais vezes do que se imagina, e sem ele o erro
   seria "a chave tem tamanho errado" quando o conteúdo está certo. */
function chave(): Buffer {
  const bruta = (process.env.CA_TOKEN_KEY || "").trim();
  if (!bruta) {
    throw new Error("CA_TOKEN_KEY está vazia no ambiente. Gere com: openssl rand -hex 32");
  }
  const b = /^[0-9a-f]{64}$/i.test(bruta) ? Buffer.from(bruta, "hex") : Buffer.from(bruta, "base64");
  if (b.length !== 32) {
    throw new Error(
      `CA_TOKEN_KEY precisa ter 32 bytes (64 hex ou 44 base64), e veio com ${bruta.length} caracteres. ` +
        "Erro comum: colar a linha inteira do arquivo, com o nome da variável junto. O valor é só o que vem depois do sinal de igual.",
    );
  }
  return b;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv.toString("base64"), c.getAuthTag().toString("base64"), dados.toString("base64")].join(":");
}

export function decifrar(guardado: string): string {
  const [iv, tag, dados] = (guardado || "").split(":");
  if (!iv || !tag || !dados) throw new Error("token guardado em formato inesperado");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
}

// ------------------------------------------------------------------ OAuth

/* Tela de autorização.

   Repare no `/#/`: a tela de login do Conta Azul é uma aplicação de página
   única, e a rota de autorização mora DEPOIS do hash. É o endereço que o
   próprio painel deles entrega ao cadastrar a aplicação.

   Isso não é detalhe de estilo. Tudo que vem depois do `#` é fragmento, o
   navegador não manda para o servidor, e quem escrever o caminho antes do
   hash, como /oauth2/authorize, recebe uma página em branco sem erro
   nenhum para explicar. */
export function urlDeAutorizacao(state: string, redirect: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CONTAAZUL_CLIENT_ID || "",
    redirect_uri: redirect,
    state,
    scope: ESCOPO,
  });
  return `${LOGIN}/#/oauth/authorize?${p}`;
}

type Resposta = { access_token: string; refresh_token?: string; expires_in?: number };

async function pedirToken(corpo: Record<string, string>): Promise<Resposta> {
  const basica = Buffer.from(
    `${process.env.CONTAAZUL_CLIENT_ID}:${process.env.CONTAAZUL_CLIENT_SECRET}`,
  ).toString("base64");

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basica}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(corpo),
    cache: "no-store",
  });
  const texto = await r.text();
  if (!r.ok) {
    const e = new Error(`token ${r.status}: ${texto.slice(0, 200)}`) as Error & { status?: number };
    e.status = r.status;
    throw e;
  }
  return JSON.parse(texto);
}

function guardar(t: Resposta, anterior?: string) {
  return {
    access_token_enc: cifrar(t.access_token),
    // A Conta Azul nem sempre devolve refresh novo. Quando não devolve, o
    // anterior continua valendo, e sobrescrever com vazio mataria a conexão.
    refresh_token_enc: t.refresh_token ? cifrar(t.refresh_token) : anterior,
    expira_em: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
    ultimo_erro: null as string | null,
    atualizado: new Date().toISOString(),
  };
}

/* Primeira conexão: troca o code do callback pelos tokens. */
export async function conectar(code: string, redirect: string) {
  const t = await pedirToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: process.env.CONTAAZUL_CLIENT_ID || "",
  });
  await createAdminClient()
    .from("integracao_conta_azul")
    .upsert({ id: 1, ...guardar(t), conectado_em: new Date().toISOString() }, { onConflict: "id" });
}

export async function desconectar() {
  await createAdminClient()
    .from("integracao_conta_azul")
    .update({ access_token_enc: null, refresh_token_enc: null, expira_em: null, conectado_em: null, ultimo_erro: null })
    .eq("id", 1);
}

/* Devolve um access_token válido, renovando se preciso.

   O ponto delicado é a corrida. Se dois webhooks chegam juntos e o token
   está vencido, os dois tentam renovar com o MESMO refresh token. O primeiro
   ganha e invalida o antigo; o segundo leva 400.

   Esse 400 não significa "conexão morta", significa "alguém chegou antes".
   Por isso, ao falhar, relemos a linha: se o refresh guardado mudou desde a
   nossa leitura, o outro processo renovou com sucesso e o access_token dele
   serve para nós. Só se nada mudou é que a conexão caiu de verdade. */
export async function accessToken(): Promise<string> {
  const admin = createAdminClient();
  const ler = async () =>
    (await admin.from("integracao_conta_azul").select("*").eq("id", 1).maybeSingle()).data;

  const linha = await ler();
  if (!linha?.refresh_token_enc) throw new Error("Conta Azul não conectada. Vá em Admin > Integrações.");

  const venceEm = linha.expira_em ? new Date(linha.expira_em).getTime() : 0;
  if (linha.access_token_enc && venceEm - Date.now() > MARGEM_MS) return decifrar(linha.access_token_enc);

  const anterior = linha.refresh_token_enc as string;
  try {
    const t = await pedirToken({
      grant_type: "refresh_token",
      refresh_token: decifrar(anterior),
      client_id: process.env.CONTAAZUL_CLIENT_ID || "",
    });
    await admin.from("integracao_conta_azul").update(guardar(t, anterior)).eq("id", 1);
    return t.access_token;
  } catch (e) {
    const agora = await ler();
    if (agora?.refresh_token_enc && agora.refresh_token_enc !== anterior && agora.access_token_enc) {
      return decifrar(agora.access_token_enc); // outro processo renovou primeiro
    }
    const msg = (e as Error).message.slice(0, 400);
    await admin.from("integracao_conta_azul").update({ ultimo_erro: msg }).eq("id", 1);
    throw new Error(`Conta Azul precisa ser reconectada: ${msg}`);
  }
}

// ------------------------------------------------------------------- API

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function caGet<T = any>(caminho: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(API + caminho);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));

  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${await accessToken()}`, accept: "application/json" },
      cache: "no-store",
    });
    if (r.ok) return (await r.json()) as T;

    const corpo = (await r.text()).slice(0, 300);
    // Leitura pode repetir à vontade: não muda nada do outro lado.
    if ((r.status === 429 || r.status >= 500) && tentativa < 4) {
      await espera(Number(r.headers.get("retry-after")) * 1000 || 1500 * (tentativa + 1));
      continue;
    }
    throw new Error(`Conta Azul ${r.status} em ${caminho}: ${corpo}`);
  }
}

/* Escrita.

   SEM RETRY, ao contrário da leitura, e não é esquecimento. A API da Conta
   Azul não tem endpoint para apagar venda. Se um POST der timeout depois de
   ter entrado do outro lado, repetir cria a segunda venda, e a receita
   dobrada sai no DRE até alguém achar na mão. Erro aqui sobe para quem
   chamou decidir. */
export async function caPost<T = any>(caminho: string, corpo: unknown): Promise<T> {
  const r = await fetch(API + caminho, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(corpo),
    cache: "no-store",
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`Conta Azul ${r.status} em ${caminho}: ${texto.slice(0, 400)}`);
  return (texto ? JSON.parse(texto) : null) as T;
}

// ---------------------------------------------------------------- config

export async function config(): Promise<Record<string, string>> {
  const { data } = await createAdminClient().from("integracao_config").select("chave, valor");
  return Object.fromEntries((data ?? []).map((r: any) => [r.chave, r.valor ?? ""]));
}

export async function ligado(): Promise<boolean> {
  return (await config()).ca_ativo === "true";
}
