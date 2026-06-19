import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import VideoManager from "./VideoManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  let videos: string[] = [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["promo_videos", "promo_video_url"]);
    if (error) throw new Error(error.message);

    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    if (map.promo_videos) {
      try {
        const arr = JSON.parse(map.promo_videos);
        if (Array.isArray(arr)) videos = arr.filter((x) => typeof x === "string");
      } catch {
        /* ignora */
      }
    }
    if (videos.length === 0 && map.promo_video_url) {
      videos = [map.promo_video_url]; // migra valor antigo (1 vídeo)
    }
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Configurações</h1>
        <div className="mt-6">
          <AdminError
            message={
              (e instanceof Error ? e.message : "Erro desconhecido.") +
              " — verifique se a tabela site_settings foi criada (rode o SQL no Supabase)."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Configurações</h1>
      <p className="mt-1 text-sm text-slate-400">Vídeos da seção “Conheça a Academy”.</p>

      {searchParams?.ok && (
        <div className="mt-6 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          Salvo! O site atualiza em até 1 minuto.
        </div>
      )}
      {searchParams?.error && (
        <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Não foi possível salvar: {searchParams.error}
        </div>
      )}

      <div className="mt-6">
        <VideoManager initial={videos} />
      </div>
    </div>
  );
}
