import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { caGet, caLista, caPatch, ligado } from "@/lib/conta-azul";
import { tabelaAusente } from "@/lib/portfolio-carreira";

/* Dados para a nota fiscal do aluno pagante.

   Quem emite a NFS-e é a Tamires, no Conta Azul, e o cadastro do cliente lá
   precisa de endereço completo e RG. Esta camada junta as duas fontes do que
   o aluno já informou e empurra para o Conta Azul:

   - o que ele preencheu no perfil (tabela dados_fiscais), que manda;
   - o que ele deu no checkout, que mora no cliente do Asaas.

   O CPF de quem pagou pelo Asaas continua só no Asaas. A Academy guarda CPF
   apenas de quem pagou por fora e não tem cadastro lá. */

const ASAAS = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export type DadosFiscais = {
  cpf: string;
  rg: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export const SEM_DADOS: DadosFiscais = { cpf: "", rg: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" };

export type ClienteAsaas = { id: string; nome: string; cpf: string; email: string | null; telefone: string | null; endereco: Partial<DadosFiscais> };

const so = (t: unknown) => String(t ?? "").trim();
const digitos = (t: unknown) => so(t).replace(/\D/g, "");

/* O cliente do Asaas pelo e-mail. O mesmo aluno às vezes tem dois cadastros
   (tentou pagar duas vezes); vale o que tiver CPF, e entre eles o mais novo. */
export async function clienteAsaasPorEmail(email: string): Promise<ClienteAsaas | null> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave || !email) return null;
  const r = await fetch(`${ASAAS}/customers?email=${encodeURIComponent(email.toLowerCase())}`, {
    headers: { access_token: chave, "User-Agent": "drivedata-academy" },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const lista: any[] = (await r.json())?.data ?? [];
  const c = lista.filter((x) => !x.deleted).sort((a, b) => Number(!!digitos(b.cpfCnpj)) - Number(!!digitos(a.cpfCnpj)) || so(b.dateCreated).localeCompare(so(a.dateCreated)))[0];
  if (!c) return null;
  return {
    id: c.id,
    nome: so(c.name),
    cpf: digitos(c.cpfCnpj),
    email: c.email || null,
    telefone: c.mobilePhone || c.phone || null,
    endereco: {
      cep: digitos(c.postalCode),
      logradouro: so(c.address),
      numero: so(c.addressNumber),
      complemento: so(c.complement),
      bairro: so(c.province),
      cidade: so(c.cityName),
      uf: so(c.state).toUpperCase(),
    },
  };
}

/* O que está salvo no perfil. `pronta` é falso enquanto a migration não rodar:
   a tela esconde o bloco em vez de quebrar. */
export async function dadosSalvos(admin: SupabaseClient, userId: string): Promise<{ pronta: boolean; dados: (DadosFiscais & { ca_sincronizado_em: string | null; ca_erro: string | null }) | null }> {
  const { data, error } = await admin.from("dados_fiscais").select("*").eq("user_id", userId).maybeSingle();
  if (tabelaAusente(error)) return { pronta: false, dados: null };
  if (!data) return { pronta: true, dados: null };
  const d = Object.fromEntries(Object.keys(SEM_DADOS).map((k) => [k, so((data as any)[k])])) as DadosFiscais;
  return { pronta: true, dados: { ...d, ca_sincronizado_em: data.ca_sincronizado_em ?? null, ca_erro: data.ca_erro ?? null } };
}

/* Junta as fontes: o perfil manda, o Asaas completa o que faltar. */
export function juntarDados(perfil: Partial<DadosFiscais> | null, asaas: ClienteAsaas | null): DadosFiscais {
  const base: DadosFiscais = { ...SEM_DADOS, ...(asaas?.endereco ?? {}), cpf: asaas?.cpf ?? "" };
  for (const [k, v] of Object.entries(perfil ?? {})) if (k in SEM_DADOS && so(v)) (base as any)[k] = so(v);
  return base;
}

/* O que falta para o cadastro do Conta Azul servir para a nota. */
export function faltandoParaNota(d: DadosFiscais): string[] {
  const falta: string[] = [];
  if (digitos(d.cpf).length !== 11 && digitos(d.cpf).length !== 14) falta.push("CPF");
  if (!so(d.rg)) falta.push("RG");
  if (digitos(d.cep).length !== 8) falta.push("CEP");
  if (!so(d.logradouro)) falta.push("endereço");
  if (!so(d.numero)) falta.push("número");
  if (!so(d.bairro)) falta.push("bairro");
  if (!so(d.cidade)) falta.push("cidade");
  if (so(d.uf).length !== 2) falta.push("UF");
  return falta;
}

/* Endereço a partir do CEP, pelo ViaCEP. No servidor, para não depender da
   política de conteúdo do navegador. Devolve null se o CEP não existir. */
export async function enderecoDoCep(cep: string): Promise<Partial<DadosFiscais> | null> {
  const d = digitos(cep);
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.erro) return null;
    return { cep: d, logradouro: so(j.logradouro), bairro: so(j.bairro), cidade: so(j.localidade), uf: so(j.uf).toUpperCase() };
  } catch {
    return null;
  }
}

