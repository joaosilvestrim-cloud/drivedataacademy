import { CAUSAS, type Caso, type ClasseDefeito, type Lancamento } from "./tipos";

/* O gerador de casos de conciliação.

   Primeiro nasce o extrato do sistema origem, que é a verdade. Depois o painel
   é montado a partir dele, e é no caminho que o defeito é plantado, de um jeito
   parecido com o que acontece na vida real: alguém esqueceu um filtro, uma
   junção comeu linha, o fuso empurrou a venda para o mês seguinte.

   Como o defeito é plantado aqui, o gabarito sai de graça: diferença, classe,
   dimensão em que ela se concentra e os ids envolvidos. Nenhum gabarito escrito
   à mão, e por isso a ferramenta roda sozinha para sempre. */

function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILIAIS = ["São Paulo", "Campinas", "Sorocaba", "Ribeirão Preto", "Santos"];
const CANAIS = ["Loja", "Site", "Televendas", "Marketplace"];
const PRODUTOS = ["Notebook", "Monitor", "Teclado", "Roteador", "Headset", "Cadeira"];

const dois = (n: number) => String(n).padStart(2, "0");
export const centavos = (v: number) => Math.round(v * 100) / 100;
export const somar = (linhas: Lancamento[]) => centavos(linhas.reduce((s, l) => s + l.valor, 0));

const CONTEXTO: Record<ClasseDefeito, string> = {
  duplicata: "O controller diz que o faturamento do painel está menor que o do sistema. Ele mandou o extrato do ERP para você comparar.",
  status: "O financeiro reclamou: o painel de vendas mostra mais faturamento do que o realizado do mês. A contabilidade mandou o extrato oficial.",
  orfao: "A diretora de uma filial ligou dizendo que o número dela sumiu do painel. O extrato do ERP veio completo.",
  devolucao: "O painel está fechando abaixo do sistema e ninguém sabe dizer por quê. As devoluções do mês foram altas.",
  escopo: "Comercial e financeiro estão brigando por causa de um número. Cada um mostra um total diferente para o mesmo mês.",
  corte_data: "O total do ano fecha certinho, mas o fechamento de um mês específico está errado, e o seguinte também.",
  arredondamento: "A diferença é pequena e o time quer ignorar. O auditor não quer, e pediu a explicação.",
};

const PERGUNTA: Record<ClasseDefeito, string> = {
  duplicata: "De quanto é a diferença entre os dois lados?",
  status: "De quanto é a diferença entre os dois lados?",
  orfao: "De quanto é a diferença entre os dois lados?",
  devolucao: "De quanto é a diferença entre os dois lados?",
  escopo: "De quanto é a diferença entre os dois lados?",
  corte_data: "O total do período fecha. De quanto é o valor que trocou de mês?",
  arredondamento: "De quanto é a diferença entre os dois lados?",
};

const TITULO: Record<ClasseDefeito, string> = {
  duplicata: "O painel está menor que o ERP",
  status: "O painel está maior que o realizado",
  orfao: "A filial sumiu do painel",
  devolucao: "Falta dinheiro no painel",
  escopo: "Dois totais para o mesmo mês",
  corte_data: "O ano fecha, o mês não",
  arredondamento: "A diferença pequena que o auditor não aceita",
};

