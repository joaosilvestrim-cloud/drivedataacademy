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
  const { data: cert } = await admin
    .from("certificates")
    .select("code, student_name, course_title, workload, created_at, expires_at, revoked")
    .eq("code", params.code)
    .maybeSingle();

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "academy.drivedata.com.br";
  const proto = h.get("x-forwarded-proto") || "https";
  const url = `${proto}://${host}/certificado/${params.code}`;

  if (!cert) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-900 px-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-white">Certificado não encontrado</p>
          <p className="mt-2 text-slate-400">O código <strong>{params.code}</strong> não corresponde a nenhum certificado.</p>
        </div>
      </main>
    );
  }

  const expired = cert.expires_at ? new Date(cert.expires_at) < new Date() : false;
  const valid = !cert.revoked && !expired;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#0b1220", light: "#00000000" } });

  return (
    <main className="min-h-screen bg-ink-900 px-4 py-10">
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } body { background:#fff !important } .no-print{display:none !important} .cert-wrap{padding:0 !important} }`}</style>

      <div className="mx-auto max-w-5xl">
        <div className={`no-print mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${valid ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-red-400/40 bg-red-400/10 text-red-300"}`}>
          <span>{valid ? "✓" : "✕"}</span>
          {valid ? "Certificado válido" : cert.revoked ? "Certificado revogado" : "Certificado expirado"}
        </div>

        <div className="cert-wrap">
          <CertificateView
            studentName={cert.student_name}
            courseTitle={cert.course_title}
            workload={cert.workload}
            dateLabel={fmtDate(cert.created_at)}
            code={cert.code}
            host={host}
            qrSvg={qrSvg}
          />
        </div>

        <CertActions shareUrl={url} courseTitle={cert.course_title} code={cert.code} dateISO={cert.created_at} />
      </div>
    </main>
  );
}
