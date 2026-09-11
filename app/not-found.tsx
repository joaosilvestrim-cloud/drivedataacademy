import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-20">
      <p className="font-mono text-meta uppercase text-ds-text-3">Erro 404</p>
      <h1 className="mt-3 font-display text-title font-semibold text-ds-text">
        Esta página não existe
      </h1>
      <p className="mt-3 text-body text-ds-text-2">
        O endereço pode ter mudado, ou o link que te trouxe aqui está desatualizado.
        Seu acesso e seu progresso continuam intactos.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/conta"
          className="rounded-ctl bg-ds-accent px-5 py-2.5 text-label font-medium text-ds-accent-ink transition-colors duration-fast ease-ds hover:brightness-110"
        >
          Ir para o meu portal
        </Link>
        <Link
          href="/"
          className="rounded-ctl border border-ds-line px-5 py-2.5 text-label font-medium text-ds-text-2 transition-colors duration-fast ease-ds hover:border-ds-text-3 hover:text-ds-text"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
