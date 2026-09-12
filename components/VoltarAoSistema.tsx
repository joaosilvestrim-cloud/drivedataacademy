import Link from "next/link";

/* Saída visível de dentro de uma ferramenta.

   As ferramentas ocupam a tela inteira e não têm o menu lateral da área do
   aluno. Sem um botão explícito, a única saída era o voltar do navegador, que
   nem sempre existe quando a ferramenta abriu em aba nova.

   Fica fixo no canto superior esquerdo, acima do conteúdo, e sai da frente em
   telas estreitas encolhendo para só a seta. */

export default function VoltarAoSistema({
  href = "/conta/ferramentas",
  label = "Voltar ao sistema",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink-900/80 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-brand-green/50 hover:text-brand-green sm:px-4"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Link>
  );
}
