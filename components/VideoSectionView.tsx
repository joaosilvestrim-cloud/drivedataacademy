"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import Reveal from "./Reveal";
import VideoCarousel from "./VideoCarousel";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function VideoSectionView({ ids }: { ids: string[] }) {
  const tr = usarTraducao();
  const t = useT();

  return (
    <section id="video" className="relative mx-auto max-w-5xl px-6 py-20 scroll-mt-24">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-marca">{t.video.eyebrow}</p>
          <h2 className="mt-3 text-[2.25rem] font-bold leading-[1.1] text-obsidian sm:text-[2.8rem]">
            {t.video.titlePre} <span className="text-marca-azul">{t.video.titleGrad}</span>
          </h2>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {ids.length > 0 ? (
          <VideoCarousel ids={ids} />
        ) : (
          <div className="mx-auto mt-10 max-w-4xl">
            <div className="escuro overflow-hidden rounded-grande">
              <div className="relative aspect-video w-full overflow-hidden rounded-grande bg-marca">
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div className="grid-bg absolute inset-0 opacity-30" />
                  <div className="relative">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-tinta/15 bg-tinta/5">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="text-acento">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm text-slate-400">{t.video.soon}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Reveal>

      {/* Microsoft Partner */}
      <Reveal delay={0.15}>
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-slate-500">
            {t.video.partner}
          </p>
          <div className="rounded-srf bg-white px-6 py-4 shadow-fio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/microsoft-partner.png" alt={tr("Microsoft Partner")} className="h-10 w-auto" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