export function gerarCaso(semente: number, classe: ClasseDefeito, ano = new Date().getFullYear() - 1): Caso {
  const r = sorteio(semente);
  const escolhe = <T,>(lista: T[]): T => lista[Math.floor(r() * lista.length)];
  const entre = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));

  // O extrato do sistema origem: a verdade do caso.
  const origem: Lancamento[] = [];
  const quantos = entre(160, 220);
  for (let i = 1; i <= quantos; i++) {
    const mes = entre(1, 3);
    origem.push({
      id: `L${String(i).padStart(4, "0")}`,
      data: `${ano}-${dois(mes)}-${dois(entre(1, 28))}`,
      filial: escolhe(FILIAIS),
      canal: escolhe(CANAIS),
      status: "faturado",
      produto: escolhe(PRODUTOS),
      valor: centavos(entre(180, 9800) + r()),
    });
  }

  const copia = (l: Lancamento, mudanca: Partial<Lancamento> = {}): Lancamento => ({ ...l, ...mudanca });
  let painel: Lancamento[] = origem.map((l) => copia(l));
  const registros: string[] = [];

  if (classe === "duplicata") {
    /* O ERP exportou alguns lançamentos duas vezes. A origem fica inflada, e o
       painel, que deduplicou, fica menor. */
    for (let i = 0; i < entre(3, 6); i++) {
      const alvo = origem[entre(0, origem.length - 1)];
      origem.push(copia(alvo, { id: alvo.id }));
      registros.push(alvo.id);
    }
  }

  if (classe === "status") {
    // O painel não filtrou status: entraram cancelados que o sistema não conta.
    for (let i = 0; i < entre(4, 9); i++) {
      const base = origem[entre(0, origem.length - 1)];
      const extra = copia(base, {
        id: `C${String(i + 1).padStart(3, "0")}`,
        status: "cancelado",
        valor: centavos(entre(400, 6000) + r()),
      });
      painel.push(extra);
      registros.push(extra.id);
    }
  }

  if (classe === "orfao") {
    // Junção interna com a dimensão de filial derrubou uma filial inteira.
    const perdida = escolhe(FILIAIS);
    painel = painel.filter((l) => l.filial !== perdida);
    for (const l of origem) if (l.filial === perdida) registros.push(l.id);
  }

  if (classe === "devolucao") {
    /* A origem já veio líquida das devoluções e o painel abateu de novo. */
    const devolvidos = origem.filter(() => r() < 0.07);
    for (const d of devolvidos) {
      const alvo = painel.find((p) => p.id === d.id);
      if (alvo) alvo.valor = centavos(alvo.valor - centavos(d.valor * 0.4));
      registros.push(d.id);
    }
  }

  if (classe === "escopo") {
    // O painel inclui um canal que o fechamento do financeiro não considera.
    const canal = escolhe(CANAIS);
    for (let i = 0; i < entre(6, 12); i++) {
      const extra: Lancamento = {
        id: `E${String(i + 1).padStart(3, "0")}`,
        data: `${ano}-${dois(entre(1, 3))}-${dois(entre(1, 28))}`,
        filial: escolhe(FILIAIS),
        canal,
        status: "faturado",
        produto: escolhe(PRODUTOS),
        valor: centavos(entre(500, 7000) + r()),
      };
      painel.push(extra);
      registros.push(extra.id);
    }
  }

  if (classe === "corte_data") {
    /* Venda do último dia do mês, depois das 21h, caiu no mês seguinte no
       painel. O total do período fecha; o mês, não. */
    const mes = entre(1, 2);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    for (let i = 0; i < entre(4, 8); i++) {
      const alvo = origem[entre(0, origem.length - 1)];
      alvo.data = `${ano}-${dois(mes)}-${dois(ultimoDia)}`;
      const noPainel = painel.find((p) => p.id === alvo.id);
      if (noPainel) {
        noPainel.data = `${ano}-${dois(mes + 1)}-01`;
        registros.push(alvo.id);
      }
    }
  }

  if (classe === "arredondamento") {
    // O painel arredonda cada linha para o real mais próximo.
    for (const l of painel) {
      const antes = l.valor;
      l.valor = Math.round(l.valor);
      if (antes !== l.valor) registros.push(l.id);
    }
  }

  const causa = CAUSAS.find((c) => c.classe === classe)!;
  const envolvidos = Array.from(new Set(registros));

  /* O valor da divergência não é sempre a diferença dos totais.

     No corte de data os dois lados somam igual: o dinheiro não sumiu, só mudou
     de mês. A divergência que existe, e que o fechamento do mês cobra, é o
     valor deslocado. Perguntar pelo total ali seria ensinar errado. */
  const diferenca =
    classe === "corte_data"
      ? centavos(origem.filter((l) => envolvidos.includes(l.id)).reduce((s, l) => s + l.valor, 0))
      : centavos(somar(painel) - somar(origem));

  return {
    id: `${classe}-${semente}`,
    titulo: TITULO[classe],
    contexto: CONTEXTO[classe],
    pergunta: PERGUNTA[classe],
    origem,
    painel,
    gabarito: {
      classe,
      diferenca,
      dimensao: causa.concentracao,
      registros: envolvidos,
    },
  };
}

export const CLASSES: ClasseDefeito[] = ["status", "duplicata", "orfao", "devolucao", "escopo", "corte_data", "arredondamento"];

/** Sorteia um caso: classe e semente próprias do aluno, sem repetir a anterior. */
export function sortearCaso(semente: number, rodada: number, ano?: number): Caso {
  const classe = CLASSES[(Math.abs(semente) + rodada * 3) % CLASSES.length];
  return gerarCaso(semente + rodada * 7919, classe, ano);
}
