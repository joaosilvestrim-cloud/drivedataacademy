"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { ICON } from "@/components/ui/primitives";
import { Field, SelectField } from "@/components/ui/form";

/* Controle especializado do domínio de cursos. Continua local de propósito:
   dois campos numa área não justificam abstração global.

   O que a família de formulários cobre aqui são os dois campos. A leitura do
   valor, a montagem da URL e a prévia continuam sendo comportamento próprio
   deste componente, e nada disso foi tocado. */

function youtubeId(v: string): string | null {
  const m = v.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || v.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

function pandaSrc(raw: string): string | null {
  let v = (raw || "").trim();
  const iframe = v.match(/src=["']([^"']+)["']/i);
  if (iframe) v = iframe[1];
  if (/^https?:\/\/[^ ]*pandavideo[^ ]*\/embed/i.test(v)) return v;
  return null;
}

export default function VideoField({ scope, defaultProvider, defaultValue }: { scope: string; defaultProvider: string; defaultValue: string }) {
  const [provider, setProvider] = useState(defaultProvider || "youtube");
  const [value, setValue] = useState(defaultValue || "");

  let preview: string | null = null;
  if (value.trim()) {
    if (provider === "panda") preview = pandaSrc(value);
    else {
      const id = youtubeId(value.trim());
      preview = id ? `https://www.youtube.com/embed/${id}` : null;
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-srf border border-ds-line-soft p-4">
      <p className="flex items-center gap-1.5 text-meta uppercase text-ds-text-3">
        <Video size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" />
        Vídeo, para aulas do tipo Vídeo
      </p>

      <div className="grid gap-4 tablet:grid-cols-[11rem_1fr]">
        <SelectField
          scope={scope}
          name="video_provider"
          label="Provedor"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="youtube">YouTube</option>
          <option value="panda">Panda Video</option>
        </SelectField>
        <Field
          scope={scope}
          name="video_id"
          label="Link ou código do vídeo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={provider === "panda" ? "Cole o código <iframe> ou o link do Panda" : "Link ou ID do YouTube"}
          // A descrição diz exatamente o que o leitor de valor aceita hoje.
          description={
            provider === "panda"
              ? "Aceita o código iframe do Panda ou um link de embed do pandavideo. Abra o vídeo, use Compartilhar e copie o código."
              : "Aceita link do YouTube nos formatos youtu.be, watch, embed e shorts, ou só o identificador de 11 caracteres."
          }
        />
      </div>

      <div>
        <p className="mb-1.5 text-meta uppercase text-ds-text-3">Pré-visualização</p>
        {preview ? (
          <div className="overflow-hidden rounded-srf border border-ds-line bg-black">
            <div className="relative aspect-video">
              <iframe key={preview} className="absolute inset-0 h-full w-full" src={preview} title="Prévia do vídeo da aula" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-srf border border-dashed border-ds-line px-4 text-center text-caption text-ds-text-3">
            {value.trim() ? "Não reconheci o link. Confira se colou o embed/link certo." : "Cole o link do vídeo acima para ver o preview aqui."}
          </div>
        )}
      </div>
    </div>
  );
}
