import { tr } from "@/lib/i18n/traduzir-servidor";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import Arena from "./Arena";
import { nomeDaFerramenta } from "@/lib/ferramentas-nomes";

export const dynamic = "force-dynamic";

/* A semente da base sai do id do aluno: a base dele é sempre a mesma quando
   ele volta, e nunca é a mesma do colega. Número estável, sem guardar nada. */
function sementeDoAluno(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default async function ArenaPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Ferramentas")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{await nomeDaFerramenta("arena")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {tr("Seis desafios sobre uma base de comércio gerada só para você. Escreva a consulta, execute ali mesmo e receba a correção na hora. Quando errar, a Arena não diz só que errou: diz onde você tropeçou.")}
      </p>

      <Arena semente={sementeDoAluno(user.id)} />

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Banco de verdade, no seu navegador")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("É um SQLite completo rodando na sua máquina. A sua consulta é executada mesmo, não comparada com texto.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Sem gabarito escrito por ninguém")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("A resposta certa é calculada na sua base, na hora. Por isso cada aluno tem números próprios e a resposta do colega não serve.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("O caminho é seu")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Chegou no resultado certo por outro caminho? Está certo. O que a Arena cobra é o número, como na vida real.")}
          </p>
        </div>
      </section>
    </div>
  );
}
