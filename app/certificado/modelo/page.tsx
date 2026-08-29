import Link from "next/link";
import CertificateView from "@/components/CertificateView";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Preview do modelo de certificado (dados de exemplo). Útil para conferir o design.
export default async function CertModeloPage({ searchParams }: { searchParams: { curso?: string; carga?: string } }) {
  const courseTitle = searchParams.curso || "Power BI do Zero ao Avançado";
  const workload = searchParams.carga || "8 horas";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  let sigMap: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data: sig } = await admin.from("site_settings").select("key, value").in("key", ["cert_signature_url", "cert_signature_name", "cert_signature_role"]);
    sigMap = Object.fromEntries((sig ?? []).map((r: any) => [r.key, r.value]));
  } catch {
    sigMap = {};
  }

  return (
    <main className="min-h-screen bg-ink-900 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">Modelo de certificado</p>
            <h1 className="font-display text-xl font-bold text-white">Pré-visualização</h1>
            <p className="mt-1 text-sm text-slate-400">Exemplo com dados fictícios. O certificado real usa o nome do aluno e o título do curso.</p>
          </div>
          <Link href="/admin/cursos" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-brand-green/50 hover:text-brand-green">← Cursos</Link>
        </div>

        <CertificateView
          studentName="Maria Oliveira Santos"
          courseTitle={courseTitle}
          workload={workload}
          dateLabel={dateLabel}
          code="DDA-EXEMPLO"
          host="academy.drivedata.com.br"
          qrSvg={null}
          signatureUrl={sigMap.cert_signature_url || null}
          signatureName={sigMap.cert_signature_name || null}
          signatureRole={sigMap.cert_signature_role || null}
        />
      </div>
    </main>
  );
}
