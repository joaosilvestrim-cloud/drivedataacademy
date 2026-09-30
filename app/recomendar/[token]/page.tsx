import { tr } from "@/lib/i18n/traduzir-servidor";
import { createAdminClient } from "@/lib/supabase/admin";
import { tabelaAusente } from "@/lib/portfolio-carreira";
import EscreverRecomendacao from "./EscreverRecomendacao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recomendação · DriveData Academy", robots: { index: false } };

/* Página que o colega abre pelo link do convite. Sem login: o link é a
   autorização, e vale uma vez. */
export default async function Recomendar({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: rec, error } = await admin
    .from("portfolio_recomendacoes")
    .select("user_id, project_id, status")
    .eq("token", params.token)
    .maybeSingle();

  const aviso = (titulo: string, texto: string) => (
    <main className="mx-auto max-w-xl px-6 py-24 text-tinta">
      <h1 className="font-display text-3xl font-bold">{titulo}</h1>
      <p className="mt-4 text-slate-300">{texto}</p>
    </main>
  );

  if (tabelaAusente(error) || !rec) return aviso("Convite não encontrado", "Este link de recomendação não existe ou foi cancelado. Peça um novo para quem enviou.");
  if (rec.status !== "convite") return aviso("Este convite já foi usado", "A recomendação deste link já foi escrita. Obrigado!");

  const [{ data: perfil }, projeto] = await Promise.all([
    admin.from("profiles").select("full_name, headline, avatar_url").eq("id", rec.user_id).maybeSingle(),
    rec.project_id ? admin.from("portfolio_projects").select("titulo").eq("id", rec.project_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const nome = (perfil?.full_name || "Um aluno da Academy").trim();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-tinta">
      <p className="text-sm text-acento">{tr("DriveData Academy")}</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{nome} {tr("pediu sua recomendação")}</h1>
      {perfil?.headline && <p className="mt-2 text-slate-400">{perfil.headline}</p>}
      <p className="mt-6 text-slate-300">
        {projeto?.data?.titulo
          ? <>{tr("Sobre o projeto")} <span className="font-semibold text-tinta">{projeto.data.titulo}</span>. </>
          : null}
        Conte o que {nome.split(" ")[0]} fez e como foi trabalhar junto. Seu texto aparece no portfólio público, com seu nome e cargo, depois que você confirmar o e-mail e {nome.split(" ")[0]} aprovar.
      </p>
      <EscreverRecomendacao token={params.token} primeiroNome={nome.split(" ")[0]} />
    </main>
  );
}
