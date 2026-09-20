"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* Modo demonstração da área do aluno.

   A pessoa vê tudo o que um assinante vê, mas nada responde, com três
   exceções: o menu lateral (para ela passear pelas telas), o DriveCanvas e o
   caminho para assinar. Todo o resto é barrado antes de chegar no React, na
   fase de captura do documento: clique, toque, envio de formulário e foco em
   campo de texto. Quem tenta recebe um aviso curto dizendo o que está liberado.

   A trava da tela é a primeira camada. A segunda está no servidor (middleware
   recusa ação de servidor e as páginas de aula e gravação não abrem). */

const LIVRE_HREF = [/^\/ferramenta(\/|$|\?)/, /^\/matricula/];

function liberado(alvo: EventTarget | null): boolean {
  const el = alvo instanceof Element ? alvo : null;
  if (!el) return false;
  if (el.closest("[data-demo-livre]")) return true;
  if (el.closest("[data-demo-nav]")) return true;
  const a = el.closest("a[href]") as HTMLAnchorElement | null;
  if (a) {
    const href = a.getAttribute("href") || "";
    if (LIVRE_HREF.some((r) => r.test(href))) return true;
  }
  return false;
}

export default function ModoDemo({ ate }: { ate: string }) {
  const tr = usarTraducao();
  const [aviso, setAviso] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("modo-demo");

    const avisar = () => {
      setAviso(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAviso(false), 2600);
    };
    const barrar = (e: Event) => {
      if (liberado(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.type === "submit") avisar();
    };
    const foco = (e: FocusEvent) => {
      if (liberado(e.target)) return;
      const el = e.target as HTMLElement | null;
      if (el && el.matches("input, textarea, select, [contenteditable]")) { el.blur(); avisar(); }
    };
    const tecla = (e: KeyboardEvent) => {
      if (liberado(e.target)) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); }
    };

    const opcoes = { capture: true } as const;
    // Sem pointerdown/touchstart de propósito: barrá-los mataria a rolagem no celular.
    const tipos = ["click", "auxclick", "submit", "dragstart", "contextmenu"];
    tipos.forEach((t) => document.addEventListener(t, barrar, opcoes));
    document.addEventListener("focusin", foco, opcoes);
    document.addEventListener("keydown", tecla, opcoes);
    return () => {
      document.documentElement.classList.remove("modo-demo");
      tipos.forEach((t) => document.removeEventListener(t, barrar, opcoes));
      document.removeEventListener("focusin", foco, opcoes);
      document.removeEventListener("keydown", tecla, opcoes);
    };
  }, []);

  const fim = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(ate));

  return (
    <>
      <div data-demo-livre className="fixed inset-x-0 bottom-0 z-[60] border-t border-amber-300/30 bg-[#1a1407]/95 px-4 py-2.5 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 text-[0.82rem] text-amber-100">
            <b className="font-semibold text-amber-300">{tr("Modo demonstração")}</b> {tr("até")} {fim.replace(",", " às")}. Você está vendo a área do assinante; só o{" "}
            <b className="font-semibold text-white">{tr("DriveCanvas")}</b> {tr("está liberado para usar.")}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/ferramenta" className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-3.5 py-1.5 text-[0.8rem] font-semibold text-ink-900">
              {tr("Abrir o DriveCanvas")}
            </Link>
            <Link href="/matricula" className="rounded-lg border border-amber-300/40 px-3.5 py-1.5 text-[0.8rem] font-semibold text-amber-200 hover:text-white">
              {tr("Assinar")}
            </Link>
          </div>
        </div>
      </div>

      {aviso && (
        <div role="status" className="fixed left-1/2 top-16 z-[70] -translate-x-1/2 rounded-xl border border-amber-300/40 bg-[#1a1407] px-4 py-2.5 text-[0.85rem] text-amber-100 shadow-2xl">
          {tr("Na demonstração só o")} <b className="text-white">{tr("DriveCanvas")}</b> {tr("está liberado. Assine para usar tudo.")}
        </div>
      )}
    </>
  );
}