/* Completa o cadastro de uma pessoa no Conta Azul com endereço e RG.

   O contrato de escrita foi descoberto batendo na API (docs/CONTA-AZUL-API.md):
   PATCH /v1/pessoas/{id} com `rg` e `enderecos: [{ id, cep, logradouro,
   numero, complemento, bairro, cidade, estado, pais }]`. Mandar o `id` do
   endereço que já existe atualiza em vez de criar um segundo.

   Confere depois de gravar, pelo mesmo motivo do CPF: a API aceita campo
   errado em silêncio, e cadastro que parece salvo e não está só aparece na
   hora de emitir a nota. */
export async function completarPessoa(pessoaId: string, d: DadosFiscais): Promise<void> {
  const atual = await caGet<any>(`/v1/pessoas/${pessoaId}`);
  const idEndereco = atual?.enderecos?.[0]?.id;
  const temEndereco = digitos(d.cep).length === 8 && so(d.logradouro);

  const corpo: any = {};
  if (so(d.rg)) corpo.rg = so(d.rg).slice(0, 20);
  if (temEndereco) {
    corpo.enderecos = [
      {
        ...(idEndereco ? { id: idEndereco } : {}),
        cep: digitos(d.cep),
        logradouro: so(d.logradouro).slice(0, 120),
        numero: so(d.numero).slice(0, 20),
        complemento: so(d.complemento).slice(0, 60),
        bairro: so(d.bairro).slice(0, 60),
        cidade: so(d.cidade).slice(0, 60),
        estado: so(d.uf).toUpperCase().slice(0, 2),
        pais: "Brasil",
      },
    ];
  }
  if (!Object.keys(corpo).length) return;

  await caPatch(`/v1/pessoas/${pessoaId}`, corpo);

  const depois = await caGet<any>(`/v1/pessoas/${pessoaId}`);
  const cepGravado = digitos(depois?.enderecos?.[0]?.cep);
  if (temEndereco && cepGravado !== digitos(d.cep)) {
    throw new Error("o Conta Azul aceitou o endereço mas não gravou. O contrato de escrita pode ter mudado: ver docs/CONTA-AZUL-API.md.");
  }
  if (corpo.rg && so(depois?.rg) !== corpo.rg) {
    throw new Error("o Conta Azul aceitou o RG mas não gravou.");
  }
}

/* A pessoa do aluno no Conta Azul, pelo CPF. */
export async function pessoaPorDocumento(documento: string): Promise<string | null> {
  const doc = digitos(documento);
  if (!doc) return null;
  const { itens } = await caLista<any>("/v1/pessoas", { tamanho_pagina: 10, busca: doc });
  return itens.find((p) => digitos(p.documento) === doc)?.id ?? null;
}

/* Depois que o aluno salva no perfil: leva os dados ao Conta Azul e registra
   o resultado. Se o aluno ainda não tem cadastro lá (nenhuma venda enviada),
   não é erro: os dados entram junto com a primeira venda. */
export async function sincronizarAluno(admin: SupabaseClient, userId: string, email: string): Promise<{ ok: boolean; mensagem: string }> {
  const registrar = (campos: Record<string, unknown>) => admin.from("dados_fiscais").update(campos).eq("user_id", userId);
  try {
    if (!(await ligado())) return { ok: true, mensagem: "Dados salvos." };
    const [{ dados }, asaas] = await Promise.all([dadosSalvos(admin, userId), clienteAsaasPorEmail(email)]);
    const d = juntarDados(dados, asaas);
    const pessoaId = await pessoaPorDocumento(d.cpf);
    if (!pessoaId) {
      await registrar({ ca_erro: null });
      return { ok: true, mensagem: "Dados salvos. Eles vão para a nota fiscal junto com o próximo pagamento." };
    }
    await completarPessoa(pessoaId, d);
    await registrar({ ca_pessoa_id: pessoaId, ca_sincronizado_em: new Date().toISOString(), ca_erro: null });
    return { ok: true, mensagem: "Dados salvos e enviados para a emissão da nota fiscal." };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 400);
    await registrar({ ca_erro: msg });
    console.warn("[dados-fiscais] sincronização falhou:", msg);
    return { ok: true, mensagem: "Dados salvos. O envio para a nota fiscal falhou e o time vai conferir." };
  }
}

/* Na hora da venda: completa a pessoa com o que o aluno deu no perfil e no
   checkout. Nunca derruba a venda: endereço faltando atrasa a nota, venda
   faltando some do DRE. */
export async function completarNaVenda(admin: SupabaseClient, pessoaId: string, email: string | null | undefined, doAsaas?: Partial<DadosFiscais> | null): Promise<void> {
  try {
    let perfil: Partial<DadosFiscais> | null = null;
    let userId: string | null = null;
    if (email) {
      const { data } = await admin.rpc("user_id_by_email", { p_email: email.toLowerCase() });
      userId = (data as string | null) ?? null;
      if (userId) perfil = (await dadosSalvos(admin, userId)).dados;
    }
    const d = juntarDados(perfil, doAsaas ? ({ endereco: doAsaas, cpf: "" } as ClienteAsaas) : null);
    await completarPessoa(pessoaId, d);
    if (userId && perfil) {
      await admin.from("dados_fiscais").update({ ca_pessoa_id: pessoaId, ca_sincronizado_em: new Date().toISOString(), ca_erro: null }).eq("user_id", userId);
    }
  } catch (e) {
    console.warn("[dados-fiscais] não completei a pessoa na venda:", (e as Error).message);
  }
}
