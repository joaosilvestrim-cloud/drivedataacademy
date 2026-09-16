import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, EmptyState, TableWrap, Th, Td, Alert } from "@/components/ui/layout";
import { Badge, Button } from "@/components/ui/primitives";
import { LinkFilter } from "@/components/ui/filter";
import ExportCsv from "../ExportCsv";
import { alternarRevogacao } from "./actions";

export const dynamic = "force-dynamic";

/* Todos os certificados emitidos, de curso e de live. É a tela para responder
   "essa pessoa tem certificado mesmo?" sem abrir o banco. */

const FUSO = "America/Sao_Paulo";
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO }).format(new Date(iso));

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "live", label: "De live" },
  { key: "curso", label: "De curso" },
  { key: "revogados", label: "Revogados" },
];

export default async function CertificadosPage({
  searchParams,
}: {
  searchParams: { tipo?: string; q?: string; ok?: string };
}) {
  const admin = createAdminClient();
  const filtro = searchParams.tipo || "todos";
  const busca = (searchParams.q || "").trim().toLowerCase();

  const { data: certsRaw } = await admin
    .from("certificates")
    .select("id, code, kind, student_name, course_title, workload, email, user_id, created_at, revoked, expires_at, module_id")
    .order("created_at", { ascending: false })
    .limit(1000);

  const certs = certsRaw ?? [];

  // E-mail do aluno: o certificado de live já guarda; o de curso vem da conta.
  const idsSemEmail = Array.from(new Set(certs.filter((c) => !c.email && c.user_id).map((c) => c.user_id as string)));
  const emailPorUsuario: Record<string, string> = {};
  if (idsSemEmail.length) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) if (u.email) emailPorUsuario[u.id] = u.email;
  }

  const linhas = certs.map((c) => ({
    ...c,
    emailFinal: c.email || (c.user_id ? emailPorUsuario[c.user_id] : "") || "",
    tipo: c.kind === "live" ? "live" : c.module_id ? "modulo" : "curso",
  }));

  const contagem = {
    todos: linhas.length,
    live: linhas.filter((l) => l.tipo === "live").length,
    curso: linhas.filter((l) => l.tipo !== "live").length,
    revogados: linhas.filter((l) => l.revoked).length,
  };

  const filtradas = linhas
    .filter((l) =>
      filtro === "todos" ? true : filtro === "revogados" ? l.revoked : filtro === "live" ? l.tipo === "live" : l.tipo !== "live"
    )
    .filter((l) =>
      !busca ||
      [l.student_name, l.course_title, l.code, l.emailFinal].some((campo) => (campo || "").toLowerCase().includes(busca))
    );

  const csv = filtradas.map((l) => ({
    emitido_em: quando(l.created_at),
    tipo: l.tipo,
    nome: l.student_name || "",
    email: l.emailFinal,
    titulo: l.course_title || "",
    carga: l.workload || "",
    codigo: l.code,
    situacao: l.revoked ? "revogado" : "valido",
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Certificados"
        lede="Tudo que foi emitido, de curso e de live, com o código de validação e a situação."
        action={csv.length > 0 ? <ExportCsv rows={csv} filename="certificados.csv" /> : undefined}
      />

      {searchParams.ok && <Alert tone="accent">{searchParams.ok}</Alert>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <LinkFilter
          label="Filtrar certificados"
          basePath="/admin/certificados"
          param="tipo"
          options={FILTROS}
          active={filtro}
          counts={contagem}
        />
        <form className="flex items-end gap-2">
          {filtro !== "todos" && <input type="hidden" name="tipo" value={filtro} />}
          <label className="flex flex-col gap-1.5">
            <span className="text-label font-medium text-ds-text-2">Buscar</span>
            <input
              name="q"
              defaultValue={searchParams.q || ""}
              placeholder="nome, e-mail, título ou código"
              className="w-64 rounded-ctl border border-ds-line bg-ds-surface px-3 py-2 text-body-sm text-ds-text outline-none focus:border-ds-accent"
            />
          </label>
          <Button type="submit" size="sm">Buscar</Button>
        </form>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          title="Nenhum certificado por aqui"
          description="Os de live saem pelo formulário de presença. Os de curso saem quando o aluno conclui as aulas."
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[60rem] border-collapse text-left">
            <thead>
              <tr>
                <Th>Emitido</Th>
                <Th>Aluno</Th>
                <Th>Título</Th>
                <Th>Tipo</Th>
                <Th>Código</Th>
                <Th>Situação</Th>
                <Th><span className="sr-only">Ações</span></Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap text-ds-text-3">{quando(l.created_at)}</Td>
                  <Td>
                    <span className="block font-medium text-ds-text">{l.student_name || "sem nome"}</span>
                    <span className="block text-caption text-ds-text-3">{l.emailFinal || "sem e-mail"}</span>
                  </Td>
                  <Td>
                    <span className="block text-ds-text-2">{l.course_title}</span>
                    {l.workload && <span className="block text-caption text-ds-text-3">{l.workload}</span>}
                  </Td>
                  <Td>
                    {l.tipo === "live" ? (
                      <Badge tone="info">live</Badge>
                    ) : l.tipo === "modulo" ? (
                      <Badge tone="neutral">módulo</Badge>
                    ) : (
                      <Badge tone="accent">curso</Badge>
                    )}
                  </Td>
                  <Td>
                    <a
                      href={`/certificado/${l.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-ds-info underline decoration-ds-line underline-offset-4"
                    >
                      {l.code}
                    </a>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {l.revoked ? <Badge tone="danger">revogado</Badge> : <Badge tone="accent">válido</Badge>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <form action={alternarRevogacao}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="revogar" value={l.revoked ? "false" : "true"} />
                      <button
                        type="submit"
                        className="rounded-ctl border border-ds-line px-2.5 py-1 text-caption text-ds-text-2 transition-colors hover:border-ds-accent hover:text-ds-text"
                      >
                        {l.revoked ? "Reativar" : "Revogar"}
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <p className="text-body-sm text-ds-text-3">
        Os certificados de live vêm do formulário de presença, em{" "}
        <Link href="/admin/presencas" className="text-ds-info underline decoration-ds-line underline-offset-4">Presenças</Link>. Revogar
        mantém o link no ar, mas a página passa a mostrar que o certificado não vale mais.
      </p>
    </div>
  );
}
