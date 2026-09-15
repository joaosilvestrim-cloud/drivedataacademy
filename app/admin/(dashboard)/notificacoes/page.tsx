import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/primitives";
import { PageHeader, Alert } from "@/components/ui/layout";
import { CheckboxField, TextareaField, FormSection, FormActions } from "@/components/ui/form";
import { lerConfigAvisos, TIPOS_AVISO, type TipoAviso } from "@/lib/notificacoes";
import { salvarNotificacoes } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificacoesAdmin({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const cfg = await lerConfigAvisos(createAdminClient());
  const tipos = Object.keys(TIPOS_AVISO) as TipoAviso[];

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <PageHeader context="Sistema" title="Notificações do time" />
        <p className="mt-2 max-w-2xl text-body-sm text-ds-text-2">
          Escolha quais avisos chegam por e-mail e para quem. Isso vale só para avisos ao time. E-mails para alunos (código de acesso, acesso liberado, resposta de chamado) continuam sendo enviados normalmente.
        </p>
      </div>

      {searchParams?.ok && <Alert tone="accent">{searchParams.ok}</Alert>}
      {searchParams?.error && <Alert tone="danger">{searchParams.error}</Alert>}
      {!cfg.salva && (
        <Alert tone="info">Ainda sem configuração salva. Hoje todos os avisos estão ligados e vão para {cfg.destinatarios[0] || "ninguém (ADMIN_EMAILS vazio)"}.</Alert>
      )}

      <form action={salvarNotificacoes} className="flex flex-col gap-10">
        <FormSection title="Avisos" description="Desmarque para parar de receber. Os chamados e pedidos continuam aparecendo no admin, com o menu piscando.">
          {tipos.map((k) => (
            <CheckboxField
              key={k}
              scope="avisos"
              name={`ativo_${k}`}
              label={TIPOS_AVISO[k].titulo}
              description={TIPOS_AVISO[k].descricao}
              defaultChecked={cfg.ativos[k]}
            />
          ))}
        </FormSection>

        <FormSection title="Quem recebe">
          <TextareaField
            scope="avisos"
            name="destinatarios"
            label="E-mails"
            rows={4}
            defaultValue={cfg.destinatarios.join("\n")}
            description="Um por linha. Em branco, nenhum aviso é enviado."
          />
        </FormSection>

        <FormActions>
          <Button type="submit">Salvar notificações</Button>
        </FormActions>
      </form>
    </div>
  );
}
