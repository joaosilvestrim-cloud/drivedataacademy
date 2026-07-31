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

  const Rings = ({ className }: { className: string }) => (
    <svg className={className} width="360" height="360" viewBox="0 0 360 360" fill="none" aria-hidden>
      {[70, 120, 170, 220].map((r) => (
        <circle key={r} cx="180" cy="180" r={r} stroke="#22c9a3" strokeOpacity="0.16" strokeWidth="2" />
      ))}
    </svg>
  );

  return (
    <main className="min-h-screen bg-ink-900 px-4 py-10">
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } body { background:#fff !important } .no-print{display:none !important} .cert-wrap{padding:0 !important} }`}</style>

      <div className="mx-auto max-w-5xl">
        <div className={`no-print mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${valid ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-red-400/40 bg-red-400/10 text-red-300"}`}>
          <span>{valid ? "✓" : "✕"}</span>
          {valid ? "Certificado válido" : cert.revoked ? "Certificado revogado" : "Certificado expirado"}
        </div>

        <div className="cert-wrap">
          <div
            className="relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-white to-[#eef4fb] text-slate-700 shadow-2xl"
            style={{ containerType: "inline-size" }}
          >
            {/* Molduras */}
            <div className="absolute inset-y-0 left-0 w-[1.6%] bg-gradient-to-b from-brand-blue via-brand-teal to-brand-green" />
            <div className="absolute inset-x-0 top-0 h-[0.6%] bg-gradient-to-r from-brand-blue via-brand-teal to-brand-green" />
            <div className="absolute inset-y-0 right-0 w-[0.6%] bg-gradient-to-b from-brand-blue via-brand-teal to-brand-green" />
            <Rings className="pointer-events-none absolute -right-24 -top-24" />
            <Rings className="pointer-events-none absolute -bottom-28 -left-24" />

            {/* Conteúdo */}
            <div className="relative flex h-full flex-col items-center px-[7%] py-[3.5%] text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cert-logo.png" alt="DriveData Academy" className="h-[15%] w-auto" />
              <p className="mt-[1.2%] text-[2.1cqw] font-bold uppercase tracking-[0.25em] text-brand-teal">Certificado de Conclusão</p>
              <p className="mt-[1.6%] text-[1.9cqw] text-slate-400">Certificamos que</p>

              <div className="mt-[1%] flex min-h-[9%] w-full items-center justify-center rounded-2xl border-2 border-brand-green/40 bg-brand-green/[0.06] px-4">
                <p className="font-display text-[5cqw] font-extrabold leading-tight text-slate-900">{cert.student_name}</p>
              </div>

              <p className="mt-[2%] text-[1.9cqw] text-slate-400">concluiu com êxito o curso</p>
              <div className="mt-[1%] flex min-h-[7%] w-full items-center justify-center rounded-2xl border-2 border-brand-blue/40 bg-brand-blue/[0.06] px-4">
                <p className="font-display text-[3.4cqw] font-bold text-slate-900">{cert.course_title}</p>
              </div>

              <div className="mt-[1.8%] text-[1.8cqw] leading-relaxed text-slate-500">
                {cert.workload && <p>Carga horária: {cert.workload}</p>}
                <p>Emitido em {fmtDate(cert.created_at)}</p>
              </div>

              <div className="mt-auto w-full border-t border-slate-200 pt-[2%]">
                <div className="grid grid-cols-3 items-end gap-4">
                  <div className="text-left">
                    <p className="text-[1.2cqw] font-semibold uppercase tracking-wide text-slate-400">Código de autenticidade</p>
                    <p className="font-mono text-[1.9cqw] font-bold text-slate-800">{cert.code}</p>
                    <p className="mt-1 text-[1.1cqw] text-slate-400">{host}/certificado/{cert.code}</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto mb-1 w-2/3 border-t border-slate-400" />
                    <p className="text-[1.4cqw] text-slate-500">Assinatura do Responsável</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="h-[15cqw] w-[15cqw] max-h-[120px] max-w-[120px]" aria-label="QR de validação" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    <p className="mt-1 text-[1.2cqw] text-slate-400">Validar certificado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CertActions shareUrl={url} />
      </div>
    </main>
  );
}
