"use client";

import { useState } from "react";
import { FileField, Field } from "@/components/ui/form";

/* Capa do post. Continua sendo componente próprio por causa da prévia ao vivo:
   o arquivo escolhido aparece antes de enviar. O FileField aceita isso porque
   `preview` é uma prop e `onChange` passa direto para o input nativo.

   O input nativo voltou a ficar visível. Antes ele estava com `hidden` dentro
   de um rótulo estilizado, e `display:none` tira o elemento da ordem de
   tabulação: quem navega por teclado não tinha como enviar capa nenhuma. */
export default function CoverField({ scope, defaultUrl }: { scope: string; defaultUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(defaultUrl ?? null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPreview(URL.createObjectURL(f));
  }

  return (
    <>
      <FileField
        scope={scope}
        name="cover_file"
        label="Enviar uma imagem"
        accept="image/*"
        preview={preview}
        onChange={onPick}
        description="PNG, JPG, WEBP ou GIF, até 8 MB. Proporção 16:9 fica melhor."
      />
      <Field
        scope={scope}
        name="cover_url"
        label="Ou uma URL de imagem"
        type="url"
        placeholder="https://"
        defaultValue={defaultUrl ?? ""}
        description="O arquivo enviado tem prioridade sobre a URL."
      />
    </>
  );
}
