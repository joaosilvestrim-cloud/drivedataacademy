import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { prazoDaLive, prazoEncerrado, PRAZO_DIAS } from "@/lib/presenca";
import { PageHeader, EmptyState, TableWrap, Th, Td } from "@/components/ui/layout";
import { Badge } from "@/components/ui/primitives";
import ExportCsv from "../ExportCsv";

export const dynamic = "force-dynamic";

/* Presença nas lives. O QR desta tela é o que vai na transmissão: quem lê cai
   em /presenca, confirma a palavra-chave e recebe o certificado na hora. */

const FUSO = "America/Sao_Paulo";
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: FUSO }).format(new Date(iso));

export default async function PresencasPage({ searchParams }: { searchParams: { live?: string } }) {
  const admin = createAdminClient();
  const { data: lives } = await admin
    .from("live_events")
    .select("id, title, starts_at, duration_min, attendance_code, certificate_hours")
    .eq("certificate_enabled", true)
    .order("starts_at", { ascending: false });

  const lista = lives ?? [];
  const live = lista.find((l) => l.id === searchParams.live) || lista[0];

  if (!live) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Presenças"
          lede="Certificado de participação emitido pelo QR code da live."
        />
        <EmptyState
          title="Nenhuma live com certificado"
          description="Abra uma live em Lives, marque “Emitir certificado de participação” e o QR code aparece aqui."
          action={<Link href="/admin/lives" className="text-ds-info underline decoration-ds-line underline-offset-4">Ir para Lives</Link>}
        />
      </div>
    );
  }

  const { data: presencas } = await admin
    .from("live_attendances")
    .select("created_at, name, email, phone, company, role, goal, certificate_code")
    .eq("live_id", live.id)
    .order("created_at", { ascending: false });

  const rows = presencas ?? [];
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "academy.drivedata.com.br";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const url = `${proto}://${host}/presenca?live=${live.id}`;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b1220", light: "#ffffff" } });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Presenças"
        lede="Quem lê o QR code durante a transmissão preenche o formulário e recebe o certificado na hora."
        action={rows.length > 0 ? <ExportCsv rows={rows} filename={`presencas-${live.id}.csv`} /> : undefined}
      />

      {lista.length > 1 && (
        <nav className="flex flex-wrap gap-2">
          {lista.map((l) => (
            <Link
              key={l.id}
              href={`/admin/presencas?live=${l.id}`}
              className={`rounded-ctl border px-3 py-1.5 text-body-sm transition-colors ${
                l.id === live.id ? "border-ds-accent text-ds-text" : "border-ds-line text-ds-text-2 hover:border-ds-accent"
              }`}
            >
              {l.title}
            </Link>
          ))}
        </nav>
      )}

      <section className="grid gap-6 tablet:grid-cols-[18rem_1fr]">
        <div className="rounded-srf bg-white p-4">
          <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="[&>svg]:h-auto [&>svg]:w-full" />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ds-text">{live.title}</h2>
          <p className="text-body-sm text-ds-text-2">{quando(live.starts_at)}</p>
          <p className="text-body-sm text-ds-text-2">
            Prazo para emitir:{" "}
            {prazoEncerrado(live as any) ? (
              <Badge tone="attention">encerrado</Badge>
            ) : (
              <span className="text-ds-text">até {quando(prazoDaLive(live as any).toISOString())}</span>
            )}{" "}
            <span className="text-ds-text-3">({PRAZO_DIAS} dias corridos depois da transmissão)</span>
          </p>
          <p className="text-body-sm text-ds-text-2">
            Link do formulário:{" "}
            <a href={url} target="_blank" rel="noreferrer" className="text-ds-info underline decoration-ds-line underline-offset-4">
              {url.replace(/^https?:\/\//, "")}
            </a>
          </p>
          <p className="text-body-sm text-ds-text-2">
            Palavra-chave:{" "}
            {live.attendance_code ? (
              <span className="font-mono text-ds-text">{live.attendance_code}</span>
            ) : (
              <Badge tone="attention">sem palavra-chave</Badge>
            )}
          </p>
          <p className="text-body-sm text-ds-text-3">
            Compartilhe esta tela na transmissão e diga a palavra-chave em voz alta. Sem ela, qualquer pessoa com o link emite o certificado.
          </p>
          <p className="text-body-sm text-ds-text-2">
            <span className="font-mono tabular-nums text-ds-text">{rows.length}</span> {rows.length === 1 ? "presença confirmada" : "presenças confirmadas"}.
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState title="Ainda sem presenças" description="Assim que alguém preencher o formulário, aparece aqui." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[54rem] border-collapse text-left">
            <thead>
              <tr>
                <Th>Quando</Th>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                <Th>WhatsApp</Th>
                <Th>Empresa e cargo</Th>
                <Th>Certificado</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p: any) => (
                <tr key={`${p.email}-${p.created_at}`}>
                  <Td className="whitespace-nowrap text-ds-text-3">{quando(p.created_at)}</Td>
                  <Td className="font-medium text-ds-text">{p.name}</Td>
                  <Td>{p.email}</Td>
                  <Td>{p.phone || "—"}</Td>
                  <Td>{[p.company, p.role].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td>
                    {p.certificate_code ? (
                      <a href={`/certificado/${p.certificate_code}`} target="_blank" rel="noreferrer" className="font-mono text-ds-info underline decoration-ds-line underline-offset-4">
                        {p.certificate_code}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}
