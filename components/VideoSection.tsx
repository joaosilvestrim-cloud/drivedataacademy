import VideoSectionView from "./VideoSectionView";
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
  return <VideoSectionView ids={ids} />;
}
