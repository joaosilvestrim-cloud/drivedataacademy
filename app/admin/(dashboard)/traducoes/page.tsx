import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Status } from "@/components/ui/primitives";
import { PageHeader, SectionHeader, EmptyState, Alert } from "@/components/ui/layout";
import { LinkFilter } from "@/components/ui/filter";
import AdminError from "../AdminError";
import { TRADUZIVEIS, type TabelaTraduzivel } from "@/lib/i18n/conteudo";
import { salvarTraducao, traduzirComIA } from "./actions";

export const dynamic = "force-dynamic";

/* Tradução do conteúdo do banco: curso, módulo, aula, live e material.

   A tela é uma lista de registros com um estado só, que é o que importa aqui:
   traduzido, traduzido pela IA e ainda não revisado, ou faltando. Abrir um
   registro mostra o português ao lado do campo de cada idioma, porque traduzir
   sem ver o original é como legendar de ouvido.

   O aluno não é obrigado a esperar por esta tela: campo sem tradução aparece
   em português, e a plataforma funciona. Isto aqui é acabamento. */

const AREAS: { chave: TabelaTraduzivel; rotulo: string; ordem: string; titulo: string }[] = [
  { chave: "courses", rotulo: "Treinamentos", ordem: "position", titulo: "title" },
  { chave: "lessons", rotulo: "Aulas", ordem: "position", titulo: "title" },
  { chave: "live_events", rotulo: "Lives", ordem: "starts_at", titulo: "title" },
  { chave: "materials", rotulo: "Materiais", ordem: "created_at", titulo: "title" },
  { chave: "course_modules", rotulo: "Módulos", ordem: "position", titulo: "title" },
];

const ROTULO_DO_CAMPO: Record<string, string> = {
  title: "Título",
  subtitle: "Subtítulo",
  description: "Descrição",
  level: "Nível",
  content: "Conteúdo",
  cta_text: "Texto do botão",
};

const LONGOS = new Set(["description", "content"]);

type Registro = { id: string } & Record<string, unknown>;
type Traducao = { registro: string; campo: string; idioma: string; texto: string; origem: string };

