"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useMemo, useState } from "react";
import Link from "next/link";
import MedalAvatar from "@/components/ranking/MedalAvatar";
import SeloCasa from "@/components/comunidade/SeloCasa";

/* Lista da Vitrine com busca, filtro e ordenação.

   O card virou link para a página do aluno. Antes o único clique era o do
   portfólio, então quem não tinha portfólio virava um cartão morto.

   O que a tela mostra agora vem todo de dado real, nada de enfeite solto:
   - o pódio de três, com a moldura de medalha do ranking, que é a mesma do chat;
   - a moldura dourada de quem é da casa, acima de qualquer medalha;
   - a barra de pontos de cada card, medida contra o líder, que dá a noção de
     distância que um número seco não dá;
   - as especialidades viram atalho de filtro, com o tamanho do chip acompanhando
     quanta gente domina aquilo. É o mapa de forças da comunidade.

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
  rank: number | null;
  casa: string | null;
};

const BADGE_ICONS: Record<string, string> = {
  fundador: "M12 2l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z",
  top: "M8 21h8M12 17v4M6 4h12v3a6 6 0 01-12 0V4zM6 5H3v1a3 3 0 003 3M18 5h3v1a3 3 0 01-3 3",
};

// O selo da casa já aparece inteiro, com coroa. Repetir na fileira de badges
// seria dizer a mesma coisa duas vezes no mesmo card.
const SELOS_DA_CASA = new Set(["fundadora", "fundador_casa"]);

const ORDENS = [
  { key: "pontos", label: "Mais pontos" },
  { key: "novos", label: "Chegaram agora" },
  { key: "az", label: "A a Z" },
];

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

function Selos({ m }: { m: Membro }) {
  const tr = usarTraducao();
  const outros = m.badges.filter((b) => !SELOS_DA_CASA.has(b.key));
  if (!m.casa && outros.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <SeloCasa label={m.casa} />
      {outros.map((b) => (
        <span
          key={b.key}
          title={tr(b.label)}
          className="inline-flex items-center gap-1 rounded-full border border-brand-teal/25 bg-brand-teal/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d={BADGE_ICONS[b.key] || "M12 2l3 6 6 .9-4.5 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9 9 8z"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tr(b.label)}
        </span>
      ))}
    </div>
  );
}

function BarraDePontos({ pts, lider }: { pts: number; lider: number }) {
  const pct = lider > 0 ? Math.max(3, Math.round((pts / lider) * 100)) : 0;
  return (
    <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-white/8" aria-hidden="true">
      <span
        className="block h-full rounded-full bg-gradient-to-r from-brand-green to-brand-teal"
        style={{ width: `${pts > 0 ? pct : 0}%` }}
      />
    </span>
  );
}

export default function VitrineClient({ membros, meuId, lider }: { membros: Membro[]; meuId: string; lider: number }) {
  const tr = usarTraducao();
  const [busca, setBusca] = useState("");
  const [skill, setSkill] = useState("");
  const [ordem, setOrdem] = useState("pontos");

  // Habilidades declaradas, com quantas pessoas têm cada uma. As mais comuns
  // primeiro, porque é por elas que se costuma procurar.
  const habilidades = useMemo(() => {
    const conta = new Map<string, number>();
    for (const m of membros) for (const s of m.skills) conta.set(s, (conta.get(s) || 0) + 1);
    return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [membros]);

  const maiorSkill = habilidades[0]?.[1] || 1;

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim());
    const lista = membros.filter((m) => {
      if (skill && !m.skills.some((s) => semAcento(s) === semAcento(skill))) return false;
      if (!q) return true;
      return semAcento([m.full_name, m.headline || "", m.skills.join(" ")].join(" ")).includes(q);
    });
    if (ordem === "az") return [...lista].sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
    if (ordem === "novos") {
      return [...lista].sort((a, b) => Date.parse(b.since || "") - Date.parse(a.since || "") || b.pts - a.pts);
    }
    return lista; // já chega ordenado por pontos
  }, [membros, busca, skill, ordem]);

  const filtrando = busca.trim() !== "" || skill !== "";

  // O pódio é dos três primeiros do ranking, não do que sobrou do filtro.
  const podio = useMemo(() => membros.filter((m) => m.rank && m.rank <= 3).sort((a, b) => a.rank! - b.rank!), [membros]);

  return (
    <>
      {/* Pódio: quem está puxando a comunidade agora. */}
      {podio.length > 0 && !filtrando && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400">{tr("No topo agora")}</h2>
            <Link href="/conta/ranking" className="text-xs font-medium text-brand-teal underline-offset-4 hover:underline">{tr("ver o ranking →")}</Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {podio.map((m) => (
              <Link
                key={m.id}
                href={`/conta/vitrine/${m.id}`}
                className="glass group flex items-center gap-4 rounded-2xl border border-white/8 p-4 transition-colors hover:border-brand-green/40"
              >
                <MedalAvatar name={m.full_name} src={m.avatar_url} rank={m.rank} casa={m.casa} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold text-white transition-colors group-hover:text-brand-green">
                    {m.full_name}
                    {m.id === meuId && <span className="ml-1.5 text-xs font-normal text-brand-green">{tr("(você)")}</span>}
                  </p>
                  <p className="text-[0.7rem] text-slate-400">
                    {m.rank}º lugar · <span className="font-mono tabular-nums text-brand-green">{m.pts}</span> pts
                  </p>
                  <BarraDePontos pts={m.pts} lider={lider} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="vitrine-busca" className="sr-only">{tr("Buscar aluno por nome, título ou especialidade")}</label>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              id="vitrine-busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
              placeholder={tr("Buscar por nome, título ou especialidade")}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
            />
          </div>
          <div>
            <label htmlFor="vitrine-skill" className="sr-only">{tr("Filtrar por especialidade")}</label>
            <select
              id="vitrine-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none [&>option]:bg-ink-900 sm:w-56 ${skill ? "border-brand-green/50" : "border-white/10"}`}
            >
              <option value="">{tr("Todas as especialidades")}</option>
              {habilidades.map(([s, n]) => (
                <option key={s} value={s}>{s} ({n})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vitrine-ordem" className="sr-only">{tr("Ordenar a vitrine")}</label>
            <select
              id="vitrine-ordem"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none [&>option]:bg-ink-900 sm:w-44"
            >
              {ORDENS.map((o) => (
                <option key={o.key} value={o.key}>{tr(o.label)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mapa de forças: o chip cresce com a quantidade de gente que domina
            aquilo, e clicar filtra. É o atalho e o retrato da turma. */}
        {habilidades.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {habilidades.slice(0, 12).map(([s, n]) => {
              const ativo = semAcento(s) === semAcento(skill);
              const peso = n / maiorSkill;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkill(ativo ? "" : s)}
                  aria-pressed={ativo}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-colors ${
                    ativo
                      ? "border-brand-green/60 bg-brand-green/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-brand-teal/40 hover:text-white"
                  }`}
                  style={{ fontSize: `${0.68 + peso * 0.22}rem` }}
                >
                  {s}
                  <span className="font-mono text-[0.62rem] tabular-nums text-slate-500">{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {filtrando && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>
              <span className="font-semibold text-white">{filtrados.length}</span> {tr("de")} {membros.length}{" "}
              {membros.length === 1 ? "aluno" : "alunos"}
            </span>
            <button
              type="button"
              onClick={() => { setBusca(""); setSkill(""); }}
              className="font-medium text-brand-teal underline-offset-4 hover:underline"
            >
              {tr("limpar")}
            </button>
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((m) => (
          <Link
            key={m.id}
            href={`/conta/vitrine/${m.id}`}
            className={`glass group relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-colors ${
              m.casa ? "border-[#f6d68c]/35 hover:border-[#f6d68c]/60" : "border-white/8 hover:border-brand-green/40"
            }`}
          >
            {/* Traço da marca na lateral, que acende no hover. */}
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                m.casa ? "bg-gradient-to-b from-[#f6d68c] to-brand-green" : "bg-gradient-to-b from-brand-green to-brand-blue"
              }`}
            />

            <div className="flex items-center gap-3">
              <MedalAvatar name={m.full_name} src={m.avatar_url} rank={m.rank} casa={m.casa} size="md" />
              <div className="min-w-0">
                <p className={`truncate font-display text-base font-bold transition-colors ${m.casa === "Oficial" ? "text-[#9fd3ff]" : m.casa ? "text-[#f6d68c]" : "text-white group-hover:text-brand-green"}`}>
                  {m.full_name}
                  {m.id === meuId && <span className="ml-1.5 text-xs font-normal text-brand-green">{tr("(você)")}</span>}
                </p>
                {m.headline && <p className="truncate text-xs text-slate-400">{m.headline}</p>}
                <p className="text-[0.7rem] text-slate-500">{tr("na comunidade")} {tempo(m.since)}</p>
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

            <Selos m={m} />

            <div className="mt-auto border-t border-white/8 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="font-display text-lg font-bold text-brand-green">{m.pts}</span>{" "}
                  <span className="text-xs text-slate-400">pts</span>
                  {m.rank && <span className="ml-2 font-mono text-[0.68rem] text-slate-500">{m.rank}º</span>}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-brand-green">
                  {tr("Ver perfil")}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              <BarraDePontos pts={m.pts} lider={lider} />
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
