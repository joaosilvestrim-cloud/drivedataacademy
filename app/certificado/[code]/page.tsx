import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import CertActions from "./CertActions";
import CertificateView from "@/components/CertificateView";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}

export default async function CertificatePage({ params }: { params: { code: string } }) {
  const admin = createAdminClient();
  const [{ data: cert }, { data: sig }] = await Promise.all([
    admin
      .from("certificates")
      .select("code, student_name, course_title, workload, created_at, expires_at, revoked, kind, signature_name, signature_role, signature_url")
      .eq("code", params.code)
      .maybeSingle(),
    admin.from("site_settings").select("key, value").like("key", "cert_signature%"),
  ]);
  const sigMap = Object.fromEntries((sig ?? []).map((r: any) => [r.key, r.value]));

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "academy.drivedata.com.br";
  const proto = h.get("x-forwarded-proto") || "https";
  const url = `${proto}://${host}/certificado/${params.code}`;

  if (!cert) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-900 px-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-white">{tr("Certificado não encontrado")}</p>
          <p className="mt-2 text-slate-400">{tr("O código")} <strong>{params.code}</strong> {tr("não corresponde a nenhum certificado.")}</p>
        </div>
      </main>
    );
  }

  /* Os dois sócios assinam todo certificado. Ficam em site_settings porque é
     assinatura da escola, não do instrutor da turma. */
  const assinaturas = [
    { nome: sigMap.cert_signature_name, cargo: sigMap.cert_signature_role, url: sigMap.cert_signature_url },
    { nome: sigMap.cert_signature2_name, cargo: sigMap.cert_signature2_role, url: sigMap.cert_signature2_url },
  ].filter((a) => a.nome);

  const expired = cert.expires_at ? new Date(cert.expires_at) < new Date() : false;
  const valid = !cert.revoked && !expired;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 2, color: { dark: "#0b1220", light: "#ffffff" } });

  return (
    <main className="certificate-page min-h-screen bg-ink-900 px-4 py-10">

      <div className="certificate-page-inner mx-auto max-w-6xl">
        {/* Quem chega pelo e-mail ou pelo QR precisa de porta de saída. */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/conta/certificados" className="text-sm text-slate-400 transition-colors hover:text-white">
            {tr("← Voltar para a plataforma")}
          </Link>
          <div className={`flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${valid ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-red-400/40 bg-red-400/10 text-red-300"}`}>
            <span>{valid ? "✓" : "✕"}</span>
            {valid ? tr("Certificado válido") : cert.revoked ? "Certificado revogado" : "Certificado expirado"}
          </div>
        </div>

        <div className="cert-wrap">
          <CertificateView
            studentName={cert.student_name}
            courseTitle={cert.course_title}
            workload={cert.workload}
            headline={cert.kind === "live" ? tr("Certificado de Participação") : undefined}
            assinaturas={assinaturas}
            achievementLabel={cert.kind === "live" ? tr("participou da transmissão ao vivo") : undefined}
            dateLabel={fmtDate(cert.created_at)}
            code={cert.code}
            host={host}
            qrSvg={qrSvg}
            verificationUrl={url}
            status={cert.revoked ? "revoked" : expired ? "expired" : "valid"}
          />
        </div>
        <p className="no-print mt-3 text-center text-xs text-slate-400 sm:hidden">{tr("Deslize para os lados para ver o certificado completo.")}</p>

        <CertActions shareUrl={url} courseTitle={cert.course_title} code={cert.code} dateISO={cert.created_at} />
      </div>
    </main>
  );
}
