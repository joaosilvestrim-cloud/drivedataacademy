"use client";

import { useEffect, useRef, useState } from "react";
import { CORES_DE_DESTAQUE, ESTILOS, GUIA_IAS, PERSONALIZACAO_PADRAO, RECEITAS, REFINAMENTOS, envelopar, limparHtmlColado, type Estilo, type Personalizacao } from "@/lib/portfolio-site-html";
import type { RaioX } from "@/lib/portfolio-raiox";
import type { Auditoria } from "@/lib/portfolio-auditoria";
import { conferirSite, despublicarSite, gerarPromptDoSite, kitDeDivulgacao, postDoLinkedIn, salvarSite } from "./actions";
import UniversoPublico from "@/components/knowledge/UniversoPublico";

/* Meu site de portfólio: quatro passos, na ordem em que acontecem.

   1. O aluno publica os projetos, com a IA interna organizando.
   2. A Academy monta o prompt com o que ele tem de verdade.
   3. Ele leva para a IA que quiser e cola de volta o HTML.
   4. Publica, e recebe o link para pôr no LinkedIn.

   A numeração é real, e cada passo mostra se está feito, se é a vez dele ou
   se vem depois. O primeiro passo existe porque, sem ele, esta seção no topo
   da página parecia ser o começo: no primeiro ensaio o João gerou o prompt
   com zero projetos sem achar onde cadastrá-los. */

export type SiteAtual = { slug: string; publicado: boolean; mostrar_universo: boolean; bloqueado: boolean } | null;

const IAS = [
  { nome: "Claude", url: "https://claude.ai/new" },
  { nome: "ChatGPT", url: "https://chatgpt.com/" },
  { nome: "Gemini", url: "https://gemini.google.com/app" },
];

type Estado = "feito" | "atual" | "depois";

function Passo({ n, titulo, estado, ultimo = false, children }: { n: number; titulo: string; estado: Estado; ultimo?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative grid grid-cols-[2.25rem_1fr] gap-x-4">
      {/* O fio que liga os passos: aceso até onde o aluno chegou. */}
      {!ultimo && <span aria-hidden className={`absolute bottom-[-1.75rem] left-[1.08rem] top-10 w-px ${estado === "feito" ? "bg-brand-green/50" : "bg-tinta/10"}`} />}
      <span
        className={`relative z-[1] grid h-9 w-9 place-items-center rounded-full font-mono text-sm transition-colors ${
          estado === "feito"
            ? "bg-brand-green text-sobre-acento"
            : estado === "atual"
              ? "border-2 border-acento bg-[#07130f] text-acento"
              : "border border-tinta/15 bg-[#080d17] text-slate-500"
        }`}
        aria-label={estado === "feito" ? `Passo ${n}, feito` : `Passo ${n}`}
      >
        {estado === "feito" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          n
        )}
      </span>
      <div className="min-w-0 pb-1 pt-1.5">
        <p className={`font-display text-base font-semibold ${estado === "depois" ? "text-slate-400" : "text-tinta"}`}>{titulo}</p>
        <div className="mt-2.5">{children}</div>
      </div>
    </div>
  );
}

/* Uma miniatura de cada estilo, desenhada em CSS: o aluno escolhe olhando,
   não lendo a descrição. */
