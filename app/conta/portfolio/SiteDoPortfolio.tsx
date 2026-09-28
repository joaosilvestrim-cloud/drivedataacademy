"use client";

import { useState } from "react";
import { ESTILOS, envelopar, type Estilo } from "@/lib/portfolio-site-html";
import type { Auditoria } from "@/lib/portfolio-auditoria";
import { conferirSite, despublicarSite, gerarPromptDoSite, salvarSite } from "./actions";

/* Meu site de portfólio: quatro passos, na ordem em que acontecem.

   1. O aluno publica os projetos, com a IA interna organizando.
   2. A Academy monta o prompt com o que ele tem de verdade.
   3. Ele leva para a IA que quiser e cola de volta o HTML.
   4. Publica, e recebe o link para pôr no LinkedIn.

   A numeração é real. O primeiro passo existe porque, sem ele, esta seção
   no topo da página parecia ser o começo: no primeiro ensaio o João gerou o
   prompt com zero projetos sem achar onde cadastrá-los. */

export type SiteAtual = { slug: string; publicado: boolean; mostrar_universo: boolean; bloqueado: boolean } | null;

const IAS = [
  { nome: "Claude", url: "https://claude.ai/new" },
  { nome: "ChatGPT", url: "https://chatgpt.com/" },
  { nome: "Gemini", url: "https://gemini.google.com/app" },
];

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[2rem_1fr]">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-brand-green/40 font-mono text-sm text-brand-green">{n}</span>
      <div className="min-w-0">
        <p className="font-semibold text-white">{titulo}</p>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export default function SiteDoPortfolio({
  atual,
  siteUrl,
  projetos,
  prontos,
}: {
  atual: SiteAtual;
  siteUrl: string;
  projetos: number;
  prontos: number;
}) {
  const [estilo, setEstilo] = useState<Estilo>("painel");
  const [prompt, setPrompt] = useState("");
  const [info, setInfo] = useState<{ incluidos: number; foraPorLacuna: string[]; foraPorPrivado: string[]; certificados: number } | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [html, setHtml] = useState("");
  const [previa, setPrevia] = useState(false);
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [mostrarUniverso, setMostrarUniverso] = useState(atual?.mostrar_universo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [publicado, setPublicado] = useState<{ url: string; publicado: boolean } | null>(
    atual ? { url: `${siteUrl}/portfolio/${atual.slug}`, publicado: atual.publicado } : null,
  );

  async function gerar() {
    setGerando(true);
    setErro("");
    const r = await gerarPromptDoSite(estilo);
    setGerando(false);
    if (!r.ok) return;
    setPrompt(r.prompt);
    setInfo(r);
  }

  async function copiar(texto: string, rotulo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(rotulo);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      setErro("Não consegui copiar. Selecione o texto e copie com Ctrl+C.");
    }
  }

  /* A pré-visualização também confere número inventado. É o momento certo:
     o aluno está olhando o site, e o aviso aponta exatamente o que conferir. */
  async function previsualizar() {
    setPrevia(true);
    setAuditoria(null);
    setErro("");
    setConferindo(true);
    const r = await conferirSite(html);
    setConferindo(false);
    if (r.ok) setAuditoria(r.auditoria);
    else setErro(r.erro);
  }

  async function salvar(publicar: boolean) {
    setSalvando(true);
    setErro("");
    const r = await salvarSite({ html, publicar, mostrarUniverso });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setPublicado({ url: r.url, publicado: r.publicado });
  }

  async function tirarDoAr() {
    await despublicarSite();
    setPublicado((p) => (p ? { ...p, publicado: false } : p));
  }

  const linkedin = publicado ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicado.url)}` : "";

  return (
    <section className="mt-8 rounded-3xl border border-brand-green/25 bg-gradient-to-b from-brand-green/[0.06] to-transparent p-5 sm:p-7">
      <h2 className="font-display text-2xl font-bold text-white">Meu site de portfólio</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        A Academy junta seus projetos e certificados num prompt. Você leva para a IA que preferir, recebe um site inteiro e publica aqui, com link para o seu LinkedIn. A página vem com o seu Universo 4D: uma constelação das competências que seus projetos provam, que quem visitar pode girar e ver crescer ao longo da sua carreira.
      </p>

      {atual?.bloqueado && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/[0.08] px-3 py-2 text-sm text-red-200">
          Seu site foi tirado do ar pelo time. Fale com o suporte pela Central de Ajuda.
        </p>
      )}

      {publicado?.publicado && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">No ar</p>
            <a href={publicado.url} target="_blank" rel="noopener" className="block truncate font-mono text-sm text-brand-green hover:underline">{publicado.url}</a>
          </div>
          <button onClick={() => copiar(publicado.url, "link")} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white">{copiado === "link" ? "Copiado" : "Copiar link"}</button>
          <a href={linkedin} target="_blank" rel="noopener" className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-sm font-semibold text-white">Compartilhar no LinkedIn</a>
          <button onClick={tirarDoAr} className="text-xs text-slate-500 hover:text-slate-300">Tirar do ar</button>
          <p className="w-full text-xs text-slate-400">
            No LinkedIn, ponha o link em dois lugares: Editar perfil → Informações de contato → Site, e na seção Em destaque do perfil.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-7">
        <Passo n={1} titulo="Publique seus projetos">
          <p className="text-sm text-slate-400">
            {prontos > 0
              ? `${prontos} ${prontos === 1 ? "projeto pronto" : "projetos prontos"} para entrar no site${projetos > prontos ? `, e ${projetos - prontos} ainda com lacuna ou só para a turma` : ""}. Quanto mais projetos, de anos diferentes, mais o seu 4D cresce.`
              : projetos > 0
                ? "Seus projetos ainda têm lacunas entre colchetes ou estão só para a turma. Complete e marque como público para eles entrarem no site."
                : "O site é feito dos seus projetos. Cadastre pelo menos um antes de gerar o prompt: conte do seu jeito e a IA organiza nos campos."}
          </p>
          <button
            onClick={() => window.dispatchEvent(new Event("portfolio:novo-projeto"))}
            className={`mt-3 rounded-xl px-4 py-2 text-sm font-semibold ${prontos > 0 ? "border border-white/15 text-white" : "bg-gradient-to-r from-brand-green to-brand-blue text-ink-900"}`}
          >
            {prontos > 0 ? "Publicar outro projeto" : "Publicar meu primeiro projeto"}
          </button>
        </Passo>

        <Passo n={2} titulo="Escolha o estilo e gere o seu prompt">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ESTILOS) as Estilo[]).map((e) => (
              <button
                key={e}
                onClick={() => setEstilo(e)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${estilo === e ? "bg-brand-green text-ink-900" : "border border-white/15 text-slate-300 hover:text-white"}`}
              >
                {ESTILOS[e].nome}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">{ESTILOS[estilo].direcao}</p>
          <button onClick={gerar} disabled={gerando} className="mt-3 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-50">
            {gerando ? "Montando..." : prompt ? "Gerar de novo" : "Gerar meu prompt"}
          </button>

          {info && (
            <div className="mt-3 text-xs text-slate-400">
              <p>
                Entraram {info.incluidos} {info.incluidos === 1 ? "projeto" : "projetos"} e {info.certificados} {info.certificados === 1 ? "certificado" : "certificados"} com link de verificação.
              </p>
              {info.incluidos === 0 && (
                <p className="mt-1 text-amber-200">Seu prompt saiu sem nenhum projeto, e o site vai sair vazio. Volte ao passo 1.</p>
              )}
              {info.foraPorLacuna.length > 0 && (
                <p className="mt-1 text-amber-200">
                  Ficaram de fora porque ainda têm lacunas entre colchetes: {info.foraPorLacuna.join(", ")}. Preencha e gere de novo.
                </p>
              )}
              {info.foraPorPrivado.length > 0 && (
                <p className="mt-1">Ficaram de fora porque estão só para a turma: {info.foraPorPrivado.join(", ")}.</p>
              )}
            </div>
          )}

          {prompt && (
            <div className="mt-3">
              <textarea readOnly value={prompt} rows={8} className={`${campo} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => copiar(prompt, "prompt")} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white">
                  {copiado === "prompt" ? "Copiado" : "Copiar prompt"}
                </button>
                <span className="text-xs text-slate-500">e cole em</span>
                {IAS.map((ia) => (
                  <a key={ia.nome} href={ia.url} target="_blank" rel="noopener" className="text-sm text-brand-green hover:underline">{ia.nome}</a>
                ))}
                <span className="text-xs text-slate-500">ou no Codex</span>
              </div>
            </div>
          )}
        </Passo>

        <Passo n={3} titulo="Cole o HTML que a IA devolveu">
          <textarea
            value={html}
            onChange={(e) => { setHtml(e.target.value); setPrevia(false); setAuditoria(null); }}
            rows={6}
            placeholder="<!doctype html> ... cole o código inteiro, pode vir com o texto que a IA escreveu em volta"
            className={`${campo} font-mono text-xs`}
          />
          <button onClick={previsualizar} disabled={html.trim().length < 30 || conferindo} className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white disabled:opacity-40">
            {conferindo ? "Conferindo o site..." : "Pré-visualizar e conferir"}
          </button>

          {/* A conferência do site. Erro trava o botão de publicar; aviso
              não trava. O pedido de correção vai pronto para a mesma
              conversa da IA, que devolve o site consertado. */}
          {auditoria && (
            <div className={`mt-3 rounded-2xl border p-4 ${auditoria.achados.some((a) => a.nivel === "erro") ? "border-red-400/40 bg-red-400/[0.06]" : auditoria.achados.length ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-brand-green/40 bg-brand-green/[0.06]"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-white">
                  {auditoria.achados.length === 0
                    ? "Site conferido: pronto para publicar."
                    : auditoria.achados.some((a) => a.nivel === "erro")
                      ? "O site precisa de correção antes de ir ao ar."
                      : "O site pode ir ao ar, mas vale ajustar."}
                </p>
                <span className="font-mono text-sm tabular-nums text-slate-300">{auditoria.nota}/100</span>
              </div>
              {auditoria.achados.length > 0 && (
                <>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                    {auditoria.achados.map((a, i) => (
                      <li key={i} className={a.nivel === "erro" ? "text-red-200" : "text-amber-100"}>
                        <span className="font-semibold">{a.nivel === "erro" ? "Corrigir: " : "Ajustar: "}</span>
                        {a.texto}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => copiar(auditoria.pedidoDeCorrecao, "correcao")} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15">
                      {copiado === "correcao" ? "Copiado" : "Copiar pedido de correção"}
                    </button>
                    <span className="text-xs text-slate-400">Cole na mesma conversa da IA, ela devolve o site corrigido. Depois cole o novo HTML aqui.</span>
                  </div>
                </>
              )}
            </div>
          )}
          {previa && (
            <iframe
              title="Pré-visualização do site"
              srcDoc={envelopar(html)}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              className="mt-3 h-[480px] w-full rounded-xl border border-white/10 bg-[#0b1220]"
            />
          )}
        </Passo>

        <Passo n={4} titulo="Publique e leve o link para o LinkedIn">
          <label className="flex items-start gap-2.5 text-sm text-slate-300">
            <input type="checkbox" checked={mostrarUniverso} onChange={(e) => setMostrarUniverso(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#15c47e]" />
            <span>Mostrar meu Universo 4D na página. As competências acendem a partir dos seus projetos, na ordem em que você os fez.</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => salvar(true)} disabled={salvando || html.trim().length < 30 || !!atual?.bloqueado || !!auditoria?.achados.some((a) => a.nivel === "erro")} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-40">
              {salvando ? "Publicando..." : publicado?.publicado ? "Publicar nova versão" : "Publicar"}
            </button>
            <button onClick={() => salvar(false)} disabled={salvando || html.trim().length < 30} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-40">
              Salvar sem publicar
            </button>
          </div>
          {erro && <p className="mt-2 text-sm text-red-300">{erro}</p>}
        </Passo>
      </div>
    </section>
  );
}
