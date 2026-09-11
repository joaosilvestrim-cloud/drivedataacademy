import { Skeleton } from "@/components/ui/primitives";

// Esqueleto com a MESMA estrutura da Home, para a troca não deslocar layout.
// O anterior desenhava cards arredondados, que deixaram de existir na página.
export default function ContaLoading() {
  return (
    <div className="flex flex-col gap-12 pb-4 tablet:gap-14" aria-busy="true" aria-label="Carregando seu portal">
      <div>
        <Skeleton className="h-3 w-56" />
        <Skeleton className="mt-3.5 h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
      </div>

      <div className="border-l-2 border-ds-line pl-5 tablet:pl-6">
        <Skeleton className="h-3 w-28" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-full max-w-sm" />
            <Skeleton className="mt-2.5 h-3.5 w-40" />
          </div>
          <Skeleton className="h-12 w-full tablet:w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-ds-line py-4 tablet:grid-cols-3 lg:flex lg:justify-between lg:gap-x-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-7 w-10" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <div>
        <div className="border-b border-ds-line pb-2.5">
          <Skeleton className="h-5 w-36" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-ds-line-soft py-4">
            <Skeleton className="hidden h-14 w-24 tablet:block" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-full max-w-xs" />
              <Skeleton className="mt-3 h-2 w-full max-w-[16rem]" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
