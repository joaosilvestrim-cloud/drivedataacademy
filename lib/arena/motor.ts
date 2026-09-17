import type { Desafio } from "./familias";

/* O juiz da Arena.

   Ele não sabe SQL: sabe comparar resultado. A consulta de referência roda na
   mesma base do aluno e o que ela devolve é o gabarito. Se o resultado bater,
   acertou, mesmo que o caminho tenha sido outro, que é como a vida funciona.

   Quando não bate, o juiz roda as consultas erradas conhecidas da família. Se o
   resultado do aluno for igual ao de uma delas, o veredito deixa de ser "está
   errado" e passa a ser "você caiu nesta". Só quando nenhuma bate é que ele
   cai na comparação genérica, que aponta a primeira linha divergente. */

export type Resultado = { colunas: string[]; linhas: (string | number | null)[][] };

/** O mínimo que o motor precisa de um banco, seja no navegador ou no Node. */
export type Banco = { exec: (sql: string) => { columns: string[]; values: any[][] }[] };

export type Veredito = {
  certo: boolean;
  titulo: string;
  detalhe: string;
  /** Verdadeiro quando o erro foi reconhecido, e não apenas apontado. */
  diagnosticado: boolean;
  resultado: Resultado | null;
  esperado: Resultado | null;
  erroDeSintaxe?: string;
};

const NUMERO_TOLERANCIA = 0.02;

export function rodar(banco: Banco, sql: string): Resultado {
  const saida = banco.exec(sql);
  if (!saida.length) return { colunas: [], linhas: [] };
  const ultima = saida[saida.length - 1];
  return { colunas: ultima.columns ?? [], linhas: (ultima.values ?? []) as Resultado["linhas"] };
}

const normalizar = (v: any): string => {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "number") return v.toFixed(2);
  const n = Number(String(v).replace(",", "."));
  if (String(v).trim() !== "" && Number.isFinite(n)) return n.toFixed(2);
  return String(v).trim().toLocaleLowerCase("pt-BR");
};

const perto = (a: any, b: any) => {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) <= NUMERO_TOLERANCIA;
  return normalizar(a) === normalizar(b);
};

const chaveDaLinha = (linha: any[]) => linha.map(normalizar).join("|");

/* Duas respostas são iguais quando têm as mesmas linhas, com os mesmos valores,
   dentro da tolerância de centavos. O nome das colunas não entra: o aluno pode
   chamar de "receita" ou de "total", desde que o número esteja certo. A ordem
   só conta quando o enunciado pediu ordem. */
export function mesmasLinhas(a: Resultado, b: Resultado, ordenado: boolean): boolean {
  if (a.linhas.length !== b.linhas.length) return false;
  if (a.linhas.length && a.linhas[0].length !== b.linhas[0].length) return false;

  if (ordenado) {
    return a.linhas.every((linha, i) => linha.every((valor, j) => perto(valor, b.linhas[i][j])));
  }
  const conta = new Map<string, number>();
  for (const l of b.linhas) conta.set(chaveDaLinha(l), (conta.get(chaveDaLinha(l)) || 0) + 1);
  for (const l of a.linhas) {
    const k = chaveDaLinha(l);
    const n = conta.get(k) || 0;
    if (!n) return false;
    conta.set(k, n - 1);
  }
  return true;
}

function primeiraDiferenca(aluno: Resultado, esperado: Resultado): string {
  const limite = Math.min(aluno.linhas.length, esperado.linhas.length);
  for (let i = 0; i < limite; i++) {
    const la = aluno.linhas[i];
    const le = esperado.linhas[i];
    for (let j = 0; j < Math.max(la.length, le.length); j++) {
      if (!perto(la[j], le[j])) {
        return `Na linha ${i + 1}, coluna ${j + 1}, você trouxe ${la[j] === null ? "vazio" : `"${la[j]}"`} e o esperado era ${le[j] === null ? "vazio" : `"${le[j]}"`}.`;
      }
    }
  }
  return "As primeiras linhas batem, mas o conjunto não fecha.";
}

