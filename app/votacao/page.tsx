import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarVotacao } from "@/lib/votacao";

export const dynamic = "force-dynamic";

/* Link curto. Manda para a votação publicada mais recente, então o endereço
   divulgado continua valendo na próxima enquete. */
export default async function VotacaoAtual() {
  const { votacao } = await carregarVotacao(createAdminClient());
  if (votacao) redirect(`/votacao/${votacao.slug}`);

  return (
    <main className="grid min-h-screen place-items-center bg-ink-900 px-6 text-center">
      <div className="max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="DriveData Academy" className="mx-auto h-9 w-auto" />
        <h1 className="mt-8 font-display text-2xl font-bold text-white">Nenhuma votação aberta</h1>
        <p className="mt-3 text-slate-400">
          Assim que abrirmos a próxima, o link aparece aqui. Enquanto isso, veja a{" "}
          <Link href="/#ao-vivo" className="text-brand-green underline underline-offset-4">grade de lives</Link>.
        </p>
      </div>
    </main>
  );
}
