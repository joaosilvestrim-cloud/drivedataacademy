import { tr } from "@/lib/i18n/traduzir-servidor";
import type { CSSProperties } from "react";
import styles from "./certificate.module.css";

function TechFrame() {
  return <svg className={styles.frame} viewBox="0 0 842 595" fill="none" aria-hidden="true">
    <defs><pattern id="certificate-grid" width="19" height="19" patternUnits="userSpaceOnUse"><path d="M19 0H0V19" stroke="#153246" strokeWidth=".55" /></pattern></defs>
    <path fill="url(#certificate-grid)" d="M560 0h282v448H560z" />
    <path d="M23 572h776l20-20V23H43L23 43z" stroke="#244052" />
    <path d="M23 75V43l20-20h67" stroke="#30d9f0" strokeWidth="1.8" />
    <path d="M819 499v53l-20 20h-73" stroke="#56ecc0" strokeWidth="1.8" />
    <path d="M51 101h738" stroke="#234354" /><path d="M51 101h124" stroke="#56ecc0" strokeWidth="2" />
    <path d="M659 164h106v114l-18 18H641V182z" stroke="#2a5a70" />
    <path d="M650 155h124v132l-18 18H632V173z" stroke="#123247" />
    {[0,1,2,3,4].map(i=><g key={i}><path d={`M776 ${268-i*17}h11l15-15h40`} stroke="#1c6277" strokeWidth=".7"/><circle cx="777" cy={268-i*17} r="1.8" fill={i===2?"#30d9f0":"#22556d"}/></g>)}
    {[0,1,2,3].map(i=><path key={i} d={`M${668+i*20} 150V${126-i*6}l20-20`} stroke="#1e455b" strokeWidth=".6"/>)}
    <path d="M623 314l25 25h136" stroke="#295469" />
  </svg>;
}

export type CertificateViewProps = {
  studentName: string;
  courseTitle: string;
  headline?: string;
  achievementLabel?: string;
  workload?: string | null;
  dateLabel: string;
  code: string;
  host: string;
  qrSvg?: string | null;
  verificationUrl?: string;
  status?: "valid" | "revoked" | "expired" | "preview";
  assinaturas?: { url?: string | null; nome: string; cargo?: string | null }[];
};

// The document uses a fixed A4 ratio. cqw units keep every element on the same
// scale on screen and paper; longer data receives more room instead of truncation.
export default function CertificateView({studentName,courseTitle,workload,dateLabel,code,host,qrSvg,verificationUrl,assinaturas=[],headline="Certificado de Conclusão",achievementLabel="concluiu com êxito o curso",status="valid"}: CertificateViewProps) {
  const nameSize = studentName.length > 70 ? 2.5 : studentName.length > 45 ? 3 : studentName.length > 28 ? 3.8 : 4.65;
  const courseSize = courseTitle.length > 115 ? 1.65 : courseTitle.length > 75 ? 1.95 : courseTitle.length > 42 ? 2.35 : 2.95;
  const validationUrl = verificationUrl || `https://${host}/certificado/${encodeURIComponent(code)}`;
  return <div className={styles.viewport} role="region" aria-label={tr("Certificado DriveData Academy")} tabIndex={0}>
    <style>{`@media print {
      html,body{margin:0!important;padding:0!important;min-height:0!important;background:#071320!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .no-print{display:none!important}
      .certificate-page{margin:0!important;padding:0!important;min-height:0!important;width:297mm!important}
      .certificate-page-inner{margin:0!important;padding:0!important;max-width:none!important;width:297mm!important}
    }`}</style>
    <article className={styles.document} aria-label={`${headline}: ${studentName}`} style={{"--name-size":`${nameSize}cqw`,"--course-size":`${courseSize}cqw`} as CSSProperties}>
      <TechFrame />
      <header className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/certificate-mark.png" alt="" />
        <div><strong>{tr("DriveData")}</strong><span>ACADEMY</span></div>
      </header>
      <div className={styles.headerMeta} aria-hidden="true"><span>{tr("FORMAÇÃO EM DADOS E IA")}</span><small>{tr("DRIVEDATA / CERTIFICAÇÃO")}</small></div>
      <p className={styles.overline}>{headline}</p>
      <h1 className={styles.title}>CERTIFICADO</h1>
      <p className={styles.certify}>{tr("Certificamos que")}</p>
      <p className={styles.name}>{studentName}</p>
      <div className={styles.rule} aria-hidden="true" />
      <p className={styles.achievement}>{achievementLabel}</p>
      <h2 className={styles.course}>{courseTitle}</h2>
      <div className={styles.chip} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/certificate-mark.png" alt="" />
        <span>{tr("DRIVEDATA ACADEMY")}</span>
      </div>
      <dl className={styles.metadata}>
        {workload && <div><dt>{tr("Carga horária")}</dt><dd className={styles.hours}>{workload}</dd></div>}
        <div><dt>{tr("Emitido em")}</dt><dd>{dateLabel}</dd></div>
        <div><dt>{tr("Código de autenticidade")}</dt><dd className={styles.code}>{code}</dd></div>
      </dl>
      <footer className={styles.authentication}>
        <div className={styles.signatures}>
          {(assinaturas.length ? assinaturas : [{nome:tr("DriveData Academy"),cargo:null,url:null}]).map((signer,i)=><div className={styles.signature} key={`${signer.nome}-${i}`}>
            <div className={styles.signatureImage}>
              {signer.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signer.url} alt={`Assinatura de ${signer.nome}`} />
              )}
            </div>
            <strong>{signer.nome}</strong>
            {signer.cargo && <p>{signer.cargo}</p>}
          </div>)}
        </div>
        <div className={styles.validation}>
          <div><strong>{tr("VALIDAÇÃO")}</strong><p>{status === "preview" ? "Modelo demonstrativo. Sem validade." : qrSvg ? "Escaneie para verificar o certificado." : "Consulte o código de autenticidade."}</p></div>
          {qrSvg ? <a href={validationUrl} aria-label={tr("Verificar autenticidade do certificado")} className={styles.qr} dangerouslySetInnerHTML={{__html:qrSvg}} />
          : <div className={styles.qrPlaceholder}>{status === "preview" ? <>{tr("PRÉVIA")}<br/>{tr("DO MODELO")}</> : <>{tr("VALIDAÇÃO")}<br/>{tr("PELO CÓDIGO")}</>}</div>}
        </div>
      </footer>
      <div className={styles.documentFooter}><span>{status === "preview" ? "MODELO DEMONSTRATIVO / SEM VALIDADE" : status === "revoked" ? "CERTIFICADO REVOGADO" : status === "expired" ? "CERTIFICADO EXPIRADO" : "DRIVEDATA ACADEMY / CERTIFICAÇÃO"}</span><span>{host}</span></div>
      {(status === "revoked" || status === "expired") && <p className={styles.invalid}>{status === "revoked" ? "REVOGADO" : "EXPIRADO"}</p>}
    </article>
  </div>;
}