export function corrigir(banco: Banco, desafio: Desafio, sqlDoAluno: string): Veredito {
  const consulta = sqlDoAluno.trim().replace(/;\s*$/, "");
  if (!consulta) {
    return { certo: false, titulo: "Escreva uma consulta", detalhe: "O editor está vazio.", diagnosticado: false, resultado: null, esperado: null };
  }

  let resultado: Resultado;
  try {
    resultado = rodar(banco, consulta);
  } catch (e: any) {
    const mensagem = String(e?.message || e);
    return {
      certo: false,
      titulo: "O banco recusou a consulta",
      detalhe: traduzirErro(mensagem),
      diagnosticado: false,
      resultado: null,
      esperado: null,
      erroDeSintaxe: mensagem,
    };
  }

  const esperado = rodar(banco, desafio.referencia);

  if (mesmasLinhas(resultado, esperado, desafio.ordenado)) {
    return {
      certo: true,
      titulo: "Bateu com o esperado",
      detalhe: `${esperado.linhas.length} ${esperado.linhas.length === 1 ? "linha" : "linhas"}, com os valores certos. O caminho pode ser outro: o que vale é o resultado.`,
      diagnosticado: true,
      resultado,
      esperado,
    };
  }

  // Caiu em alguma das armadilhas conhecidas?
  for (const a of desafio.armadilhas) {
    try {
      if (mesmasLinhas(resultado, rodar(banco, a.sql), desafio.ordenado)) {
        return { certo: false, titulo: "Quase. Sei exatamente onde você tropeçou", detalhe: a.diagnostico, diagnosticado: true, resultado, esperado };
      }
    } catch {
      /* armadilha que não roda nesta base é ignorada */
    }
  }

  const detalhes: string[] = [];

  /* Resultado vazio merece recado próprio. Comparar contagem de coluna de uma
     tabela sem linha nenhuma só confunde quem já está perdido. */
  if (!resultado.linhas.length) {
    return {
      certo: false,
      titulo: "A consulta rodou, mas não voltou nada",
      detalhe: `Nenhuma linha veio, e o esperado tem ${esperado.linhas.length}. Comece tirando os filtros e veja se a tabela responde. Filtro que nunca é verdadeiro e junção que não casa são as duas causas de lista vazia.`,
      diagnosticado: false,
      resultado,
      esperado,
    };
  }

  if (resultado.linhas.length !== esperado.linhas.length) {
    detalhes.push(`Você trouxe ${resultado.linhas.length} ${resultado.linhas.length === 1 ? "linha" : "linhas"} e o esperado tem ${esperado.linhas.length}.`);
  }
  const colunasAluno = resultado.linhas[0]?.length ?? resultado.colunas.length;
  const colunasEsperadas = esperado.linhas[0]?.length ?? esperado.colunas.length;
  if (colunasAluno !== colunasEsperadas) {
    detalhes.push(`São ${colunasAluno} colunas contra ${colunasEsperadas} esperadas. Traga exatamente o que o enunciado pediu, na ordem em que ele pediu.`);
  } else if (resultado.linhas.length === esperado.linhas.length) {
    detalhes.push(primeiraDiferenca(resultado, esperado));
  }

  return {
    certo: false,
    titulo: "Ainda não",
    detalhe: detalhes.join(" ") || "O resultado não bateu com o esperado.",
    diagnosticado: false,
    resultado,
    esperado,
  };
}

/* O SQLite fala inglês e em tom de compilador. Aqui vira recado de gente. */
function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  const coluna = mensagem.match(/no such column: ([^\s]+)/i)?.[1];
  if (coluna) return `A coluna ${coluna} não existe. Confira o dicionário ao lado: nome errado de coluna é o erro mais comum de todos.`;
  const tabela = mensagem.match(/no such table: ([^\s]+)/i)?.[1];
  if (tabela) return `A tabela ${tabela} não existe nesta base. As que existem são clientes, produtos, pedidos e itens.`;
  if (m.includes("ambiguous column")) return `Duas tabelas têm uma coluna com esse mesmo nome, então o banco não sabe de qual você está falando. Prefixe com o apelido da tabela, como p.id.`;
  if (m.includes("syntax error")) return `Tem um erro de escrita na consulta. Confira vírgula sobrando, parêntese aberto e palavra fora de ordem.`;
  if (m.includes("misuse of aggregate")) return `Você usou uma função de agregação onde o banco não aceita. Filtro sobre agregação vai em HAVING, não em WHERE.`;
  return mensagem;
}
