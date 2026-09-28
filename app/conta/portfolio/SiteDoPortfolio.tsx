"use client";

import { useState } from "react";
import { ESTILOS, envelopar, type Estilo } from "@/lib/portfolio-site-html";
import { conferirSite, despublicarSite, gerarPromptDoSite, salvarSite } from "./actions";

/* Meu site de portfólio: três passos, na ordem em que acontecem.

   1. A Academy monta o prompt com o que o aluno tem de verdade.
   2. O aluno leva para a IA que quiser e cola de volta o HTML.
   3. Publica, e recebe o link para pôr no LinkedIn.

   A numeração é real: não dá para colar HTML antes de ter o prompt, nem
   publicar antes de colar. */

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

export default function SiteDoPortfolio({ atual, siteUrl }: { atual: SiteAtual; siteUrl: string }) {
  const [estilo, setEstilo] = useState<Estilo>("painel");
  const [prompt, setPrompt] = useState("");
  const [info, setInfo] = useState<{ incluidos: number; foraPorLacuna: string[]; foraPorPrivado: string[]; certificados: number } | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [html, setHtml] = useState("");
  const [previa, setPrevia] = useState(false);
  const [suspeitos, setSuspeitos] = useState<string[]>([]);
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
    setSuspeitos([]);
    const r = await conferirSite(html);
    if (r.ok) setSuspeitos(r.suspeitos);
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
        <Passo n={1} titulo="Escolha o estilo e gere o seu prompt">
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

        <Passo n={2} titulo="Cole o HTML que a IA devolveu">
          <textarea
            value={html}
            onChange={(e) => { setHtml(e.target.value); setPrevia(false); setSuspeitos([]); }}
            rows={6}
            placeholder="<!doctype html> ... cole o código inteiro, pode vir com o texto que a IA escreveu em volta"
            className={`${campo} font-mono text-xs`}
          />
          <button onClick={previsualizar} disabled={html.trim().length < 30} className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white disabled:opacity-40">
            Pré-visualizar
          </button>
          {suspeitos.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/[0.07] px-3 py-2.5 text-sm text-amber-100">
              <p className="font-semibold">A IA pôs no site números que não estão nos seus projetos:</p>
              <p className="mt-1 font-mono text-xs">{suspeitos.join("  ·  ")}</p>
              <p className="mt-1.5 text-xs text-amber-200/80">
                Se o número é verdadeiro, ponha no projeto e gere o prompt de novo. Se não é, peça para a IA tirar. Em entrevista, alguém vai perguntar como você mediu.
              </p>
            </div>
          )}
          {previa && (
            <iframe
              title="Pré-visualização do site"
              srcDoc={envelopar(html)}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              className="mt-3 h-[480px] w-full rounded-xl border border-white/10 bg-white"
            />
          )}
        </Passo>

        <Passo n={3} titulo="Publique e leve o link para o LinkedIn">
          <label className="flex items-start gap-2.5 text-sm text-slate-300">
            <input type="checkbox" checked={mostrarUniverso} onChange={(e) => setMostrarUniverso(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#15c47e]" />
            <span>Mostrar meu Universo 4D na página. As competências acendem a partir dos seus projetos, na ordem em que você os fez.</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => salvar(true)} disabled={salvando || html.trim().length < 30 || !!atual?.bloqueado} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-40">
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
