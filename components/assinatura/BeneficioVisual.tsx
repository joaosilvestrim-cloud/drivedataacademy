"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Controle, Modelo } from "./BeneficioCena";

/* Moldura do modelo 3D de um benefício. Cuida do que a cena não deve saber:
   só monta o WebGL quando o card está perto da tela (onze contextos ao mesmo
   tempo pesam), lê o ponteiro, respeita "reduzir movimento" e cai para o
   ícone se o WebGL falhar. */

const Cena = dynamic(() => import("./BeneficioCena"), { ssr: false });

class Guarda extends Component<{ fallback: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() { return { erro: true }; }
  render() { return this.state.erro ? this.props.fallback : this.props.children; }
}

export default function BeneficioVisual({ modelo, fallback, className = "" }: { modelo: Modelo; fallback: ReactNode; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const controle = useRef<Controle>({ x: 0, y: 0, hover: false, pulso: 0, reduzido: false });
  const [perto, setPerto] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { controle.current.reduzido = mq.matches; };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof IntersectionObserver === "undefined") { setPerto(true); return; }
    const io = new IntersectionObserver(([e]) => setPerto(e.isIntersecting), { rootMargin: "160px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    controle.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    controle.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    controle.current.hover = true;
  }
  function sair() {
    controle.current.x = 0;
    controle.current.y = 0;
    controle.current.hover = false;
  }
  function pulsar() {
    controle.current.pulso = 1;
  }

  return (
    <div
      ref={caixa}
      onPointerMove={mover}
      onPointerLeave={sair}
      onPointerDown={pulsar}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pulsar(); } }}
      tabIndex={0}
      role="img"
      aria-label={`Ilustração animada: ${modelo}`}
      className={`relative select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-green/60 ${className}`}
    >
      {perto ? (
        <Guarda fallback={<div className="grid h-full w-full place-items-center text-brand-green">{fallback}</div>}>
          <Cena modelo={modelo} controle={controle} />
        </Guarda>
      ) : (
        <div className="grid h-full w-full place-items-center text-brand-green">{fallback}</div>
      )}
    </div>
  );
}
