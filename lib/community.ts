import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasFullAccess } from "@/lib/access";

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.toLowerCase());
}

/* Quem pode usar a comunidade e o resto do conteúdo da plataforma.

   A regra é uma só: assinatura ativa. Antes qualquer matrícula abria a porta,
   e isso vinha da época em que existia curso gratuito com matrícula aberta.
   Com todo o conteúdo dentro da assinatura, essa porta virou um furo.

   Sobram duas exceções, as duas deliberadas:
   - e-mail de administrador, que precisa entrar para operar;
   - matrícula de origem deliberada: cortesia do time, compra avulsa ou turma.

   A regra é por exclusão e não por lista: só a origem "free" deixou de valer,
   que era a do cadastro aberto. Assim uma origem nova amanhã não nasce
   bloqueada sem ninguém perceber. */
export async function canUseCommunity(admin: SupabaseClient, userId: string, email?: string | null): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  if (await hasFullAccess(admin, userId)) return true;
  const { data } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .neq("source", "free")
    .limit(1);
  return !!data?.length;
}

// Badge do selo por nome (para exibição).
export const BADGE_LABELS: Record<string, string> = {
  fundador: "Fundador",
  top: "Top do ranking",
  fundadora: "Fundadora da Academy",
  fundador_casa: "Fundador da Academy",
};

/* Selo da casa: quem criou a Academy e responde por ela.

   Não confundir com o selo "fundador", que é do aluno da turma fundadora e sai
   sozinho em toda compra de acesso full. Estes dois são nominais, entram na mão
   e valem para duas pessoas: Tamires Cavani e Reed Lopes. Na comunidade eles
   trocam a moldura do avatar, acima de qualquer medalha de ranking. */
export const SELOS_DA_CASA: Record<string, string> = {
  fundadora: "Fundadora",
  fundador_casa: "Fundador",
  // Conta institucional da Academy (admin@drivedata.com.br). Moldura própria,
  // azul com escudo, para ninguém confundir a voz oficial com a de um aluno.
  oficial: "Oficial",
};

/** O selo "Oficial" usa moldura e cor próprias; os de fundação usam o dourado. */
export const SELO_OFICIAL = "Oficial";

export function seloDaCasa(badges?: string[]): string | null {
  for (const b of badges ?? []) if (SELOS_DA_CASA[b]) return SELOS_DA_CASA[b];
  return null;
}

// Nomes (sem e-mail, por privacidade) e badges de um conjunto de alunos.
export async function loadProfiles(admin: SupabaseClient, ids: string[]) {
  const uniq = Array.from(new Set(ids)).filter(Boolean);
  const nameById: Record<string, string> = {};
  const badgeById: Record<string, string[]> = {};
  const avatarById: Record<string, string> = {};
  if (uniq.length === 0) return { nameById, badgeById, avatarById };
  const [{ data: profs }, { data: badges }] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_url").in("id", uniq),
    admin.from("user_badges").select("user_id, badge").in("user_id", uniq),
  ]);
  for (const p of profs ?? []) {
    nameById[p.id] = (p.full_name || "").trim();
    if (p.avatar_url) avatarById[p.id] = p.avatar_url;
  }
  for (const b of badges ?? []) (badgeById[b.user_id] ||= []).push(b.badge);
  return { nameById, badgeById, avatarById };
}

export function displayName(nameById: Record<string, string>, id: string): string {
  return nameById[id] || "Aluno";
}

// Pontos totais por usuário: eventos (solução = 10) + curtidas no chat (2 por curtida de outra pessoa).
/* Quem é da equipe e por isso não disputa ranking.

   Ranking é prêmio de aluno. Fundadora, fundadores, a conta oficial e qualquer
   pessoa com e-mail da DriveData (ou na lista de administradores) continuam
   usando a comunidade normalmente, com moldura própria, mas não somam pontos,
   não ganham medalha e não ocupam posição de aluno.

   A lista muda raramente, então fica guardada por 5 minutos na memória do
   servidor em vez de custar uma varredura de usuários a cada leitura. */
const DOMINIO_DA_EQUIPE = "@drivedata.com.br";
let equipeMemo: { ids: Set<string>; em: number } | null = null;

export function ehEmailDaEquipe(email?: string | null): boolean {
  const e = (email || "").trim().toLowerCase();
  return !!e && (e.endsWith(DOMINIO_DA_EQUIPE) || isAdminEmail(e));
}

export async function idsDaEquipe(admin: SupabaseClient): Promise<Set<string>> {
  if (equipeMemo && Date.now() - equipeMemo.em < 5 * 60_000) return equipeMemo.ids;
  const ids = new Set<string>();
  const { data: selos } = await admin.from("user_badges").select("user_id").in("badge", Object.keys(SELOS_DA_CASA));
  for (const s of selos ?? []) ids.add((s as any).user_id);
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) if (ehEmailDaEquipe(u.email)) ids.add(u.id);
    if (users.length < 1000) break;
  }
  equipeMemo = { ids, em: Date.now() };
  return ids;
}

/** Pontos de quem disputa o ranking: só alunos. A equipe fica de fora. */
export async function pointsByUser(admin: SupabaseClient): Promise<Record<string, number>> {
  const [totais, equipe] = await Promise.all([pontosDeTodos(admin), idsDaEquipe(admin)]);
  for (const id of equipe) delete totais[id];
  return totais;
}

async function pontosDeTodos(admin: SupabaseClient): Promise<Record<string, number>> {
  // Caminho rápido: função agregada no banco (1 chamada). Se ainda não existir, cai no cálculo em JS.
  const rpc = await admin.rpc("points_by_user");
  if (!rpc.error && Array.isArray(rpc.data)) {
    const t: Record<string, number> = {};
    for (const r of rpc.data as any[]) t[r.user_id] = Number(r.points) || 0;
    return t;
  }

  const [{ data: events }, { data: reacts }, { data: msgs }] = await Promise.all([
    admin.from("point_events").select("user_id, points"),
    admin.from("message_reactions").select("message_id, user_id"),
    admin.from("channel_messages").select("id, user_id, created_at"),
  ]);
  const totals: Record<string, number> = {};
  for (const e of events ?? []) totals[e.user_id] = (totals[e.user_id] || 0) + (e.points || 0);
  const author: Record<string, string> = {};
  for (const m of msgs ?? []) author[m.id] = m.user_id;
  for (const r of reacts ?? []) {
    const a = author[r.message_id];
    if (a && a !== r.user_id) totals[a] = (totals[a] || 0) + 2;
  }
  // Pontos por participar (comentar) na comunidade, com teto diário para evitar spam.
  const MSG_POINT = 1, MSG_CAP = 5;
  const perDay: Record<string, number> = {};
  for (const m of msgs ?? []) {
    const day = (m.created_at || "").slice(0, 10);
    perDay[`${m.user_id}|${day}`] = (perDay[`${m.user_id}|${day}`] || 0) + 1;
  }
  for (const [key, cnt] of Object.entries(perDay)) {
    const uid = key.split("|")[0];
    totals[uid] = (totals[uid] || 0) + Math.min(cnt, MSG_CAP) * MSG_POINT;
  }
  return totals;
}