function Miniatura({ estilo }: { estilo: Estilo }) {
  if (estilo === "painel")
    return (
      <div className="flex h-full flex-col gap-1.5 bg-[#0d1422] p-2.5">
        <div className="h-1.5 w-10 rounded-sm bg-tinta/60" />
        <div className="grid grid-cols-3 gap-1">
          {["42", "7", "3"].map((n) => (
            <div key={n} className="rounded-sm bg-tinta/[0.06] px-1 py-1 font-mono text-[9px] leading-none text-[#4ade9a]">{n}</div>
          ))}
        </div>
        <div className="flex flex-1 items-end gap-1">
          {[40, 65, 50, 85, 70].map((h, i) => <div key={i} className="flex-1 rounded-t-sm bg-[#4ade9a]/70" style={{ height: `${h}%` }} />)}
        </div>
      </div>
    );
  if (estilo === "editorial")
    return (
      <div className="flex h-full flex-col gap-1.5 bg-[#f1ece2] p-2.5">
        <div className="font-serif text-[13px] font-bold leading-none text-[#1c1a17]">Dados que</div>
        <div className="font-serif text-[13px] italic leading-none text-[#1c1a17]">mudam o jogo</div>
        <div className="mt-auto grid grid-cols-2 gap-1.5">
          {[0, 1].map((c) => (
            <div key={c} className="flex flex-col gap-[3px]">
              {[100, 90, 95, 70].map((w, i) => <div key={i} className="h-[2px] bg-[#1c1a17]/40" style={{ width: `${w}%` }} />)}
            </div>
          ))}
        </div>
      </div>
    );
  if (estilo === "terminal")
    return (
      <div className="flex h-full flex-col gap-1 bg-[#050805] p-2.5 font-mono text-[9px] leading-tight text-[#39ff88]">
        <span>$ portfolio --abrir</span>
        <span className="text-[#39ff88]/60">› 4 projetos</span>
        <span className="text-[#39ff88]/60">› 9 competências</span>
        <span>
          $ <span className="inline-block h-2 w-1.5 translate-y-[1px] bg-[#39ff88]" />
        </span>
      </div>
    );
  if (estilo === "minimalista")
    return (
      <div className="relative flex h-full flex-col bg-white p-2.5">
        <div className="text-[15px] font-black leading-[0.9] tracking-tight text-black">Dados.</div>
        <div className="mt-1 h-[2px] w-8 bg-black" />
        <div className="absolute bottom-2.5 right-2.5 h-4 w-4 bg-[#e3262b]" />
        <div className="mt-auto flex flex-col gap-[3px]">
          {[60, 45].map((w, i) => <div key={i} className="h-[2px] bg-black/50" style={{ width: `${w}%` }} />)}
        </div>
      </div>
    );
  if (estilo === "estudio")
    return (
      <div className="relative h-full overflow-hidden bg-[#0a0a0c] p-2.5">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(245,184,90,.55),transparent_65%)]" />
        <div className="font-mono text-[9px] text-[#f5b85a]">CENA 01</div>
        <div className="mt-1 text-[13px] font-bold leading-tight text-[#f2efe9]">O projeto</div>
        <div className="mt-auto flex flex-col gap-[3px] pt-5">
          {[70, 50].map((w, i) => <div key={i} className="h-[2px] bg-tinta/30" style={{ width: `${w}%` }} />)}
        </div>
      </div>
    );
  if (estilo === "metro")
    return (
      <div className="relative h-full bg-[#fafaf7]">
        <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
          <path d="M8 58 H50 L70 38 H112" stroke="#e4002b" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M20 12 V30 L50 58" stroke="#0072ce" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M70 38 V12 H104" stroke="#00a650" strokeWidth="4" fill="none" strokeLinecap="round" />
          {[[8, 58], [50, 58], [70, 38], [112, 38], [20, 12], [104, 12]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.2" fill="#fff" stroke="#1a1a1a" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    );
  if (estilo === "blueprint")
    return (
      <div className="relative h-full bg-[#0b3d91] bg-[linear-gradient(rgba(127,167,232,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(127,167,232,.25)_1px,transparent_1px)] bg-[size:8px_8px] p-2.5">
        <div className="font-mono text-[10px] font-bold text-tinta">PROJ-01</div>
        <div className="mt-2 h-6 w-16 border border-[#eaf2ff]/80" />
        <div className="absolute bottom-2 right-2 border border-[#eaf2ff]/80 px-1 font-mono text-[7px] text-[#ffcc00]">REV A · 2026</div>
      </div>
    );
  if (estilo === "relatorio")
    return (
      <div className="flex h-full flex-col gap-1 bg-white p-2.5">
        <div className="text-[10px] font-bold text-[#0a2540]">Relatório anual</div>
        {[85, 60, 40].map((w, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="h-1 w-6 bg-[#e3e8ee]" />
            <div className="h-1.5 rounded-sm bg-[#00a3a3]" style={{ width: `${w * 0.6}%` }} />
          </div>
        ))}
        <div className="mt-auto h-[2px] w-full bg-[#0a2540]" />
      </div>
    );
  if (estilo === "bento")
    return (
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 bg-[#f2f2f0] p-1.5">
        <div className="col-span-2 row-span-2 rounded-md bg-white p-1.5 text-[10px] font-bold text-[#16181d]">Nome</div>
        <div className="rounded-md bg-[#3b5bfd]" />
        <div className="rounded-md bg-white" />
      </div>
    );
  if (estilo === "brutalista")
    return (
      <div className="flex h-full flex-col bg-white p-2">
        <div className="border-[3px] border-black px-1 text-[15px] font-black leading-none text-black">DADOS</div>
        <div className="mt-1.5 text-[9px] font-bold text-black">
          <span className="bg-[#ffe600] px-0.5">RESULTADO</span> REAL
        </div>
        <div className="mt-auto h-[3px] w-full bg-black" />
      </div>
    );
  if (estilo === "caderno")
    return (
      <div className="relative h-full bg-[#fbf8f1] bg-[linear-gradient(transparent_11px,#d9e4f2_12px)] bg-[size:100%_12px] p-2.5">
        <div className="absolute bottom-0 left-4 top-0 w-px bg-[#f1a1a1]" />
        <div className="pl-3 text-[11px] italic text-[#1f5fbf]">anotação</div>
        <div className="absolute bottom-2 right-2 h-7 w-9 rotate-6 bg-[#ffe58a] shadow-sm" />
      </div>
    );
  if (estilo === "museu")
    return (
      <div className="flex h-full items-center gap-2 bg-[#f7f6f3] p-2.5">
        <div className="h-12 w-12 shrink-0 border-[3px] border-[#1b1b1b] bg-[#d9d4cb]" />
        <div className="flex flex-col gap-[3px]">
          <div className="text-[9px] font-semibold text-[#222]">Projeto, 2024</div>
          <div className="h-[2px] w-10 bg-[#8c8a85]" />
          <div className="h-[2px] w-8 bg-[#8c8a85]" />
        </div>
      </div>
    );
  return (
    <div className="relative h-full overflow-hidden bg-[#141026]">
      <div className="absolute -left-3 top-2 h-10 w-10 rotate-12 rounded-md bg-[#ff7a59]" />
      <div className="absolute left-7 top-7 h-7 w-12 -rotate-6 rounded-full bg-[#5ad1ff]" />
      <div className="absolute right-2 top-1 h-6 w-6 rotate-45 bg-[#ffd166]" />
      <div className="absolute bottom-1.5 right-3 font-display text-lg font-bold text-tinta">?</div>
    </div>
  );
}

export default function SiteDoPortfolio({
  atual,
  siteUrl,
  projetos,
  prontos,
  nome,
  raioX = null,
  promptInicial = null,
}: {
  atual: SiteAtual;
  siteUrl: string;
  projetos: number;
  prontos: number;
  nome: string;
  /** O que corrigir nos projetos antes de gerar (lib/portfolio-raiox). */
  raioX?: RaioX | null;
  /** Prompt já montado no servidor com o estilo padrão: o aluno chega e ele está pronto. */
  promptInicial?: { prompt: string; incluidos: number; foraPorLacuna: string[]; foraPorPrivado: string[]; certificados: number } | null;
}) {
  const [estilo, setEstilo] = useState<Estilo>("painel");
  const [pers, setPers] = useState<Personalizacao>(PERSONALIZACAO_PADRAO);
  const [verDirecao, setVerDirecao] = useState(false);
  const [raioAberto, setRaioAberto] = useState(false);
  const [ia, setIa] = useState(0);
  const [kit, setKit] = useState<Awaited<ReturnType<typeof kitDeDivulgacao>> | null>(null);
  const [abrindoKit, setAbrindoKit] = useState(false);
  async function abrirKit() {
    setAbrindoKit(true);
    setKit(await kitDeDivulgacao());
    setAbrindoKit(false);
  }
  function baixarQr(svg: string) {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-do-meu-portfolio.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const [prompt, setPrompt] = useState(promptInicial?.prompt ?? "");
  const [promptAberto, setPromptAberto] = useState(false);
  const [promptCopiado, setPromptCopiado] = useState(false);
  const [info, setInfo] = useState<{ incluidos: number; foraPorLacuna: string[]; foraPorPrivado: string[]; certificados: number } | null>(promptInicial);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [html, setHtml] = useState("");
  const [previa, setPrevia] = useState(false);
  const [aparelho, setAparelho] = useState<"computador" | "celular">("computador");
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [mostrarUniverso, setMostrarUniverso] = useState(atual?.mostrar_universo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [publicado, setPublicado] = useState<{ url: string; publicado: boolean } | null>(
    atual ? { url: `${siteUrl}/portfolio/${atual.slug}`, publicado: atual.publicado } : null,
  );
  // O momento da publicação: a carreira acende na tela antes do "está no ar".
  const [revelando, setRevelando] = useState(false);
  const [post, setPost] = useState("");

  async function carregarPost() {
    const r = await postDoLinkedIn();
    if (r.ok) setPost(r.texto);
  }

  /* O prompt se refaz sozinho a cada escolha, sem botão: montar é rápido e não
     usa IA nenhuma. A última escolha fica guardada neste navegador, e na
     próxima visita o prompt já volta montado com ela. */
  const ultimaChamada = useRef(0);
  async function gerar(e: Estilo = estilo, x: Personalizacao = pers) {
    const minha = ++ultimaChamada.current;
    setGerando(true);
    setErro("");
    const r = await gerarPromptDoSite(e, x);
    if (minha !== ultimaChamada.current) return; // chegou outra escolha no meio
    setGerando(false);
    if (!r.ok) return;
    setPrompt(r.prompt);
    setPromptCopiado(false);
    setInfo(r);
  }
  const CHAVE_PREFS = "portfolio-site-escolha";
  const carregouPrefs = useRef(false);
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFS) || "null");
      if (salvo?.estilo && salvo.estilo in ESTILOS) {
        setEstilo(salvo.estilo);
        setPers({ ...PERSONALIZACAO_PADRAO, ...(salvo.pers || {}) });
      }
    } catch {}
    carregouPrefs.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A escolha que gerou o prompt na tela. O servidor já mandou o do padrão.
  const escolhaDoPrompt = useRef(promptInicial ? JSON.stringify({ estilo: "painel", pers: PERSONALIZACAO_PADRAO }) : "");
  useEffect(() => {
    if (!carregouPrefs.current) return;
    const escolha = JSON.stringify({ estilo, pers });
    try { localStorage.setItem(CHAVE_PREFS, escolha); } catch {}
    if (prontos === 0 || escolha === escolhaDoPrompt.current) return;
    const t = setTimeout(() => {
      escolhaDoPrompt.current = escolha;
      gerar(estilo, pers);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estilo, pers]);
  const receitaAtiva = RECEITAS.find((r) => r.estilo === estilo && JSON.stringify(r.pers) === JSON.stringify(pers))?.id;

  async function copiar(texto: string, rotulo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(rotulo);
      if (rotulo === "prompt") setPromptCopiado(true);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      setErro("Não consegui copiar. Selecione o texto e copie com Ctrl+C.");
    }
  }

  /* A pré-visualização também confere número inventado. É o momento certo:
     o aluno está olhando o site, e o aviso aponta exatamente o que conferir. */
  async function previsualizar(texto = html) {
    setPrevia(true);
    setAuditoria(null);
    setErro("");
    setConferindo(true);
    const r = await conferirSite(texto);
    setConferindo(false);
    if (r.ok) setAuditoria(r.auditoria);
    else setErro(r.erro);
  }

  // Colou o site inteiro: confere na hora, sem precisar de mais um clique.
  function aoColar(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const colado = e.clipboardData.getData("text");
    if (colado.length > 200 && /<html|<!doctype/i.test(colado)) {
      e.preventDefault();
      setHtml(colado);
      previsualizar(colado);
    }
  }

  async function colarDaAreaDeTransferencia() {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) return setErro("A área de transferência está vazia. Copie o código na IA primeiro.");
      setHtml(t);
      previsualizar(t);
    } catch {
      setErro("O navegador não deixou ler a área de transferência. Clique na caixa e cole com Ctrl+V.");
    }
  }

  async function salvar(publicar: boolean) {
    setSalvando(true);
    setErro("");
    const r = await salvarSite({ html, publicar, mostrarUniverso });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setPublicado({ url: r.url, publicado: r.publicado });
    if (r.publicado) {
      carregarPost();
      setRevelando(true);
    }
  }

  async function tirarDoAr() {
    await despublicarSite();
    setPublicado((p) => (p ? { ...p, publicado: false } : p));
  }

  /* O LinkedIn abre o compositor já com o texto do post, e o link dentro do
     texto puxa o cartão com a constelação. Sem texto pronto, cai no
     compartilhamento simples do link. */
  const linkedin = publicado
    ? post
      ? `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post)}`
      : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicado.url)}`
    : "";

  // O que dá para saber do HTML colado antes de conferir no servidor.
  const leitura = (() => {
    const t = html.trim();
    if (!t) return null;
    const temInicio = /<!doctype html|<html/i.test(t);
    const temFim = /<\/html>/i.test(t);
    const linhas = t.split("\n").length;
    const kb = Math.max(1, Math.round(new Blob([t]).size / 1024));
    return { temInicio, temFim, linhas, kb };
  })();

  const temErro = !!auditoria?.achados.some((a) => a.nivel === "erro");
  const noAr = !!publicado?.publicado;

  // Onde o aluno está: o primeiro passo que ainda não foi feito é a vez dele.
  const feito = [prontos > 0, !!prompt || noAr, (!!auditoria && !temErro) || (noAr && !html), noAr && !html];
  const vez = feito.findIndex((f) => !f);
  const estado = (i: number): Estado => (feito[i] && (vez === -1 || i < vez) ? "feito" : i === vez ? "atual" : "depois");

  const cartaoNoAr = publicado && (
    <div className="rounded-3xl border border-acento/30 bg-papel p-6 text-left shadow-overlay">
      <p className="font-display text-2xl font-bold text-tinta">Seu portfólio está no ar</p>
      <a href={publicado.url} target="_blank" rel="noopener" className="mt-1 block truncate font-mono text-sm text-acento hover:underline">{publicado.url}</a>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={linkedin} target="_blank" rel="noopener" className="rounded-xl bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-tinta">Publicar no LinkedIn</a>
        <button onClick={() => copiar(publicado.url, "link")} className="rounded-xl border border-tinta/15 px-4 py-2 text-sm text-tinta">{copiado === "link" ? "Copiado" : "Copiar link"}</button>
        <a href={publicado.url} target="_blank" rel="noopener" className="rounded-xl border border-tinta/15 px-4 py-2 text-sm text-tinta">Abrir o site</a>
      </div>
      {post && (
        <div className="mt-4">
          <p className="text-xs text-slate-400">O texto do post, montado com o que você publicou:</p>
          <textarea readOnly value={post} rows={7} className="mt-1 w-full resize-none rounded-xl border border-tinta/10 bg-papel p-3 text-xs text-slate-200" />
          <button onClick={() => copiar(post, "post")} className="mt-1 text-xs text-acento hover:underline">{copiado === "post" ? "Copiado" : "Copiar o texto"}</button>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">Ponha o link também no seu perfil do LinkedIn: Informações de contato → Site, e na seção Em destaque.</p>
      <button onClick={() => setRevelando(false)} className="mt-4 text-sm text-slate-300 hover:text-tinta">Voltar</button>
    </div>
  );

  const botaoForte = "rounded-full bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento transition-opacity disabled:opacity-40";
  const botaoLeve = "rounded-xl border border-tinta/15 px-4 py-2.5 text-sm text-tinta transition-colors hover:border-tinta/40 disabled:opacity-40";

  return (
    <>
      {revelando && publicado && (
        <UniversoPublico slug={publicado.url.split("/portfolio/")[1]} nome={nome} aoFechar={() => setRevelando(false)} autoplay final={cartaoNoAr} />
      )}
      <section className="mt-8 overflow-hidden rounded-3xl border border-tinta/10 bg-[#070d18]">
        <div className="border-b border-tinta/[0.07] bg-[radial-gradient(90%_140%_at_0%_0%,rgba(21,196,126,.14),transparent_60%)] p-5 sm:p-7">
          <h2 className="font-display text-2xl font-bold text-tinta">Meu site de portfólio</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
            A Academy junta seus projetos e certificados num prompt. Você leva para a IA que preferir, recebe um site inteiro e publica aqui, com link para o seu LinkedIn. A página vem com o seu Universo 4D, que quem visitar pode girar e ver crescer ao longo da sua carreira.
          </p>

          {atual?.bloqueado && (
            <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/[0.08] px-3 py-2 text-sm text-red-200">
              Seu site foi tirado do ar pelo time. Fale com o suporte pela Central de Ajuda.
            </p>
          )}

          {noAr && publicado && (
            <div className="mt-5 border-l-2 border-acento pl-4">
              <p className="text-sm font-semibold text-tinta">Seu site está no ar</p>
              <a href={publicado.url} target="_blank" rel="noopener" className="mt-0.5 block truncate font-mono text-sm text-acento hover:underline">{publicado.url}</a>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={linkedin} target="_blank" rel="noopener" onMouseEnter={() => !post && carregarPost()} className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-sm font-semibold text-tinta">Publicar no LinkedIn</a>
                <button onClick={() => copiar(publicado.url, "link")} className="rounded-lg border border-tinta/15 px-3 py-1.5 text-sm text-tinta hover:border-tinta/40">{copiado === "link" ? "Copiado" : "Copiar link"}</button>
                <button onClick={() => setRevelando(true)} className="rounded-lg border border-tinta/15 px-3 py-1.5 text-sm text-tinta hover:border-tinta/40">Ver a revelação</button>
                <button onClick={tirarDoAr} className="px-2 text-xs text-slate-500 hover:text-slate-300">Tirar do ar</button>
              </div>
              <p className="mt-2.5 text-xs text-slate-500">No LinkedIn, ponha o link em Editar perfil → Informações de contato → Site, e na seção Em destaque.</p>

              {/* Kit de divulgação: QR para o currículo e textos prontos. */}
              {!kit?.ok ? (
                <button type="button" onClick={abrirKit} disabled={abrindoKit} className="mt-3 text-sm font-semibold text-acento hover:underline disabled:opacity-50">
                  {abrindoKit ? "Montando o kit..." : "Abrir o kit de divulgação: QR code e textos prontos"}
                </button>
              ) : (
                <div className="mt-4 grid gap-4 rounded-[20px] border border-tinta/10 bg-papel p-4 sm:grid-cols-[9rem_1fr]">
                  <div>
                    <div className="rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: kit.qrSvg }} />
                    <button type="button" onClick={() => baixarQr(kit.qrSvg)} className="mt-2 w-full text-center text-xs font-semibold text-acento hover:underline">
                      Baixar o QR
                    </button>
                    <p className="mt-1 text-center text-[0.7rem] text-slate-500">Para o currículo e o crachá</p>
                  </div>
                  <div className="flex min-w-0 flex-col gap-3">
                    {[
                      { rotulo: "Título para a seção Em destaque", texto: kit.destaqueTitulo },
                      { rotulo: "Descrição para a seção Em destaque", texto: kit.destaqueDescricao },
                      { rotulo: "Mensagem para recrutador (troque o nome entre colchetes)", texto: kit.mensagem },
                    ].map((t) => (
                      <div key={t.rotulo}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-xs font-semibold text-slate-300">{t.rotulo}</p>
                          <button type="button" onClick={() => copiar(t.texto, t.rotulo)} className="shrink-0 text-xs text-acento hover:underline">
                            {copiado === t.rotulo ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-200">{t.texto}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {kit && !kit.ok && <p className="mt-2 text-xs text-red-300">{kit.erro}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-7 p-5 sm:p-7">
          <Passo n={1} titulo="Publique seus projetos" estado={estado(0)}>
            <p className="text-sm text-slate-400">
              {prontos > 0
                ? `${prontos} ${prontos === 1 ? "projeto pronto" : "projetos prontos"} para entrar no site${projetos > prontos ? `, e ${projetos - prontos} ainda com lacuna ou só para a turma` : ""}. Quanto mais projetos, de anos diferentes, mais o seu 4D cresce.`
                : projetos > 0
                  ? "Seus projetos ainda têm lacunas entre colchetes ou estão só para a turma. Complete e marque como público para eles entrarem no site."
                  : "O site é feito dos seus projetos. Cadastre pelo menos um antes de gerar o prompt: conte do seu jeito e a IA organiza nos campos."}
            </p>
            <button onClick={() => window.dispatchEvent(new Event("portfolio:novo-projeto"))} className={`mt-3 ${prontos > 0 ? botaoLeve : botaoForte}`}>
              {prontos > 0 ? "Publicar outro projeto" : "Publicar meu primeiro projeto"}
            </button>

            {/* Raio-X: o site é tão bom quanto os projetos que entram nele. */}
            {raioX && projetos > 0 && (
              <div className="mt-5 rounded-2xl border border-tinta/10 bg-tinta/[0.02]">
                <button type="button" onClick={() => setRaioAberto((v) => !v)} className="flex w-full items-center gap-4 p-4 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-tinta">Raio-X do portfólio</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {raioX.projetos.length + raioX.gerais.length === 0
                        ? "Tudo certo. Seus projetos estão prontos para virar um site forte."
                        : `${raioX.projetos.length} ${raioX.projetos.length === 1 ? "projeto pede" : "projetos pedem"} ajuste antes de gerar o site.`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-tinta/10">
                      <div className={`h-full rounded-full ${raioX.nota >= 85 ? "bg-brand-green" : raioX.nota >= 60 ? "bg-amber-300" : "bg-red-400"}`} style={{ width: `${raioX.nota}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-sm tabular-nums text-tinta">{raioX.nota}</span>
                    <span className="text-xs text-slate-500">{raioAberto ? "fechar" : "ver"}</span>
                  </div>
                </button>
                {raioAberto && (
                  <div className="border-t border-tinta/[0.07] p-4">
                    {raioX.fortes.length > 0 && (
                      <p className="text-sm text-slate-300">
                        <span className="font-semibold text-acento">O que já está forte:</span> {raioX.fortes.join(", ")}.
                      </p>
                    )}
                    {raioX.gerais.map((a, i) => (
                      <p key={i} className={`mt-2 text-sm ${a.nivel === "grave" ? "text-red-200" : "text-amber-100"}`}>{a.texto}</p>
                    ))}
                    <ul className="mt-3 divide-y divide-tinta/[0.06]">
                      {raioX.projetos.map((p) => (
                        <li key={p.id} className="py-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-tinta">{p.titulo}</p>
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent("portfolio:editar-projeto", { detail: p.id }))}
                              className="shrink-0 text-xs font-semibold text-acento hover:underline"
                            >
                              Corrigir →
                            </button>
                          </div>
                          <ul className="mt-1 flex flex-col gap-1">
                            {p.achados.map((a, i) => (
                              <li key={i} className={`text-xs leading-relaxed ${a.nivel === "grave" ? "text-red-200" : "text-slate-400"}`}>
                                {a.nivel === "grave" ? "Corrigir: " : ""}{a.texto}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Passo>

          <Passo n={2} titulo="Escolha o estilo e gere o seu prompt" estado={estado(1)}>
            {/* Receitas: um clique e está pronto. Os estilos embaixo são para quem quer ajustar. */}
            <p className="text-xs font-semibold text-slate-300">Comece por uma receita</p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {RECEITAS.map((r) => {
                const sel = receitaAtiva === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setEstilo(r.estilo); setPers(r.pers); }}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${sel ? "border-acento bg-brand-green/10" : "border-tinta/10 hover:border-tinta/30"}`}
                  >
                    <span className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-tinta/10"><Miniatura estilo={r.estilo} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tinta">{r.nome}</span>
                      <span className="block truncate text-xs text-slate-400">{r.para}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-xs font-semibold text-slate-300">Ou escolha o estilo</p>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Estilo do site">
              {(Object.keys(ESTILOS) as Estilo[]).map((e) => {
                const sel = estilo === e;
                return (
                  <button
                    key={e}
                    role="radio"
                    aria-checked={sel}
                    onClick={() => setEstilo(e)}
                    className={`group overflow-hidden rounded-xl border text-left transition-all ${
                      sel ? "border-acento ring-1 ring-acento" : "border-tinta/10 hover:-translate-y-0.5 hover:border-tinta/30"
                    }`}
                  >
                    <div className="h-[4.5rem] overflow-hidden">
                      <Miniatura estilo={e} />
                    </div>
                    <p className={`border-t border-tinta/10 px-2.5 py-2 text-xs font-semibold ${sel ? "bg-brand-green/10 text-tinta" : "text-slate-300"}`}>{ESTILOS[e].nome}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 max-w-3xl">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-tinta">{ESTILOS[estilo].nome}.</span> {ESTILOS[estilo].resumo}
              </p>
              <button type="button" onClick={() => setVerDirecao((v) => !v)} className="mt-1 text-xs text-slate-400 underline decoration-tinta/20 underline-offset-4 hover:text-tinta">
                {verDirecao ? "Esconder a direção de arte" : "Ver a direção de arte completa que vai no prompt"}
              </button>
              {verDirecao && <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-tinta/10 bg-papel p-3 font-sans text-xs leading-relaxed text-slate-400">{ESTILOS[estilo].direcao}</pre>}
            </div>

            {/* Personalização por cima do estilo. Cada escolha vira uma linha no prompt. */}
            <div className="mt-5 grid gap-4 rounded-[20px] border border-tinta/10 bg-papel p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-300">Cor de destaque</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
                  {CORES_DE_DESTAQUE.map((c) => {
                    const sel = pers.cor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        role="radio"
                        aria-checked={sel}
                        onClick={() => setPers((x) => ({ ...x, cor: c.hex }))}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${sel ? "border-tinta/60 bg-tinta/10 text-tinta" : "border-tinta/10 text-slate-300 hover:border-tinta/30"}`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-tinta/20"
                          style={{ background: c.hex === "auto" ? "conic-gradient(#22c55e,#2f6bff,#ff5a4e,#f5b400,#22c55e)" : c.hex }}
                        />
                        {c.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(
                [
                  { chave: "tema", rotulo: "Tema", opcoes: [["auto", "Automático"], ["escuro", "Escuro"], ["claro", "Claro"]] },
                  { chave: "idioma", rotulo: "Idioma do site", opcoes: [["pt", "Português"], ["en", "Inglês"], ["bilingue", "PT + EN"]] },
                  { chave: "tom", rotulo: "Tom dos textos", opcoes: [["direto", "Direto"], ["tecnico", "Técnico"], ["caloroso", "Caloroso"]] },
                ] as const
              ).map((g) => (
                <div key={g.chave}>
                  <p className="text-xs font-semibold text-slate-300">{g.rotulo}</p>
                  <div className="mt-2 inline-flex rounded-lg border border-tinta/10 p-0.5" role="radiogroup" aria-label={g.rotulo}>
                    {g.opcoes.map(([v, r]) => {
                      const sel = (pers as any)[g.chave] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          onClick={() => setPers((x) => ({ ...x, [g.chave]: v }))}
                          className={`rounded-md px-3 py-1.5 text-xs transition-colors ${sel ? "bg-white text-[#0b1220]" : "text-slate-300 hover:text-tinta"}`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {prontos > 0 ? (
              <p className={`mt-4 text-sm ${gerando ? "text-slate-400" : "text-acento"}`} aria-live="polite">
                {gerando ? "Atualizando o seu prompt com a escolha..." : prompt ? "Seu prompt está pronto, com o estilo e as escolhas acima. É só copiar." : ""}
              </p>
            ) : (
              <p className="mt-4 text-sm text-amber-200">Publique pelo menos um projeto no passo 1 e o seu prompt aparece aqui, pronto.</p>
            )}

            {info && (
              <div className="mt-4 flex flex-col gap-1 text-xs text-slate-400">
                <p>
                  Entraram <span className="font-semibold text-tinta">{info.incluidos}</span> {info.incluidos === 1 ? "projeto" : "projetos"} e{" "}
                  <span className="font-semibold text-tinta">{info.certificados}</span> {info.certificados === 1 ? "certificado" : "certificados"} com link de verificação.
                </p>
                {info.incluidos === 0 && <p className="text-amber-200">Seu prompt saiu sem nenhum projeto, e o site vai sair vazio. Volte ao passo 1.</p>}
                {info.foraPorLacuna.length > 0 && (
                  <p className="text-amber-200">Ficaram de fora porque ainda têm lacunas entre colchetes: {info.foraPorLacuna.join(", ")}. Preencha e gere de novo.</p>
                )}
                {info.foraPorPrivado.length > 0 && <p>Ficaram de fora porque estão só para a turma: {info.foraPorPrivado.join(", ")}.</p>}
              </div>
            )}

            {prompt && (
              <div className="mt-4 rounded-2xl border border-tinta/10 bg-tinta/[0.02]">
                <div className="flex flex-wrap items-center gap-2 border-b border-tinta/[0.07] p-3">
                  <button onClick={() => copiar(prompt, "prompt")} className={botaoForte}>
                    {copiado === "prompt" ? "Copiado" : "Copiar prompt"}
                  </button>
                  <span className="px-1 text-xs text-slate-500">e cole em</span>
                  {IAS.map((ia) => (
                    <a key={ia.nome} href={ia.url} target="_blank" rel="noopener" className="rounded-lg border border-tinta/10 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:border-tinta/40 hover:text-tinta">
                      {ia.nome} ↗
                    </a>
                  ))}
                  <span className="text-xs text-slate-500">ou no Codex</span>
                </div>
                <div className="relative">
                  <pre className={`overflow-hidden whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-slate-400 ${promptAberto ? "max-h-[28rem] overflow-y-auto" : "max-h-28"}`}>{prompt}</pre>
                  {!promptAberto && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a1019] to-transparent" />}
                </div>
                <button onClick={() => setPromptAberto((v) => !v)} className="w-full border-t border-tinta/[0.07] py-2 text-xs text-slate-400 hover:text-tinta">
                  {promptAberto ? "Recolher o prompt" : `Ler o prompt inteiro (${prompt.length.toLocaleString("pt-BR")} caracteres)`}
                </button>
                {/* Como pedir em cada IA: é onde o aluno mais trava. */}
                <div className="border-t border-tinta/[0.07] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold text-slate-300">Como pedir no</p>
                    <div className="inline-flex rounded-lg border border-tinta/10 p-0.5" role="tablist" aria-label="Guia por IA">
                      {GUIA_IAS.map((g, i) => (
                        <button
                          key={g.nome}
                          type="button"
                          role="tab"
                          aria-selected={ia === i}
                          onClick={() => setIa(i)}
                          className={`rounded-md px-3 py-1 text-xs transition-colors ${ia === i ? "bg-white text-[#0b1220]" : "text-slate-300 hover:text-tinta"}`}
                        >
                          {g.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ol className="mt-3 flex flex-col gap-1.5">
                    {GUIA_IAS[ia].passos.map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-slate-300">
                        <span className="font-mono text-acento">{i + 1}</span>
                        {t}
                      </li>
                    ))}
                  </ol>
                  <a href={GUIA_IAS[ia].url} target="_blank" rel="noopener" className="mt-3 inline-block text-xs font-semibold text-acento hover:underline">
                    Abrir o {GUIA_IAS[ia].nome} ↗
                  </a>
                </div>
              </div>
            )}
            {promptCopiado && !html && <p className="mt-2 text-xs text-acento">Prompt copiado. Cole na IA e, quando ela devolver o código, siga para o passo 3.</p>}
          </Passo>

          <Passo n={3} titulo="Cole o HTML que a IA devolveu" estado={estado(2)}>
            <div className={`rounded-2xl border border-dashed transition-colors ${html ? "border-tinta/15" : "border-tinta/20 hover:border-acento/50"}`}>
              <textarea
                value={html}
                onChange={(e) => { setHtml(e.target.value); setPrevia(false); setAuditoria(null); }}
                onPaste={aoColar}
                rows={html ? 6 : 4}
                placeholder="Cole aqui o código inteiro, do <!doctype html> ao </html>. Pode vir com o texto que a IA escreveu em volta: a Academy separa sozinha."
                className="w-full resize-y rounded-2xl bg-transparent px-4 py-3 font-mono text-xs text-slate-200 placeholder:font-sans placeholder:text-sm placeholder:text-slate-500 outline-none"
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-tinta/[0.07] px-4 py-2.5">
                {!html ? (
                  <button onClick={colarDaAreaDeTransferencia} className="text-sm font-semibold text-acento hover:underline">Colar da área de transferência</button>
                ) : (
                  leitura && (
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="font-mono tabular-nums text-slate-400">{leitura.linhas.toLocaleString("pt-BR")} linhas · {leitura.kb} KB</span>
                      <span className={leitura.temInicio ? "text-slate-400" : "text-amber-200"}>{leitura.temInicio ? "início do site encontrado" : "não achei o <!doctype html>"}</span>
                      <span className={leitura.temFim ? "text-slate-400" : "text-amber-200"}>{leitura.temFim ? "fim do site encontrado" : "não achei o </html>: talvez a IA cortou"}</span>
                    </span>
                  )
                )}
                {html && (
                  <button onClick={() => { setHtml(""); setPrevia(false); setAuditoria(null); }} className="ml-auto text-xs text-slate-500 hover:text-slate-300">Limpar</button>
                )}
              </div>
            </div>
            <button onClick={() => previsualizar()} disabled={html.trim().length < 30 || conferindo} className={`mt-3 ${botaoLeve}`}>
              {conferindo ? "Conferindo o site..." : auditoria ? "Conferir de novo" : "Pré-visualizar e conferir"}
            </button>

            {/* A conferência do site. Erro trava o botão de publicar; aviso
                não trava. O pedido de correção vai pronto para a mesma
                conversa da IA, que devolve o site consertado. */}
            {auditoria && (
              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  temErro ? "border-red-400/40 bg-red-400/[0.06]" : auditoria.achados.length ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-acento/40 bg-brand-green/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-tinta">
                    {auditoria.achados.length === 0 ? "Site conferido: pronto para publicar." : temErro ? "O site precisa de correção antes de ir ao ar." : "O site pode ir ao ar, mas vale ajustar."}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-tinta/10">
                      <div className={`h-full rounded-full ${temErro ? "bg-red-400" : auditoria.nota < 90 ? "bg-amber-300" : "bg-brand-green"}`} style={{ width: `${auditoria.nota}%` }} />
                    </div>
                    <span className="font-mono text-sm tabular-nums text-slate-200">{auditoria.nota}</span>
                  </div>
                </div>
                {auditoria.achados.length > 0 && (
                  <>
                    <ul className="mt-3 flex flex-col divide-y divide-tinta/[0.06] text-sm">
                      {auditoria.achados.map((a, i) => (
                        <li key={i} className={`py-1.5 ${a.nivel === "erro" ? "text-red-200" : "text-amber-100"}`}>
                          <span className="font-semibold">{a.nivel === "erro" ? "Corrigir: " : "Ajustar: "}</span>
                          {a.texto}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button onClick={() => copiar(auditoria.pedidoDeCorrecao, "correcao")} className="rounded-lg bg-tinta/10 px-3 py-1.5 text-sm font-semibold text-tinta hover:bg-tinta/15">
                        {copiado === "correcao" ? "Copiado" : "Copiar pedido de correção"}
                      </button>
                      <span className="text-xs text-slate-400">Cole na mesma conversa da IA, ela devolve o site corrigido. Depois cole o novo HTML aqui.</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refinar na mesma conversa da IA. O primeiro site raramente é o
                melhor: pedir ajustes é a parte que o aluno mais aprende. */}
            {previa && (
              <div className="mt-4 rounded-[20px] border border-tinta/10 bg-papel p-4">
                <p className="text-sm font-semibold text-tinta">Refinar com a IA</p>
                <p className="mt-0.5 text-xs text-slate-400">Copie um pedido, cole na mesma conversa da IA e cole aqui o código novo que ela devolver.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REFINAMENTOS.map((r) => (
                    <button
                      key={r.rotulo}
                      type="button"
                      onClick={() => copiar(r.texto, `ref-${r.rotulo}`)}
                      title={r.texto}
                      className="rounded-full border border-tinta/15 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-acento/60 hover:text-tinta"
                    >
                      {copiado === `ref-${r.rotulo}` ? "Copiado" : r.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {previa && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-tinta/10 bg-[#0b1220]">
                <div className="flex items-center justify-between gap-3 border-b border-tinta/[0.07] px-3 py-2">
                  <span className="text-xs text-slate-400">Pré-visualização</span>
                  <div className="flex rounded-lg border border-tinta/10 p-0.5 text-xs" role="tablist" aria-label="Tamanho da tela">
                    {(["computador", "celular"] as const).map((a) => (
                      <button
                        key={a}
                        role="tab"
                        aria-selected={aparelho === a}
                        onClick={() => setAparelho(a)}
                        className={`rounded-md px-3 py-1 capitalize transition-colors ${aparelho === a ? "bg-white text-[#0b1220]" : "text-slate-300 hover:text-tinta"}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`flex justify-center ${aparelho === "celular" ? "bg-[#05080f] py-4" : ""}`}>
                  <iframe
                    title="Pré-visualização do site"
                    srcDoc={envelopar((() => { const l = limparHtmlColado(html); return l.ok ? l.html : html; })())}
                    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                    className={`bg-white transition-[width] duration-300 ${aparelho === "celular" ? "h-[640px] w-[390px] rounded-[1.4rem] border-[6px] border-[#1d2433]" : "h-[520px] w-full"}`}
                  />
                </div>
              </div>
            )}
          </Passo>

          <Passo n={4} titulo="Publique e leve o link para o LinkedIn" estado={estado(3)} ultimo>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
              <span className="relative mt-0.5 inline-flex shrink-0">
                <input type="checkbox" checked={mostrarUniverso} onChange={(e) => setMostrarUniverso(e.target.checked)} className="peer sr-only" />
                <span className="h-5 w-9 rounded-full bg-tinta/15 transition-colors peer-checked:bg-brand-green peer-focus-visible:ring-2 peer-focus-visible:ring-acento/60" />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </span>
              <span>
                <span className="font-medium text-tinta">Mostrar meu Universo 4D na página</span>
                <span className="block text-xs text-slate-400">As competências acendem a partir dos seus projetos, na ordem em que você os fez.</span>
              </span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => salvar(true)} disabled={salvando || html.trim().length < 30 || !!atual?.bloqueado || temErro} className={botaoForte}>
                {salvando ? "Publicando..." : noAr ? "Publicar nova versão" : "Publicar"}
              </button>
              <button onClick={() => salvar(false)} disabled={salvando || html.trim().length < 30} className={botaoLeve}>
                Salvar sem publicar
              </button>
              {!html && <span className="text-xs text-slate-500">{noAr ? "Para trocar o site, cole a nova versão no passo 3." : "Cole o HTML no passo 3 para liberar."}</span>}
              {html && temErro && <span className="text-xs text-red-300">Corrija o que a conferência apontou para liberar.</span>}
            </div>
            {erro && <p className="mt-3 text-sm text-red-300">{erro}</p>}
          </Passo>
        </div>
      </section>
    </>
  );
}
