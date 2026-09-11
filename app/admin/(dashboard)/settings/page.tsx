import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, ErrorState, Alert } from "@/components/ui/layout";
import VideoManager from "./VideoManager";
import CertSignatureForm from "./CertSignatureForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  let videos: string[] = [];
  let cert: Record<string, string> = {};
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["promo_videos", "promo_video_url", "cert_signature_url", "cert_signature_name", "cert_signature_role"]);
    if (error) throw new Error(error.message);

    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    cert = {
      cert_signature_url: map.cert_signature_url || "",
      cert_signature_name: map.cert_signature_name || "",
      cert_signature_role: map.cert_signature_role || "",
    };
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
      <div className="flex flex-col gap-8">
        <PageHeader context="Administração" title="Configurações" />
        <ErrorState
          title="Não foi possível carregar as configurações"
          description={
            (e instanceof Error ? e.message : "Erro desconhecido.") +
            " Se a tabela site_settings ainda não existe, rode o SQL no Supabase."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        context="Administração"
        title="Configurações"
        lede="Vídeos da home e assinatura dos certificados."
      />

      {searchParams?.ok && <Alert tone="accent" title="Salvo">O site atualiza em até um minuto.</Alert>}
      {searchParams?.error && <Alert tone="danger" title="Não foi possível salvar">{searchParams.error}</Alert>}

      <VideoManager initial={videos} />
      <CertSignatureForm initial={cert} />
    </div>
  );
}
