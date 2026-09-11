"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, SelectField, CheckboxField, FormSection, FormActions } from "@/components/ui/form";
import { createProduct, saveProduct, deleteProduct } from "./actions";

type Course = { id: string; title: string };
type Product = {
  id: string; name: string; description: string | null; price: number; kind: string;
  course_id: string | null; course_ids: string | null; access_days: number | null;
  max_installments: number; methods: string; active: boolean;
} | null;

const KINDS = [
  { k: "course", label: "Curso avulso", desc: "Vende um treinamento específico." },
  { k: "bundle", label: "Pacote", desc: "Você escolhe quais treinamentos entram." },
  { k: "full_access", label: "Acesso full", desc: "Libera todos os treinamentos." },
];

export default function ProductForm({ product, courses }: { product?: Product; courses: Course[] }) {
  const [kind, setKind] = useState(product?.kind || "full_access");
  const isEdit = !!product;
  const scope = isEdit ? `produto-${product!.id}` : "produto-novo";
  const selectedBundle = new Set((product?.course_ids || "").split(",").map((s) => s.trim()).filter(Boolean));
  const methods = new Set((product?.methods || "pix,card,boleto").split(","));

  return (
    <form action={isEdit ? saveProduct : createProduct} className="flex flex-col gap-8">
      {isEdit && <input type="hidden" name="id" value={product!.id} />}

      <FormSection title="Produto">
        <Field
          scope={scope}
          name="name"
          label="Nome do produto"
          required
          defaultValue={product?.name ?? ""}
          placeholder="Acesso full, turma de setembro"
          description="Aparece no checkout e no relatório de vendas."
        />
        {isEdit && (
          <Field
            scope={scope}
            name="description"
            label="Descrição"
            defaultValue={product?.description ?? ""}
            description="Texto de apoio exibido na hora da compra."
          />
        )}
      </FormSection>

      <FormSection title="O que este produto libera">
        {/* Controle próprio: o valor vai por campo oculto, não por radio nativo.
            Preservamos o comportamento e só acrescentamos a semântica que
            faltava, para o leitor de tela anunciar grupo e seleção. */}
        <div role="radiogroup" aria-label="Como você quer precificar" className="grid gap-2 tablet:grid-cols-3">
          {KINDS.map((o) => {
            const ativo = kind === o.k;
            return (
              <button
                type="button"
                key={o.k}
                role="radio"
                aria-checked={ativo}
                onClick={() => setKind(o.k)}
                className={`rounded-srf border p-3 text-left transition-colors duration-fast ease-ds ${
                  ativo ? "border-ds-accent/50 bg-ds-accent/[0.07]" : "border-ds-line hover:border-ds-text-3"
                }`}
              >
                <span className={`block text-label font-medium ${ativo ? "text-ds-accent" : "text-ds-text"}`}>{o.label}</span>
                <span className="mt-0.5 block text-caption leading-snug text-ds-text-3">{o.desc}</span>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="kind" value={kind} />

        {kind === "course" && (
          <SelectField scope={scope} name="course_id" label="Qual treinamento" defaultValue={product?.course_id ?? ""}>
            <option value="">Selecione</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </SelectField>
        )}

        {kind === "bundle" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-label font-medium text-ds-text-2">Treinamentos incluídos</legend>
            {courses.length === 0 ? (
              <p className="text-caption text-ds-text-3">Nenhum curso cadastrado ainda.</p>
            ) : (
              <div className="grid gap-2 tablet:grid-cols-2">
                {courses.map((c) => (
                  <CheckboxField
                    key={c.id}
                    scope={`${scope}-bundle-${c.id}`}
                    name="course_ids"
                    label={c.title}
                    value={c.id}
                    defaultChecked={selectedBundle.has(c.id)}
                  />
                ))}
              </div>
            )}
          </fieldset>
        )}

        {kind === "full_access" && (
          <p className="border-l-2 border-ds-line py-1.5 pl-3 text-body-sm text-ds-text-3">
            Inclui <span className="text-ds-text-2">todos os treinamentos</span> da plataforma,
            inclusive os que forem adicionados depois.
          </p>
        )}
      </FormSection>

      <FormSection title="Valores e pagamento">
        <div className="grid gap-4 tablet:grid-cols-3">
          <Field
            scope={scope}
            name="price"
            label="Preço"
            inputMode="decimal"
            defaultValue={product?.price ?? ""}
            placeholder="1600"
            description="Em reais."
          />
          <Field
            scope={scope}
            name="access_days"
            label="Dias de acesso"
            type="number"
            inputMode="numeric"
            defaultValue={product?.access_days ?? ""}
            description="Em branco não expira."
          />
          <Field
            scope={scope}
            name="max_installments"
            label="Máximo de parcelas"
            type="number"
            inputMode="numeric"
            defaultValue={product?.max_installments ?? 12}
            description="Somente no cartão."
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-label font-medium text-ds-text-2">Formas de pagamento</legend>
          <div className="flex flex-col gap-3 tablet:flex-row tablet:gap-x-8">
            <CheckboxField scope={scope} name="m_pix" label="PIX" defaultChecked={methods.has("pix")} />
            <CheckboxField scope={scope} name="m_card" label="Cartão" defaultChecked={methods.has("card")} />
            <CheckboxField scope={scope} name="m_boleto" label="Boleto" defaultChecked={methods.has("boleto")} />
          </div>
        </fieldset>
      </FormSection>

      {isEdit && (
        <FormSection title="Disponibilidade">
          <CheckboxField
            scope={scope}
            name="active"
            label="Produto ativo"
            defaultChecked={product?.active}
            description="Enquanto desmarcado, o produto não aparece para compra."
          />
        </FormSection>
      )}

      <FormActions
        destructive={isEdit ? <Button formAction={deleteProduct} variant="danger" size="sm">Excluir</Button> : undefined}
      >
        <Button type="submit">{isEdit ? "Salvar alterações" : "Criar produto"}</Button>
      </FormActions>
    </form>
  );
}
