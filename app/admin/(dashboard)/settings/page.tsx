import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { saveSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { ok?: string };
}) {
  let videoUrl = "";
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "promo_video_url")
      .maybeSingle();
    videoUrl = data?.value ?? "";
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Configurações</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro desconhecido."} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Configurações</h1>
      <p className="mt-1 text-sm text-slate-400">Ajustes do site.</p>

      {searchParams?.ok && (
        <div className="mt-6 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          Configurações salvas! O site atualiza em até 1 minuto.
        </div>
      )}

      <form action={saveSettings} className="mt-6 max-w-2xl">
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-3">
          <label className="block text-sm font-medium text-slate-300" htmlFor="promo_video_url">
            Vídeo do YouTube (seção “Conheça a Academy”)
          </label>
          <input
            id="promo_video_url"
            name="promo_video_url"
            defaultValue={videoUrl}
            placeholder="https://youtu.be/XXXXXXXXXXX  ou  https://www.youtube.com/watch?v=XXXXXXXXXXX"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
          />
          <p className="text-xs text-slate-500">
            Cole o link do YouTube (pode ser “não listado”). Deixe em branco para esconder
            o vídeo. A reprodução inicia automaticamente, sem som (exigência dos navegadores) —
            o visitante pode ativar o áudio no player.
          </p>
        </div>

        <div className="mt-5">
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
