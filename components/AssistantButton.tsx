"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import panelStyles from "./assistant-panel.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Mascot from "./Mascot";
import FloatingMascot from "./FloatingMascot";
import MascotNamePoll from "./MascotNamePoll";
import { montarFila, type Balao } from "@/lib/mascote";

/* Ritmo dos balões: o primeiro aparece logo, fica um tempo e some; o próximo
   só vem bem depois. Fechar no ✕ cala o mascote até o fim da sessão. */
const PRIMEIRO_MS = 3500;
const VISIVEL_MS = 14000;
const INTERVALO_MS = 45000;
const MAX_POR_SESSAO = 12;

function lerSessao(chave: string): string | null {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}
function gravarSessao(chave: string, valor: string) {
  try { sessionStorage.setItem(chave, valor); } catch {}
}

type Msg = { role: "user" | "assistant"; content: string; link?: { href: string; label: string } };

const GREETING = "Oi! Sou o assistente da DriveData. Posso ajudar com cursos, certificados, comunidade, ranking e como tudo funciona por aqui. No que posso ajudar?";
const SUGGESTIONS = ["Onde fica meu certificado?", "Em qual curso eu estou?", "Como ganho pontos na comunidade?"];

/* O modelo escreve Markdown mesmo mandado nao escrever.

   O balao renderiza texto puro, entao "**Agenda**" aparecia com os asteriscos
   na tela do aluno. Instruir o prompt ajuda mas nao garante: modelo escorrega,
   e quando escorrega quem ve o defeito e o aluno.

   Entao o negrito passa a ser entendido aqui. Sao duas estrelas, nada alem
   disso: lista e cabecalho ja saem bem com a quebra de linha que o CSS
   preserva, e interpretar mais Markdown so criaria jeitos novos de quebrar.

   Uma estrela solta fica como esta, de proposito: aparece em multiplicacao e
   em SELECT *, e apagar seria pior que mostrar. */
