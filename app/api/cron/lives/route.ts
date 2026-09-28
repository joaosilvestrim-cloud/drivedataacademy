import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cobrarLivesSemAviso, enviarAvisosPendentes } from "@/lib/avisos-live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* Disparo automático dos avisos de live.

   Dois agendadores chamam esta rota, de propósito. O principal é o GitHub
   Actions, de 15 em 15 minutos, que é o único capaz de pegar a janela de 30
   minutos. O segundo é o cron da Vercel, uma vez por dia, em vercel.json: o
   plano Hobby não aceita mais que isso, e ele não salva o lembrete de 30
   minutos, mas garante que o de 24h saia mesmo se o GitHub parar. O GitHub
   desliga sozinho os agendamentos de repositório parado há 60 dias, e esse é
   o modo de falha silencioso que a redundância cobre.

   Pode rodar com qualquer frequência: quem decide o que sai é a tabela
   live_avisos, não a hora da chamada. Rodar duas vezes seguidas não manda
   nada duas vezes, e rodar atrasado manda o aviso atrasado em vez de pular a
   live.

   O segredo é obrigatório e não tem valor padrão. Rota de disparo em massa sem
   autenticação é um botão de spam aberto na internet: qualquer um que
   descobrisse o caminho mandaria o link da sala para toda a base, quantas
   vezes quisesse. Sem CRON_SECRET configurado, a rota responde 503 e não faz
   nada. */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }

  /* Aceita os dois formatos: o header Authorization que a Vercel manda nos
     próprios crons, e o header simples, para um agendador externo. */
  const auth = req.headers.get("authorization") || "";
  const alternativo = req.headers.get("x-cron-secret") || "";
  if (auth !== `Bearer ${segredo}` && alternativo !== segredo) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const feitos = await enviarAvisosPendentes(admin);
    // Live publicada sem link nao avisa ninguem. O time precisa saber antes.
    const semLink = await cobrarLivesSemAviso(admin);
    return NextResponse.json({ ok: true, avisos: feitos, livesSemLink: semLink });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "falhou" }, { status: 500 });
  }
}
