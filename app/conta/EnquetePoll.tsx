import Link from "next/link";
import { votarEnquete } from "./actions";

/* Enquete do aluno. É a mesma enquete da página pública /votacao: mesma
   pergunta, mesmas opções e mesma contagem, porque lê e escreve na mesma
   tabela. Aqui o aluno vota em um clique, já que o e-mail vem da conta. */

type Opcao = { id: string; label: string; description: string | null };

export default function EnquetePoll({
  slug,
  titulo,
  descricao,
  opcoes,
  contagem,
  minhas,
  totalVotos,
  maxEscolhas,
}: {
  slug: string;
  titulo: string;
  descricao: string | null;
  opcoes: Opcao[];
  contagem: Record<string, number>;
  minhas: string[];
  totalVotos: number;
  maxEscolhas: number;
}) {
  const maior = Math.max(1, ...opcoes.map((o) => contagem[o.id] || 0));

  return (
    <div className="rounded-srf border border-ds-accent/30 bg-ds-accent/[0.04] p-5 tablet:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-section font-semibold text-ds-text">{titulo}</h2>
        <span className="text-meta uppercase text-ds-text-3">
          {totalVotos} {totalVotos === 1 ? "voto" : "votos"}
        </span>
      </div>
      <span className="mt-2 block h-0.5 w-12 bg-ds-accent" aria-hidden="true" />

      {descricao && <p className="mt-3 max-w-2xl text-body-sm text-ds-text-2">{descricao}</p>}

      <div className="mt-5 flex flex-col gap-2">
        {opcoes.map((o) => {
          const n = contagem[o.id] || 0;
          const pct = Math.round((n / maior) * 100);
          const minha = minhas.includes(o.id);
          return (
            <form key={o.id} action={votarEnquete}>
              <input type="hidden" name="option_id" value={o.id} />
              <button
                aria-pressed={minha}
                className={`relative block w-full overflow-hidden rounded-ctl border px-4 py-3 text-left transition-colors duration-fast ease-ds ${
                  minha ? "border-ds-accent bg-ds-accent/10" : "border-ds-line hover:border-ds-accent/50"
                }`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-ds-accent/10 transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
                <span className="relative flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className={`block text-body-sm font-medium ${minha ? "text-ds-text" : "text-ds-text-2"}`}>{o.label}</span>
                    {o.description && <span className="mt-0.5 block text-caption text-ds-text-3">{o.description}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-caption tabular-nums text-ds-text-3">{n}</span>
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <p className="mt-4 text-caption text-ds-text-3">
        {maxEscolhas > 1 ? `Você pode marcar até ${maxEscolhas} temas. ` : "Dá para trocar o voto quando quiser. "}
        Também dá para responder pelo link público:{" "}
        <Link href={`/votacao/${slug}`} className="text-ds-info underline decoration-ds-line underline-offset-4">
          página da enquete
        </Link>
        .
      </p>
    </div>
  );
}
