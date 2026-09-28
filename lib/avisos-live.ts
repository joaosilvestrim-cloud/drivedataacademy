import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendHtmlEmail, sendLiveReminderEmail } from "@/lib/email";
import { avisarTime } from "@/lib/notificacoes";

/* Aviso automático das lives para quem tem assinatura ativa.

   O problema que resolve: o link da sala do Teams existia no banco desde
   setembro, visível para o aluno em Minha agenda, e mesmo assim as lives
   começavam com meia dúzia de pessoas. Quem não abre a plataforma naquele dia
   não fica sabendo. Nenhuma ferramenta de campanha serve aqui, porque no Teams
   o link É a credencial: a senha da sala viaja dentro dele, em `p=`. Mandar
   isso por uma lista de marketing entrega a sala para lead que nunca pagou.

   Por isso o envio é daqui, com a lista de assinantes montada no momento do
   disparo, e nunca a partir do campo público `url`.

   Duas janelas, que é o que basta: uma no dia anterior, para a pessoa reservar
   a agenda, e uma perto da hora, para ela lembrar. */

/* Tres lembretes dentro das 24 horas que antecedem a aula, cada um com um
   trabalho diferente:

   - 24h, na vespera, para a pessoa reservar a agenda;
   - 3h, no fim da tarde do dia, quando ela ainda consegue reorganizar a noite;
   - 30min, para abrir o link.

   Mais que isso vira spam e ensina o aluno a ignorar o remetente, que e o
   custo escondido de lembrete demais. */
export const JANELAS = [
  { chave: "24h" as const, minutos: 24 * 60, rotulo: "1 dia antes" },
  { chave: "3h" as const, minutos: 3 * 60, rotulo: "3 horas antes" },
  { chave: "30min" as const, minutos: 30, rotulo: "30 minutos antes" },
];

export type Janela = (typeof JANELAS)[number]["chave"];

function quando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/* Quem recebe: assinatura ativa e não vencida, lida agora.

   A lista não é guardada. Quem cancelou ontem não recebe o link hoje, e quem
   assinou hoje de manhã recebe o da live desta noite. */
async function assinantes(admin: SupabaseClient): Promise<{ email: string; nome: string }[]> {
  const { data: ativas } = await admin.from("memberships").select("user_id, expires_at").eq("status", "active");
  const agora = Date.now();
  const ids = new Set(
    (ativas ?? []).filter((m: any) => !m.expires_at || new Date(m.expires_at).getTime() > agora).map((m: any) => m.user_id),
  );
  if (!ids.size) return [];

  const { data: perfis } = await admin.from("profiles").select("id, full_name").in("id", [...ids]);
  const nomes = new Map((perfis ?? []).map((p: any) => [p.id, p.full_name || ""]));

  const lista: { email: string; nome: string }[] = [];
  for (let page = 1; page < 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !ids.has(u.id)) continue;
      lista.push({ email: u.email, nome: nomes.get(u.id) || (u.user_metadata as any)?.full_name || "" });
    }
    if (!data || data.users.length < 1000) break;
  }
  return lista;
}

export type Resultado = { live: string; janela: Janela; enviados: number; falhas: number };

/* Manda o que está vencido e ainda não foi mandado.

   Roda com qualquer frequência. O que decide não é a hora da execução e sim o
   registro em live_avisos: enquanto a linha daquela janela não existir, o
   aviso está pendente; assim que existir, nunca mais sai. Um agendador que
   falhou de madrugada e só rodou de manhã manda o aviso atrasado, em vez de
   pular a live. */
