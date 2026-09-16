// Cartão visual do certificado (usado na página pública e no preview do admin).
function Rings({ className }: { className: string }) {
  return (
    <svg className={className} width="360" height="360" viewBox="0 0 360 360" fill="none" aria-hidden>
      {[70, 120, 170, 220].map((r) => (
        <circle key={r} cx="180" cy="180" r={r} stroke="#22c9a3" strokeOpacity="0.16" strokeWidth="2" />
      ))}
    </svg>
  );
}

export default function CertificateView({
  studentName,
  courseTitle,
  workload,
  dateLabel,
  code,
  host,
  qrSvg,
  assinaturas = [],
  headline = "Certificado de Conclusão",
  achievementLabel = "concluiu com êxito o curso",
}: {
  studentName: string;
  courseTitle: string;
  headline?: string;
  achievementLabel?: string;
  workload?: string | null;
  dateLabel: string;
  code: string;
  host: string;
  qrSvg?: string | null;
  /* Quem assina. A Academy tem dois sócios, e os dois assinam todo
     certificado, então isto é uma lista e não um responsável só. */
  assinaturas?: { url?: string | null; nome: string; cargo?: string | null }[];
}) {
  return (
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
      <div className="relative flex h-full flex-col items-center px-[7%] py-[5%] text-center">
        {/* A marca precisa de ar em volta: encostada no título ela some dentro do
            bloco e o "ACADEMY" parece colado na linha de baixo. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cert-logo.png" alt="DriveData Academy" className="h-[13%] w-auto" />
        <p className="mt-[3.4%] text-[2.1cqw] font-bold uppercase tracking-[0.25em] text-brand-teal">{headline}</p>
        <p className="mt-[2.4%] text-[1.9cqw] text-slate-400">Certificamos que</p>

        <div className="mt-[1%] flex min-h-[9%] w-full items-center justify-center rounded-2xl border-2 border-brand-green/40 bg-brand-green/[0.06] px-4">
          <p className="font-display text-[5cqw] font-extrabold leading-tight text-slate-900">{studentName}</p>
        </div>

        <p className="mt-[2%] text-[1.9cqw] text-slate-400">{achievementLabel}</p>
        <div className="mt-[1%] flex min-h-[7%] w-full items-center justify-center rounded-2xl border-2 border-brand-blue/40 bg-brand-blue/[0.06] px-4">
          <p className="font-display text-[3.4cqw] font-bold text-slate-900">{courseTitle}</p>
        </div>

        <div className="mt-[1.8%] text-[1.8cqw] leading-relaxed text-slate-500">
          {workload && <p>Carga horária: {workload}</p>}
          <p>Emitido em {dateLabel}</p>
        </div>

        <div className="mt-auto w-full border-t border-slate-200 pt-[2%]">
          {/* A faixa do meio ganha mais espaço porque agora são duas assinaturas. */}
          <div className="grid grid-cols-[1fr_1.6fr_auto] items-end gap-4">
            <div className="text-left">
              <p className="text-[1.2cqw] font-semibold uppercase tracking-wide text-slate-400">Código de autenticidade</p>
              <p className="font-mono text-[1.9cqw] font-bold text-slate-800">{code}</p>
              <p className="mt-1 text-[1.1cqw] text-slate-400">{host}/certificado/{code}</p>
            </div>
            <div className={`grid gap-4 ${assinaturas.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {(assinaturas.length ? assinaturas : [{ nome: "", cargo: null, url: null }]).map((a, i) => (
                <div key={a.nome || i} className="text-center">
                  {a.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={`Assinatura de ${a.nome}`} className="mx-auto mb-1 h-[7cqw] max-h-[56px] w-auto object-contain" />
                  )}
                  <div className="mx-auto mb-1 w-4/5 border-t border-slate-400" />
                  <p className="text-[1.4cqw] font-semibold text-slate-700">{a.nome || "Assinatura do Responsável"}</p>
                  {a.nome && a.cargo && <p className="text-[1.05cqw] leading-tight text-slate-500">{a.cargo}</p>}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end">
              {qrSvg ? (
                <div className="h-[15cqw] w-[15cqw] max-h-[120px] max-w-[120px]" aria-label="QR de validação" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              ) : (
                <div className="grid h-[15cqw] max-h-[120px] w-[15cqw] max-w-[120px] place-items-center rounded bg-slate-100 text-[1.1cqw] text-slate-400">QR</div>
              )}
              <p className="mt-1 text-[1.2cqw] text-slate-400">Validar certificado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
