import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { idsDaEquipe, isAdminEmail } from "@/lib/community";

/* O que cada canal tem de novo para quem está olhando.

   Duas contas diferentes, para duas pessoas diferentes:

   - Aluno: mensagens de outras pessoas que chegaram depois da última vez que
     ele abriu aquele canal. É o "você ainda não viu".
   - Equipe: mensagens de alunos que chegaram depois da última fala da equipe
     naquele canal. É o "tem gente esperando resposta", e ele não zera só porque
     alguém da equipe abriu o canal: zera quando alguém da equipe responde.

   Canal que a pessoa nunca abriu conta só os últimos 7 dias, para ninguém
   entrar pela primeira vez e dar de cara com 300 mensagens "não lidas". Se a
   tabela de leitura ainda não existir, tudo volta zerado e nada quebra. */

const JANELA_NOVO_MS = 7 * 864e5;
const JANELA_AGUARDANDO_MS = 14 * 864e5;

export type EstadoCanal = { naoLidas: number; aguardando: number };
export type EstadoComunidade = {
  porCanal: Record<string, EstadoCanal>;
  souEquipe: boolean;
  equipe: string[];
  totalNaoLidas: number;
  totalAguardando: number;
};

const VAZIO: EstadoComunidade = { porCanal: {}, souEquipe: false, equipe: [], totalNaoLidas: 0, totalAguardando: 0 };

export const estadoDaComunidade = cache(async (userId: string, email?: string | null): Promise<EstadoComunidade> => {
  try {
    const admin = createAdminClient();
    const agora = Date.now();
    const [equipeSet, { data: canais }, leituras] = await Promise.all([
      idsDaEquipe(admin),
      admin.from("forum_channels").select("id"),
      admin.from("channel_reads").select("channel_id, last_read_at").eq("user_id", userId),
    ]);
    if (leituras.error) return VAZIO;

    const souEquipe = equipeSet.has(userId) || isAdminEmail(email);
    const lidoAte = new Map<string, number>();
    for (const l of leituras.data ?? []) lidoAte.set((l as any).channel_id, Date.parse((l as any).last_read_at));

    const desde = new Date(agora - Math.max(JANELA_NOVO_MS, souEquipe ? JANELA_AGUARDANDO_MS : 0)).toISOString();
    const { data: msgs } = await admin
      .from("channel_messages")
      .select("channel_id, user_id, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: true })
      .limit(5000);

    const porCanal: Record<string, EstadoCanal> = {};
    for (const c of canais ?? []) porCanal[(c as any).id] = { naoLidas: 0, aguardando: 0 };

    for (const m of (msgs ?? []) as any[]) {
      const e = porCanal[m.channel_id] ?? (porCanal[m.channel_id] = { naoLidas: 0, aguardando: 0 });
      const t = Date.parse(m.created_at);
      if (m.user_id !== userId && t > (lidoAte.get(m.channel_id) ?? agora - JANELA_NOVO_MS)) e.naoLidas++;
      if (souEquipe) {
        // Mensagens chegam em ordem: fala da equipe zera a fila do canal.
        if (equipeSet.has(m.user_id)) e.aguardando = 0;
        else if (t > agora - JANELA_AGUARDANDO_MS) e.aguardando++;
      }
    }

    const lista = Object.values(porCanal);
    return {
      porCanal,
      souEquipe,
      equipe: [...equipeSet],
      totalNaoLidas: lista.reduce((s, e) => s + e.naoLidas, 0),
      totalAguardando: lista.reduce((s, e) => s + e.aguardando, 0),
    };
  } catch {
    return VAZIO;
  }
});

export async function marcarLido(userId: string, channelId: string) {
  try {
    await createAdminClient()
      .from("channel_reads")
      .upsert({ user_id: userId, channel_id: channelId, last_read_at: new Date().toISOString() }, { onConflict: "user_id,channel_id" });
  } catch {
    // Sem tabela ainda: segue sem marcar.
  }
}
