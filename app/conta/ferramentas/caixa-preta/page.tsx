import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import CaixaPreta from "./CaixaPreta";
import { nomeDaFerramenta } from "@/lib/ferramentas-nomes";

export const dynamic = "force-dynamic";

export default async function CaixaPretaPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Ferramentas</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{await nomeDaFerramenta("caixa-preta")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Monte e opere um modelo de linguagem dentro do seu navegador. Veja o texto virar token, o corpus virar tabela de
        probabilidade e a frase ser escrita um token por vez, com os candidatos à vista. Sem API, sem chave e sem custo.
      </p>

      <CaixaPreta />

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">Por que um modelo pequeno</p>
          <p className="mt-1 text-sm text-slate-400">
            Modelo grande convence e esconde o mecanismo. Este é pequeno o suficiente para você ver a tabela de
            probabilidade que decide cada palavra.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">O que muda no seu trabalho</p>
          <p className="mt-1 text-sm text-slate-400">
            Você para de pedir conta exata para a IA, passa a entender por que o contexto estoura e começa a desconfiar
            na hora certa.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">Nada sai daqui</p>
          <p className="mt-1 text-sm text-slate-400">
            Tokenizador, treino e geração acontecem na sua máquina. O texto que você colar não vai para servidor nenhum.
          </p>
        </div>
      </section>
    </div>
  );
}
