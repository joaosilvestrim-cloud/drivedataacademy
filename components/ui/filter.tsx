import Link from "next/link";

/* --------------------------------------------------------------------------
   Filtro governado pela URL.

   Arquivo separado de data.tsx de propósito: data.tsx é "use client" por causa
   de Search, FilterSelect e FilterSummary, que dependem de estado React. Este
   componente não depende de nada disso, então fica fora daquela fronteira e
   continua renderizando no servidor, sem mandar JavaScript para o navegador.

   Promovido depois de três consumidores independentes: /admin/suporte,
   /admin/comentarios e /admin/representacao. As três implementações locais
   tinham a mesma forma, o mesmo comportamento com parâmetro ausente e inválido
   e a mesma acessibilidade. Nenhuma precisou de condicional por página.

   FilterSelect resolve o outro caso, o de estado local, como em /admin/alunos.
   Nenhum dos dois serve para seletor de contexto, que é o que /admin/progresso
   faz com o parâmetro c: lá o parâmetro não restringe a lista, ele abre uma
   segunda leitura.
   -------------------------------------------------------------------------- */

export type FilterOption = { key: string; label: string };

export function LinkFilter({
  label,
  basePath,
  param,
  options,
  active,
  counts,
}: {
  /** Nome acessível do grupo, por exemplo "Filtrar chamados por situação". */
  label: string;
  basePath: string;
  param: string;
  options: FilterOption[];
  /** Já resolvido pela página. O componente não conhece o padrão de ninguém. */
  active: string;
  /** Opcional. Quando falta, cada opção mostra só o rótulo. */
  counts?: Record<string, number>;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const atual = active === o.key;
        return (
          <Link
            key={o.key}
            // Versão 1 monta o endereço com um parâmetro só. Nenhuma das três
            // páginas tem um segundo parâmetro de URL, então preservar outros
            // seria resolver problema que ainda não existe. Quando aparecer o
            // primeiro consumidor real, isso evolui sem quebrar os atuais.
            href={`${basePath}?${param}=${o.key}`}
            aria-current={atual ? "page" : undefined}
            className={`inline-flex items-baseline gap-2 rounded-ctl border px-3 py-1.5 text-label font-medium transition-colors duration-fast ease-ds ${
              atual
                ? "border-ds-accent/50 bg-ds-accent/[0.07] text-ds-accent"
                : "border-ds-line text-ds-text-2 hover:border-ds-text-3 hover:text-ds-text"
            }`}
          >
            {o.label}
            {/* Mono só no número. O rótulo ao lado nunca é monoespaçado. */}
            {counts && <span className="font-mono text-caption tabular-nums">{counts[o.key] ?? 0}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
