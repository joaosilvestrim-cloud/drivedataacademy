import { unzipSync, strFromU8 } from "fflate";
import type { Campo, Pagina, Relatorio, Visual } from "./tipos";
import { LIMITE_ARQUIVO } from "./tipos";

/* Leitor de arquivo do Power BI.

   O .pbix é um zip. Dentro dele o relatório vem de duas formas, conforme a
   versão do Desktop que salvou:

   - "Report/Layout": um JSON só, em UTF-16, com todas as páginas e visuais,
     e com JSON dentro de string em cada visual (o campo `config`);
   - "Report/definition/...": um arquivo por página e um por visual, em UTF-8.
     É o formato novo, o PBIR, e é o que a maioria dos arquivos traz hoje.

   O modelo (tabelas, medidas, relacionamentos) fica em "DataModel", que é
   binário e comprimido: não dá para ler aqui. Por isso o .pbit importa. O
   template guarda o modelo em "DataModelSchema", que é JSON. Ele pode conter
   nomes, fórmulas e valores de filtros; também deve ser tratado como confidencial.

   Tudo isto roda no navegador do aluno. O arquivo não sobe para lugar nenhum:
   o que viaja é o laudo. */

const decodifica = (bytes: Uint8Array): string => {
  // UTF-16 LE começa com o primeiro byte do caractere e um zero em seguida.
  if (bytes.length > 1 && (bytes[1] === 0 || (bytes[0] === 255 && bytes[1] === 254))) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  return strFromU8(bytes);
};

const json = <T,>(bytes: Uint8Array, padrao: T, obrigatorio = false): T => {
  try {
    return JSON.parse(decodifica(bytes).replace(/^﻿/, "")) as T;
  } catch {
    if (obrigatorio) throw new Error("Uma definição do relatório está ilegível. Abra o arquivo no Power BI, salve novamente e tente outra vez.");
    return padrao;
  }
};

/* Campos usados por um visual, no formato novo e no antigo. As duas formas
   guardam a mesma ideia: por papel do visual (Values, Category, Y), uma lista
   de projeções que apontam para Measure ou Column de uma Entity. */
function camposDoQueryState(queryState: any): Campo[] {
  const saida: Campo[] = [];
  for (const papel of Object.values(queryState || {})) {
    for (const p of ((papel as any)?.projections ?? []) as any[]) {
      const alvo = p?.field?.Measure || p?.field?.Column || p?.field?.Aggregation?.Expression?.Column;
      const tabela = alvo?.Expression?.SourceRef?.Entity || "";
      const campo = alvo?.Property || p?.nativeQueryRef || "";
      if (!campo) continue;
      saida.push({ tabela, campo, ref: `${tabela}.${campo}`, medida: !!p?.field?.Measure, });
    }
  }
  return saida;
}

function camposDoProjections(sv: any): Campo[] {
  const saida: Campo[] = [];
  const porPapel = sv?.projections ?? {};
  const seletores: any[] = sv?.prototypeQuery?.Select ?? [];
  const porRef = new Map<string, any>();
  for (const s of seletores) porRef.set(s?.Name, s);
  for (const lista of Object.values(porPapel)) {
    for (const item of (lista as any[]) ?? []) {
      const ref: string = item?.queryRef || "";
      const sel = porRef.get(ref);
      const alvo = sel?.Measure || sel?.Column || sel?.Aggregation?.Expression?.Column;
      const [tabelaRef, campoRef] = ref.split(".");
      const tabela = alvo?.Expression?.SourceRef?.Entity || tabelaRef || "";
      const campo = alvo?.Property || campoRef || ref;
      if (!campo) continue;
      saida.push({ tabela, campo, ref: ref || `${tabela}.${campo}`, medida: !!sel?.Measure });
    }
  }
  return saida;
}

/* O título é a pista mais honesta de cuidado com quem lê: ou o autor escreveu
   um, ou ficou o texto automático do Power BI ("Soma de Valor por Mês"). */
