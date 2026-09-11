"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button, ICON } from "@/components/ui/primitives";
import { FormSection, FormActions } from "@/components/ui/form";
import { saveVideos } from "./actions";

// Lista dinâmica: adicionar, remover e reordenar. É um controle próprio, não um
// Field solto, então preservamos o comportamento e usamos os tokens oficiais.
// Cada linha tem rótulo próprio porque "Vídeo 1" e "Vídeo 2" são campos
// distintos; um rótulo único não serviria para os dois.
export default function VideoManager({ initial }: { initial: string[] }) {
  const [videos, setVideos] = useState<string[]>(initial.length ? initial : [""]);

  const update = (i: number, val: string) =>
    setVideos((v) => v.map((x, idx) => (idx === i ? val : x)));
  const add = () => setVideos((v) => [...v, ""]);
  const remove = (i: number) => setVideos((v) => v.filter((_, idx) => idx !== i));
  const move = (i: number, dir: number) =>
    setVideos((v) => {
      const j = i + dir;
      if (j < 0 || j >= v.length) return v;
      const copy = [...v];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const cleaned = videos.map((s) => s.trim()).filter(Boolean);
  const acao =
    "grid h-10 w-10 shrink-0 place-items-center rounded-ctl border border-ds-line text-ds-text-2 transition-colors duration-fast ease-ds hover:border-ds-text-3 hover:text-ds-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ds-line";

  return (
    <form action={saveVideos} className="flex max-w-2xl flex-col gap-6">
      <input type="hidden" name="videos_json" value={JSON.stringify(cleaned)} />

      <FormSection
        title="Vídeos da seção Conheça a Academy"
        description="A ordem aqui é a ordem do carrossel no site."
      >
        <ul className="flex flex-col gap-3">
          {videos.map((url, i) => {
            const id = `video-${i}`;
            return (
              <li key={i} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-label font-medium text-ds-text-2">
                  Vídeo {i + 1}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    value={url}
                    onChange={(e) => update(i, e.target.value)}
                    placeholder="https://youtu.be/"
                    className="h-10 w-full rounded-ctl border border-ds-line bg-ds-surface px-3 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds hover:border-ds-text-3"
                  />
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Mover vídeo ${i + 1} para cima`} className={acao}>
                    <ArrowUp size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === videos.length - 1} aria-label={`Mover vídeo ${i + 1} para baixo`} className={acao}>
                    <ArrowDown size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => remove(i)} aria-label={`Remover vídeo ${i + 1}`} className={`${acao} hover:border-ds-danger/50 hover:text-ds-danger`}>
                    <X size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div>
          <Button type="button" variant="secondary" size="sm" onClick={add}>
            <Plus size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" />
            Adicionar vídeo
          </Button>
        </div>

        <p className="text-caption text-ds-text-3">
          Pode ser link não listado. Lista vazia esconde a seção. Os vídeos tocam sozinhos e
          sem som, que é exigência dos navegadores.
        </p>
      </FormSection>

      <FormActions>
        <Button type="submit">Salvar vídeos</Button>
      </FormActions>
    </form>
  );
}
