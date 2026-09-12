"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

/* Lista da Vitrine com busca e filtro.

   O card virou link para a página do aluno. Antes o único clique era o do
   portfólio, então quem não tinha portfólio virava um cartão morto.

   As especialidades vêm do campo `skills` do perfil, que é texto separado por
   vírgula. Não inventei estrutura nova: é o mesmo campo que o aluno preenche em
   /conta/perfil e que o extrator de currículo já alimenta. */

export type Membro = {
  id: string;
  full_name: string;
  headline: string | null;
  avatar_url: string | null;
  pts: number;
  badges: { key: string; label: string }[];
  since: string | null;
  skills: string[];
};

const BADGE_ICONS: Record<string, string> = {
  fundador: "M12 2l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z",
  top: "M8 21h8M12 17v4M6 4h12v3a6 6 0 01-12 0V4zM6 5H3v1a3 3 0 003 3M18 5h3v1a3 3 0 01-3 3",
};

function tempo(iso?: string | null) {
  if (!iso) return "novo por aqui";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days < 1) return "entrou hoje";
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months > 1 ? "meses" : "mês"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years > 1 ? "s" : ""}`;
}

// Acento não pode atrapalhar a busca: quem digita "analise" precisa achar
// "análise". \p{Diacritic} evita escrever a faixa de combinantes na mão.
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function VitrineClient({ membros, meuId }: { membros: Membro[]; meuId: string }) {
  const [busca, setBusca] = useState("");
  const [skill, setSkill] = useState("");

  // Habilidades declaradas, com quantas pessoas têm cada uma. As mais comuns
  // primeiro, porque é por elas que se costuma procurar.
  const habilidades = useMemo(() => {
    const conta = new Map<string, number>();
    for (const m of membros) for (const s of m.skills) conta.set(s, (conta.get(s) || 0) + 1);
    return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [membros]);

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim());
    return membros.filter((m) => {
      if (skill && !m.skills.some((s) => semAcento(s) === semAcento(skill))) return false;
      if (!q) return true;
      return semAcento([m.full_name, m.headline || "", m.skills.join(" ")].join(" ")).includes(q);
    });
  }, [membros, busca, skill]);

  const filtrando = busca.trim() !== "" || skill !== "";

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="vitrine-busca" className="sr-only">Buscar aluno por nome, título ou especialidade</label>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              id="vitrine-busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
              placeholder="Buscar por nome, título ou especialidade"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
            />
          </div>
          <div>
            <label htmlFor="vitrine-skill" className="sr-only">Filtrar por especialidade</label>
            <select
              id="vitrine-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none [&>option]:bg-ink-900 sm:w-64 ${skill ? "border-brand-green/50" : "border-white/10"}`}
            >
              <option value="">Todas as especialidades</option>
              {habilidades.map(([s, n]) => (
                <option key={s} value={s}>{s} ({n})</option>
              ))}
            </select>
          </div>
        </div>

        {filtrando && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>
              <span className="font-semibold text-white">{filtrados.length}</span> de {membros.length}{" "}
              {membros.length === 1 ? "aluno" : "alunos"}
            </span>
            <button
              type="button"
              onClick={() => { setBusca(""); setSkill(""); }}
              className="font-medium text-brand-teal underline-offset-4 hover:underline"
            >
              limpar
            </button>
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((m) => (
          <Link
            key={m.id}
            href={`/conta/vitrine/${m.id}`}
            className="glass group flex flex-col rounded-2xl border border-white/8 p-5 transition-colors hover:border-brand-green/40"
          >
            <div className="flex items-center gap-3">
              <Avatar name={m.full_name} src={m.avatar_url} size="lg" className="ring-2 ring-white/10" />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-white transition-colors group-hover:text-brand-green">
                  {m.full_name}
                  {m.id === meuId && <span className="ml-1.5 text-xs font-normal text-brand-green">(você)</span>}
                </p>
                {m.headline && <p className="truncate text-xs text-slate-400">{m.headline}</p>}
                <p className="text-[0.7rem] text-slate-500">na comunidade {tempo(m.since)}</p>
              </div>
            </div>

            {/* Quatro especialidades e a conta do resto, senão quem listou vinte
                estica o card e quebra o alinhamento da grade. */}
            {m.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.skills.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-md border border-brand-blue/25 bg-brand-blue/10 px-2 py-0.5 text-[0.68rem] font-medium text-brand-teal">
                    {s}
                  </span>
                ))}
                {m.skills.length > 4 && (
                  <span className="rounded-md border border-white/10 px-2 py-0.5 text-[0.68rem] font-medium text-slate-400">
                    +{m.skills.length - 4}
                  </span>
                )}
              </div>
            )}

            {m.badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.badges.map((b) => (
                  <span key={b.key} className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={BADGE_ICONS[b.key] || "M12 2l3 6 6 .9-4.5 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9 9 8z"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-4">
              <span className="text-sm">
                <span className="font-display text-lg font-bold text-brand-green">{m.pts}</span>{" "}
                <span className="text-xs text-slate-400">pts</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-brand-green">
                Ver perfil
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">
          {membros.length === 0
            ? "Ainda não há alunos na vitrine."
            : "Nenhum aluno encontrado com esses termos. Tente outra busca ou limpe o filtro."}
        </p>
      )}
    </>
  );
}
