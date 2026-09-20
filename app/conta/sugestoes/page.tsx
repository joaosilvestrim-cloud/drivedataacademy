import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TICKET_STATUS } from "@/lib/support";
import { PageHeader, SectionHeader, EmptyState, Alert } from "@/components/ui/layout";
import { Button, Status } from "@/components/ui/primitives";
import { Field, TextareaField, SelectField } from "@/components/ui/form";
import { enviarSugestao } from "./actions";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/* Canal aberto de sugestões. Cada envio vira um chamado da categoria
   "sugestao", então o aluno acompanha a resposta no mesmo lugar da Ajuda. */

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

const TOM: Record<string, "attention" | "accent" | "neutral"> = {
  open: "attention",
  answered: "accent",
  read: "neutral",
  resolved: "neutral",
};

export default async function SugestoesPage({ searchParams }: { searchParams: { ok?: string; erro?: string } }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: minhas } = await admin
    .from("support_tickets")
    .select("id, subject, status, updated_at")
    .eq("user_id", user.id)
    .eq("category", "sugestao")
    .order("updated_at", { ascending: false });

  const lista = minhas ?? [];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        context={tr("Sua voz na Academy")}
        title={tr("Sugestões e melhorias")}
        lede={tr("Conta o que está faltando, o que atrapalha e o que você quer ver por aqui. Lemos tudo e respondemos.")}
      />

      {searchParams.ok && <Alert tone="accent">{tr("Sugestão enviada. Obrigado. Você acompanha a resposta aqui embaixo.")}</Alert>}
      {searchParams.erro && <Alert tone="danger">{searchParams.erro}</Alert>}

      <form action={enviarSugestao} className="flex max-w-2xl flex-col gap-5 rounded-srf border border-ds-line p-5">
        <SelectField scope="sug" name="about" label={tr("É sobre o quê?")} defaultValue="plataforma">
          <option value="plataforma">{tr("A plataforma: telas, navegação, algo que não funciona bem")}</option>
          <option value="conteudo">{tr("O conteúdo: temas de aula, materiais, profundidade")}</option>
          <option value="comunidade">{tr("A comunidade: canais, encontros, interação")}</option>
        </SelectField>
        <Field scope="sug" name="subject" label={tr("Resumo em uma linha")} required placeholder={tr("Poder marcar aula como favorita")} />
        <TextareaField
          scope="sug"
          name="message"
          label={tr("Conta com suas palavras")}
          rows={5}
          required
          description={tr("Se for um problema, diz onde aconteceu. Se for uma ideia, diz o que ela resolveria no seu dia.")}
        />
        <div>
          <Button type="submit">{tr("Enviar sugestão")}</Button>
        </div>
      </form>

      <section className="flex flex-col gap-4">
        <SectionHeader title={tr("O que você já enviou")} meta={lista.length ? `${lista.length}` : undefined} />
        {lista.length === 0 ? (
          <EmptyState title={tr("Nada por aqui ainda")} description={tr("A primeira sugestão que você mandar aparece nesta lista, com a resposta do time.")} />
        ) : (
          <ul className="flex flex-col">
            {lista.map((t) => {
              const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
              return (
                <li key={t.id}>
                  <Link
                    href={`/conta/ajuda/${t.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ds-line-soft py-3.5 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                  >
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ds-text">{t.subject}</span>
                    <Status tone={TOM[t.status] ?? "neutral"}>{st.label}</Status>
                    <span className="text-caption text-ds-text-3">{fmt(t.updated_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
