import { PageHeader, Alert } from "@/components/ui/layout";
import { Button } from "@/components/ui/primitives";
import { Field, TextareaField, FormActions } from "@/components/ui/form";
import { NOMES_PADRAO, trocasDoAdmin, LIMITE_NOME, LIMITE_DESC } from "@/lib/ferramentas-nomes";
import { salvarNomes } from "./actions";

export const dynamic = "force-dynamic";

/* Nomes das ferramentas.

   O que for escrito aqui aparece no cartão da vitrine de ferramentas, no
   título da página da ferramenta e no painel de uso. Campo em branco usa o
   nome padrão, que fica visível logo abaixo para ninguém esquecer qual era. */

export default async function NomesFerramentas({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const trocas = await trocasDoAdmin();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        context="Administração"
        title="Nomes das ferramentas"
        lede="Troque o nome e a descrição que o aluno vê. Vale para o cartão em Ferramentas, o título da página da ferramenta e o painel de uso. Deixe em branco para voltar ao padrão."
      />

      {searchParams?.ok && <Alert tone="accent" title="Salvo">Os novos nomes já aparecem para os alunos.</Alert>}
      {searchParams?.error && <Alert tone="danger" title="Não foi possível salvar">{searchParams.error}</Alert>}

      <form action={salvarNomes} className="flex flex-col gap-4">
        {Object.entries(NOMES_PADRAO).map(([chave, padrao]) => {
          const trocado = !!(trocas[chave]?.nome || trocas[chave]?.desc);
          return (
            <fieldset key={chave} className="flex flex-col gap-4 rounded-srf border border-ds-line bg-ds-surface p-4">
              <legend className="px-1 text-meta uppercase text-ds-text-3">
                {padrao.nome}
                {trocado && <span className="ml-2 rounded-ctl bg-ds-accent/15 px-1.5 py-0.5 text-ds-accent">personalizado</span>}
              </legend>
              <Field
                scope={chave}
                name={`nome:${chave}`}
                label="Nome"
                maxLength={LIMITE_NOME}
                defaultValue={trocas[chave]?.nome ?? ""}
                placeholder={padrao.nome}
                description={`Padrão: ${padrao.nome}. Até ${LIMITE_NOME} caracteres.`}
              />
              <TextareaField
                scope={chave}
                name={`desc:${chave}`}
                label="Descrição do cartão"
                rows={2}
                maxLength={LIMITE_DESC}
                defaultValue={trocas[chave]?.desc ?? ""}
                placeholder={padrao.desc}
                description={`Em branco usa a descrição padrão. Até ${LIMITE_DESC} caracteres.`}
              />
            </fieldset>
          );
        })}

        <FormActions>
          <Button type="submit">Salvar nomes</Button>
        </FormActions>
      </form>
    </div>
  );
}
