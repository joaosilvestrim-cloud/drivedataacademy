"use client";

import { Button } from "@/components/ui/primitives";
import { Field, FormSection, FormActions } from "@/components/ui/form";
import { saveCertSignature } from "./actions";

export default function CertSignatureForm({ initial }: { initial: Record<string, string> }) {
  const url = initial.cert_signature_url || "";
  const scope = "cert";

  return (
    <form action={saveCertSignature} className="flex max-w-2xl flex-col gap-6">
      <FormSection
        title="Assinatura do certificado"
        description="Aparece na linha de assinatura. Envie a imagem para o Storage e cole o endereço aqui."
      >
        <Field
          scope={scope}
          name="cert_signature_url"
          label="Imagem da assinatura"
          type="url"
          defaultValue={url}
          placeholder="https://"
          description="SVG ou PNG com fundo transparente."
        />

        <div className="grid gap-4 tablet:grid-cols-2">
          <Field
            scope={scope}
            name="cert_signature_name"
            label="Nome do responsável"
            defaultValue={initial.cert_signature_name || "Reed Lopes"}
          />
          <Field
            scope={scope}
            name="cert_signature_role"
            label="Cargo"
            defaultValue={initial.cert_signature_role || "Instrutor"}
          />
        </div>

        {url && (
          <div className="flex flex-col gap-2">
            <p className="text-meta uppercase text-ds-text-3">Prévia</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Assinatura do responsável" className="h-16 w-auto" />
          </div>
        )}
      </FormSection>

      <FormActions>
        <Button type="submit">Salvar assinatura</Button>
      </FormActions>
    </form>
  );
}
