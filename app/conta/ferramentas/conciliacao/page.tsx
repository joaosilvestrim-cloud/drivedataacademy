import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import Conciliacao from "./Conciliacao";

export const dynamic = "force-dynamic";

/* A semente sai do id do aluno: o caso dele é sempre o dele, e nunca o do
   colega. Número estável, sem guardar nada. */
function sementeDoAluno(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default async function ConciliacaoPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Ferramentas</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">O número não bate</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        O painel diz uma coisa, o sistema diz outra, e alguém importante está esperando a explicação. Aqui você treina a
        cena mais comum da profissão, com um método que funciona sempre: total, quebra, linha.
      </p>

      <Conciliacao semente={sementeDoAluno(user.id)} />

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">Sete causas, as de verdade</p>
          <p className="mt-1 text-sm text-slate-400">
            Duplicata na origem, filtro de status, linha perdida na junção, devolução dobrada, escopo diferente, corte de
            data e arredondamento por linha. É o que quebra número no mundo real.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">Errar a causa também ensina</p>
          <p className="mt-1 text-sm text-slate-400">
            Se você escolher a causa errada, eu explico por que ela não fecha com o que está na tela. Descartar hipótese
            pelo sinal da diferença é metade do trabalho de um sênior.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">Nunca acaba e não repete</p>
          <p className="mt-1 text-sm text-slate-400">
            O caso é gerado a partir do seu cadastro, com valores próprios. O do colega é outro, e o seu muda a cada
            chamado novo.
          </p>
        </div>
      </section>
    </div>
  );
}
