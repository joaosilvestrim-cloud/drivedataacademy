"use client";

import { useState } from "react";
import Link from "next/link";
import Mascot from "./Mascot";

export default function AssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {/* Popover */}
      {open && (
        <div className="mb-3 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-ink-800/95 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-green/20 to-brand-blue/15 p-4">
            <Mascot className="h-12 w-12 shrink-0 object-contain" />
            <div>
              <p className="font-display text-sm font-bold text-white">Assistente DriveData</p>
              <p className="text-xs text-slate-300">Estou aqui para ajudar</p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm text-slate-300">Tem uma dúvida sobre os cursos, certificados ou pagamento? Fale com a gente.</p>
            <Link href="/conta/ajuda" onClick={() => setOpen(false)} className="block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2.5 text-center text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              Central de Ajuda
            </Link>
            <Link href="/conta/ajuda?novo=1" onClick={() => setOpen(false)} className="block rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green">
              Abrir um chamado
            </Link>
            <p className="text-center text-[0.7rem] text-slate-500">Respondo na hora e chamo o time quando precisar</p>
          </div>
        </div>
      )}

      {/* Botão */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Assistente de dúvidas"
        className="group relative grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-ink-800 shadow-xl transition-transform hover:scale-105"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-green/30 to-brand-blue/20 blur-md transition-opacity group-hover:opacity-100" />
        <Mascot className="relative h-14 w-14 object-contain" />
        {!open && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ink-800 bg-brand-green" />}
      </button>
    </div>
  );
}
