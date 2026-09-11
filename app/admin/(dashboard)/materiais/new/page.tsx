import { PageHeader } from "@/components/ui/layout";
import MaterialForm from "../MaterialForm";

export default function NewMaterialPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        context="Materiais"
        title="Novo material"
        lede="Uma página de captura com formulário e entrega automática por e-mail."
      />
      <MaterialForm />
    </div>
  );
}
