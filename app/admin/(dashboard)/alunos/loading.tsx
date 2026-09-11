import { Skeleton } from "@/components/ui/primitives";

// Reflete a estrutura final: cabeçalho, barra de trabalho, resumo e linhas de
// tabela na mesma altura. Sem blocos gigantes arredondados, sem salto.
export default function AlunosLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando alunos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2.5 h-8 w-36" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:gap-4">
        <Skeleton className="h-10 w-full tablet:max-w-xs" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <Skeleton className="h-4 w-32" />

      <div>
        <div className="border-b border-ds-line pb-2">
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-ds-line-soft py-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="mt-1.5 h-3 w-56" />
            </div>
            <Skeleton className="hidden h-3 w-20 tablet:block" />
            <Skeleton className="hidden h-3 w-8 tablet:block" />
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
