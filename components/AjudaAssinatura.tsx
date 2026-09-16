"use client";

import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";
import { abrirChamadoCheckout } from "@/app/matricula/ajuda-actions";
import { MOTIVOS } from "@/lib/ajuda-checkout";

/* Ajuda do checkout. Parece conversa, mas é um formulário guiado: sem IA, sem
   resposta automática. Serve para quem travou no pagamento ou pagou e não
   recebeu o código, gente que ainda não tem login para abrir chamado. */

type Etapa = "motivo" | "dados" | "pronto";

const OPCOES = Object.entries(MOTIVOS);

export default function AjudaAssinatura() {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("motivo");
  const [motivo, setMotivo] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  // O balão aparece sozinho depois de alguns segundos, uma vez só. Quem está
  // travado no pagamento não procura ajuda: a ajuda tem que aparecer.
  const [balao, setBalao] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBalao(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  const set = (campo: string, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const r = await abrirChamadoCheckout({ motivo, ...form });
    setEnviando(false);
    if (!r.ok) { setErro(r.erro); return; }
    setProtocolo(r.protocolo);
    setEtapa("pronto");
  }

  return (
    <>
      {/* Chamariz fixo no canto, com o balão que chama a pessoa */}
      {!aberto && balao && (
        <div className="fixed bottom-28 right-5 z-50 w-[min(17rem,calc(100vw-2.5rem))] rounded-2xl rounded-br-sm border border-brand-green/30 bg-ink-800 px-4 py-3 shadow-xl lg:bottom-auto lg:right-[19rem] lg:top-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:rounded-tr-sm">
          <p className="text-sm text-slate-200">Travou no pagamento ou não recebeu o código? Fala com a gente.</p>
          <button type="button" onClick={() => setBalao(false)} className="mt-2 text-xs text-slate-400 hover:text-white">
            agora não
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setAberto((v) => !v); setBalao(false); }}
        aria-expanded={aberto}
        /* No computador é um painel colado na lateral, grande o suficiente para
           ninguém dizer que não viu. No celular volta a ser o botão do canto,
           senão come metade da tela. */
        className="group fixed bottom-5 right-5 z-50 rounded-2xl bg-gradient-to-r from-brand-green to-brand-blue p-[2px] shadow-[0_18px_44px_-18px_rgba(52,232,160,0.9)] transition-transform hover:scale-[1.03] lg:bottom-auto lg:right-0 lg:top-1/2 lg:w-[17rem] lg:-translate-y-1/2 lg:rounded-r-none lg:rounded-l-3xl lg:pr-0 lg:hover:scale-100 lg:hover:pr-1"
      >
        <span className="flex items-center gap-3 rounded-[14px] bg-ink-900 py-2.5 pl-2.5 pr-5 text-left lg:flex-col lg:items-start lg:gap-4 lg:rounded-r-none lg:rounded-l-[22px] lg:px-6 lg:py-7">
          <span className="relative">
            {/* Anel pulsando: é o que faz o olho ir até a lateral da tela. */}
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-green/40 motion-reduce:animate-none" aria-hidden="true" />
            <Mascot className="relative h-11 w-11 lg:h-20 lg:w-20" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white lg:text-xl lg:leading-tight">Precisa de ajuda?</span>
            <span className="block text-xs text-brand-green lg:mt-1 lg:text-sm">Time online agora</span>
            <span className="hidden text-sm leading-snug text-slate-400 lg:mt-3 lg:block">
              Problema no pagamento ou no código de acesso? Abra aqui que a gente resolve.
            </span>
          </span>
        </span>
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl lg:bottom-auto lg:right-5 lg:top-1/2 lg:w-[26rem] lg:-translate-y-1/2">
          <header className="flex items-center gap-3 border-b border-white/10 bg-ink-800/80 px-4 py-3">
            <Mascot className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Ajuda da assinatura</p>
              <p className="text-xs text-slate-400">Time da DriveData Academy</p>
            </div>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="text-slate-400 hover:text-white">✕</button>
          </header>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
            {/* A fala do time é sempre a mesma, escrita por gente. */}
            <p className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm text-slate-200">
              Oi! Aqui é o time da Academy. Conta o que aconteceu que a gente resolve.
            </p>

            {etapa === "motivo" && (
              <div className="mt-4 flex flex-col gap-2">
                {OPCOES.map(([chave, rotulo]) => (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => { setMotivo(chave); setEtapa("dados"); }}
                    className="rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-brand-green/50 hover:text-white"
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            )}

            {etapa === "dados" && (
              <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-green/15 px-4 py-2 text-sm text-brand-green">
                  {MOTIVOS[motivo]}
                </p>

                <input
                  required
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Seu nome"
                  className="rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-green"
                />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="E-mail usado na compra"
                  className="rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-green"
                />
                <input
                  value={form.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  placeholder="WhatsApp (opcional)"
                  className="rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-green"
                />
                <textarea
                  required
                  rows={3}
                  value={form.mensagem}
                  onChange={(e) => set("mensagem", e.target.value)}
                  placeholder="O que aconteceu? Se puder, diga a forma de pagamento e o horário."
                  className="resize-y rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-green"
                />

                {erro && <p className="text-xs text-red-300" role="alert">{erro}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-white disabled:opacity-60"
                  >
                    {enviando ? "Enviando..." : "Enviar"}
                  </button>
                  <button type="button" onClick={() => setEtapa("motivo")} className="text-xs text-slate-400 hover:text-white">
                    voltar
                  </button>
                </div>
              </form>
            )}

            {etapa === "pronto" && (
              <div className="mt-4 rounded-2xl border border-brand-green/30 bg-brand-green/10 px-4 py-4">
                <p className="text-sm font-semibold text-brand-green">Recebemos seu pedido</p>
                <p className="mt-2 text-sm text-slate-200">
                  Protocolo <span className="font-mono">{protocolo}</span>. Respondemos no e-mail {form.email}.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Se você já tem conta, a conversa também aparece em Ajuda, dentro da plataforma.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
