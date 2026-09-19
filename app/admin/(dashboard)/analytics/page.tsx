import { PageHeader } from "@/components/ui/layout";
import { LinkFilter } from "@/components/ui/filter";
import Videos from "./Videos";
import Engajamento from "./Engajamento";
import Pagamentos from "./Pagamentos";

export const dynamic = "force-dynamic";

/* Analytics de alunos, em três perguntas: o que assistem, quanto aparecem e
   quem continua pagando. Cada aba lê só o que precisa. */

const ABAS = [
  { key: "videos", label: "Vídeos e retenção" },
  { key: "engajamento", label: "Acessos e horários" },
  { key: "pagamentos", label: "Recorrência de pagamento" },
];
const PERIODOS = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
];

export default async function AnalyticsAlunos({ searchParams }: { searchParams: { aba?: string; periodo?: string; curso?: string } }) {
  const aba = ABAS.some((a) => a.key === searchParams?.aba) ? searchParams.aba! : "videos";
  const periodo = PERIODOS.some((p) => p.key === searchParams?.periodo) ? searchParams.periodo! : "30";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context="Administração"
        title="Analytics de alunos"
        lede="Retenção dos vídeos, frequência e horário de acesso, e quem continua pagando a mensalidade. A equipe fica fora das contas."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkFilter label="Escolher análise" basePath="/admin/analytics" param="aba" options={ABAS} active={aba} extra={{ periodo }} />
        {aba !== "pagamentos" && (
          <LinkFilter label="Período" basePath="/admin/analytics" param="periodo" options={PERIODOS} active={periodo} extra={{ aba, curso: searchParams?.curso }} />
        )}
      </div>

      {aba === "videos" && <Videos dias={Number(periodo)} cursoSel={searchParams?.curso} />}
      {aba === "engajamento" && <Engajamento dias={Number(periodo)} />}
      {aba === "pagamentos" && <Pagamentos />}
    </div>
  );
}
