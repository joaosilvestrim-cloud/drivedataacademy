"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { ICON } from "@/components/ui/primitives";
import { Field } from "@/components/ui/form";
import { resolverVideo } from "@/lib/video";

/* Campo da gravação, com prévia.

   O motivo de existir é simples: antes daqui, colar o iframe do Panda e clicar
   em salvar não dava sinal nenhum de vida. O campo voltava com o endereço
   limpo, sem o iframe que a pessoa tinha colado, e não havia como saber se
   funcionou. Parecia que nada tinha sido gravado.

   A prévia usa exatamente o mesmo leitor da página do aluno (`resolverVideo`),
   então o que toca aqui toca lá. */

export default function GravacaoField({
  scope,
  defaultValue,
  host,
  verEm,
}: {
  scope: string;
  defaultValue: string;
  host: string | null;
  verEm?: string;
}) {
  const [valor, setValor] = useState(defaultValue || "");
  const video = resolverVideo(valor, host);

  return (
    <div className="flex flex-col gap-4 rounded-srf border border-ds-line p-4">
      <p className="flex items-center gap-1.5 text-meta uppercase text-ds-text-3">
        <Video size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" />
        Gravação
      </p>

      <Field
        scope={scope}
        name="recording_url"
        label="Link ou código do vídeo"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Cole o <iframe> do Panda ou o link do YouTube"
        description="Aceita o iframe do Panda colado inteiro, o endereço de embed, link do YouTube ou só o id do vídeo. Depois de salvar, assinantes assistem em Gravações."
      />

      <div>
        <p className="mb-1.5 text-meta uppercase text-ds-text-3">Pré-visualização</p>
        {video ? (
          <div className="overflow-hidden rounded-srf border border-ds-line bg-black">
            <div className="relative aspect-video">
              <iframe
                key={video.src}
                className="absolute inset-0 h-full w-full"
                src={video.src}
                title="Prévia da gravação"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-srf border border-dashed border-ds-line px-4 text-center text-caption text-ds-text-3">
            {valor.trim()
              ? "Não reconheci esse link. No Panda, use Compartilhar e copie o código de incorporação inteiro."
              : "Cole o link acima para ver a prévia aqui."}
          </div>
        )}
      </div>

      {video && (
        <p className="text-caption text-ds-text-3">
          Vai ser salvo como <span className="font-mono break-all text-ds-text-2">{video.src}</span>
          {verEm && (
            <>
              {" · "}
              <a href={verEm} target="_blank" rel="noreferrer" className="text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info">
                abrir como o aluno vê ↗
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
