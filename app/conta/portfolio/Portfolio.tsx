"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MedalAvatar from "@/components/ranking/MedalAvatar";
import SeloCasa from "@/components/comunidade/SeloCasa";
import { FERRAMENTAS_SUGERIDAS, LIMITES, STATUS, type Projeto } from "@/lib/portfolio";
import { assinarCapaDoProjeto, curtirProjeto, excluirProjeto, salvarProjeto } from "./actions";

/* Vitrine de portfólio.

   Duas leituras na mesma tela: o que a turma construiu, que é o que inspira e
   dá prova social, e os meus projetos, que é onde eu trabalho. O filtro por
   ferramenta serve para o aluno achar quem fez algo parecido com o que ele
   precisa fazer amanhã.

   O que vale como projeto pronto está em lib/portfolio (pendenciasDoProjeto),
   e é o mesmo no servidor: a tela só antecipa o aviso. */

export type Autor = { nome: string; avatar: string | null; casa: string | null; headline: string | null };

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const rotulo = "block text-[0.72rem] font-semibold uppercase tracking-wide text-slate-400";

function Chip({ children, ativo, onClick }: { children: React.ReactNode; ativo?: boolean; onClick?: () => void }) {
  const base = "rounded-full px-2.5 py-1 text-[0.7rem] transition-colors";
  if (!onClick) return <span className={`${base} bg-white/[0.06] text-slate-300`}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={`${base} ${ativo ? "bg-brand-green/20 font-semibold text-brand-green" : "bg-white/5 text-slate-400 hover:text-white"}`}>
      {children}
    </button>
  );
}

