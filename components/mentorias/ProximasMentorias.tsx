import Link from "next/link";
import { Radio } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import s from "./mentorias.module.css";

/* Faixa "Próximas Mentorias".

   É a versão viva do banner: mesma leitura, mesmos quatro pilares, só que os
   dados vêm de live_events. Um PNG com as datas impressas envelhece na primeira
   remarcação e não se lê no celular; esta faixa acompanha o banco sozinha.

   Server Component. A consulta usa o cliente de serviço porque a política de
   leitura de live_events exige sessão, e a home pública não tem uma. Só saem
   daqui os campos que já apareciam no banner. */

type Mentoria = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
};

const FUSO = "America/Sao_Paulo";

function dataCurta(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: FUSO }).format(new Date(iso));
}

function hora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso));
}

/* A descrição guarda duas frases: a chamada e o que o aluno sai fazendo. No
   banner elas aparecem em pesos diferentes, então separo na primeira quebra de
   linha e caio para o ponto final quando não houver quebra. */
function partirDescricao(d: string | null) {
  const texto = (d || "").trim();
  if (!texto) return { chamada: null as string | null, promessa: null as string | null };
  const porLinha = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  if (porLinha.length > 1) return { chamada: porLinha[0], promessa: porLinha.slice(1).join(" ") };
  const corte = texto.indexOf(". ");
  if (corte > 0) return { chamada: texto.slice(0, corte + 1), promessa: texto.slice(corte + 2) };
  return { chamada: texto, promessa: null };
}

export default async function ProximasMentorias({
  limite = 4,
  cta = { label: "Ver agenda completa", href: "/conta/agenda" },
  // A home pública põe a própria margem; a área do aluno já vive dentro de um
  // container, então lá a faixa entra sem moldura.
  className = "relative mx-auto max-w-7xl px-6 py-10",
}: {
  limite?: number;
  className?: string;
  /* O destino muda com quem está olhando: aluno vai para a agenda, visitante
     vai para a entrada. O rótulo acompanha, senão o link mente. */
  cta?: { label: string; href: string };
}) {
  let mentorias: Mentoria[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("live_events")
      .select("id, title, description, starts_at")
      .eq("published", true)
      .eq("kind", "mentoria")
      // Tolerância de duas horas: a mentoria que começou agora continua na
      // faixa em vez de sumir no meio da própria transmissão.
      .gte("starts_at", new Date(Date.now() - 2 * 3600e3).toISOString())
      .order("starts_at")
      .limit(limite);
    mentorias = data ?? [];
  } catch {
    mentorias = [];
  }

  // Sem mentoria marcada a faixa não aparece. Melhor ausência do que moldura
  // vazia prometendo agenda que não existe.
  if (mentorias.length === 0) return null;

  return (
    <section aria-labelledby="proximas-mentorias" className={className}>
      <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-cyan/15 bg-ink-900">
        {/* Fundo: um degradê fixo e um brilho que atravessa devagar. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_18%_0%,#0d2b3f_0%,#071019_58%,#04070f_100%)]" />
        <div aria-hidden className={`pointer-events-none absolute -inset-x-1/4 -top-1/2 h-[200%] ${s.brilho} bg-[radial-gradient(42%_38%_at_50%_50%,rgba(34,211,238,0.10)_0%,transparent_70%)]`} />

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${s.titulo}`}>
            <h2 id="proximas-mentorias" className="font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              Próximas Mentorias
            </h2>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5">
              <span aria-hidden className={`block h-2 w-2 rounded-full bg-red-500 ${s.ponto}`} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Ao vivo</span>
            </span>
          </div>

          <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {mentorias.map((m, i) => {
              const { chamada, promessa } = partirDescricao(m.description);
              return (
                <li
                  key={m.id}
                  className={`relative pl-5 ${s.card}`}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1 h-[calc(100%-0.25rem)] w-px bg-gradient-to-b from-brand-cyan/70 via-brand-cyan/25 to-transparent ${s.regua}`}
                    style={{ "--i": i } as React.CSSProperties}
                  />
                  <p className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    <Radio size={12} strokeWidth={2} aria-hidden className="text-brand-cyan/70" />
                    <time dateTime={m.starts_at} className="text-[0.7rem] font-medium tabular-nums text-slate-300">
                      {dataCurta(m.starts_at)} · {hora(m.starts_at)}
                    </time>
                  </p>
                  <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-brand-cyan">{m.title}</h3>
                  {chamada && <p className="mt-2 text-[0.8rem] font-medium leading-snug text-slate-200">{chamada}</p>}
                  {promessa && <p className="mt-1.5 text-[0.8rem] leading-relaxed text-slate-400">{promessa}</p>}
                </li>
              );
            })}
          </ul>

          <p className="mt-8 border-t border-white/8 pt-5 text-sm">
            <Link
              href={cta.href}
              className="inline-flex items-center gap-2 font-medium text-brand-cyan underline decoration-brand-cyan/30 underline-offset-4 transition-colors hover:decoration-brand-cyan"
            >
              {cta.label}
              <span aria-hidden>→</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
