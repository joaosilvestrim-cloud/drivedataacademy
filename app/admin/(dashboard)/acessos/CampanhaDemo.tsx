import Link from "next/link";
import { criarCampanhaDemo, alternarCampanhaDemo } from "./actions";

/* Campanhas de demonstração do DriveCanvas, as que a pessoa libera sozinha
   pelo QR code da live.

   É diferente do bloco acima: lá o time digita um e-mail por vez, e isso serve
   para um prospect específico. Aqui é para a transmissão, onde cinquenta
   pessoas entram no mesmo minuto e ninguém vai digitar nada ao vivo. */

export type Campanha = {
  id: string;
  slug: string;
  titulo: string;
  palavra: string | null;
  dias: number;
  ativo: boolean;
  limite: number | null;
  inscritos: number;
};

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function CampanhaDemo({ campanhas }: { campanhas: Campanha[] }) {
  return (
    <div className="glass rounded-2xl border border-brand-green/20 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-white">Demonstração por QR code (live)</p>
        <Link href="/admin/telao" className="text-xs text-brand-green underline underline-offset-4">
          Abrir o telão →
        </Link>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        A pessoa lê o QR na transmissão, preenche nome, e-mail e telefone, confirma a palavra-chave e
        sai com o acesso na hora. O contato fica guardado como lead mesmo depois do prazo vencer.
      </p>

      <form action={criarCampanhaDemo} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_110px_110px_auto]">
        <input name="titulo" required placeholder="Live de 22/09" className={field} />
        <input name="palavra" placeholder="Palavra-chave" autoCapitalize="characters" className={field} />
        <input name="dias" type="number" min={1} max={90} defaultValue={7} title="Dias de acesso" className={field} />
        <input name="limite" type="number" min={1} placeholder="Limite" title="Máximo de cadastros. Vazio = sem teto." className={field} />
        <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
          Criar
        </button>
      </form>
      <p className="mt-2 text-[0.7rem] text-slate-500">
        Sem palavra-chave, qualquer pessoa com o link entra, inclusive depois da live. O limite é a
        segunda trava: se o link vazar num grupo, ele para de liberar acesso ao bater o teto.
      </p>

      {campanhas.length > 0 && (
        <ul className="mt-5 divide-y divide-white/5 rounded-xl border border-white/8">
          {campanhas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-white">{c.titulo}</span>
                <span className="block font-mono text-[0.7rem] text-slate-500">
                  /demo/{c.slug}
                  {c.palavra ? ` · palavra: ${c.palavra}` : " · sem palavra-chave"} · {c.dias} dias
                  {c.limite ? ` · teto ${c.limite}` : ""}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
                {c.inscritos} {c.inscritos === 1 ? "lead" : "leads"}
              </span>
              <form action={alternarCampanhaDemo} className="shrink-0">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="ativo" value={c.ativo ? "0" : "1"} />
                <button className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  c.ativo
                    ? "border-white/12 text-slate-300 hover:border-red-400/50 hover:text-red-300"
                    : "border-brand-green/40 text-brand-green"
                }`}>
                  {c.ativo ? "Encerrar" : "Reabrir"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