function Cartao({ p, autor, curtido, total, aoCurtir, aoEditar, aoAbrir, meu, grande }: { p: Projeto; autor?: Autor; curtido?: boolean; total?: number; aoCurtir?: () => void; aoEditar?: () => void; aoAbrir?: () => void; meu?: boolean; grande?: boolean }) {
  const tr = usarTraducao();
  const st = STATUS[p.status];
  return (
    <article className={`group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition-colors hover:border-brand-green/30 ${grande ? "sm:col-span-2 xl:col-span-2" : ""}`}>
      <div className={`relative overflow-hidden bg-ink-800 ${grande ? "aspect-[21/9]" : "aspect-video"} ${aoAbrir ? "cursor-zoom-in" : ""}`} onClick={aoAbrir}>
        {p.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-600">{tr("sem imagem")}</div>
        )}
        {p.destaque && p.status === "aprovado" && (
          <span className="absolute left-3 top-3 rounded-full bg-[#f6d68c] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-ink-900">{tr("Destaque")}</span>
        )}
        {meu && p.status !== "aprovado" && (
          <span className={`absolute right-3 top-3 rounded-full bg-ink-900/90 px-2 py-0.5 text-[0.65rem] font-semibold ${st.cor}`}>{st.rotulo}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {aoAbrir ? (
            <button onClick={aoAbrir} className="text-left">
              <h3 className={`font-display font-bold leading-snug text-white transition-colors group-hover:text-brand-green ${grande ? "text-2xl" : "text-lg"}`}>{p.titulo}</h3>
            </button>
          ) : (
            <h3 className="font-display text-lg font-bold leading-snug text-white">{p.titulo}</h3>
          )}
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.resumo}</p>
          {grande && p.resultado && <p className="mt-2 text-sm text-brand-teal">{p.resultado}</p>}
        </div>

        {p.ferramentas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.ferramentas.map((f) => <Chip key={f}>{f}</Chip>)}
          </div>
        )}

        {meu && p.status === "recusado" && p.motivo && (
          <p className="rounded-xl border border-red-400/25 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">{p.motivo}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          {autor && (
            <span className="flex min-w-0 items-center gap-2">
              <MedalAvatar name={autor.nome} src={autor.avatar} casa={autor.casa} size="xs" />
              <span className="min-w-0">
                <span className={`block truncate text-xs ${autor.casa ? "font-semibold text-[#f6d68c]" : "text-slate-300"}`}>{autor.nome}</span>
                {autor.headline && <span className="block truncate text-[0.65rem] text-slate-500">{autor.headline}</span>}
              </span>
              <SeloCasa label={autor.casa} />
            </span>
          )}

          <span className="ml-auto flex items-center gap-2">
            {aoCurtir && (
              <button onClick={aoCurtir} aria-pressed={!!curtido} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${curtido ? "text-brand-green" : "text-slate-400 hover:text-white"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={curtido ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 6.6a5 5 0 00-7.1 0L12 8.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 22l8.8-8.3a5 5 0 000-7.1z" /></svg>
                {total ?? p.curtidas ?? 0}
              </button>
            )}
            {p.link_url && (
              <a href={p.link_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-200 hover:border-brand-green/50 hover:text-white">{tr("Ver projeto ↗")}</a>
            )}
            {p.repo_url && (
              <a href={p.repo_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:text-white">{tr("Código ↗")}</a>
            )}
            {aoAbrir && (
              <button onClick={aoAbrir} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-200 hover:border-brand-green/50 hover:text-white">{tr("Ver detalhes")}</button>
            )}
            {aoEditar && (
              <button onClick={aoEditar} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-200 hover:border-brand-green/50 hover:text-white">{tr("Editar")}</button>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Portfolio({
  vitrine,
  meus,
  autores,
  curtidos,
  cursos,
}: {
  vitrine: Projeto[];
  meus: Projeto[];
  autores: Record<string, Autor>;
  curtidos: string[];
  cursos: { id: string; title: string }[];
}) {
  const tr = usarTraducao();
  const [aba, setAba] = useState<"vitrine" | "meus">(meus.length ? "meus" : "vitrine");
  const [filtro, setFiltro] = useState("");
  const [curtidas, setCurtidas] = useState<Record<string, { curtido: boolean; total: number }>>(
    Object.fromEntries(vitrine.map((p) => [p.id, { curtido: curtidos.includes(p.id), total: p.curtidas || 0 }]))
  );
  const [editando, setEditando] = useState<Projeto | "novo" | null>(null);
  const [aberto, setAberto] = useState<Projeto | null>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"recentes" | "curtidos">("recentes");

  const ferramentas = useMemo(() => {
    const conta = new Map<string, number>();
    for (const p of vitrine) for (const f of p.ferramentas) conta.set(f, (conta.get(f) || 0) + 1);
    return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 12);
  }, [vitrine]);

  const semAcento = (x: string) => x.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const q = semAcento(busca.trim());
  const lista = useMemo(() => {
    const base = vitrine
      .filter((p) => (filtro ? p.ferramentas.includes(filtro) : true))
      .filter((p) => (q ? semAcento(`${p.titulo} ${p.resumo} ${p.resultado ?? ""} ${p.ferramentas.join(" ")} ${autores[p.user_id]?.nome ?? ""}`).includes(q) : true));
    // Destaque sempre na frente: é a curadoria do time, não o gosto do filtro.
    return [...base].sort((a, b) => {
      if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
      if (ordem === "curtidos") return (curtidas[b.id]?.total ?? b.curtidas) - (curtidas[a.id]?.total ?? a.curtidas);
      return (b.aprovado_em ?? b.updated_at).localeCompare(a.aprovado_em ?? a.updated_at);
    });
  }, [vitrine, filtro, q, ordem, curtidas, autores]);

  async function curtir(id: string) {
    const antes = curtidas[id] ?? { curtido: false, total: 0 };
    setCurtidas((c) => ({ ...c, [id]: { curtido: !antes.curtido, total: antes.total + (antes.curtido ? -1 : 1) } }));
    const r = await curtirProjeto(id).catch(() => null);
    if (r?.ok) setCurtidas((c) => ({ ...c, [id]: { curtido: r.curtido, total: r.curtidas } }));
    else setCurtidas((c) => ({ ...c, [id]: antes }));
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(["vitrine", "meus"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${aba === a ? "bg-brand-green/20 font-semibold text-brand-green" : "bg-white/5 text-slate-400 hover:text-white"}`}
            >
              {a === "vitrine" ? `Projetos da turma (${vitrine.length})` : `Meus projetos (${meus.length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditando("novo")}
          className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
        >
          {tr("Publicar um projeto")}
        </button>
      </div>

      {aba === "vitrine" ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
                <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={tr("buscar por projeto, ferramenta ou pessoa")}
                aria-label={tr("Buscar projeto")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
              />
            </div>
            <div className="flex gap-1.5">
              {([["recentes", "Recentes"], ["curtidos", "Mais curtidos"]] as const).map(([k, rotulo]) => (
                <Chip key={k} ativo={ordem === k} onClick={() => setOrdem(k)}>{rotulo}</Chip>
              ))}
            </div>
          </div>

          {ferramentas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip ativo={!filtro} onClick={() => setFiltro("")}>{tr("Todas")}</Chip>
              {ferramentas.map(([f, n]) => (
                <Chip key={f} ativo={filtro === f} onClick={() => setFiltro(filtro === f ? "" : f)}>
                  {f} <span className="font-mono tabular-nums opacity-60">{n}</span>
                </Chip>
              ))}
            </div>
          )}

          {lista.length === 0 && (busca || filtro) ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
              <p className="font-medium text-white">{tr("Nenhum projeto com esse recorte")}</p>
              <button onClick={() => { setBusca(""); setFiltro(""); }} className="mt-3 text-sm text-brand-green hover:underline">{tr("Limpar a busca e o filtro")}</button>
            </div>
          ) : lista.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <p className="font-medium text-white">{tr("Ainda não tem projeto publicado aqui")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {tr("Seja o primeiro. Um dashboard que você montou no trabalho, um exercício da Academy que virou coisa séria, uma automação que economizou o seu dia: tudo conta.")}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((p, i) => (
                <Cartao
                  key={p.id}
                  p={p}
                  autor={autores[p.user_id]}
                  curtido={curtidas[p.id]?.curtido}
                  total={curtidas[p.id]?.total}
                  aoCurtir={() => curtir(p.id)}
                  aoAbrir={() => setAberto(p)}
                  grande={i === 0 && p.destaque}
                />
              ))}
            </div>
          )}
        </>
      ) : meus.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-medium text-white">{tr("Você ainda não publicou nada")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            {tr("Portfólio é o que abre porta. Publique um projeto com a imagem, o problema que ele resolve e o resultado, e ele passa a aparecer para a turma e para quem visita o site.")}
          </p>
          <button onClick={() => setEditando("novo")} className="mt-6 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">
            {tr("Publicar meu primeiro projeto")}
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {meus.map((p) => (
            <Cartao key={p.id} p={p} meu aoEditar={() => setEditando(p)} aoAbrir={() => setAberto(p)} />
          ))}
        </div>
      )}

      {aberto && <Detalhe p={aberto} autor={autores[aberto.user_id]} aoFechar={() => setAberto(null)} />}

      {editando && (
        <Formulario
          projeto={editando === "novo" ? null : editando}
          cursos={cursos}
          aoFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function Detalhe({ p, autor, aoFechar }: { p: Projeto; autor?: Autor; aoFechar: () => void }) {
  const tr = usarTraducao();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onClick={aoFechar} role="dialog" aria-modal="true" aria-label={p.titulo}>
      <article onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-2xl">
        {p.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" className="max-h-[60vh] w-full object-contain bg-ink-800" />
        )}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold text-white">{p.titulo}</h2>
              <p className="mt-1 text-sm text-slate-400">{p.resumo}</p>
            </div>
            <button onClick={aoFechar} aria-label={tr("Fechar")} className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:text-white">✕</button>
          </div>

          {autor && (
            <div className="flex items-center gap-2.5 border-y border-white/8 py-3">
              <MedalAvatar name={autor.nome} src={autor.avatar} casa={autor.casa} size="sm" />
              <div className="min-w-0">
                <p className={`truncate text-sm ${autor.casa ? "font-semibold text-[#f6d68c]" : "text-slate-200"}`}>{autor.nome}</p>
                {autor.headline && <p className="truncate text-xs text-slate-500">{autor.headline}</p>}
              </div>
              <SeloCasa label={autor.casa} className="ml-1" />
            </div>
          )}

          {p.problema && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">{tr("O problema")}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-300">{p.problema}</p>
            </div>
          )}
          {p.resultado && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-green">{tr("O resultado")}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-200">{p.resultado}</p>
            </div>
          )}
          {p.descricao && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">{tr("Como foi feito")}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-300">{p.descricao}</p>
            </div>
          )}

          {p.ferramentas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.ferramentas.map((f) => <Chip key={f}>{f}</Chip>)}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {p.link_url && <a href={p.link_url} target="_blank" rel="noreferrer" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">{tr("Ver o projeto ↗")}</a>}
            {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-brand-green/50">{tr("Código ↗")}</a>}
          </div>
        </div>
      </article>
    </div>
  );
}

function Formulario({ projeto, cursos, aoFechar }: { projeto: Projeto | null; cursos: { id: string; title: string }[]; aoFechar: () => void }) {
  const tr = usarTraducao();
  const [ferramentas, setFerramentas] = useState<string[]>(projeto?.ferramentas ?? []);
  const [capa, setCapa] = useState(projeto?.cover_url ?? "");
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState("");
  // Os dois botões enviam o mesmo formulário: o que muda é a ação, guardada
  // aqui porque estado do React não chega a tempo no envio.
  const acao = useRef<"rascunho" | "enviar">("enviar");

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [aoFechar]);

  async function subirCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) { setErro("Escolha uma imagem."); return; }
    setSubindo(true);
    setErro("");
    try {
      const assinado = await assinarCapaDoProjeto(arquivo.name.split(".").pop() || "jpg");
      if (!assinado.ok) { setErro(assinado.error); return; }
      const supabase = createClient();
      const { error } = await supabase.storage.from("portfolio").uploadToSignedUrl(assinado.path, assinado.token, arquivo, { contentType: arquivo.type });
      if (error) throw error;
      setCapa(assinado.url);
    } catch (err: any) {
      setErro("Não consegui subir a imagem: " + (err?.message || "erro desconhecido"));
    } finally {
      setSubindo(false);
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const dados = new FormData(e.currentTarget);
    dados.set("acao", acao.current);
    dados.set("cover_url", capa);
    dados.delete("ferramentas");
    for (const f of ferramentas) dados.append("ferramentas", f);
    const r = await salvarProjeto(dados);
    setSalvando(false);
    if (!r.ok) { setErro(r.erro); return; }
    aoFechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={aoFechar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
        className="my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">{projeto ? "Editar projeto" : "Publicar projeto"}</h2>
            <p className="mt-1 text-sm text-slate-400">{tr("O time revisa antes de publicar na vitrine. Costuma sair em até dois dias úteis.")}</p>
          </div>
          <button type="button" onClick={aoFechar} aria-label={tr("Fechar")} className="rounded-lg px-2 py-1 text-slate-400 hover:text-white">✕</button>
        </div>

        {projeto && <input type="hidden" name="id" value={projeto.id} />}

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className={rotulo} htmlFor="p-titulo">{tr("Título")}</label>
            <input id="p-titulo" name="titulo" defaultValue={projeto?.titulo} maxLength={LIMITES.titulo} required placeholder={tr("Painel de vendas da distribuidora")} className={`${campo} mt-1`} />
          </div>

          <div>
            <label className={rotulo} htmlFor="p-resumo">{tr("Resumo, em uma frase")}</label>
            <input id="p-resumo" name="resumo" defaultValue={projeto?.resumo} maxLength={LIMITES.resumo} required placeholder={tr("Troquei 12 planilhas por um painel que abre em 3 segundos.")} className={`${campo} mt-1`} />
          </div>

          <div>
            <span className={rotulo}>{tr("Imagem do projeto")}</span>
            <div className="mt-1 flex items-start gap-4">
              <div className="grid aspect-video w-40 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-ink-800">
                {capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capa} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-600">{tr("sem imagem")}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input type="file" accept="image/*" onChange={subirCapa} disabled={subindo} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white" />
                {subindo && <p className="text-xs text-brand-teal">Subindo...</p>}
                <p className="text-xs text-slate-500">{tr("Um print do painel já resolve. Proporção 16:9 fica melhor no cartão.")}</p>
              </div>
            </div>
          </div>

          <div>
            <span className={rotulo}>{tr("Ferramentas usadas")}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...new Set([...FERRAMENTAS_SUGERIDAS, ...ferramentas])].map((f) => (
                <Chip key={f} ativo={ferramentas.includes(f)} onClick={() => setFerramentas((a) => (a.includes(f) ? a.filter((x) => x !== f) : a.length < LIMITES.ferramentas ? [...a, f] : a))}>
                  {f}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder={tr("outra ferramenta")} className={campo} maxLength={24} />
              <button
                type="button"
                onClick={() => { const f = nova.trim(); if (f && !ferramentas.includes(f) && ferramentas.length < LIMITES.ferramentas) setFerramentas((a) => [...a, f]); setNova(""); }}
                className="shrink-0 rounded-xl border border-white/10 px-3 text-sm text-slate-200 hover:border-brand-green/50"
              >
                {tr("Adicionar")}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={rotulo} htmlFor="p-problema">{tr("Qual problema resolvia")}</label>
              <textarea id="p-problema" name="problema" defaultValue={projeto?.problema ?? ""} rows={3} maxLength={600} placeholder={tr("O time fechava o mês somando planilha na mão, e o número nunca batia.")} className={`${campo} mt-1 resize-y`} />
            </div>
            <div>
              <label className={rotulo} htmlFor="p-resultado">{tr("O que mudou depois")}</label>
              <textarea id="p-resultado" name="resultado" defaultValue={projeto?.resultado ?? ""} rows={3} maxLength={600} placeholder={tr("Fechamento caiu de 2 dias para 20 minutos.")} className={`${campo} mt-1 resize-y`} />
            </div>
          </div>

          <div>
            <label className={rotulo} htmlFor="p-descricao">{tr("Como você fez (opcional)")}</label>
            <textarea id="p-descricao" name="descricao" defaultValue={projeto?.descricao ?? ""} rows={4} maxLength={LIMITES.descricao} placeholder={tr("Fontes, modelagem, medidas principais, decisões de visual.")} className={`${campo} mt-1 resize-y`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={rotulo} htmlFor="p-link">{tr("Link do projeto (opcional)")}</label>
              <input id="p-link" name="link_url" defaultValue={projeto?.link_url ?? ""} placeholder={tr("publicado no Power BI, vídeo, post")} className={`${campo} mt-1`} />
            </div>
            <div>
              <label className={rotulo} htmlFor="p-repo">{tr("Link do código (opcional)")}</label>
              <input id="p-repo" name="repo_url" defaultValue={projeto?.repo_url ?? ""} placeholder={tr("GitHub, Drive")} className={`${campo} mt-1`} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={rotulo} htmlFor="p-curso">{tr("Nasceu em algum curso? (opcional)")}</label>
              <select id="p-curso" name="course_id" defaultValue={projeto?.course_id ?? ""} className={`${campo} mt-1 [&>option]:bg-ink-900`}>
                <option value="">{tr("Não, é do meu trabalho")}</option>
                {cursos.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <label className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-slate-300">
              <input type="checkbox" name="publico" defaultChecked={projeto?.publico ?? true} className="mt-0.5 h-4 w-4 accent-[#15c47e]" />
              <span>
                {tr("Pode aparecer na página pública da Academy")}
                <span className="mt-0.5 block text-xs text-slate-500">{tr("Desmarcado, ele fica só para a turma, dentro do portal.")}</span>
              </span>
            </label>
          </div>

          {erro && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200" role="alert">{erro}</p>}

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button type="submit" onClick={() => (acao.current = "enviar")} disabled={salvando || subindo} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-50">
              {salvando ? "Enviando..." : "Enviar para revisão"}
            </button>
            {/* Rascunho não exige campo obrigatório: a pessoa salva o que tem e volta depois. */}
            <button type="submit" formNoValidate onClick={() => (acao.current = "rascunho")} disabled={salvando} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:border-brand-green/50">
              {tr("Salvar rascunho")}
            </button>
            {projeto && (
              <button
                type="button"
                onClick={async () => { if (confirm("Excluir este projeto? Não dá para desfazer.")) { await excluirProjeto(projeto.id); aoFechar(); } }}
                className="ml-auto text-sm text-red-300 hover:underline"
              >
                {tr("Excluir")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
