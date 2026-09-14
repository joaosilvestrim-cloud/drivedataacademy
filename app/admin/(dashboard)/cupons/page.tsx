import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Badge, Status } from "@/components/ui/primitives";
import { PageHeader, ErrorState, EmptyState, Alert } from "@/components/ui/layout";
import { Field, TextareaField, SelectField, CheckboxField, FormActions } from "@/components/ui/form";
import { salvarCupom, excluirCupom } from "./actions";

export const dynamic = "force-dynamic";

type Cupom = {
  id: string;
  code: string;
  note: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: "ambos" | "mensal" | "anual";
  monthly_scope: "primeira" | "todas";
  restricted_email: string | null;
  max_uses: number | null;
  expires_at: string | null;
  active: boolean;
};

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// timestamptz -> "YYYY-MM-DD" no horário de Brasília, para o input de data.
function dataLocal(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function resumo(c: Cupom) {
  const valor = c.discount_type === "fixed" ? `${brl(c.discount_value)} OFF` : `${Number(c.discount_value).toLocaleString("pt-BR")}% OFF`;
  const plano = c.applies_to === "ambos" ? "mensal e anual" : c.applies_to;
  const mensal = c.applies_to !== "anual" ? (c.monthly_scope === "todas" ? " · todas as mensalidades" : " · 1ª mensalidade") : "";
  return `${valor} · ${plano}${mensal}`;
}

function CupomForm({ scope, c }: { scope: string; c?: Cupom }) {
  const editando = !!c;
  return (
    <form action={salvarCupom} className="flex flex-col gap-5">
      {editando && <input type="hidden" name="id" value={c!.id} />}

      <div className="grid gap-4 tablet:grid-cols-[1fr_10rem_9rem]">
        <Field scope={scope} name="code" label="Código" required defaultValue={c?.code} placeholder="BEMVINDO10" description="O que a pessoa digita. Vira maiúsculas sozinho." />
        <SelectField scope={scope} name="discount_type" label="Tipo" defaultValue={c?.discount_type || "percent"}>
          <option value="percent">Porcentagem</option>
          <option value="fixed">Valor em reais</option>
        </SelectField>
        <Field scope={scope} name="discount_value" label="Desconto" required inputMode="decimal" defaultValue={c?.discount_value ?? ""} placeholder="10" description="10 = 10% ou R$ 10." />
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
        <SelectField scope={scope} name="applies_to" label="Vale para" defaultValue={c?.applies_to || "ambos"}>
          <option value="ambos">Mensal e anual</option>
          <option value="mensal">Só mensal</option>
          <option value="anual">Só anual</option>
        </SelectField>
        <SelectField scope={scope} name="monthly_scope" label="No mensal, o desconto vale em" defaultValue={c?.monthly_scope || "primeira"} description="Ignorado quando o cupom é só do anual.">
          <option value="primeira">Só na primeira mensalidade</option>
          <option value="todas">Todas as mensalidades</option>
        </SelectField>
      </div>

      <div className="grid gap-4 tablet:grid-cols-[1fr_9rem_11rem]">
        <Field scope={scope} name="restricted_email" label="Só para este e-mail" type="email" defaultValue={c?.restricted_email ?? ""} placeholder="pessoa@empresa.com" description="Vazio: qualquer pessoa pode usar." />
        <Field scope={scope} name="max_uses" label="Limite de usos" inputMode="numeric" defaultValue={c?.max_uses ?? ""} description="Vazio: sem limite." />
        <Field scope={scope} name="expires_at" label="Válido até" type="date" defaultValue={dataLocal(c?.expires_at ?? null)} description="Inclui o dia todo." />
      </div>

      <TextareaField scope={scope} name="note" label="Anotação interna" rows={2} defaultValue={c?.note ?? ""} description="Para quem é e por quê. O aluno não vê." />

      <CheckboxField scope={scope} name="active" label="Ativo" defaultChecked={editando ? c!.active : true} description="Desmarcado, o cupom para de funcionar na hora." />

      <FormActions destructive={editando ? <Button formAction={excluirCupom} variant="danger" size="sm">Excluir</Button> : undefined}>
        <Button type="submit" size={editando ? "sm" : "md"}>{editando ? "Salvar alterações" : "Criar cupom"}</Button>
      </FormActions>
    </form>
  );
}

export default async function CuponsAdmin({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let cupons: Cupom[] = [];
  const usos: Record<string, { n: number; total: number }> = {};
  try {
    const supabase = createAdminClient();
    const [{ data, error }, { data: red }] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("coupon_redemptions").select("coupon_id, discount_amount"),
    ]);
    if (error) throw new Error(error.message);
    cupons = (data ?? []) as Cupom[];
    for (const r of red ?? []) {
      const u = (usos[r.coupon_id] ||= { n: 0, total: 0 });
      u.n += 1;
      u.total += Number(r.discount_amount || 0);
    }
  } catch (e) {
    return (
      <div>
        <PageHeader context="Vendas" title="Cupons" />
        <ErrorState
          title="Não foi possível carregar os cupons"
          description={(e instanceof Error ? e.message : "Erro desconhecido.") + " Se a tabela ainda não existe, rode a migration de cupons no Supabase."}
        />
      </div>
    );
  }

  const agora = Date.now();

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div>
        <PageHeader context="Vendas" title="Cupons" />
        <p className="mt-2 max-w-2xl text-body-sm text-ds-text-2">
          Crie códigos de desconto para a página de assinatura. Pode ser para todo mundo ou só para uma pessoa. Um uso só é
          contado quando o pagamento confirma, e nenhum cupom derruba o preço abaixo de R$ 5, que é o mínimo do Asaas.
        </p>
      </div>

      {searchParams?.ok && <Alert tone="accent">{searchParams.ok}</Alert>}
      {searchParams?.error && <Alert tone="danger">{searchParams.error}</Alert>}

      <details open={cupons.length === 0} className="rounded-srf border border-ds-line p-5">
        <summary className="cursor-pointer text-component font-semibold text-ds-text">Novo cupom</summary>
        <div className="mt-5">
          <CupomForm scope="novo-cupom" />
        </div>
      </details>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ds-line pb-2.5">
          <h2 className="font-display text-section font-semibold text-ds-text">Cupons criados</h2>
          <span className="text-meta uppercase text-ds-text-3">{cupons.length} {cupons.length === 1 ? "cupom" : "cupons"}</span>
        </div>

        {cupons.length === 0 ? (
          <EmptyState title="Nenhum cupom ainda" description="Crie o primeiro acima e mande o código para quem quiser." />
        ) : (
          <ul className="flex flex-col">
            {cupons.map((c) => {
              const u = usos[c.id] || { n: 0, total: 0 };
              const expirado = !!c.expires_at && Date.parse(c.expires_at) < agora;
              const esgotado = !!c.max_uses && u.n >= c.max_uses;
              const estado = !c.active ? { t: "neutral" as const, l: "Desativado" } : expirado ? { t: "attention" as const, l: "Expirado" } : esgotado ? { t: "attention" as const, l: "Esgotado" } : { t: "accent" as const, l: "Ativo" };
              return (
                <li key={c.id} className="border-b border-ds-line-soft py-4">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-mono text-body-sm font-semibold text-ds-text">{c.code}</span>
                      <Status tone={estado.t}>{estado.l}</Status>
                      <span className="text-caption text-ds-text-2">{resumo(c)}</span>
                      {c.restricted_email && <Badge tone="info">só {c.restricted_email}</Badge>}
                      <span className="ml-auto text-caption text-ds-text-3">
                        <span className="font-mono tabular-nums">{u.n}</span>
                        {c.max_uses ? <>/<span className="font-mono tabular-nums">{c.max_uses}</span></> : null} {u.n === 1 ? "uso" : "usos"}
                        {u.total > 0 && <> · {brl(u.total)} descontados</>}
                      </span>
                    </summary>
                    <div className="mt-5">
                      <CupomForm scope={`cupom-${c.id}`} c={c} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
