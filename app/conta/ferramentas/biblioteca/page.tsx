import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import { ITENS } from "@/lib/biblioteca";
import Biblioteca from "./Biblioteca";
import { trocasDoAdmin } from "@/lib/ferramentas-nomes";

export const dynamic = "force-dynamic";

/* Biblioteca de referência.

   O aluno termina o curso e volta para o trabalho. Seis meses depois ele não
   lembra a sintaxe do DATEADD, mas lembra que aqui tem. É para esse dia que a
   Biblioteca existe. */

export default async function BibliotecaPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Biblioteca</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{((await trocasDoAdmin()).biblioteca?.nome || "").trim() || "Referência de bolso"}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {ITENS.length} padrões de DAX, SQL e Power Query que resolvem o dia a dia. Cada um responde três coisas: quando
        usar, o código para colar e a armadilha em que a maioria cai. Sem enrolação e sem precisar assistir a nada.
      </p>

      <Biblioteca />

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">Escrito para consulta</p>
          <p className="mt-1 text-sm text-slate-400">
            Nada aqui é aula. É o que você abre com o chefe esperando, acha em cinco segundos, cola e volta ao trabalho.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">A armadilha é o conteúdo</p>
          <p className="mt-1 text-sm text-slate-400">
            Código o Google já tem. O que falta é alguém dizer por que aquele padrão quebra na sua base. Todo verbete
            traz o erro que a maioria comete.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">Funciona offline</p>
          <p className="mt-1 text-sm text-slate-400">
            O acervo inteiro carrega junto com a página. A busca é instantânea e nada do que você digita sai do seu
            navegador.
          </p>
        </div>
      </section>
    </div>
  );
}
