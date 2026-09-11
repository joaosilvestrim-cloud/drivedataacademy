"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, SelectField, CheckboxField, FormSection, FormActions } from "@/components/ui/form";
import { updateTurma } from "./actions";

type Course = { id: string; title: string };
type Turma = any;

function toDate(d: string | null) { return d ? d.slice(0, 10) : ""; }

const INCLUDES = [
  { k: "full", label: "Todos os treinamentos", desc: "Acesso full, inclusive cursos futuros." },
  { k: "selected", label: "Escolher treinamentos", desc: "Só os cursos que você marcar." },
];

export default function TurmaForm({ turma, courses }: { turma: Turma; courses: Course[] }) {
  const [includes, setIncludes] = useState(turma.includes || "full");
  // Uma turma por página, mas o scope segue a convenção: id previsível e único.
  const scope = `turma-${turma.id}`;
  const selected = new Set((turma.course_ids || "").split(",").map((s: string) => s.trim()).filter(Boolean));
  const methods = new Set((turma.methods || "pix,card").split(","));

  return (
    <form action={updateTurma} className="flex flex-col gap-8">
      <input type="hidden" name="id" value={turma.id} />

      <FormSection title="Dados da turma">
        <Field
          scope={scope}
          name="name"
          label="Nome da turma"
          defaultValue={turma.name}
          description="Uso interno e, quando a venda online está ligada, na página de matrícula."
        />
        <Field
          scope={scope}
          name="description"
          label="Descrição"
          defaultValue={turma.description ?? ""}
          description="Aparece na matrícula."
        />
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field
            scope={scope}
            name="starts_at"
            label="Início"
            type="date"
            defaultValue={toDate(turma.starts_at)}
          />
          <SelectField scope={scope} name="status" label="Status" defaultValue={turma.status}>
            <option value="open">Aberta</option>
            <option value="closed">Fechada</option>
          </SelectField>
        </div>
      </FormSection>

      <FormSection title="Quais treinamentos esta turma libera">
        {/* Mesmo controle especializado de /admin/cobranca: o valor vai por campo
            oculto, não por radio nativo. Comportamento preservado; o que se
            acrescenta é a semântica de grupo, que faltava. */}
        <div role="radiogroup" aria-label="O que a turma libera" className="grid gap-2 tablet:grid-cols-2">
          {INCLUDES.map((o) => {
            const ativo = includes === o.k;
            return (
              <button
                type="button"
                key={o.k}
                role="radio"
                aria-checked={ativo}
                onClick={() => setIncludes(o.k)}
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
        <input type="hidden" name="includes" value={includes} />

        {includes === "selected" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-label font-medium text-ds-text-2">Treinamentos incluídos</legend>
            {courses.length === 0 ? (
              <p className="text-caption text-ds-text-3">Nenhum curso cadastrado.</p>
            ) : (
              <div className="grid gap-2 tablet:grid-cols-2">
                {courses.map((c) => (
                  <CheckboxField
                    key={c.id}
                    scope={`${scope}-curso-${c.id}`}
                    name="course_ids"
                    label={c.title}
                    value={c.id}
                    defaultChecked={selected.has(c.id)}
                  />
                ))}
              </div>
            )}
          </fieldset>
        )}
      </FormSection>

      <FormSection title="Cobrança da turma">
        <div className="grid gap-4 tablet:grid-cols-3">
          <Field
            scope={scope}
            name="price"
            label="Preço"
            inputMode="decimal"
            defaultValue={turma.price ?? ""}
            placeholder="1600"
            description="Em reais."
          />
          <Field
            scope={scope}
            name="access_days"
            label="Dias de acesso"
            type="number"
            inputMode="numeric"
            defaultValue={turma.access_days ?? ""}
            placeholder="365"
            description="Em branco não expira."
          />
          <Field
            scope={scope}
            name="max_installments"
            label="Máximo de parcelas"
            type="number"
            inputMode="numeric"
            defaultValue={turma.max_installments ?? 12}
            description="Somente no cartão."
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-label font-medium text-ds-text-2">Formas de pagamento</legend>
          <div className="flex flex-col gap-3 tablet:flex-row tablet:gap-x-8">
            <CheckboxField scope={scope} name="m_pix" label="PIX" description="À vista, com desconto." defaultChecked={methods.has("pix")} />
            <CheckboxField scope={scope} name="m_card" label="Cartão" description="Parcelado até o limite acima." defaultChecked={methods.has("card")} />
          </div>
          <p className="text-caption text-ds-text-3">
            Boleto está desativado. O desconto do PIX é configurado em Matrícula.
          </p>
        </fieldset>

        <CheckboxField
          scope={scope}
          name="online_sale"
          label="Vender esta turma na página pública de matrícula"
          defaultChecked={turma.online_sale}
        />
      </FormSection>

      <FormActions>
        <Button type="submit">Salvar turma</Button>
      </FormActions>
    </form>
  );
}
