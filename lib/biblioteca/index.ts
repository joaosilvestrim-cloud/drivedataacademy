import { DAX } from "./dax";
import { SQL } from "./sql";
import { M } from "./m";
import type { Item } from "./tipos";

export * from "./tipos";

/* O acervo inteiro em uma lista só.

   A ordem aqui é a ordem dos arquivos, e ela importa: DAX primeiro porque é o
   que a turma usa todo dia, SQL depois, Power Query no fim. Dentro de cada
   linguagem, os itens já vêm agrupados por assunto. */
export const ITENS: Item[] = [...DAX, ...SQL, ...M];

export { DAX, SQL, M };