function comNegrito(texto: string) {
  return String(texto || "")
    .split(/(\*\*[^*\n]+\*\*)/g)
    .map((parte, i) =>
      parte.length > 4 && parte.startsWith("**") && parte.endsWith("**") ? (
        <strong key={i} className="font-semibold text-white">{parte.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{parte}</span>
      ),
    );
}

export default function AssistantButton() {
  const tr = usarTraducao();
  const [open, setOpen] = useState(false);
  const [pollVisible, setPollVisible] = useState(false);
  const [pollAvailable, setPollAvailable] = useState(false);
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: tr(GREETING) }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [balao, setBalao] = useState<Balao | null>(null);
  const [revelado, setRevelado] = useState(false);
  const pathname = usePathname() || "";
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const openRef = useRef(false);
  openRef.current = open || pollVisible;
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    const openEv = () => openChat();
    window.addEventListener("open-assistant", openEv);
    return () => window.removeEventListener("open-assistant", openEv);
  }, []);

  // Ciclo dos balões. A posição na fila fica na sessão, então trocar de tela
  // continua de onde parou em vez de repetir o primeiro balão.
  useEffect(() => {
    if (lerSessao("mascote:mudo") === "1") { setHintDismissed(true); return; }
    let semente = Number(lerSessao("mascote:semente"));
    if (!semente) { semente = Math.floor(Math.random() * 1e9) + 1; gravarSessao("mascote:semente", String(semente)); }

    const timers: number[] = [];
    const agenda = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };

    const mostrar = () => {
      const pos = Number(lerSessao("mascote:pos") || "0");
      if (pos >= MAX_POR_SESSAO) return;
      if (openRef.current) { agenda(mostrar, INTERVALO_MS); return; }
      const fila = montarFila(pathRef.current, semente);
      setBalao(fila[pos % fila.length]);
      setRevelado(false);
      setShowHint(true);
      gravarSessao("mascote:pos", String(pos + 1));
      agenda(() => setRevelado(true), 2200);
      agenda(() => { setShowHint(false); agenda(mostrar, INTERVALO_MS); }, VISIVEL_MS);
    };
    agenda(mostrar, PRIMEIRO_MS);
    return () => timers.forEach(window.clearTimeout);
  }, []);

  function calar() {
    setShowHint(false);
    setHintDismissed(true);
    gravarSessao("mascote:mudo", "1");
  }

  // Abrir o chat só esconde o balão da vez: o mascote volta a falar depois,
  // quando a conversa estiver fechada. Quem quer silêncio usa o ✕.
  function openChat() {
    setOpen(true);
    setShowHint(false);
  }

  function closeChat() {
    setOpen(false);
    document.getElementById("drivedata-assistant-trigger")?.focus({ preventScroll: true });
  }

  async function callApi(convo: Msg[], extra: Record<string, any> = {}) {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convo.map(({ role, content }) => ({ role, content })), escalated, ...extra }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply || tr("Não consegui responder agora.") }]);
      if (data.escalated && data.ticketId) {
        setEscalated(true);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: tr("Acompanhe o atendimento por aqui:"), link: { href: `/conta/ajuda/${data.ticketId}`, label: "Ver meu chamado" } },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: tr("Tive um problema de conexão. Tente de novo em instantes.") }]);
    } finally {
      setLoading(false);
    }
  }

  async function sendText(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setInput("");
    await callApi(next);
  }

  async function talkToTeam() {
    if (loading || escalated) return;
    const next = [...messages, { role: "user" as const, content: tr("Quero falar com o time.") }];
    setMessages(next);
    await callApi(next, { forceEscalate: true });
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  }

  const fresh = messages.length === 1;

  return (
    <div className={`assistant-dock fixed bottom-5 right-5 z-50 print:hidden ${panelStyles.stage}`}>
      <style>{`@media (prefers-reduced-motion:reduce){.assistant-dock .animate-float,.assistant-dock .animate-pulse{animation:none!important}}`}</style>
      <AnimatePresence initial={false}>
      {open && (
        <motion.section key="assistant-panel" id="drivedata-assistant-panel" role="dialog" aria-label={tr("Assistente DriveData")} className={panelStyles.panel}
          initial={reduceMotion ? {opacity:0} : {opacity:0,scale:.84,y:28,rotateX:9,filter:"blur(10px)"}}
          animate={{opacity:1,scale:1,y:0,rotateX:0,filter:"blur(0px)"}}
          exit={reduceMotion ? {opacity:0} : {opacity:0,scale:.94,y:16,filter:"blur(5px)",transition:{duration:.18}}}
          transition={{duration:reduceMotion ? .1 : .6,ease:[.16,1,.3,1]}}
          onAnimationComplete={definition => { if(typeof definition === "object" && !Array.isArray(definition) && definition.opacity === 1) closeRef.current?.focus({preventScroll:true}); }}
          onKeyDown={event => { if(event.key === "Escape") { event.stopPropagation(); closeChat(); } }}>
          {/* Header */}
          <div className={panelStyles.header}>
            <div className="relative flex items-center gap-3">
              <div className={panelStyles.portrait}><Mascot realistic className="h-16 w-16 drop-shadow" /></div>
              <div className="flex-1">
                <p className={panelStyles.brand}>DRIVEDATA ACADEMY</p>
                <p className={panelStyles.title}>{tr("Assistente DriveData")}</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> {tr("Online agora")}</p>
              </div>
              <button ref={closeRef} onClick={closeChat} aria-label={tr("Fechar")} className={panelStyles.close}>✕</button>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className={`${panelStyles.messages} space-y-4`}>
            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="flex items-end gap-2">
                  <Mascot realistic className="h-7 w-7 shrink-0" />
                  <div className="max-w-[82%]">
                    <div className={panelStyles.message}>{comNegrito(m.content)}</div>
                    {m.link && (
                      <Link href={m.link.href} onClick={() => setOpen(false)} className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-brand-teal/40 px-3 py-1.5 text-xs font-medium text-brand-teal hover:bg-brand-teal/10">{m.link.label} →</Link>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-gradient-to-br from-brand-green to-brand-blue px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 whitespace-pre-line">{m.content}</div>
                </div>
              )
            )}

            {/* Sugestões rápidas */}
            {fresh && !loading && (
              <div className={panelStyles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => sendText(s)} className={panelStyles.suggestion}>{tr(s)}</button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-end gap-2">
                <Mascot realistic className="h-7 w-7 shrink-0" />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.04] px-4 py-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={panelStyles.composer}>
            <div className={panelStyles.inputRow}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder={tr("Escreva sua mensagem...")}
                aria-label={tr("Escreva sua mensagem...")}
                className={panelStyles.input}
              />
              <button onClick={() => sendText(input)} disabled={loading || !input.trim()} aria-label={tr("Enviar")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 transition-transform hover:scale-105 disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[0.65rem] text-slate-500">{tr("IA · pode conter imprecisões")}</span>
              <button onClick={talkToTeam} disabled={loading || escalated} className="text-[0.72rem] font-medium text-brand-teal hover:underline disabled:opacity-50">
                {escalated ? "Time acionado ✓" : tr("Falar com uma pessoa")}
              </button>
            </div>
          </div>
        </motion.section>
      )}
      </AnimatePresence>

      {/* Balão do mascote: convite, dica da plataforma ou piada de tech. */}
      {showHint && !open && !pollAvailable && !hintDismissed && balao && (
        <div className="absolute bottom-5 right-[116px] w-64 max-w-[calc(100vw-164px)]" role="status" aria-live="polite">
          <div className="relative rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 shadow-xl backdrop-blur">
            <button onClick={calar} aria-label={tr("Não mostrar mais balões nesta sessão")} title={tr("Não mostrar mais nesta sessão")} className="absolute right-2 top-2 text-slate-500 hover:text-white">✕</button>

            {balao.tipo === "ajuda" && (
              <button onClick={openChat} className="block pr-4 text-left">
                <p className="text-sm font-semibold text-white">{tr("Precisa de ajuda?")}</p>
                <p className="mt-0.5 text-xs text-slate-300">{tr("Fale comigo, respondo na hora.")}</p>
              </button>
            )}

            {balao.tipo === "dica" && (
              <div className="pr-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-brand-green">{tr("Dica")}</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{tr(balao.titulo)}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{tr(balao.texto)}</p>
                {!pathname.startsWith(balao.href) && (
                  <Link href={balao.href} onClick={() => setShowHint(false)} className="mt-2 inline-block text-xs font-semibold text-brand-green hover:underline">
                    {tr(balao.acao)} →
                  </Link>
                )}
              </div>
            )}

            {balao.tipo === "piada" && (
              <div className="pr-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-amber-300">{tr("Piada de dev")}</p>
                <p className="mt-0.5 text-sm text-white">{tr(balao.texto)}</p>
                {balao.final && (
                  <p className={`mt-1 text-xs font-semibold text-brand-green transition-opacity duration-500 ${revelado ? "opacity-100" : "opacity-0"}`}>
                    {tr(balao.final)}
                  </p>
                )}
                <button onClick={openChat} className="mt-2 text-[0.7rem] text-slate-400 hover:text-white">{tr("Posso ajudar em algo? →")}</button>
              </div>
            )}

            <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-r border-white/10 bg-ink-800" />
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <MascotNamePoll chatOpen={open} onVisibilityChange={setPollVisible} onAvailabilityChange={setPollAvailable} />
      <FloatingMascot open={open} onToggle={() => (open ? closeChat() : openChat())} />
    </div>
  );
}
