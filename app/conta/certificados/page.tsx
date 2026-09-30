import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
}

export default async function CertificadosPage() {
  const user = await usuarioAtual();
  // Sem sessão a consulta voltava vazia e a página dizia "nenhum certificado",
  // que é resposta errada para quem só não entrou ainda.
  if (!user) redirect("/entrar");

  // A leitura continua pelo cliente com sessão: a RLS é que limita ao aluno.
  const supabase = createClient();
  const { data: certs } = await supabase
    .from("certificates")
    .select("code, course_title, created_at")
    .order("created_at", { ascending: false });

  const rows = certs ?? [];

  return (
    <div>
      <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-obsidian">{tr("Meus certificados")}</h1>
      <p className="mt-1 text-sm text-slate-400">{tr("Suas conquistas na DriveData Academy.")}</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-[20px] border border-dashed bg-papel border-tinta/20 px-6 py-16 text-center">
          <p className="font-medium text-tinta">{tr("Você ainda não tem certificados.")}</p>
          <p className="mt-1 text-sm text-slate-400">{tr("Conclua um curso para emitir o seu.")}</p>
          <Link href="/conta/cursos" className="mt-5 inline-block rounded-xl border border-tinta/10 bg-papel px-5 py-2.5 text-sm font-medium text-tinta hover:border-acento/50 hover:text-acento">
            {tr("Ver cursos")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {rows.map((c: any) => (
            <Link key={c.code} href={`/certificado/${c.code}`} className="card-hover bg-papel overflow-hidden rounded-3xl border border-tinta/8">
              <div className="h-1.5 w-full bg-marca-verde" />
              <div className="p-6">
                <p className="text-xs font-semibold text-marca">{tr("Certificado")}</p>
                <h3 className="mt-2 font-display text-lg font-bold text-tinta">{c.course_title}</h3>
                <p className="mt-1 text-sm text-slate-400">{tr("Emitido em")} {fmt(c.created_at)}</p>
                <p className="mt-3 font-mono text-xs text-slate-500">{c.code}</p>
                <span className="mt-4 inline-block text-sm font-medium text-acento">{tr("Ver certificado →")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
