"use client";

import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ICON } from "@/components/ui/primitives";
import { BUCKET_MATERIAIS, tamanhoLegivel } from "@/lib/materiais";
import { assinarUploadMaterial } from "./actions";

/* Envio do arquivo direto do navegador para o bucket privado, por URL assinada.
   O formulário recebe só o caminho, o nome e o tamanho em campos ocultos. */

export default function ArquivoUpload({
  scope,
  inicial,
}: {
  scope: string;
  inicial?: { path: string | null; name: string | null; size: number | null };
}) {
  const [path, setPath] = useState(inicial?.path || "");
  const [name, setName] = useState(inicial?.name || "");
  const [size, setSize] = useState<number>(inicial?.size || 0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const id = `${scope}-arquivo`;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    setErro("");
    try {
      const assinado = await assinarUploadMaterial(file.name);
      if (!assinado.ok) throw new Error(assinado.error);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(BUCKET_MATERIAIS)
        .uploadToSignedUrl(assinado.path, assinado.token, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw error;
      setPath(assinado.path);
      setName(file.name);
      setSize(file.size);
    } catch (err: any) {
      const msg = String(err?.message || err?.error || "falha desconhecida");
      setErro(
        /exceeded|too large|payload/i.test(msg)
          ? `O arquivo passou do limite de tamanho do Storage (${tamanhoLegivel(file.size)}). Aumente o limite no Supabase ou use um link.`
          : `Não consegui enviar: ${msg}`
      );
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label font-medium text-ds-text-2">Arquivo</label>
      <input type="hidden" name="file_path" value={path} />
      <input type="hidden" name="file_name" value={name} />
      <input type="hidden" name="file_size" value={size || ""} />

      <div className="flex flex-wrap items-center gap-3 rounded-ctl border border-ds-line bg-ds-surface px-3 py-2.5">
        {name ? (
          <span className="inline-flex min-w-0 items-center gap-2 text-body-sm text-ds-text">
            <Paperclip size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="shrink-0 text-ds-accent" />
            <span className="truncate">{name}</span>
            {size > 0 && <span className="shrink-0 font-mono text-caption tabular-nums text-ds-text-3">{tamanhoLegivel(size)}</span>}
          </span>
        ) : (
          <span className="text-body-sm text-ds-text-3">Nenhum arquivo enviado.</span>
        )}
        <input
          id={id}
          type="file"
          onChange={onFile}
          disabled={enviando}
          accept=".pbix,.pbit,.pbip,.zip,.xlsx,.xls,.csv,.pdf,.json,.pptx,.fig"
          className="ml-auto block text-caption text-ds-text-2 file:mr-2 file:rounded-ctl file:border-0 file:bg-ds-raised file:px-3 file:py-1.5 file:text-caption file:font-medium file:text-ds-text hover:file:bg-ds-line disabled:opacity-50"
        />
      </div>

      {enviando && (
        <p className="inline-flex items-center gap-1.5 text-caption text-ds-info" role="status">
          <Loader2 size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="animate-spin" />
          Enviando arquivo. Arquivos grandes de Power BI podem levar um minuto.
        </p>
      )}
      {erro && <p className="text-caption text-ds-danger" role="alert">{erro}</p>}
      <p className="text-caption text-ds-text-3">
        .pbix, .pbit, .zip, .xlsx, .pdf e outros. Sobe direto do navegador para um espaço privado: só assinante baixa.
      </p>
    </div>
  );
}
