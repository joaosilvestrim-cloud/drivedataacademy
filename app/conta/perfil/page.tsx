import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BADGE_LABELS } from "@/lib/community";
import {loadCommunityRanking} from "@/lib/community-ranking";
import ProfileForm from "./ProfileForm";
import DadosFiscais from "./DadosFiscais";
import { clienteAsaasPorEmail, dadosSalvos, juntarDados } from "@/lib/dados-fiscais";
import ProfilePreview from "@/components/knowledge/ProfilePreview";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function PerfilPage({ searchParams }: { searchParams: { falta?: string } }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const [ranked, { data: myEvents }, { data: badges }, { data: site }] = await Promise.all([
    loadCommunityRanking(),
    admin.from("point_events").select("kind, points").eq("user_id", user.id),
    admin.from("user_badges").select("badge").eq("user_id", user.id),
    admin.from("portfolio_sites").select("slug, publicado, bloqueado").eq("user_id", user.id).maybeSingle(),
  ]);
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const siteDoPortfolio = site?.publicado && !site.bloqueado ? `${SITE}/portfolio/${site.slug}` : null;

  /* Dados para nota fiscal: só para quem pagou, por Asaas ou por fora. O
     bloco se esconde enquanto a tabela dados_fiscais não existir. */
  const email = (user.email || "").toLowerCase();
  const { data: pedidoPago } = await admin
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .or(`user_id.eq.${user.id},email.eq."${email.replace(/"/g, "")}"`)
    .limit(1);
  let fiscal: { inicial: any; cpfDoPagamento: string | null; enviadoEm: string | null; erroEnvio: string | null } | null = null;
  if (pedidoPago?.length) {
    const [salvos, asaas] = await Promise.all([dadosSalvos(admin, user.id), clienteAsaasPorEmail(email).catch(() => null)]);
    if (salvos.pronta) {
      const juntos = juntarDados(salvos.dados, asaas);
      const cpf = asaas?.cpf || "";
      fiscal = {
        inicial: { ...juntos, cpf: asaas?.cpf ? "" : juntos.cpf },
        cpfDoPagamento: cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : cpf ? "informado no pagamento" : null,
        enviadoEm: salvos.dados?.ca_sincronizado_em ?? null,
        erroEnvio: salvos.dados?.ca_erro ?? null,
      };
    }
  }

  const myPoints = ranked.find(r=>r.id===user.id)?.pts || 0;
  const myRank = ranked.findIndex(r => r.id === user.id);
  const solutions = (myEvents ?? []).filter((e: any) => e.kind === "solution").length;
  const myBadges = (badges ?? []).map((b: any) => b.badge);

  const Icon = ({ d }: { d: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-marca"><path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );

  const stats = [
    { label: tr("Pontos"), value: myPoints, d: "M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" },
    { label: "Posição", value: myRank >= 0 ? `#${myRank + 1}` : "—", d: "M4 20h16M7 20V9M12 20V4M17 20v-7" },
    { label: "Soluções", value: solutions, d: "M20 6L9 17l-5-5" },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-obsidian">{tr("Meu perfil")}</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-charcoal">{tr("Seus dados de aluno na DriveData Academy. O cartão ao lado mostra como você aparece para os outros alunos.")}</p>

      {/* Chega aqui quem tentou emitir certificado sem nome no cadastro. O nome
          é o que fica impresso, então a emissão para em vez de imprimir e-mail. */}
      {searchParams?.falta === "nome" && (
        <div className="mt-6 flex gap-3 rounded-[20px] border border-amber-400/40 bg-amber-400/[0.08] p-5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-amber-300">
            <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-200">{tr("Preencha seu nome completo para emitir o certificado")}</p>
            <p className="mt-1 text-sm text-slate-300">{tr("É o nome que fica impresso no documento e no seu LinkedIn. Salve abaixo e volte ao curso para emitir.")}</p>
          </div>
        </div>
      )}

      <ProfileForm siteDoPortfolio={siteDoPortfolio} />
      {fiscal && <DadosFiscais {...fiscal} />}
      <div className="lg:max-w-[calc(100%-21.5rem)]">
      <ProfilePreview userId={user.id} email={user.email} />

      {/* Gamificação */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-obsidian">{tr("Minha gamificação")}</h2>
        <p className="mt-1 text-[15px] text-charcoal">{tr("Você ganha pontos participando da comunidade: cada curtida que suas mensagens recebem vale pontos e te faz subir no ranking.")}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[20px] border border-tinta/10 bg-papel p-5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-marca-nevoa"><Icon d={s.d} /></div>
              <p className="mt-4 font-mono text-[2rem] font-medium leading-none tabular-nums tracking-tight text-obsidian">{s.value}</p>
              <p className="mt-1.5 text-sm text-charcoal">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Selos */}
        <div className="mt-3 rounded-[20px] border border-tinta/10 bg-papel p-5">
          <p className="text-sm font-bold text-obsidian">{tr("Meus selos")}</p>
          {myBadges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {myBadges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-marca-nevoa px-3 py-1 text-xs font-semibold text-marca">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 17.7l.9-5.4L4.2 8.5l5.4-.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                  {BADGE_LABELS[b] || b}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{tr("Você ainda não tem selos. O selo Fundador é dado aos alunos da primeira turma.")}</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/conta/comunidade" className="rounded-full bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento transition-[filter] hover:brightness-95">{tr("Ir para a comunidade")}</Link>
          <Link href="/conta/ranking" className="text-sm font-semibold text-marca underline decoration-marca/30 underline-offset-4 hover:decoration-marca">{tr("Ver ranking completo")}</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