export default async function TraducoesAdmin({
  searchParams,
}: {
  searchParams: { tabela?: string; registro?: string; ok?: string; error?: string };
}) {
  const area = AREAS.find((a) => a.chave === searchParams?.tabela) ?? AREAS[0];
  const campos = TRADUZIVEIS[area.chave] as readonly string[];

  let registros: Registro[] = [];
  let traducoes: Traducao[] = [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from(area.chave)
      .select(["id", ...campos].join(", "))
      .order(area.ordem, { ascending: area.chave !== "live_events" })
      .limit(300);
    if (error) throw new Error(error.message);
    registros = (data ?? []) as unknown as Registro[];

    const { data: t, error: erroT } = await admin
      .from("content_translations")
      .select("registro, campo, idioma, texto, origem")
      .eq("tabela", area.chave);
    if (erroT) throw new Error(erroT.message);
    traducoes = (t ?? []) as Traducao[];
  } catch (e) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader context="Administração" title="Traduções do conteúdo" />
        <AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode a migration 20260920_traducoes.sql no Supabase."} />
      </div>
    );
  }

  // { registro: { "campo|idioma": {texto, origem} } }
  const porRegistro: Record<string, Record<string, { texto: string; origem: string }>> = {};
  for (const t of traducoes) (porRegistro[t.registro] ??= {})[`${t.campo}|${t.idioma}`] = { texto: t.texto, origem: t.origem };

  /* Quantos campos daquele registro têm texto em português e, desses, quantos
     já têm as duas traduções. Campo vazio no original não conta como falta. */
  function situacao(r: Registro) {
    const comTexto = campos.filter((c) => typeof r[c] === "string" && (r[c] as string).trim());
    const feito = porRegistro[r.id] ?? {};
    const prontos = comTexto.filter((c) => feito[`${c}|en`] && feito[`${c}|es`]);
    const revisados = prontos.filter((c) => feito[`${c}|en`].origem === "humano" && feito[`${c}|es`].origem === "humano");
    return { total: comTexto.length, prontos: prontos.length, revisados: revisados.length, campos: comTexto };
  }

  const contagem: Record<string, number> = {};
  for (const a of AREAS) contagem[a.chave] = 0;
  contagem[area.chave] = registros.length;

  const aberto = registros.find((r) => r.id === searchParams?.registro);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context="Administração"
        title="Traduções do conteúdo"
        lede="O texto fixo da plataforma já vira inglês e espanhol sozinho. O que o time escreve — treinamento, aula, live, material — passa por aqui. O que não for traduzido continua aparecendo em português, então nada quebra por causa de um campo em branco."
      />

      {searchParams?.ok && <Alert tone="accent" title="Pronto">{searchParams.ok}</Alert>}
      {searchParams?.error && <Alert tone="danger" title="Não deu certo">{searchParams.error}</Alert>}

      <LinkFilter
        label="Escolher o que traduzir"
        basePath="/admin/traducoes"
        param="tabela"
        options={AREAS.map((a) => ({ key: a.chave, label: a.rotulo }))}
        active={area.chave}
        counts={contagem}
      />

      {aberto ? (
        <Editor
          area={area}
          registro={aberto}
          campos={situacao(aberto).campos}
          feito={porRegistro[aberto.id] ?? {}}
        />
      ) : (
        <>
          <SectionHeader
            title={area.rotulo}
            action={<span className="text-meta uppercase text-ds-text-3">{registros.length} {registros.length === 1 ? "registro" : "registros"}</span>}
          />
          {registros.length === 0 ? (
            <EmptyState title="Nada para traduzir aqui" description="Quando o time publicar um registro nesta área, ele aparece nesta lista." />
          ) : (
            <ul className="flex flex-col gap-2">
              {registros.map((r) => {
                const s = situacao(r);
                const tom = s.prontos === 0 ? "neutral" : s.revisados === s.total ? "accent" : "attention";
                const rotulo = s.prontos === 0 ? "falta traduzir" : s.revisados === s.total ? "revisado" : `${s.prontos}/${s.total} pela IA`;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-srf border border-ds-line bg-ds-surface px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-body-sm text-ds-text">{String(r[area.titulo] ?? "(sem título)")}</span>
                    <Status tone={tom}>{rotulo}</Status>
                    <a
                      href={`/admin/traducoes?tabela=${area.chave}&registro=${r.id}`}
                      className="text-caption text-ds-info underline decoration-ds-line underline-offset-4"
                    >
                      Abrir
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Editor({
  area,
  registro,
  campos,
  feito,
}: {
  area: { chave: TabelaTraduzivel; rotulo: string; titulo: string };
  registro: Registro;
  campos: string[];
  feito: Record<string, { texto: string; origem: string }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={String(registro[area.titulo] ?? "(sem título)")}
        action={
          <a href={`/admin/traducoes?tabela=${area.chave}`} className="text-caption text-ds-info underline decoration-ds-line underline-offset-4">
            ← Voltar à lista
          </a>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-srf border border-ds-line bg-ds-surface px-4 py-3">
        <form action={traduzirComIA}>
          <input type="hidden" name="tabela" value={area.chave} />
          <input type="hidden" name="registro" value={registro.id} />
          <Button type="submit" variant="secondary" size="sm">Traduzir com IA</Button>
        </form>
        <p className="text-caption text-ds-text-3">
          Escreve os campos vazios nos dois idiomas e marca como não revisado. O que você já corrigiu à mão não é tocado.
        </p>
      </div>

      <form action={salvarTraducao} className="flex flex-col gap-5">
        <input type="hidden" name="tabela" value={area.chave} />
        <input type="hidden" name="registro" value={registro.id} />

        {campos.map((campo) => (
          <div key={campo} className="flex flex-col gap-2 rounded-srf border border-ds-line bg-ds-surface p-4">
            <p className="text-meta uppercase text-ds-text-3">{ROTULO_DO_CAMPO[campo] ?? campo}</p>
            <p className="whitespace-pre-line rounded-srf border border-ds-line-soft bg-ds-raised p-3 text-body-sm text-ds-text-2">
              {String(registro[campo] ?? "")}
            </p>
            <div className="grid gap-3 tablet:grid-cols-2">
              {(["en", "es"] as const).map((idioma) => {
                const atual = feito[`${campo}|${idioma}`];
                return (
                  <label key={idioma} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2 text-caption text-ds-text-3">
                      {idioma === "en" ? "Inglês" : "Espanhol"}
                      {atual?.origem === "ia" && <Status tone="attention">da IA, sem revisão</Status>}
                    </span>
                    {LONGOS.has(campo) ? (
                      <textarea
                        name={`${campo}__${idioma}`}
                        defaultValue={atual?.texto ?? ""}
                        rows={5}
                        className="rounded-srf border border-ds-line bg-ds-raised p-2.5 text-body-sm text-ds-text"
                      />
                    ) : (
                      <input
                        name={`${campo}__${idioma}`}
                        defaultValue={atual?.texto ?? ""}
                        className="rounded-srf border border-ds-line bg-ds-raised p-2.5 text-body-sm text-ds-text"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm">Salvar tradução</Button>
          <span className="text-caption text-ds-text-3">Salvar marca os campos como revisados por gente. Deixar em branco volta o campo ao português.</span>
        </div>
      </form>
    </div>
  );
}
