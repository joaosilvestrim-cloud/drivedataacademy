import { headers } from "next/headers";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import CertActions from "./CertActions";

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

  const expired = cert?.expires_at ? new Date(cert.expires_at) < new Date() : false;
  const valid = !!cert && !cert.revoked && !expired;

  // Página de "não encontrado / inválido"
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

  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#0b1220", light: "#ffffff" } });

  return (
    <main className="min-h-screen bg-ink-900 px-6 py-12">
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } body { background:#fff !important } .no-print{display:none !important} .cert-wrap{padding:0 !important} }`}</style>

      <div className="mx-auto max-w-4xl">
        {/* Selo de validação */}
        <div className={`no-print mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${valid ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-red-400/40 bg-red-400/10 text-red-300"}`}>
          <span>{valid ? "✓" : "✕"}</span>
          {valid ? "Certificado válido" : cert.revoked ? "Certificado revogado" : "Certificado expirado"}
        </div>

        <div className="cert-wrap">
          {/* Certificado (fundo claro, estilo diploma) */}
          <div className="mx-auto overflow-hidden rounded-[1.5rem] bg-white text-slate-800 shadow-2xl">
            <div className="h-2 w-full bg-gradient-to-r from-brand-green to-brand-blue" />
            <div className="px-10 py-12 text-center sm:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Drive Data Academy" className="mx-auto h-10 w-auto" style={{ filter: "brightness(0) invert(0.12)" }} />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Certificado de Conclusão</p>
              <p className="mt-6 text-sm text-slate-500">Certificamos que</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">{cert.student_name}</p>
              <p className="mt-5 text-sm text-slate-500">concluiu com êxito o curso</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-800 sm:text-2xl">{cert.course_title}</p>
              {cert.workload && <p className="mt-3 text-sm text-slate-500">Carga horária: {cert.workload}</p>}
              <p className="mt-1 text-sm text-slate-500">Emitido em {fmtDate(cert.created_at)}</p>

              <div className="mt-10 flex items-end justify-between gap-6 border-t border-slate-200 pt-6">
                <div className="text-left">
                  <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Código de autenticidade</p>
                  <p className="font-mono text-sm font-semibold text-slate-700">{cert.code}</p>
                  <p className="mt-1 text-[0.7rem] text-slate-400">Valide em {host}/certificado/{cert.code}</p>
                </div>
                <div className="shrink-0" aria-label="QR de validação" dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: 84, height: 84 }} />
              </div>
            </div>
          </div>
        </div>

        <CertActions shareUrl={url} />
      </div>
    </main>
  );
}
