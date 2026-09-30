import { tr } from "@/lib/i18n/traduzir-servidor";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, seloDaCasa } from "@/lib/community";
import { usuarioAtual } from "@/lib/sessao";
import { LACUNA, type Projeto } from "@/lib/portfolio";
import { vitrine } from "@/lib/portfolio-servidor";
import Portfolio, { type Autor } from "./Portfolio";
import SiteDoPortfolio, { type SiteAtual } from "./SiteDoPortfolio";
import { raioXDoPortfolio } from "@/lib/portfolio-raiox";
import { montarPrompt } from "@/lib/portfolio-site";
import CarreiraDoAluno from "./CarreiraDoAluno";
import { carreiraDoAluno } from "@/lib/portfolio-carreira";
import { cursosPorCompetencia, nomesDasCompetencias } from "@/lib/portfolio-competencias";

export const dynamic = "force-dynamic";

/* Vitrine de portfólio.

   Projeto de aluno é a melhor propaganda que a Academy tem, e o melhor
   currículo que o aluno faz aqui dentro. Por isso a mesma tela mostra o que a
   turma construiu e deixa a pessoa publicar o dela em dois minutos. */

export default async function PortfolioPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/matricula");

  const [{ projetos, erro }, meusRes, curtidasRes, cursosRes, siteRes] = await Promise.all([
    vitrine(admin),
    admin.from("portfolio_projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
    admin.from("portfolio_likes").select("project_id").eq("user_id", user.id),
    admin.from("courses").select("id, title").eq("published", true).order("position"),
    // Sem a tabela ainda, volta erro e a seção abre como site novo.
    admin.from("portfolio_sites").select("slug, publicado, mostrar_universo, bloqueado").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data: meuPerfil } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  /* A carreira além dos projetos. Sem a migration do universo da carreira,
     carreira.pronta é falso e as partes novas não aparecem. */
  const [carreira, nomesComp, cursosComp] = await Promise.all([
    carreiraDoAluno(admin, user.id),
    nomesDasCompetencias(),
    cursosPorCompetencia(admin),
  ]);
  const provadas = [...new Set(((meusRes.data ?? []) as any[]).flatMap((p) => (p.competencias?.itens ?? []).map((c: any) => c.id)))];
  const siteAtual = (siteRes.data ?? null) as SiteAtual;
  // Mesma régua do prompt: público e sem lacuna entre colchetes.
  const prontos = meusProjetosProntos(meusRes.data ?? []);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

  const meus = (meusRes.data ?? []) as Projeto[];
  // Papel de cada projeto só entra na régua quando a tabela de detalhes existe.
  const papeis: Record<string, string | null> = carreira.pronta
    ? Object.fromEntries(((meusRes.data ?? []) as any[]).map((p) => [p.id, carreira.detalhes[p.id]?.papel ?? null]))
    : {};
  const raioX = raioXDoPortfolio((meusRes.data ?? []) as any[], papeis);
  // O prompt chega pronto, com o estilo padrão. Montar não usa IA e leva cerca de um segundo.
  const promptInicial = prontos > 0 ? await montarPrompt(admin, user.id, "painel").catch(() => null) : null;
  const semTabela = !!erro && /relation|does not exist|schema cache/i.test(erro);

  // Autor de cada projeto da vitrine, com a moldura que ele tem na comunidade.
  const ids = [...new Set(projetos.map((p) => p.user_id))];
  const { nameById, avatarById, badgeById } = await loadProfiles(admin, ids);
  const { data: perfis } = ids.length ? await admin.from("profiles").select("id, headline").in("id", ids) : { data: [] as any[] };
  const headlineDe = new Map((perfis ?? []).map((p: any) => [p.id, p.headline]));
  const autores: Record<string, Autor> = {};
  for (const id of ids) {
    autores[id] = {
      nome: displayName(nameById, id),
      avatar: avatarById[id] || null,
      casa: seloDaCasa(badgeById[id]),
      headline: (headlineDe.get(id) || "").trim() || null,
    };
  }

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Portfólio")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{tr("O que a turma construiu")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {tr("Projeto pronto vale mais que certificado em entrevista. Publique o seu com a imagem, o problema que ele resolvia e o resultado. O time revisa e ele entra na vitrine, aqui e na página pública da Academy.")}
      </p>

      {!semTabela && <SiteDoPortfolio atual={siteAtual} siteUrl={siteUrl} projetos={(meusRes.data ?? []).length} prontos={prontos} nome={(meuPerfil?.full_name || "").trim() || "você"} raioX={raioX} promptInicial={promptInicial ? { prompt: promptInicial.prompt, incluidos: promptInicial.incluidos, foraPorLacuna: promptInicial.foraPorLacuna, foraPorPrivado: promptInicial.foraPorPrivado, certificados: promptInicial.certificados } : null} />}

      {semTabela ? (
        <div className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] px-5 py-4 text-sm text-amber-100">
          {tr("A vitrine ainda não foi ligada no banco. Peça para o time rodar a migration 20260920_portfolio.sql no Supabase.")}
        </div>
      ) : (
        <Portfolio
          vitrine={projetos}
          meus={meus}
          autores={autores}
          curtidos={((curtidasRes.data ?? []) as any[]).map((c) => c.project_id)}
          cursos={(cursosRes.data ?? []) as { id: string; title: string }[]}
          detalhes={carreira.detalhes}
          comDetalhes={carreira.pronta}
        />
      )}

      {!semTabela && (
        <CarreiraDoAluno
          carreira={carreira}
          projetos={((meusRes.data ?? []) as any[]).map((p) => ({ id: p.id, titulo: p.titulo }))}
          nomes={nomesComp}
          provadas={provadas}
          cursos={cursosComp}
        />
      )}

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Serve qualquer projeto")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Painel do trabalho, exercício da Academy que virou coisa séria, automação que economizou o seu dia. Se resolveu um problema real, entra.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Conte o problema, não a ferramenta")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Quem contrata quer saber o que estava quebrado e o que mudou depois. A lista de ferramentas é o detalhe, não a história.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Você controla a exposição")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Dá para deixar o projeto só para a turma. Dado de cliente nunca deve aparecer no print: troque nome e número antes de publicar.")}
          </p>
        </div>
      </section>
    </div>
  );
}

function meusProjetosProntos(meus: any[]): number {
  return meus.filter((p) => p.titulo && p.publico && !LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" "))).length;
}
