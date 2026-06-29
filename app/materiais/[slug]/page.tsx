import { notFound } from "next/navigation";
import Background from "@/components/Background";
import { createPublicClient } from "@/lib/supabase/public";
import MaterialView from "./MaterialView";

export const dynamic = "force-dynamic";

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createPublicClient();
  const { data: material } = await supabase
    .from("materials")
    .select("title, slug, subtitle, description, cover_url, cta_text, ask_phone, ask_company, ask_role")
    .eq("slug", params.slug)
    .eq("published", true)
    .maybeSingle();

  if (!material) notFound();

  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v || "");
  const utm = {
    source: str(searchParams.utm_source),
    medium: str(searchParams.utm_medium),
    campaign: str(searchParams.utm_campaign),
  };

  return (
    <>
      <Background />
      <MaterialView material={material as any} utm={utm} />
    </>
  );
}