function leTitulo(objetos: any): { proprio: boolean; visivel: boolean } {
  const titulo = objetos?.title?.[0]?.properties ?? {};
  const textoLiteral = titulo?.text?.expr?.Literal?.Value;
  const mostra = titulo?.show?.expr?.Literal?.Value;
  return {
    proprio: !!titulo?.text?.expr && (typeof textoLiteral !== "string" || textoLiteral.replace(/'/g, "").trim().length > 0),
    visivel: mostra === undefined ? true : String(mostra) !== "false",
  };
}

function lerPBIR(arquivos: Record<string, Uint8Array>): Pagina[] {
  const paginas: Pagina[] = [];
  const caminhos = Object.keys(arquivos);
  const paginasJson = caminhos.filter((c) => /^Report\/definition\/pages\/[^/]+\/page\.json$/.test(c));

  for (const caminho of paginasJson) {
    const pasta = caminho.replace(/\/page\.json$/, "");
    const pg = json<any>(arquivos[caminho], {}, true);
    if (!pg?.name || !pg?.displayName) throw new Error("Uma página está sem definição válida. Salve o relatório novamente no Power BI.");
    const visuais: Visual[] = [];

    for (const c of caminhos.filter((x) => x.startsWith(`${pasta}/visuals/`) && x.endsWith("/visual.json"))) {
      const v = json<any>(arquivos[c], {}, true);
      const pos = v?.position ?? {};
      const sv = v?.visual ?? {};
      if (!v?.name || (!sv?.visualType && !v?.visualGroup)) throw new Error("Encontrei um visual que não consigo interpretar. Salve uma nova versão no Power BI.");
      if (v?.visualGroup) continue;
      const objetos = { ...(sv?.visualContainerObjects ?? {}), ...(sv?.objects ?? {}) };
      const titulo = leTitulo(objetos);
      visuais.push({
        id: v?.name || c,
        tipo: sv?.visualType || "desconhecido",
        x: Number(pos.x) || 0,
        y: Number(pos.y) || 0,
        largura: Number(pos.width) || 0,
        altura: Number(pos.height) || 0,
        campos: camposDoQueryState(sv?.query?.queryState),
        tituloProprio: titulo.proprio,
        tituloVisivel: titulo.visivel,
        temFiltroProprio: ((v?.filterConfig?.filters ?? []) as any[]).length > 0,
        oculto: v?.isHidden === true || v?.isHidden === "true",
      });
    }

    paginas.push({
      id: pg?.name || pasta,
      nome: pg?.displayName || "sem nome",
      largura: Number(pg?.width) || 1280,
      altura: Number(pg?.height) || 720,
      visuais,
    });
  }
  return paginas;
}

function lerLayoutAntigo(bytes: Uint8Array): Pagina[] {
  const layout = json<any>(bytes, {}, true);
  if (!Array.isArray(layout?.sections)) throw new Error("Não consegui ler as páginas deste relatório.");
  return ((layout?.sections ?? []) as any[]).map((s) => {
    const visuais: Visual[] = ((s?.visualContainers ?? []) as any[]).flatMap((v, i): Visual[] => {
      const cfg = typeof v?.config === "string" ? json<any>(new TextEncoder().encode(v.config), {}, true) : v?.config ?? {};
      const sv = cfg?.singleVisual ?? {};
      if (cfg?.singleVisualGroup) return [];
      if (!sv.visualType) throw new Error("Encontrei um visual sem definição legível. Salve novamente no Power BI.");
      const titulo = leTitulo(sv?.vcObjects ?? sv?.objects);
      const filtros = typeof v?.filters === "string" ? json<any[]>(new TextEncoder().encode(v.filters), []) : v?.filters ?? [];
      return [{
        id: cfg?.name || String(i),
        tipo: sv?.visualType || "desconhecido",
        x: Number(v?.x) || 0,
        y: Number(v?.y) || 0,
        largura: Number(v?.width) || 0,
        altura: Number(v?.height) || 0,
        campos: camposDoProjections(sv),
        tituloProprio: titulo.proprio,
        tituloVisivel: titulo.visivel,
        temFiltroProprio: Array.isArray(filtros) && filtros.length > 0,
        oculto: cfg?.singleVisual?.display?.mode === "hidden" || cfg?.visibility === 1,
      }];
    });
    return {
      id: s?.name || s?.displayName || "",
      nome: s?.displayName || "sem nome",
      largura: Number(s?.width) || 1280,
      altura: Number(s?.height) || 720,
      visuais,
    };
  });
}

/* Nomes das tabelas sem abrir o modelo: o diagrama do Power BI guarda a posição
   de cada tabela na tela, e com ela o nome. Serve para checar nomenclatura e
   para saber se existe uma tabela de datas. */
function tabelasDoDiagrama(bytes: Uint8Array | undefined): string[] {
  if (!bytes) return [];
  const d = json<any>(bytes, {});
  const nos = ((d?.diagrams ?? []) as any[]).flatMap((x) => x?.nodes ?? []);
  return Array.from(new Set(nos.map((n: any) => String(n?.nodeIndex || "")).filter(Boolean)));
}

/* Modelo completo, só disponível no .pbit. É aqui que moram medidas com DAX,
   relacionamentos e colunas calculadas. */
function lerModelo(bytes: Uint8Array | undefined) {
  const vazio = {
    tabelas: [] as string[],
    medidas: [] as Relatorio["medidas"],
    relacionamentos: [] as Relatorio["relacionamentos"],
    colunasCalculadas: [] as Relatorio["colunasCalculadas"],
    temTabelaDeDatas: false,
  };
  if (!bytes) return vazio;
  const schema = json<any>(bytes, {}, true);
  const modelo = schema?.model ?? schema;
  const tabelas: any[] = modelo?.tables ?? [];
  if (!Array.isArray(tabelas) || !tabelas.length) throw new Error("O modelo do .pbit não contém tabelas legíveis. Exporte um novo modelo no Power BI.");

  const texto = (e: any) => (Array.isArray(e) ? e.join("\n") : String(e ?? ""));

  return {
    tabelas: tabelas.map((t) => String(t?.name || "")).filter(Boolean),
    medidas: tabelas.flatMap((t) =>
      ((t?.measures ?? []) as any[]).map((m) => ({
        tabela: String(t?.name || ""),
        nome: String(m?.name || ""),
        dax: texto(m?.expression),
        formato: m?.formatString ? String(m.formatString) : null,
      }))
    ),
    colunasCalculadas: tabelas.flatMap((t) =>
      ((t?.columns ?? []) as any[])
        .filter((c) => c?.type === "calculated")
        .map((c) => ({ tabela: String(t?.name || ""), nome: String(c?.name || ""), dax: texto(c?.expression) }))
    ),
    relacionamentos: ((modelo?.relationships ?? []) as any[]).map((r) => ({
      de: String(r?.fromTable || ""),
      para: String(r?.toTable || ""),
      deColuna: String(r?.fromColumn || ""),
      paraColuna: String(r?.toColumn || ""),
      cruzado: String(r?.crossFilteringBehavior || "oneDirection"),
      ativo: r?.isActive !== false,
      cardinalidade: `${r?.fromCardinality || "many"}-${r?.toCardinality || "one"}`,
    })),
    temTabelaDeDatas: tabelas.some((t) => t?.dataCategory === "Time" || (t?.columns ?? []).some((c: any) => c?.isKey && c?.dataType === "dateTime")),
  };
}

/* O que interessa dentro do arquivo.

   Um .pbix de 280 MB é quase todo modelo compactado, que não dá para ler. Pedir
   ao descompactador só as partes que a auditoria usa deixa a leitura dez vezes
   mais rápida e tira da memória do navegador o que nunca seria aberto. */
const INTERESSA = (nome: string) =>
  nome.startsWith("Report/definition/") ||
  nome === "Report/Layout" ||
  nome === "DiagramLayout" ||
  nome.endsWith("DataModelSchema") ||
  nome.startsWith("Report/CustomVisuals/");

export function extrairRelatorio(arquivo: string, bytes: Uint8Array): Relatorio {
  if (!/\.(pbix|pbit)$/i.test(arquivo)) throw new Error("Escolha um arquivo .pbix ou .pbit.");
  if (!bytes.length || bytes.length > LIMITE_ARQUIVO) throw new Error("Escolha um arquivo de até 300 MB. Para arquivos maiores, exporte como .pbit.");
  let total = 0;
  let entradas = 0;
  const zip = unzipSync(bytes, { filter: (f) => {
    if (++entradas > 20000) throw new Error("O arquivo contém definições demais para esta análise.");
    if (!INTERESSA(f.name)) return false;
    total += f.originalSize;
    if (f.originalSize > 20 * 1024 * 1024 || total > 60 * 1024 * 1024) throw new Error("As definições descompactadas excedem o limite de leitura (60 MB). Divida o relatório em arquivos menores.");
    return true;
  } });
  const caminhos = Object.keys(zip);

  const temPBIR = caminhos.some((c) => c.startsWith("Report/definition/pages/"));
  const temLayout = caminhos.includes("Report/Layout");
  const schema = caminhos.find((c) => c.endsWith("DataModelSchema"));

  if (!temPBIR && !temLayout && !schema) {
    throw new Error("Este arquivo não parece um .pbix ou .pbit do Power BI.");
  }

  const paginas = temPBIR ? lerPBIR(zip) : temLayout ? lerLayoutAntigo(zip["Report/Layout"]) : [];
  if (!paginas.length || !paginas.some((p) => p.visuais.length > 0)) throw new Error("Não encontrei páginas com visuais legíveis. Nenhuma nota foi atribuída.");
  if (paginas.length > 100 || paginas.reduce((n, p) => n + p.visuais.length, 0) > 3000) throw new Error("Esta análise aceita até 100 páginas e 3.000 visuais. Divida o relatório para continuar.");
  if (paginas.some(p => !Number.isFinite(p.largura) || !Number.isFinite(p.altura) || p.largura <= 0 || p.altura <= 0 || p.visuais.some(v => ![v.x,v.y,v.largura,v.altura].every(Number.isFinite)))) throw new Error("A geometria das páginas está inválida. Salve novamente o relatório.");
  const modelo = lerModelo(schema ? zip[schema] : undefined);
  const doDiagrama = tabelasDoDiagrama(zip["DiagramLayout"]);

  return {
    arquivo,
    formato: schema ? "pbit" : temPBIR ? "pbir" : "layout",
    paginas,
    tabelas: modelo.tabelas.length ? modelo.tabelas : doDiagrama,
    temVisualCustomizado: caminhos.some((c) => c.startsWith("Report/CustomVisuals/")),
    medidas: modelo.medidas,
    relacionamentos: modelo.relacionamentos,
    colunasCalculadas: modelo.colunasCalculadas,
    temTabelaDeDatas: modelo.temTabelaDeDatas,
    modeloLido: !!schema && modelo.tabelas.length > 0,
  };
}
