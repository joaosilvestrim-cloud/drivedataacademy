import Reveal from "./Reveal";
import VideoCarousel from "./VideoCarousel";
import { youtubeId } from "@/lib/youtube";
import { createPublicClient } from "@/lib/supabase/public";

async function getVideoUrls(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["promo_videos", "promo_video_url"]);

    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));

    if (map.promo_videos) {
      try {
        const arr = JSON.parse(map.promo_videos);
        if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string" && x.trim());
      } catch {
        /* ignora JSON inválido */
      }
    }
    if (map.promo_video_url) return [map.promo_video_url]; // compatibilidade
    return [];
  } catch {
    return [];
  }
}

export default async function VideoSection() {
  const urls = await getVideoUrls();
  const ids = urls.map(youtubeId).filter(Boolean) as string[];

  return (
    <section id="video" className="relative mx-auto max-w-5xl px-6 py-20 scroll-mt-24">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">DriveData Academy</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Conheça a Academy <span className="text-gradient">por dentro</span>
          </h2>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {ids.length > 0 ? (
          <VideoCarousel ids={ids} />
        ) : (
          <div className="mx-auto mt-10 max-w-4xl">
            <div className="glow-border overflow-hidden rounded-[1.75rem]">
              <div className="relative aspect-video w-full overflow-hidden rounded-[1.75rem] bg-ink-900">
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div className="grid-bg absolute inset-0 opacity-30" />
                  <div className="relative">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/5">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="text-brand-green">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm text-slate-400">Vídeo em breve.</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Somos Microsoft Partner
          </p>
          <div className="rounded-2xl border border-white/10 bg-white px-6 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/microsoft-partner.png" alt="Microsoft Partner" className="h-10 w-auto" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