export async function enviarAvisosPendentes(
  admin: SupabaseClient,
  opcoes: { liveId?: string; janela?: Janela; repetir?: boolean } = {},
): Promise<Resultado[]> {
  const agora = Date.now();
  let q = admin
    .from("live_events")
    .select("id, title, description, starts_at, url_alunos, acesso_alunos, cover_url, published")
    .eq("published", true)
    .not("url_alunos", "is", null)
    .gte("starts_at", new Date(agora - 30 * 60000).toISOString());
  if (opcoes.liveId) q = q.eq("id", opcoes.liveId);
  const { data: lives } = await q;

  const feitos: Resultado[] = [];
  let lista: { email: string; nome: string }[] | null = null;

  for (const live of lives ?? []) {
    const faltam = (new Date(live.starts_at).getTime() - agora) / 60000;

    for (const j of JANELAS) {
      if (opcoes.janela && opcoes.janela !== j.chave) continue;
      // Ainda longe demais: a janela deste aviso não abriu.
      if (!opcoes.liveId && faltam > j.minutos) continue;

      /* A linha entra ANTES do envio, como reserva. Se duas execuções se
         cruzarem, a segunda bate na chave primária e desiste, em vez de
         mandar o mesmo e-mail duas vezes para a base inteira. */
      if (opcoes.repetir) {
        await admin.from("live_avisos").upsert({ live_id: live.id, janela: j.chave }, { onConflict: "live_id,janela" });
      } else {
        const { error } = await admin.from("live_avisos").insert({ live_id: live.id, janela: j.chave });
        if (error) continue; // já existe, ou seja: já foi
      }

      if (!lista) lista = await assinantes(admin);
      let enviados = 0;
      let falhas = 0;
      for (const p of lista) {
        const r = await sendLiveReminderEmail(
          p.email,
          p.nome,
          {
            title: live.title,
            quando: quando(live.starts_at),
            url: live.url_alunos!,
            acesso: live.acesso_alunos,
            descricao: live.description,
            capa: live.cover_url,
          },
          j.chave,
        );
        if (r.sent) enviados++;
        else falhas++;
      }

      await admin
        .from("live_avisos")
        .update({ enviado_em: new Date().toISOString(), destinatarios: enviados, falhas })
        .eq("live_id", live.id)
        .eq("janela", j.chave);

      feitos.push({ live: live.title, janela: j.chave, enviados, falhas });
    }
  }
  return feitos;
}

/* Vigia: live perto de comecar e ninguem avisado.

   O automatico so manda quando ha link da sala. Live publicada sem link nao
   avisa ninguem, e ate aqui isso era silencioso: descobria-se com a sala
   vazia. Duas das proximas lives estao exatamente nesse estado.

   Roda junto com o disparo e cobra uma vez so por live, usando a mesma tabela
   como memoria. A janela e de 3 horas porque abaixo disso nao da tempo de
   fazer nada a respeito. */
export async function cobrarLivesSemAviso(admin: SupabaseClient): Promise<string[]> {
  const agora = Date.now();
  const { data: lives } = await admin
    .from("live_events")
    .select("id, title, starts_at, url_alunos")
    .eq("published", true)
    .gte("starts_at", new Date(agora).toISOString())
    .lte("starts_at", new Date(agora + 3 * 3600_000).toISOString());

  const cobradas: string[] = [];
  for (const live of lives ?? []) {
    if (String(live.url_alunos || "").trim()) continue;

    // A mesma reserva do envio: se a linha entrou, a cobranca ja saiu.
    const { error } = await admin.from("live_avisos").insert({ live_id: live.id, janela: "sem-link" });
    if (error) continue;

    const quandoTexto = quando(live.starts_at);
    await avisarTime("live_sem_aviso", (para) =>
      sendHtmlEmail(
        para,
        `Live sem link: ${live.title}`,
        `<p style="font-family:Arial">A live <b>${live.title}</b> comeca em ${quandoTexto} e esta publicada <b>sem link da sala</b>.</p>
         <p style="font-family:Arial">Nenhum aluno foi avisado, porque o aviso existe para entregar a sala. Cadastre o link em Admin &gt; Lives, no bloco "Encontro fechado", e use o botao "Enviar agora".</p>`,
      ),
    );
    await admin.from("live_avisos").update({ enviado_em: new Date().toISOString(), destinatarios: 0 }).eq("live_id", live.id).eq("janela", "sem-link");
    cobradas.push(live.title);
  }
  return cobradas;
}
