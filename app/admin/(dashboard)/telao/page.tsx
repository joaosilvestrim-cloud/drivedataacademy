import Link from "next/link";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/* Telão da live: os dois QR codes lado a lado, para compartilhar tela.

   É a única tela do admin feita para ser projetada, não operada. Por isso o
   texto é grande, o fundo é chapado e não existe nada clicável no meio: quem
   está olhando está a três metros de distância, no YouTube.

   Os dois códigos respondem a perguntas diferentes e por isso ficam juntos:
   um dá o certificado de quem assistiu, o outro dá a ferramenta para quem
   quer experimentar. Numa live as duas coisas são ditas no mesmo minuto. */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

async function qr(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#04140d", light: "#ffffff" } });
}

export default async function TelaoPage({ searchParams }: { searchParams: { live?: string; demo?: string } }) {
  const admin = createAdminClient();

  const [{ data: lives }, { data: campanhas }] = await Promise.all([
    admin.from("live_events").select("id, title, starts_at, attendance_code, certificate_enabled")
      .eq("certificate_enabled", true).order("starts_at", { ascending: false }).limit(12),
    admin.from("demo_invites").select("id, slug, titulo, palavra, dias, ativo")
      .eq("ativo", true).order("created_at", { ascending: false }).limit(12),
  ]);

  const live = (lives ?? []).find((l) => l.id === searchParams.live) ?? (lives ?? [])[0] ?? null;
  const demo = (campanhas ?? []).find((c) => c.slug === searchParams.demo) ?? (campanhas ?? [])[0] ?? null;

  const [qrLive, qrDemo, inscritos] = await Promise.all([
    live ? qr(`${SITE}/presenca?live=${live.id}`) : Promise.resolve(""),
    demo ? qr(`${SITE}/demo/${demo.slug}`) : Promise.resolve(""),
    demo
      ? admin.from("demo_signups").select("id", { count: "exact", head: true }).eq("invite_id", demo.id).then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);

  const presentes = live
    ? await admin.from("live_attendances").select("id", { count: "exact", head: true }).eq("live_id", live.id).then((r) => r.count ?? 0)
    : 0;

  if (!live && !demo) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Telão da live</h1>
        <p className="mt-3 text-sm text-slate-400">
          Ainda não há live com certificado nem campanha de demonstração. Crie em{" "}
          <Link href="/admin/lives" className="text-brand-green underline underline-offset-4">Lives</Link> ou em{" "}
          <Link href="/admin/acessos" className="text-brand-green underline underline-offset-4">Acessos</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Barra de controle: some na projeção porque fica acima da dobra. */}
      <div className="mb-8 flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="font-display text-xl font-bold text-white">Telão da live</h1>
        <p className="text-xs text-slate-500">Compartilhe esta tela na transmissão. Os números atualizam ao recarregar.</p>
      </div>

      {(lives ?? []).length > 1 || (campanhas ?? []).length > 1 ? (
        <div className="mb-8 flex flex-wrap gap-4 text-xs print:hidden">
          {(lives ?? []).length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Live:</span>
              {(lives ?? []).map((l) => (
                <Link key={l.id} href={`/admin/telao?live=${l.id}&demo=${demo?.slug ?? ""}`}
                  className={`rounded-lg px-2.5 py-1 ${l.id === live?.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>
                  {l.title.slice(0, 26)}
                </Link>
              ))}
            </div>
          )}
          {(campanhas ?? []).length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Demo:</span>
              {(campanhas ?? []).map((c) => (
                <Link key={c.slug} href={`/admin/telao?live=${live?.id ?? ""}&demo=${c.slug}`}
                  className={`rounded-lg px-2.5 py-1 ${c.slug === demo?.slug ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>
                  {c.titulo.slice(0, 26)}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        {live && (
          <Cartao
            eyebrow="Assistiu até aqui?"
            titulo="Seu certificado"
            svg={qrLive}
            palavra={live.attendance_code}
            rotuloPalavra="Palavra-chave"
            rodape={`${presentes} ${presentes === 1 ? "pessoa já pegou" : "pessoas já pegaram"}`}
            url={`${SITE}/presenca`}
          />
        )}
        {demo && (
          <Cartao
            eyebrow={`${demo.dias} dias grátis`}
            titulo="DriveCanvas"
            svg={qrDemo}
            palavra={demo.palavra}
            rotuloPalavra="Palavra-chave"
            rodape={`${inscritos} ${inscritos === 1 ? "pessoa já liberou" : "pessoas já liberaram"}`}
            url={`${SITE}/demo/${demo.slug}`}
          />
        )}
      </div>

      {live && !live.attendance_code && (
        <p className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 print:hidden">
          Esta live está sem palavra-chave. Qualquer pessoa com o link emite o certificado sem ter assistido.{" "}
          <Link href="/admin/lives" className="underline underline-offset-4">Defina em Lives</Link>.
        </p>
      )}
    </div>
  );
}

/* Um cartão por QR. Branco de propósito: QR code em fundo escuro falha em
   leitor de celular com brilho baixo, que é o caso de quem assiste à noite. */
function Cartao({
  eyebrow, titulo, svg, palavra, rotuloPalavra, rodape, url,
}: {
  eyebrow: string; titulo: string; svg: string;
  palavra: string | null; rotuloPalavra: string; rodape: string; url: string;
}) {
  return (
    <section className="rounded-3xl bg-white p-8 text-ink-900">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1 font-display text-4xl font-bold leading-none">{titulo}</h2>

      <div className="mx-auto mt-6 w-full max-w-[300px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />

      {palavra && (
        <div className="mt-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{rotuloPalavra}</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.18em] text-ink-900">{palavra}</p>
        </div>
      )}

      <p className="mt-6 text-center font-mono text-xs text-slate-500">{url.replace(/^https?:\/\//, "")}</p>
      <p className="mt-1 text-center text-sm font-medium text-emerald-700">{rodape}</p>
    </section>
  );
}
