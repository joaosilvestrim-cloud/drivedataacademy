"use client";

import { saveCertSignature } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";

export default function CertSignatureForm({ initial }: { initial: Record<string, string> }) {
  const url = initial.cert_signature_url || "";
  return (
    <form action={saveCertSignature} className="glass max-w-2xl space-y-5 rounded-2xl border border-white/8 p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-white">Assinatura do certificado</h2>
        <p className="mt-1 text-sm text-slate-400">Aparece na linha de assinatura do certificado. Envie a imagem (SVG ou PNG com fundo transparente) para o Storage e cole a URL aqui.</p>
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="cert_signature_url">URL da imagem da assinatura</label>
        <input id="cert_signature_url" name="cert_signature_url" defaultValue={url} placeholder="https://.../assinatura-reed.svg" className={field} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={label} htmlFor="cert_signature_name">Nome do responsável</label>
          <input id="cert_signature_name" name="cert_signature_name" defaultValue={initial.cert_signature_name || "Reed Lopes"} placeholder="Reed Lopes" className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="cert_signature_role">Cargo / título</label>
          <input id="cert_signature_role" name="cert_signature_role" defaultValue={initial.cert_signature_role || "Instrutor"} placeholder="Instrutor" className={field} />
        </div>
      </div>

      {url && (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Prévia</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Assinatura" className="h-16 w-auto" />
        </div>
      )}

      <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
        Salvar assinatura
      </button>
    </form>
  );
}
