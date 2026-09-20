import { tr } from "@/lib/i18n/traduzir-servidor";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import { nomeDaFerramenta } from "@/lib/ferramentas-nomes";
import Dojo from "./Dojo";

export const dynamic = "force-dynamic";

/* A base sai do id do aluno: a dele é sempre a dele, e nunca a do colega.
   Número estável, sem guardar nada. */
function sementeDoAluno(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default async function DojoPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Ferramentas")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{await nomeDaFerramenta("dojo")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {tr("A mesma base, as mesmas perguntas, duas ferramentas. Você responde com o número e com a fórmula, e a correção separa as duas coisas: entender o problema e saber escrever a solução.")}
      </p>

      <Dojo semente={sementeDoAluno(user.id)} />

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Número e fórmula")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Acertar o número com a fórmula errada é o que mais acontece no trabalho, e é o que quebra quando a base cresce. Aqui os dois são conferidos, e o atalho perigoso vira alerta.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Sua base, não a do colega")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("A tabela é gerada a partir da sua conta. Copiar a resposta de alguém não funciona: os números são outros.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Mais de um jeito certo")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("A correção procura os pedaços que a solução precisa ter, não um texto idêntico. SUMX escrito de outro jeito continua valendo.")}
          </p>
        </div>
      </section>
    </div>
  );
}
