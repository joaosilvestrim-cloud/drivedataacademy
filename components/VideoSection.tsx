import Reveal from "./Reveal";
import { createPublicClient } from "@/lib/supabase/public";

function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const u = url.trim();
  if (/^[\w-]{11}$/.test(u)) return u; // já é um ID
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}

async function getVideoUrl(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "promo_video_url")
      .maybeSingle();
    return data?.value || null;
  } catch {
    return null;
  }
}

export default async function VideoSection() {
  const id = youtubeId(await getVideoUrl());

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
        <div className="mx-auto mt-10 max-w-4xl">
          <div className="glow-border overflow-hidden rounded-[1.75rem]">
            <div className="relative aspect-video w-full overflow-hidden rounded-[1.75rem] bg-ink-900">
              {id ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1&rel=0&modestbranding=1&playsinline=1`}
                  title="Vídeo DriveData Academy"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
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
              )}
            </div>
          </div>
        </div>
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
