import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import MaterialForm from "../MaterialForm";
import CampaignLink from "../CampaignLink";

export const dynamic = "force-dynamic";

export default async function EditMaterialPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data: material } = await supabase
    .from("materials")
    .select("id, title, slug, subtitle, description, cover_url, file_url, cta_text, email_subject, email_message, ask_phone, ask_company, ask_role, published")
    .eq("id", params.id)
    .single();

  if (!material) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Editar material</h1>
      <p className="mt-1 text-sm text-slate-400">{material.title}</p>

      <div className="mt-6 max-w-3xl">
        <CampaignLink slug={material.slug} published={material.published} />
      </div>

      <div className="mt-6">
        <MaterialForm material={material} />
      </div>
    </div>
  );
}
