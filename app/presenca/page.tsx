import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { liveDePresenca, cargaDaLive, prazoDaLive, prazoEncerrado, PRAZO_DIAS } from "@/lib/presenca";
import { registrarPresenca } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Presença na live · DriveData Academy",
  description: "Confirme sua presença na live e receba o certificado de participação.",
  robots: { index: false, follow: false },
};

const FUSO = "America/Sao_Paulo";
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso));
const dia = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", timeZone: FUSO }).format(d);

function Campo({
  name,
  label,
  ajuda,
  type = "text",
  required = false,
  autoComplete,
}: {
  name: string;
  label: string;
  ajuda?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-brand-green"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-600 focus:border-brand-green"
      />
      {ajuda && <span className="text-xs text-slate-500">{ajuda}</span>}
    </label>
  );
}

export default async function PresencaPage({ searchParams }: { searchParams: { live?: string; erro?: string } }) {
  const admin = createAdminClient();
  const { live, aberta } = await liveDePresenca(admin, searchParams.live);

  if (!live) {
    return (
      <Aviso titulo="Nenhuma live com certificado no momento">
        <p className="mt-3 text-slate-400">
          A confirmação de presença abre meia hora antes da transmissão. Veja a próxima na{" "}
          <Link href="/#ao-vivo" className="text-brand-green underline underline-offset-4">grade de transmissões</Link>.
        </p>
      </Aviso>
    );
  }

  if (!aberta && prazoEncerrado(live)) {
    return (
      <Aviso titulo="O prazo deste certificado terminou">
        <p className="mt-3 text-slate-400">
          O certificado de <span className="text-white">{live.title}</span> podia ser emitido até {dia(prazoDaLive(live))}. São {PRAZO_DIAS} dias corridos depois da transmissão.
        </p>
        <p className="mt-3 text-slate-400">
          Nas próximas lives, emita o seu no mesmo dia. A grade está na{" "}
          <Link href="/#ao-vivo" className="text-brand-green underline underline-offset-4">página inicial</Link>.
        </p>
      </Aviso>
    );
  }

  if (!aberta) {
    return (
      <Aviso titulo="A presença ainda não abriu">
        <p className="mt-3 text-slate-400">
          <span className="text-white">{live.title}</span> começa {quando(live.starts_at)}. Leia o QR code de novo quando a transmissão estiver no ar.
        </p>
      </Aviso>
    );
  }

  const carga = cargaDaLive(live);

  return (
    <main className="min-h-screen bg-ink-900 px-6 py-14">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Link href="/" aria-label="DriveData Academy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="DriveData Academy" className="h-9 w-auto" />
          </Link>
          <p className="mt-10 text-sm text-slate-400">{quando(live.starts_at)} · ao vivo</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{live.title}</h1>
          <p className="mt-4 max-w-md text-slate-300/90">
            Confirme sua presença e receba o certificado de participação no seu nome, com código de validação.
            {carga ? ` Carga horária de ${carga}.` : ""}
          </p>

          <ol className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="font-mono text-brand-green">1</span>
              <span>Preencha o formulário com o nome que deve sair no certificado.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-brand-green">2</span>
              <span>{live.attendance_code ? "Digite a palavra-chave dita na transmissão." : "Confirme o envio."}</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-brand-green">3</span>
              <span>O certificado abre na hora e também vai para o seu e-mail.</span>
            </li>
          </ol>

          <p className="mt-6 text-sm text-amber-300/90">
            Você tem até {dia(prazoDaLive(live))} para emitir. Depois desse prazo o formulário fecha.
          </p>
        </div>

        <form action={registrarPresenca} className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-ink-800/60 p-6 sm:p-8">
          <input type="hidden" name="live_id" value={live.id} />

          {searchParams.erro && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
              {searchParams.erro}
            </p>
          )}

          <Campo name="name" label="Nome completo" required autoComplete="name" ajuda="É exatamente assim que sai no certificado." />
          <Campo name="email" label="E-mail" type="email" required autoComplete="email" ajuda="Enviamos o certificado para cá." />
          <Campo name="phone" label="WhatsApp" type="tel" autoComplete="tel" />

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo name="company" label="Empresa" autoComplete="organization" />
            <Campo name="role" label="Cargo ou área" autoComplete="organization-title" />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-200">O que você quer resolver com dados?</span>
            <textarea
              name="goal"
              rows={3}
              className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-600 focus:border-brand-green"
            />
            <span className="text-xs text-slate-500">Opcional. Ajuda a escolher os próximos temas.</span>
          </label>

          {live.attendance_code && (
            <Campo name="code" label="Palavra-chave da live" required ajuda="Dita durante a transmissão. Prova que você estava assistindo." />
          )}

          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input type="checkbox" name="consent" defaultChecked className="mt-1 h-4 w-4 accent-brand-green" />
            <span>Quero receber os avisos das próximas lives e materiais da DriveData Academy.</span>
          </label>

          <button
            type="submit"
            className="rounded-xl bg-brand-green px-6 py-3.5 font-semibold text-ink-900 transition-colors hover:bg-white"
          >
            Emitir meu certificado
          </button>
        </form>
      </div>
    </main>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-900 px-6 text-center">
      <div className="max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="DriveData Academy" className="mx-auto h-9 w-auto" />
        <h1 className="mt-8 font-display text-2xl font-bold text-white">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
