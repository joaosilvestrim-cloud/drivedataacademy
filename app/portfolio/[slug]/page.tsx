import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { envelopar } from "@/lib/portfolio-site";
import SitePublico from "./SitePublico";

/* Site de portfólio do aluno, com link público.

   Um minuto de cache: é o link que o aluno põe no LinkedIn, e um post que
   pega tração traz muita visita de uma vez. Ao republicar, a ação do aluno
   invalida esta página na hora. */
export const revalidate = 60;

async function carregar(slug: string) {
  const admin = createAdminClient();
  const { data: site } = await admin
    .from("portfolio_sites")
    .select("user_id, html, publicado, bloqueado, mostrar_universo")
    .eq("slug", slug)
    .maybeSingle();
  if (!site || !site.publicado || site.bloqueado) return null;
  const { data: perfil } = await admin.from("profiles").select("full_name, headline").eq("id", site.user_id).maybeSingle();
  return { site, nome: (perfil?.full_name || "").trim() || "Aluno da Academy", headline: (perfil?.headline || "").trim() };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const dados = await carregar(params.slug);
  if (!dados) return { title: "Portfólio · DriveData Academy" };
  const descricao = dados.headline || `Projetos de dados e competências de ${dados.nome}, verificadas pela DriveData Academy.`;
  return {
    title: `${dados.nome} · Portfólio`,
    description: descricao,
    openGraph: { title: `${dados.nome} · Portfólio`, description: descricao, type: "profile" },
  };
}

export default async function PortfolioDoAluno({ params }: { params: { slug: string } }) {
  const dados = await carregar(params.slug);
  if (!dados) notFound();
  return (
    <SitePublico
      html={envelopar(dados.site.html)}
      nome={dados.nome}
      slug={params.slug}
      mostrarUniverso={dados.site.mostrar_universo}
    />
  );
}
