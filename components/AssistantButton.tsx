"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Mascot from "./Mascot";

type Msg = { role: "user" | "assistant"; content: string; link?: { href: string; label: string } };

const GREETING = "Oi! Sou o assistente da DriveData. Posso ajudar com cursos, certificados, comunidade, ranking e como tudo funciona por aqui. No que posso ajudar?";
const SUGGESTIONS = ["Onde fica meu certificado?", "Em qual curso eu estou?", "Como ganho pontos na comunidade?"];

export default function AssistantButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3500);
    const openEv = () => openChat();
    window.addEventListener("open-assistant", openEv);
    return () => { clearTimeout(t); window.removeEventListener("open-assistant", openEv); };
  }, []);

  function openChat() {
    setOpen(true);
    setShowHint(false);
    setHintDismissed(true);
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
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "Não consegui responder agora." }]);
      if (data.escalated && data.ticketId) {
        setEscalated(true);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Acompanhe o atendimento por aqui:", link: { href: `/conta/ajuda/${data.ticketId}`, label: "Ver meu chamado" } },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Tive um problema de conexão. Tente de novo em instantes." }]);
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
    const next = [...messages, { role: "user" as const, content: "Quero falar com o time." }];
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
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div className="mb-3 flex h-[540px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-800/95 shadow-2xl backdrop-blur">
          {/* Header */}
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-brand-green/25 via-brand-teal/10 to-brand-blue/20 px-4 py-3">
            <div className="relative flex items-center gap-3">
              <Mascot className="h-12 w-12 animate-float drop-shadow" />
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-white">Assistente DriveData</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-200"><span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" /> Online agora</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white">✕</button>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="flex items-end gap-2">
                  <Mascot className="h-7 w-7 shrink-0" />
                  <div className="max-w-[82%]">
                    <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-slate-100 whitespace-pre-line">{m.content}</div>
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
              <div className="ml-9 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => sendText(s)} className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-brand-green/50 hover:text-white">{s}</button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-end gap-2">
                <Mascot className="h-7 w-7 shrink-0" />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.04] px-4 py-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Escreva sua mensagem..."
                className="max-h-24 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
              />
              <button onClick={() => sendText(input)} disabled={loading || !input.trim()} aria-label="Enviar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 transition-transform hover:scale-105 disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[0.65rem] text-slate-500">IA · pode conter imprecisões</span>
              <button onClick={talkToTeam} disabled={loading || escalated} className="text-[0.72rem] font-medium text-brand-teal hover:underline disabled:opacity-50">
                {escalated ? "Time acionado ✓" : "Falar com uma pessoa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balãozinho de atenção */}
      {showHint && !open && !hintDismissed && (
        <div className="absolute bottom-3 right-[88px] w-56 animate-float">
          <div className="relative rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 shadow-xl backdrop-blur">
            <button onClick={() => { setShowHint(false); setHintDismissed(true); }} aria-label="Fechar" className="absolute right-2 top-2 text-slate-500 hover:text-white">✕</button>
            <button onClick={openChat} className="block text-left">
              <p className="text-sm font-semibold text-white">Precisa de ajuda?</p>
              <p className="mt-0.5 text-xs text-slate-300">Fale comigo, respondo na hora.</p>
            </button>
            <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-r border-white/10 bg-ink-800" />
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button onClick={() => (open ? setOpen(false) : openChat())} aria-label="Assistente de dúvidas" className="group relative grid h-[72px] w-[72px] place-items-center rounded-full transition-transform hover:scale-105">
        {!open && <span className="absolute inset-0 rounded-full bg-brand-green/30 animate-ping" />}
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-green/50 to-brand-blue/40 blur-lg" />
        <span className="absolute inset-1 rounded-full border border-white/15 bg-ink-800/85 backdrop-blur" />
        <Mascot className={`relative h-[72px] w-[72px] ${open ? "" : "animate-float"} drop-shadow-lg`} />
        {!open && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-ink-800 bg-brand-green text-[0.6rem] font-bold text-ink-900">1</span>}
      </button>
    </div>
  );
}
