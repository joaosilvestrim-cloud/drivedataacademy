"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { assinarUploadDeImagem } from "@/app/admin/(dashboard)/upload-actions";

/* Campo de imagem do admin: escolhe o arquivo e vê a prévia, ou cola um
   endereço se a imagem já estiver publicada em outro lugar.

   O arquivo vai do navegador direto para o Storage, então banner grande não
   esbarra no limite de upload do servidor. O que o formulário envia continua
   sendo só o endereço, no campo `name`, igual a antes. */

export default function UploadDeImagem({
  name,
  label,
  initialUrl,
  prefixo = "imagem",
  descricao,
  transparente,
}: {
  name: string;
  label: string;
  initialUrl?: string | null;
  prefixo?: string;
  descricao?: string;
  /** Assinatura tem fundo transparente: a prévia mostra em xadrez claro. */
  transparente?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl || "");
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) { setErro("Escolha uma imagem (JPG, PNG ou WEBP)."); return; }
    setSubindo(true);
    setErro("");
    try {
      const ext = arquivo.name.split(".").pop() || "jpg";
      const assinado = await assinarUploadDeImagem(ext, prefixo);
      if (!assinado.ok) { setErro(assinado.error); return; }
      const supabase = createClient();
      const { error } = await supabase.storage.from("covers").uploadToSignedUrl(assinado.path, assinado.token, arquivo, { contentType: arquivo.type });
      if (error) throw error;
      const { data } = supabase.storage.from("covers").getPublicUrl(assinado.path);
      setUrl(data.publicUrl);
    } catch (err: any) {
      setErro("Não consegui subir: " + (err?.message || "erro desconhecido"));
    } finally {
      setSubindo(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label font-medium text-ds-text-2">{label}</span>
      <div className="flex items-start gap-4">
        <div className={`grid h-[4.5rem] w-32 shrink-0 place-items-center overflow-hidden rounded-srf border ${url ? "border-ds-line" : "border-dashed border-ds-line"} ${transparente ? "bg-[repeating-conic-gradient(#2a3441_0%_25%,#1b2430_0%_50%)] bg-[length:14px_14px]" : "bg-ds-surface"}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className={`h-full w-full ${transparente ? "object-contain p-1" : "object-cover"}`} />
          ) : (
            <span className="text-caption text-ds-text-3">sem imagem</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={aoEscolher}
            disabled={subindo}
            aria-label={`Escolher arquivo para ${label}`}
            className="block w-full text-body-sm text-ds-text-2 file:mr-3 file:rounded-ctl file:border-0 file:bg-ds-accent file:px-3 file:py-1.5 file:text-body-sm file:font-semibold file:text-ds-accent-ink hover:file:opacity-90 disabled:opacity-50"
          />
          <input
            name={name}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ou cole o endereço de uma imagem"
            className="w-full rounded-ctl border border-ds-line bg-ds-surface px-3 py-2 text-body-sm text-ds-text outline-none transition-colors placeholder:text-ds-text-3 focus:border-ds-accent"
          />
          {subindo && <p className="text-caption text-ds-accent">Subindo a imagem...</p>}
          {erro && <p className="text-caption text-ds-danger" role="alert">{erro}</p>}
          {!subindo && !erro && descricao && <p className="text-caption text-ds-text-3">{descricao}</p>}
        </div>
      </div>
    </div>
  );
}
