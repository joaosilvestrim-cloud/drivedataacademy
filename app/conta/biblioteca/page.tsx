import { redirect } from "next/navigation";

/* A Biblioteca passou a morar dentro de Ferramentas. O endereço antigo
   continua funcionando por causa dos links já enviados: e-mail, dica do
   mascote e o que a turma salvou. */
export default function BibliotecaAntiga() {
  redirect("/conta/ferramentas/biblioteca");
}
