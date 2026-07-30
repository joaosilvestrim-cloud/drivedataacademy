import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
}

export default async function CertificadosPage() {
  const supabase = createClient();
  const { data: certs } = await supabase
    .from("certificates")
    .select("code, course_title, created_at")
    .order("created_at", { ascending: false });

  const rows = certs ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Meus certificados</h1>
      <p className="mt-1 text-sm text-slate-400">Suas conquistas na DriveData Academy.</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-medium text-white">Você ainda não tem certificados.</p>
          <p className="mt-1 text-sm text-slate-400">Conclua um curso para emitir o seu.</p>
          <Link href="/cursos" className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:border-brand-green/50 hover:text-brand-green">
            Ver cursos
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {rows.map((c: any) => (
            <Link key={c.code} href={`/certificado/${c.code}`} className="card-hover glass overflow-hidden rounded-3xl border border-white/8">
              <div className="h-1.5 w-full bg-gradient-to-r from-brand-green to-brand-blue" />
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">Certificado</p>
                <h3 className="mt-2 font-display text-lg font-bold text-white">{c.course_title}</h3>
                <p className="mt-1 text-sm text-slate-400">Emitido em {fmt(c.created_at)}</p>
                <p className="mt-3 font-mono text-xs text-slate-500">{c.code}</p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-green">Ver certificado →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
