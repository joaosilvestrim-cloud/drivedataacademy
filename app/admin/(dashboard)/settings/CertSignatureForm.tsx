"use client";

import { Button } from "@/components/ui/primitives";
import { Field, FormSection, FormActions } from "@/components/ui/form";
import { saveCertSignature } from "./actions";

/* Assinatura do certificado. São dois blocos porque a Academy tem dois sócios
   e os dois assinam todo certificado, de curso e de live. Deixar o segundo em
   branco faz o certificado sair com uma assinatura só. */

function Bloco({
  scope,
  prefixo,
  titulo,
  descricao,
  inicial,
}: {
  scope: string;
  prefixo: string;
  titulo: string;
  descricao: string;
  inicial: Record<string, string>;
}) {
  const url = inicial[`${prefixo}_url`] || "";
  return (
    <FormSection title={titulo} description={descricao}>
      <Field
        scope={scope}
        name={`${prefixo}_url`}
        label="Imagem da assinatura"
        type="url"
        defaultValue={url}
        placeholder="https://"
        description="PNG ou SVG com fundo transparente."
      />

      <div className="grid gap-4 tablet:grid-cols-2">
        <Field scope={scope} name={`${prefixo}_name`} label="Nome" defaultValue={inicial[`${prefixo}_name`] || ""} />
        <Field scope={scope} name={`${prefixo}_role`} label="Cargo" defaultValue={inicial[`${prefixo}_role`] || ""} />
      </div>

      {url && (
        <div className="flex flex-col gap-2">
          <p className="text-meta uppercase text-ds-text-3">Prévia</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Assinatura de ${inicial[`${prefixo}_name`] || "responsável"}`} className="h-16 w-auto" />
        </div>
      )}
    </FormSection>
  );
}

export default function CertSignatureForm({ initial }: { initial: Record<string, string> }) {
  return (
    <form action={saveCertSignature} className="flex max-w-2xl flex-col gap-8">
      <Bloco
        scope="cert1"
        prefixo="cert_signature"
        titulo="Primeira assinatura"
        descricao="Aparece à esquerda na linha de assinatura do certificado."
        inicial={initial}
      />
      <Bloco
        scope="cert2"
        prefixo="cert_signature2"
        titulo="Segunda assinatura"
        descricao="Aparece à direita. Em branco, o certificado sai com uma assinatura só."
        inicial={initial}
      />

      <FormActions>
        <Button type="submit">Salvar assinaturas</Button>
      </FormActions>
    </form>
  );
}
