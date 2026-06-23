"use client";

import { useState } from "react";

export default function VideoCarousel({ ids }: { ids: string[] }) {
  const [i, setI] = useState(0);
  const id = ids[i];
  const many = ids.length > 1;

  const prev = () => setI((p) => (p - 1 + ids.length) % ids.length);
  const next = () => setI((p) => (p + 1) % ids.length);

  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div className="relative">
        <div className="glow-border overflow-hidden rounded-[1.75rem]">
          <div className="relative aspect-video w-full overflow-hidden rounded-[1.75rem] bg-ink-900">
            <iframe
              key={id}
              className="pointer-events-none absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3&fs=0`}
              title="Vídeo DriveData Academy"
              allow="autoplay; encrypted-media; picture-in-picture"
            />
            {/* Camada que impede a interface do YouTube (título/avatar) de aparecer */}
            <div className="absolute inset-0" aria-hidden />
          </div>
        </div>

        {many && (
          <>
            <button
              onClick={prev}
              aria-label="Vídeo anterior"
              className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-900/70 text-white backdrop-blur transition-colors hover:border-brand-green/60 hover:text-brand-green sm:-left-5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Próximo vídeo"
              className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-900/70 text-white backdrop-blur transition-colors hover:border-brand-green/60 hover:text-brand-green sm:-right-5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {many && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {ids.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Ir para o vídeo ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === i ? "w-6 bg-brand-green" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
