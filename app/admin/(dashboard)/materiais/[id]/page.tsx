import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/layout";
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
    <div className="flex flex-col gap-8">
      <PageHeader
        context="Materiais"
        title="Editar material"
        lede={material.title}
      />
      <div className="max-w-3xl">
        <CampaignLink slug={material.slug} published={material.published} />
      </div>
      <MaterialForm material={material} />
    </div>
  );
}
