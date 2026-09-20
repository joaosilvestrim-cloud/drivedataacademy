import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import Forja from "./Forja";
import { nomeDaFerramenta } from "@/lib/ferramentas-nomes";

export const dynamic = "force-dynamic";

export default async function ForjaPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Ferramentas")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{await nomeDaFerramenta("forja")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {tr("A tabela de calendário e as medidas de tempo do seu modelo, escritas com o nome das suas tabelas e prontas para colar. Com ano fiscal, feriados nacionais de verdade e um comentário em cada decisão, para você entender o que está colando.")}
      </p>

      <Forja />

      <section className="mt-12 grid gap-5 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Feriado móvel no lugar certo")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Carnaval, Sexta-feira Santa e Corpus Christi andam com a Páscoa. A Forja calcula a Páscoa de cada ano e monta a lista, então &quot;dia útil&quot; passa a ser dia útil de verdade.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Ano fiscal tratado")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Escolhendo um mês diferente de janeiro, entram as colunas de ano e mês fiscal e o YTD passa a fechar no mês certo, que é o detalhe que quase todo modelo erra.")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-green">{tr("Sai do Raio-X e chega aqui")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {tr("Se o")}{" "}
            <Link href="/conta/ferramentas/raio-x" className="text-brand-teal underline decoration-white/20 underline-offset-4">
              Raio-X
            </Link>{" "}
            {tr("apontou que falta calendário no seu modelo, este é o conserto.")}
          </p>
        </div>
      </section>
    </div>
  );
}
