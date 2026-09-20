import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, seloDaCasa } from "@/lib/community";
import { usuarioAtual } from "@/lib/sessao";
import { type Projeto } from "@/lib/portfolio";
import { vitrine } from "@/lib/portfolio-servidor";
import Portfolio, { type Autor } from "./Portfolio";

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

  const [{ projetos, erro }, meusRes, curtidasRes, cursosRes] = await Promise.all([
    vitrine(admin),
    admin.from("portfolio_projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
    admin.from("portfolio_likes").select("project_id").eq("user_id", user.id),
    admin.from("courses").select("id, title").eq("published", true).order("position"),
  ]);

  const meus = (meusRes.data ?? []) as Projeto[];
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
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Portfólio</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">O que a turma construiu</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Projeto pronto vale mais que certificado em entrevista. Publique o seu com a imagem, o problema que ele resolvia e o
        resultado. O time revisa e ele entra na vitrine, aqui e na página pública da Academy.
      </p>

      {semTabela ? (
        <div className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] px-5 py-4 text-sm text-amber-100">
          A vitrine ainda não foi ligada no banco. Peça para o time rodar a migration 20260920_portfolio.sql no Supabase.
        </div>
      ) : (
        <Portfolio
          vitrine={projetos}
          meus={meus}
          autores={autores}
          curtidos={((curtidasRes.data ?? []) as any[]).map((c) => c.project_id)}
          cursos={(cursosRes.data ?? []) as { id: string; title: string }[]}
        />
      )}

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">Serve qualquer projeto</p>
          <p className="mt-1 text-sm text-slate-400">
            Painel do trabalho, exercício da Academy que virou coisa séria, automação que economizou o seu dia. Se resolveu um
            problema real, entra.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">Conte o problema, não a ferramenta</p>
          <p className="mt-1 text-sm text-slate-400">
            Quem contrata quer saber o que estava quebrado e o que mudou depois. A lista de ferramentas é o detalhe, não a
            história.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">Você controla a exposição</p>
          <p className="mt-1 text-sm text-slate-400">
            Dá para deixar o projeto só para a turma. Dado de cliente nunca deve aparecer no print: troque nome e número antes
            de publicar.
          </p>
        </div>
      </section>
    </div>
  );
}
