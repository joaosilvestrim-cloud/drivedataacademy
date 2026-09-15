"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ICON } from "@/components/ui/primitives";
import { BUCKET_MATERIAIS, tamanhoLegivel } from "@/lib/materiais";
import { assinarUploadMaterial, registrarArquivoDaAula } from "./actions";

/* Envio de arquivos de uma aula de materiais. Cada arquivo sobe direto do
   navegador para o bucket privado, por URL assinada, e já entra na aula assim
   que termina. Um .pbix passa fácil de dezenas de MB, o que estouraria o limite
   de corpo da Vercel se passasse pelo servidor. */

export default function MaterialUpload({ scope, lessonId, courseId }: { scope: string; lessonId: string; courseId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const id = `${scope}-arquivo`;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setErro("");
    setOk("");
    const falhas: string[] = [];
    let enviados = 0;
    for (const file of files) {
      setEnviando(`Enviando ${file.name} (${tamanhoLegivel(file.size)}). Arquivos grandes de Power BI podem levar um minuto.`);
      try {
        const assinado = await assinarUploadMaterial(file.name);
        if (!assinado.ok) throw new Error(assinado.error);
        const { error } = await createClient()
          .storage.from(BUCKET_MATERIAIS)
          .uploadToSignedUrl(assinado.path, assinado.token, file, { contentType: file.type || "application/octet-stream" });
        if (error) throw error;
        const salvo = await registrarArquivoDaAula(lessonId, courseId, { path: assinado.path, name: file.name, size: file.size });
        if (!salvo.ok) throw new Error(salvo.error);
        enviados++;
      } catch (err: any) {
        const msg = String(err?.message || err?.error || "falha desconhecida");
        falhas.push(
          /exceeded|too large|payload/i.test(msg)
            ? `${file.name} passou do limite de tamanho do Storage. Aumente o limite no Supabase ou use um link.`
            : `${file.name}: ${msg}`
        );
      }
    }
    setEnviando("");
    if (enviados) {
      setOk(enviados === 1 ? "Arquivo adicionado à aula." : `${enviados} arquivos adicionados à aula.`);
      router.refresh();
    }
    if (falhas.length) setErro(`Não consegui enviar: ${falhas.join(" · ")}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-srf border border-dashed border-ds-line bg-ds-surface px-4 py-6 text-center transition-colors hover:border-ds-accent ${enviando ? "pointer-events-none opacity-60" : ""}`}
      >
        <UploadCloud size={ICON.lg} strokeWidth={ICON.stroke} aria-hidden="true" className="text-ds-accent" />
        <span className="text-body-sm font-medium text-ds-text">Escolher arquivos para esta aula</span>
        <span className="text-caption text-ds-text-3">.pbix, .pbit, .zip, .xlsx, .csv, .pdf e outros. Pode escolher vários. Cada um entra na aula assim que termina de subir.</span>
      </label>
      <input
        id={id}
        type="file"
        multiple
        onChange={onFiles}
        disabled={!!enviando}
        accept=".pbix,.pbit,.pbip,.zip,.xlsx,.xls,.csv,.pdf,.json,.pptx,.fig"
        className="sr-only"
      />

      {enviando && (
        <p className="inline-flex items-center gap-1.5 text-caption text-ds-info" role="status">
          <Loader2 size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="animate-spin" />
          {enviando}
        </p>
      )}
      {ok && !enviando && <p className="text-caption text-ds-accent" role="status">{ok}</p>}
      {erro && <p className="text-caption text-ds-danger" role="alert">{erro}</p>}
    </div>
  );
}
