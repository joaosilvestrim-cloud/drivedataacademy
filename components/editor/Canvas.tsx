"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from "react";
import { useEditor, elementosAtivos } from "@/lib/editor/store";
import { iconeSvg, svgDeInner } from "@/lib/editor/icones";
import { corDasRegras } from "@/lib/editor/render";
import { amostraFormatada } from "@/lib/editor/format";
import type { Binding, SceneElement } from "@/lib/editor/types";

/** Cor viva do elemento no canvas (resolve a cor condicional pelo valor atual). */
function corViva(el: SceneElement): string {
  const s = el.estilo;
  if (el.corCond?.ativo && el.corCond.regras?.length) return corDasRegras(el.corCond.regras, Number(el.binding.valor) || 0);
  return s.cor;
}

/** Valor de amostra já formatado (só afeta dinâmico com formato; senão devolve cru). */
const fmtVal = (b: Binding) => amostraFormatada(b.valor, b);
import ContextMenu, { type MenuCtx } from "./ContextMenu";

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;
const ALIGN_V = { start: "flex-start", center: "center", end: "flex-end" } as const;
const FUNDO_TRANSP = new Set(["gauge", "donut", "velocimetro", "waffle", "anelKpi"]);
const ARCO_270 = "M 20 76 A 40 40 0 1 1 80 76";
const ARCO_180 = "M 4 20 A 14 14 0 0 1 32 20";
const KF: Record<string, string> = { fade: "fd", slide: "sl", zoom: "zm", float: "fl", pulse: "pu", shimmer: "sh", bounce: "bn", swing: "sw", blink: "bk", rotateIn: "ri", wipe: "wp" };
const CONTINUAS = new Set(["float", "pulse", "shimmer", "bounce", "swing", "blink"]);

const KEYFRAMES_CSS = `
@keyframes fd{from{opacity:0}to{opacity:1}}
@keyframes sl{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes zm{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes pu{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes sh{0%,100%{filter:brightness(1)}50%{filter:brightness(1.45)}}
@keyframes bn{0%,20%,53%,100%{transform:translateY(0)}40%,43%{transform:translateY(-14px)}70%{transform:translateY(-7px)}90%{transform:translateY(-2px)}}
@keyframes sw{20%{transform:rotate(8deg)}40%{transform:rotate(-6deg)}60%{transform:rotate(4deg)}80%{transform:rotate(-2deg)}100%{transform:rotate(0)}}
@keyframes bk{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes ri{from{opacity:0;transform:rotate(-12deg) scale(.9)}to{opacity:1;transform:rotate(0) scale(1)}}
@keyframes wp{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes gw{from{width:0}}
@keyframes ga{from{stroke-dasharray:0 100}}
@keyframes ndl{from{transform:translateX(-50%) rotate(-135deg)}}
@keyframes mkr{from{bottom:0}}
@keyframes gh{from{height:0}}
@keyframes ln{from{stroke-dashoffset:100}}
@keyframes ap{from{opacity:0;transform:translateY(6px)}}
@keyframes bl{from{left:0}}
`;

const FAIXA_FALLBACK = (el: SceneElement) => (el.faixas?.length ? el.faixas : [{ ate: el.maximo || 100, cor: el.estilo.cor }]);

function estiloReact(el: SceneElement): CSSProperties {
  const e = el.estilo;
  const cont = CONTINUAS.has(el.animacao.tipo);
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    display: "flex",
    alignItems: ALIGN_V[e.alignV ?? "center"],
    justifyContent: JUSTIFY[e.align],
    color: corViva(el),
    background: FUNDO_TRANSP.has(el.type) ? "transparent" : e.fundo,
    borderRadius: e.borderRadius,
    border: e.borderWidth > 0 ? `${e.borderWidth}px ${e.borderStyle || "solid"} ${e.borderColor}` : undefined,
    boxShadow: e.sombra > 0 ? `0 8px ${e.sombra}px ${e.sombraColor || "rgba(0,0,0,.35)"}` : undefined,
    opacity: e.opacidade,
    fontSize: e.fontSize,
    fontWeight: e.fontWeight,
    lineHeight: e.lineHeight || undefined,
    padding: e.padding || undefined,
    fontFamily: e.fontFamily || "'Segoe UI',system-ui,-apple-system,sans-serif",
    textTransform: e.uppercase ? "uppercase" : "none",
    letterSpacing: e.letterSpacing ? e.letterSpacing : undefined,
    textShadow: e.glow > 0 ? `0 0 ${e.glow}px ${corViva(el)}` : undefined,
    transform: e.rotation ? `rotate(${e.rotation}deg)` : undefined,
    animation:
      el.animacao.tipo !== "none"
        ? `${KF[el.animacao.tipo]} ${el.animacao.duracao}s ${cont ? "ease-in-out" : "ease"} ${el.animacao.delay}s ${cont ? "infinite" : "both"}`
        : undefined,
    overflow: "hidden",
  };
}

function Seta({ direcao, cor }: { direcao: SceneElement["direcao"]; cor: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      {direcao === "down" ? (
        <path d="M12 20L4 7h16z" fill={cor} />
      ) : direcao === "neutral" ? (
        <rect x="4" y="10.5" width="16" height="3" rx="1.5" fill={cor} />
      ) : (
        <path d="M12 4l8 13H4z" fill={cor} />
      )}
    </svg>
  );
}

// tipos cujo conteúdo é texto e podem ser editados direto no canvas (duplo clique)
const EDITAVEL_TEXTO = new Set(["texto", "kpi", "badge", "botao", "tendencia", "divisorRotulo"]);

function EditableText({ el, onDone }: { el: SceneElement; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    n.textContent = el.binding.valor;
    n.focus();
    document.getSelection()?.selectAllChildren(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function done() {
    const t = ref.current?.textContent ?? "";
    useEditor.getState().patchBinding(el.id, { valor: t });
    onDone();
  }
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLElement).blur(); }
        if (e.key === "Escape") { e.preventDefault(); onDone(); }
      }}
      style={{ outline: "none", cursor: "text", width: "100%", whiteSpace: "pre-wrap" }}
    />
  );
}

function ConteudoEl({ el, foco = null }: { el: SceneElement; foco?: string | null }) {
  const cor = corViva(el);
  // clicar numa parte do componente seleciona o elemento (solo) e ativa a parte na direita
  const selParte = (p: string) => (ev: RMouseEvent) => { ev.stopPropagation(); const st = useEditor.getState(); st.selecionar(el.id, false, true); st.setParte(p); };
  // realce da parte em foco: contorno vermelho que SEGUE a forma da parte
  // (drop-shadow em 4 direções = borda "adesivo", acompanha arco/texto/barra)
  const R = "#EF4444";
  const anel = (p: string): CSSProperties | undefined =>
    foco === p ? { filter: `drop-shadow(1.3px 0 0 ${R}) drop-shadow(-1.3px 0 0 ${R}) drop-shadow(0 1.3px 0 ${R}) drop-shadow(0 -1.3px 0 ${R})` } : undefined;
  if (el.type === "forma" || el.type === "linha") return null;
  if (el.type === "progresso") {
    return (
      <div
        onClick={selParte("barra")}
        style={{
          height: "100%",
          width: `${el.binding.valor || 0}%`,
          background: cor,
          borderRadius: el.estilo.borderRadius,
          animation: el.estilo.animarFill ? "gw .9s ease both" : undefined,
          cursor: "pointer",
          ...anel("barra"),
        }}
      />
    );
  }
  if (el.type === "tendencia") {
    return (
      <>
        <Seta direcao={el.direcao ?? "up"} cor={cor} />
        <span style={{ marginLeft: 6 }}>{fmtVal(el.binding)}</span>
      </>
    );
  }
  if (el.type === "icone") {
    const centro = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } as const;
    const stroke = el.estilo.iconeStroke ?? 2;
    const svg = el.iconePaths ? svgDeInner(el.iconePaths, cor, stroke) : iconeSvg(el.binding.valor, cor, "62%", stroke);
    if (svg) return <div style={centro} dangerouslySetInnerHTML={{ __html: svg }} />;
    return <div style={centro}>{el.binding.valor}</div>;
  }
  if (el.type === "pictograma") {
    const n = Math.max(1, el.quantidade ?? 10);
    const ico = el.iconeNome ?? "users";
    const row = (cor: string, w: string) => (
      <div style={{ display: "flex", alignItems: "center", gap: 4, width: w, height: "100%" }}>
        {Array.from({ length: n }).map((_, i) => (
          <span key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }} dangerouslySetInnerHTML={{ __html: el.iconeNomePaths ? svgDeInner(el.iconeNomePaths, cor, 2, "85%") : iconeSvg(ico, cor, "85%") }} />
        ))}
      </div>
    );
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {row("rgba(148,163,184,.35)", "100%")}
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${el.binding.valor || 0}%`, overflow: "hidden", animation: el.estilo.animarFill ? "gw .8s ease both" : undefined }}>
          {row(cor, `${el.w}px`)}
        </div>
      </div>
    );
  }
  if (el.type === "tabela") {
    const cols = el.colunas ?? [];
    return (
      <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: el.estilo.fontSize, color: cor }}>
          <thead>
            <tr>{cols.map((c, i) => (<th key={i} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, opacity: 0.7 }}>{c.rotulo}</th>))}</tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((r) => (
              <tr key={r}>{cols.map((c, i) => (<td key={i} style={{ padding: "6px 8px", borderTop: "1px solid rgba(148,163,184,.18)" }}>{i === 0 ? `Item ${r + 1}` : `${(r + 1) * 100}`}</td>))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (el.type === "imagem") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.binding.valor}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: el.contain ? "contain" : "cover", borderRadius: el.estilo.borderRadius }}
        onError={(ev) => ((ev.target as HTMLImageElement).style.opacity = "0.15")}
      />
    );
  }
  if (el.type === "rating") {
    const n = Math.max(1, el.quantidade ?? 5);
    const v = Number(el.binding.valor) || 0;
    const row = (cor: string, w: string) => (
      <div style={{ display: "flex", alignItems: "center", gap: 2, width: w, height: "100%" }}>
        {Array.from({ length: n }).map((_, i) => (
          <span key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }} dangerouslySetInnerHTML={{ __html: iconeSvg("star", cor, "88%") }} />
        ))}
      </div>
    );
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {row("rgba(148,163,184,.35)", "100%")}
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${Math.min(100, (v / n) * 100)}%`, overflow: "hidden", animation: el.estilo.animarFill ? "gw .8s ease both" : undefined }}>
          {row(cor, `${el.w}px`)}
        </div>
      </div>
    );
  }
  if (el.type === "sparkline") {
    const vals = el.binding.dinamico ? [45, 70, 35, 85, 55, 60, 40, 75] : (el.barras?.length ? el.barras : [40, 65, 30, 80, 55, 70]);
    const max = Math.max(...vals, 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, width: "100%", height: "100%" }}>
        {vals.map((v, i) => (<div key={i} style={{ flex: 1, minWidth: 2, height: `${Math.max(4, (v / max) * 100)}%`, background: cor, borderRadius: el.estilo.borderRadius || 2, animation: el.estilo.animarFill ? `gh .7s ease ${(i * 0.05).toFixed(2)}s both` : undefined }} />))}
      </div>
    );
  }
  if (el.type === "lista") {
    const itens = el.itens?.length ? el.itens : ["Item"];
    const ic = el.iconeNome ?? "check";
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%" }}>
        {itens.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ flexShrink: 0, display: "flex" }} dangerouslySetInnerHTML={{ __html: el.iconeNomePaths ? svgDeInner(el.iconeNomePaths, cor, 2, "16px") : iconeSvg(ic, cor, "16px") }} />
            <span>{t}</span>
          </div>
        ))}
      </div>
    );
  }
  if (el.type === "divisorRotulo") {
    const linha = <div style={{ flex: 1, height: 1, background: el.estilo.borderColor || "rgba(148,163,184,.4)" }} />;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: "100%" }}>
        {linha}<span style={{ whiteSpace: "nowrap" }}>{fmtVal(el.binding)}</span>{linha}
      </div>
    );
  }
  if (el.type === "velocimetro") {
    const max = el.maximo || 100;
    const v = Number(el.binding.valor) || 0;
    const ang = Math.max(-135, Math.min(135, (v / max) * 270 - 135));
    let prev = 0;
    const esp = el.estilo.espessura ?? 9;
    const segs = FAIXA_FALLBACK(el).map((f, i) => {
      const start = Math.max(0, Math.min(100, (prev / max) * 100));
      const len = Math.max(0, Math.min(100, ((f.ate - prev) / max) * 100));
      prev = f.ate;
      return <path key={i} d={ARCO_270} pathLength={100} fill="none" stroke={f.cor} strokeWidth={esp} strokeDasharray={`${len} 100`} strokeDashoffset={-start} />;
    });
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <svg viewBox="0 0 100 90" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "80%", cursor: "pointer", ...anel("faixas") }} onClick={selParte("faixas")}>
          <path d={ARCO_270} pathLength={100} fill="none" stroke={el.estilo.fundo} strokeWidth={esp} strokeLinecap="round" />
          {segs}
        </svg>
        <div style={{ position: "absolute", left: "50%", top: "26%", width: 3, height: "36%", background: "#334155", borderRadius: 2, transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${ang}deg)`, animation: el.estilo.animarFill ? "ndl .9s cubic-bezier(.34,1.4,.6,1) both" : undefined }} />
        <div style={{ position: "absolute", left: "50%", top: "62%", width: 12, height: 12, margin: "-6px 0 0 -6px", borderRadius: "50%", background: "#94a3b8" }} />
        <div onClick={selParte("valor")} style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", fontWeight: 800, color: el.estilo.corValor || cor, fontSize: el.estilo.fontSize, cursor: "pointer", ...anel("valor") }}>{v}</div>
      </div>
    );
  }
  if (el.type === "bullet") {
    const max = el.maximo || 100;
    const v = Number(el.binding.valor) || 0;
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div onClick={selParte("faixas")} style={{ position: "absolute", inset: 0, display: "flex", borderRadius: el.estilo.borderRadius, overflow: "hidden", cursor: "pointer", ...anel("faixas") }}>
          {[0.35, 0.6, 1].map((op, i) => (<div key={i} style={{ flex: 1, background: cor, opacity: op }} />))}
        </div>
        <div onClick={selParte("escala")} style={{ position: "absolute", top: -2, bottom: -2, left: `${Math.min(100, (v / max) * 100)}%`, width: 3, background: "#0f172a", borderRadius: 2, transform: "translateX(-50%)", cursor: "pointer", animation: el.estilo.animarFill ? "bl .8s cubic-bezier(.34,1.4,.6,1) both" : undefined }} />
      </div>
    );
  }
  if (el.type === "termometro") {
    const max = el.maximo || 100;
    const v = Number(el.binding.valor) || 0;
    let prev = 0;
    const bandas = FAIXA_FALLBACK(el).map((f, i) => {
      const h = Math.max(0, Math.min(100, ((f.ate - prev) / max) * 100));
      prev = f.ate;
      return { h, cor: f.cor, i };
    }).reverse();
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div onClick={selParte("faixas")} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", borderRadius: el.estilo.borderRadius, overflow: "hidden", cursor: "pointer", ...anel("faixas") }}>
          {bandas.map((b) => (<div key={b.i} style={{ width: "100%", height: `${b.h}%`, background: b.cor }} />))}
        </div>
        <div onClick={selParte("marcador")} style={{ position: "absolute", left: -3, right: -3, bottom: `${Math.min(100, (v / max) * 100)}%`, height: 4, background: cor, borderRadius: 3, boxShadow: "0 0 0 2px rgba(255,255,255,.55)", transform: "translateY(50%)", cursor: "pointer", animation: el.estilo.animarFill ? "mkr .9s cubic-bezier(.34,1.4,.6,1) both" : undefined, ...anel("marcador") }} />
      </div>
    );
  }
  if (el.type === "donut") {
    const v = Number(el.binding.valor) || 0;
    const esp = el.estilo.espessura ?? 4.5;
    if (el.formato === "semi") {
      return (
        <svg viewBox="0 0 36 24" style={{ width: "100%", height: "100%" }}>
          <path d={ARCO_180} fill="none" stroke={el.estilo.fundo} strokeWidth={esp} strokeLinecap="round" pathLength={100} onClick={selParte("trilho")} style={{ cursor: "pointer", ...anel("trilho") }} />
          <path d={ARCO_180} fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} onClick={selParte("arco")} style={{ cursor: "pointer", ...anel("arco"), animation: el.estilo.animarFill ? "ga .9s ease both" : undefined }} />
          <text x="18" y="20" textAnchor="middle" fontSize="7" fontWeight="800" fill={el.estilo.corValor || cor} onClick={selParte("valor")} style={{ cursor: "pointer", ...anel("valor") }}>{v}%</text>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%" }}>
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke={el.estilo.fundo} strokeWidth={esp} onClick={selParte("trilho")} style={{ cursor: "pointer", ...anel("trilho") }} />
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} transform="rotate(-90 18 18)" onClick={selParte("arco")} style={{ cursor: "pointer", ...anel("arco"), animation: el.estilo.animarFill ? "ga .9s ease both" : undefined }} />
        <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="800" fill={el.estilo.corValor || cor} onClick={selParte("valor")} style={{ cursor: "pointer", ...anel("valor") }}>{v}%</text>
      </svg>
    );
  }
  if (el.type === "gauge") {
    const v = Number(el.binding.valor) || 0;
    const esp = el.estilo.espessura ?? 3.5;
    return (
      <svg viewBox="0 0 36 24" style={{ width: "100%", height: "100%" }}>
        <path d={ARCO_180} fill="none" stroke={el.estilo.fundo} strokeWidth={esp} strokeLinecap="round" pathLength={100} onClick={selParte("trilho")} style={{ cursor: "pointer", ...anel("trilho") }} />
        <path d={ARCO_180} fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} onClick={selParte("arco")} style={{ cursor: "pointer", ...anel("arco"), animation: el.estilo.animarFill ? "ga .9s ease both" : undefined }} />
        <text x="18" y="20" textAnchor="middle" fontSize="7" fontWeight="800" fill={el.estilo.corValor || cor} onClick={selParte("valor")} style={{ cursor: "pointer", ...anel("valor") }}>{v}%</text>
      </svg>
    );
  }
  if (el.type === "cartao") {
    const ic = el.iconeNome || "dollar";
    const iconeCor = el.estilo.corIcone || cor;
    const tituloCor = el.estilo.corTitulo || "#94A3B8";
    return (
      <div onClick={selParte("fundo")} style={{ display: "block", padding: "16px 18px", position: "relative", width: "100%", height: "100%", cursor: "pointer", ...anel("fundo") }}>
        <div onClick={selParte("icone")} dangerouslySetInnerHTML={{ __html: el.iconeNomePaths ? svgDeInner(el.iconeNomePaths, iconeCor, 2, "22px") : iconeSvg(ic, iconeCor, "22px") }} style={{ position: "absolute", top: 16, left: 18, width: 40, height: 40, borderRadius: 12, background: "rgba(6,182,212,.16)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", ...anel("icone") }} />
        <div onClick={selParte("titulo")} style={{ marginLeft: 52, fontSize: 13, fontWeight: 600, color: tituloCor, cursor: "pointer", ...anel("titulo") }}>{el.titulo || ""}</div>
        <div onClick={selParte("valor")} style={{ marginTop: 16, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: cor, lineHeight: 1, cursor: "pointer", ...anel("valor") }}>{fmtVal(el.binding)}</div>
      </div>
    );
  }
  if (el.type === "cardGauge") {
    const tituloCor = el.estilo.corTitulo || "#94A3B8";
    const gCor = el.estilo.corIcone || "#06B6D4";
    const gEsp = el.estilo.espessura ?? 4;
    const v = Number(el.binding.valor) || 0;
    return (
      <div onClick={selParte("fundo")} style={{ display: "block", padding: "16px 18px", position: "relative", width: "100%", height: "100%", cursor: "pointer", ...anel("fundo") }}>
        <div style={{ position: "absolute", top: 16, left: 18, right: 98 }}>
          <div onClick={selParte("titulo")} style={{ fontSize: 13, fontWeight: 600, color: tituloCor, cursor: "pointer", ...anel("titulo") }}>{el.titulo || ""}</div>
          <div onClick={selParte("valor")} style={{ marginTop: 10, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: cor, lineHeight: 1, cursor: "pointer", ...anel("valor") }}>{v}%</div>
        </div>
        <div onClick={selParte("gauge")} style={{ position: "absolute", top: "50%", right: 16, transform: "translateY(-50%)", width: 84, height: 84, cursor: "pointer", ...anel("gauge") }}>
          <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%" }}>
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(148,163,184,.2)" strokeWidth={gEsp} />
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke={gCor} strokeWidth={gEsp} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} transform="rotate(-90 18 18)" />
          </svg>
        </div>
      </div>
    );
  }
  if (el.type === "narrativo") {
    const mp = Object.fromEntries((el.medidas ?? []).map((m) => [m.chave, m]));
    const partes = (el.binding.valor || "").split(/(\{[a-zA-Z0-9_]+\})/g);
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", whiteSpace: "pre-wrap", color: cor, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, lineHeight: el.estilo.lineHeight ?? 1.5, textAlign: (el.estilo.align as CanvasTextAlign) || "left" }}>
        <span>
          {partes.map((p, i) => {
            const m = p.match(/^\{([a-zA-Z0-9_]+)\}$/);
            const med = m && mp[m[1]];
            if (med) return <b key={i} style={{ color: med.cor || el.estilo.corValor || cor, fontWeight: 700 }}>{fmtVal(med.binding)}</b>;
            return <span key={i}>{p}</span>;
          })}
        </span>
      </div>
    );
  }
  if (el.type === "kpiCompleto") {
    const tituloCor = el.estilo.corTitulo || "#94A3B8";
    const valorCor = el.estilo.corValor || "#fff";
    const dir = el.direcao ?? "up";
    const setaCor = dir === "up" ? "#22C55E" : dir === "down" ? "#EF4444" : "#94A3B8";
    const varV = (el.medidas ?? []).find((m) => m.chave === "var")?.binding.valor || "";
    const vals = el.barras && el.barras.length ? el.barras : [40, 60, 50, 70];
    const maxb = Math.max(...vals, 1);
    return (
      <div style={{ display: "block", padding: "14px 16px", position: "relative", width: "100%", height: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: tituloCor, textTransform: "uppercase", letterSpacing: ".03em" }}>{el.titulo || ""}</div>
        <div style={{ marginTop: 4, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: valorCor, lineHeight: 1 }}>{fmtVal(el.binding)}</div>
        <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: setaCor }}><Seta direcao={dir} cor={setaCor} /><span>{varV}</span></div>
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 12, height: 24, display: "flex", alignItems: "flex-end", gap: 2 }}>
          {vals.map((v, i) => (<div key={i} style={{ flex: 1, height: `${Math.max(8, Math.round((v / maxb) * 100))}%`, background: cor, borderRadius: 2, opacity: 0.85, animation: el.estilo.animarFill ? `gh .6s ease ${(i * 0.05).toFixed(2)}s both` : undefined }} />))}
        </div>
      </div>
    );
  }
  if (el.type === "areaMini") {
    const vals = el.barras && el.barras.length ? el.barras : [30, 50, 40, 65, 55, 75, 60, 85];
    const max = Math.max(...vals), min = Math.min(...vals);
    const range = max - min || 1;
    const W = 100, H = 34;
    const den = Math.max(1, vals.length - 1); // evita NaN com 1 ponto
    const pts = vals.map((v, i) => `${((i / den) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`);
    const linha = pts.join(" ");
    const gid = `ga${el.id}`;
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cor} stopOpacity={0.32} /><stop offset="100%" stopColor={cor} stopOpacity={0} /></linearGradient></defs>
          <polygon points={`0,${H} ${linha} ${W},${H}`} fill={`url(#${gid})`} />
          <polyline points={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" {...(el.estilo.animarFill ? { pathLength: 100, strokeDasharray: 100, style: { animation: "ln 1s ease both" } } : {})} />
        </svg>
        <div style={{ position: "absolute", inset: 0 }}>
          {vals.map((v, i) => (<div key={i} style={{ position: "absolute", left: `${((i / den) * 100).toFixed(1)}%`, top: `${((1 - (v - min) / range) * 100).toFixed(1)}%`, width: 5, height: 5, margin: "-2.5px 0 0 -2.5px", borderRadius: "50%", background: cor }} />))}
        </div>
      </div>
    );
  }
  if (el.type === "anelKpi") {
    const v = Number(el.binding.valor) || 0;
    const esp = el.estilo.espessura ?? 4;
    const numero = <div style={{ fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: el.estilo.corValor || "#fff", lineHeight: 1 }}>{v}%</div>;
    const rotulo = el.titulo ? <div style={{ fontSize: 12, color: el.estilo.corTitulo || "#94A3B8", marginTop: 2 }}>{el.titulo}</div> : null;
    if (el.formato === "semi") {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <svg viewBox="0 0 36 24" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
            <path d={ARCO_180} fill="none" stroke={el.estilo.fundo} strokeWidth={esp} strokeLinecap="round" pathLength={100} />
            <path d={ARCO_180} fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} style={{ animation: el.estilo.animarFill ? "ga .9s ease both" : undefined }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: "15%" }}>{numero}{rotulo}</div>
        </div>
      );
    }
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <svg viewBox="0 0 36 36" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke={el.estilo.fundo} strokeWidth={esp} />
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke={cor} strokeWidth={esp} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} transform="rotate(-90 18 18)" style={{ animation: el.estilo.animarFill ? "ga .9s ease both" : undefined }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{numero}{rotulo}</div>
      </div>
    );
  }
  if (el.type === "comparaAB") {
    const tituloCor = el.estilo.corTitulo || "#94A3B8";
    const valorCor = el.estilo.corValor || "#fff";
    const bMed = (el.medidas ?? []).find((m) => m.chave === "b");
    return (
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12, width: "100%", height: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, color: tituloCor }}>{el.titulo || "Atual"}</div><div style={{ marginTop: 4, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: valorCor, lineHeight: 1 }}>{fmtVal(el.binding)}</div></div>
        <div style={{ width: 1, alignSelf: "stretch", background: "rgba(148,163,184,.25)" }} />
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, color: tituloCor }}>{bMed?.rotulo || "Anterior"}</div><div style={{ marginTop: 4, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: valorCor, opacity: 0.65, lineHeight: 1 }}>{bMed ? fmtVal(bMed.binding) : ""}</div></div>
      </div>
    );
  }
  if (el.type === "comparativo") {
    const tituloCor = el.estilo.corTitulo || "#94A3B8";
    const valorCor = el.estilo.corValor || cor;
    const barCor = el.estilo.corIcone || "#06B6D4";
    const meta = (el.medidas ?? []).find((m) => m.chave === "meta")?.binding.valor || "";
    const pct = Number((el.medidas ?? []).find((m) => m.chave === "pct")?.binding.valor) || 0;
    return (
      <div style={{ display: "block", padding: "16px 18px", width: "100%", height: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: tituloCor }}>{el.titulo || ""}</div>
        <div style={{ marginTop: 6, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: valorCor, lineHeight: 1.05 }}>{fmtVal(el.binding)}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: tituloCor }}>Meta: <b>{meta}</b></div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 6, background: "rgba(148,163,184,.2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: barCor, borderRadius: 6 }} /></div>
      </div>
    );
  }
  if (el.type === "chip") {
    const ic = el.iconeNome || "flame";
    const iconeCor = el.estilo.corIcone || "#06B6D4";
    const rotuloCor = el.estilo.corTitulo || "#94A3B8";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", width: "100%", height: "100%" }}>
        <span style={{ flexShrink: 0, display: "flex" }} dangerouslySetInnerHTML={{ __html: el.iconeNomePaths ? svgDeInner(el.iconeNomePaths, iconeCor, 2, "20px") : iconeSvg(ic, iconeCor, "20px") }} />
        <span style={{ fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, color: cor, lineHeight: 1 }}>{fmtVal(el.binding)}</span>
        <span style={{ fontSize: 12, color: rotuloCor, whiteSpace: "nowrap" }}>{el.titulo || ""}</span>
      </div>
    );
  }
  if (el.type === "filtros") {
    const rotuloCor = el.estilo.corTitulo || "#94A3B8";
    const pill = el.estilo.fundo && el.estilo.fundo !== "transparent" ? el.estilo.fundo : "rgba(148,163,184,.16)";
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", alignContent: "flex-start", gap: 6, width: "100%", height: "100%" }}>
        {(el.medidas ?? []).map((m, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: el.estilo.borderRadius, background: pill, fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, whiteSpace: "nowrap" }}>
            <span style={{ color: rotuloCor }}>{m.rotulo || m.chave}:</span>
            <span style={{ color: cor }}>{fmtVal(m.binding)}</span>
          </span>
        ))}
      </div>
    );
  }
  if (el.type === "funil") {
    const etapas = el.etapas && el.etapas.length ? el.etapas : [{ rotulo: "Etapa", valor: 1 }];
    const max = Math.max(...etapas.map((e2) => e2.valor), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", gap: 4, width: "100%", height: "100%" }}>
        {etapas.map((et, i) => {
          const ant = etapas[i - 1]?.valor;
          return (
          <div key={i} style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: `${Math.max(12, Math.round((et.valor / max) * 100))}%`, height: "82%", background: cor, borderRadius: el.estilo.borderRadius, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: el.estilo.corValor || "#fff", fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, whiteSpace: "nowrap", overflow: "hidden", padding: "0 8px", animation: el.estilo.animarFill ? `gw .7s ease ${(i * 0.08).toFixed(2)}s both` : undefined }}>{et.rotulo} · {et.valor}</div>
            {el.mostrarConversao && i > 0 && ant ? <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, color: el.estilo.corTitulo || "#94A3B8" }}>{Math.round((et.valor / ant) * 100)}%</div> : null}
          </div>
        ); })}
      </div>
    );
  }
  if (el.type === "waffle") {
    const v = Math.max(0, Math.min(100, Number(el.binding.valor) || 0));
    const grade = (c: string) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gridTemplateRows: "repeat(10,1fr)", gap: 3, width: "100%", height: "100%" }}>
        {Array.from({ length: 100 }).map((_, i) => (<div key={i} style={{ borderRadius: el.estilo.borderRadius, background: c }} />))}
      </div>
    );
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {grade(el.estilo.fundo)}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${v}%`, overflow: "hidden", animation: el.estilo.animarFill ? "gh .8s ease both" : undefined }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: el.h }}>{grade(cor)}</div>
        </div>
      </div>
    );
  }
  if (el.type === "timeline") {
    const passos = el.itens && el.itens.length ? el.itens : ["Passo"];
    const vert = el.orientacao === "v";
    const linhaCor = el.estilo.fundo || "rgba(148,163,184,.25)";
    const bola = (i: number) => (<div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: cor, color: el.estilo.corValor || "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{el.iconeNome ? <span style={{ display: "flex" }} dangerouslySetInnerHTML={{ __html: el.iconeNomePaths ? svgDeInner(el.iconeNomePaths, el.estilo.corValor || "#fff", 2, "16px") : iconeSvg(el.iconeNome, el.estilo.corValor || "#fff", "16px") }} /> : i + 1}</div>);
    const aStep = (i: number) => (el.estilo.animarFill ? `ap .5s ease ${(i * 0.09).toFixed(2)}s both` : undefined);
    if (vert) return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", position: "relative", width: "100%", height: "100%" }}>
        <div style={{ position: "absolute", top: 14, bottom: 14, left: 13, width: 2, background: linhaCor }} />
        {passos.map((t, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minHeight: 0, animation: aStep(i) }}>{bola(i)}<div style={{ color: el.estilo.corTitulo || "#94A3B8", fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight }}>{t}</div></div>))}
      </div>
    );
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", width: "100%", height: "100%", paddingTop: 2 }}>
        <div style={{ position: "absolute", top: 16, left: "8%", right: "8%", height: 2, background: linhaCor }} />
        {passos.map((t, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 1, animation: aStep(i) }}>{bola(i)}<div style={{ color: el.estilo.corTitulo || "#94A3B8", fontSize: el.estilo.fontSize, fontWeight: el.estilo.fontWeight, textAlign: "center" }}>{t}</div></div>))}
      </div>
    );
  }
  return <>{fmtVal(el.binding)}</>;
}

const HANDLES: { dir: string; style: CSSProperties }[] = [
  { dir: "nw", style: { left: -5, top: -5, cursor: "nwse-resize" } },
  { dir: "n", style: { left: "calc(50% - 5px)", top: -5, cursor: "ns-resize" } },
  { dir: "ne", style: { right: -5, top: -5, cursor: "nesw-resize" } },
  { dir: "e", style: { right: -5, top: "calc(50% - 5px)", cursor: "ew-resize" } },
  { dir: "se", style: { right: -5, bottom: -5, cursor: "nwse-resize" } },
  { dir: "s", style: { left: "calc(50% - 5px)", bottom: -5, cursor: "ns-resize" } },
  { dir: "sw", style: { left: -5, bottom: -5, cursor: "nesw-resize" } },
  { dir: "w", style: { left: -5, top: "calc(50% - 5px)", cursor: "ew-resize" } },
];

const MIN = 8;
const THRESH = 6;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface DragInfo {
  mode: "move" | "resize";
  dir?: string;
  id: string;
  ids: string[];
  startX: number;
  startY: number;
  orig: { x: number; y: number; w: number; h: number };
  lastDx: number;
  lastDy: number;
  pendingDrill?: string; // se arrastar não acontecer (clique), entra no grupo e seleciona este id
  moved?: boolean;
}

export default function Canvas({
  stageBg,
  zoom = 1,
  snap = false,
  grid = false,
}: {
  stageBg: "claro" | "escuro";
  zoom?: number;
  snap?: boolean;
  grid?: boolean;
}) {
  const doc = useEditor((s) => s.doc);
  const els = useEditor(elementosAtivos);
  const selectedIds = useEditor((s) => s.selectedIds);
  const parteSel = useEditor((s) => s.parteSel);
  const drag = useRef<DragInfo | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [guias, setGuias] = useState<{ vx: number[]; hy: number[] }>({ vx: [], hy: [] });
  const [menu, setMenu] = useState<MenuCtx | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const snapTo = (v: number) => (snap ? Math.round(v / 8) * 8 : v);

  // seleção por arrasto: clicar no fundo do card e arrastar um retângulo
  function startMarquee(e: RPointerEvent) {
    e.stopPropagation();
    setMenu(null);
    setEditId(null);
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x0 = (e.clientX - rect.left) / zoom;
    const y0 = (e.clientY - rect.top) / zoom;
    useEditor.getState().selecionar(null);
    let moveu = false;
    const mv = (ev: globalThis.PointerEvent) => {
      const x1 = (ev.clientX - rect.left) / zoom, y1 = (ev.clientY - rect.top) / zoom;
      const x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
      if (w + h > 4) moveu = true;
      setMarquee({ x, y, w, h });
      const st = useEditor.getState();
      const ids = elementosAtivos(st)
        .filter((el) => el.visivel && !el.bloqueado && el.x < x + w && el.x + el.w > x && el.y < y + h && el.y + el.h > y)
        .map((el) => el.id);
      useEditor.setState({ selectedIds: ids, selectedId: ids[ids.length - 1] ?? null });
    };
    const up = () => {
      setMarquee(null);
      if (!moveu) useEditor.getState().selecionar(null);
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  function onContext(e: RMouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const st = useEditor.getState();
    if (!st.selectedIds.includes(id)) st.selecionar(id);
    setMenu({ x: e.clientX, y: e.clientY, id });
  }

  function onMove(ev: globalThis.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(ev.clientX - d.startX) + Math.abs(ev.clientY - d.startY) > 3) d.moved = true;
    if (d.pendingDrill && !d.moved) return; // segura o arrasto até sair do limiar (evita micro-movimento)
    const st = useEditor.getState();
    const card = st.doc.card;
    const dx = (ev.clientX - d.startX) / zoom;
    const dy = (ev.clientY - d.startY) / zoom;

    if (d.mode === "resize") {
      let { x, y, w, h } = d.orig;
      const dir = d.dir!;
      if (dir.includes("e")) w = clamp(snapTo(d.orig.w + dx), MIN, card.w - d.orig.x);
      if (dir.includes("s")) h = clamp(snapTo(d.orig.h + dy), MIN, card.h - d.orig.y);
      if (dir.includes("w")) { const nx = clamp(snapTo(d.orig.x + dx), 0, d.orig.x + d.orig.w - MIN); w = d.orig.x + d.orig.w - nx; x = nx; }
      if (dir.includes("n")) { const ny = clamp(snapTo(d.orig.y + dy), 0, d.orig.y + d.orig.h - MIN); h = d.orig.y + d.orig.h - ny; y = ny; }
      st.redimensionar(d.id, { x, y, w, h });
      return;
    }

    // MOVE múltiplo: desloca todos por delta incremental
    if (d.ids.length > 1) {
      st.moverDelta(d.ids, dx - d.lastDx, dy - d.lastDy);
      d.lastDx = dx;
      d.lastDy = dy;
      return;
    }

    // MOVE único: com smart guides (snap a bordas/centros dos outros + card)
    let nx = snapTo(d.orig.x + dx);
    let ny = snapTo(d.orig.y + dy);
    const w = d.orig.w, h = d.orig.h;
    const vxC = [0, card.w / 2, card.w];
    const hyC = [0, card.h / 2, card.h];
    elementosAtivos(st).forEach((o) => {
      if (o.id === d.id || !o.visivel) return;
      vxC.push(o.x, o.x + o.w / 2, o.x + o.w);
      hyC.push(o.y, o.y + o.h / 2, o.y + o.h);
    });
    const gv: number[] = [], gh: number[] = [];
    for (const c of vxC) {
      for (const [e, off] of [[nx, 0], [nx + w / 2, w / 2], [nx + w, w]] as const) {
        if (Math.abs(e - c) <= THRESH) { nx = c - off; gv.push(c); break; }
      }
    }
    for (const c of hyC) {
      for (const [e, off] of [[ny, 0], [ny + h / 2, h / 2], [ny + h, h]] as const) {
        if (Math.abs(e - c) <= THRESH) { ny = c - off; gh.push(c); break; }
      }
    }
    nx = clamp(nx, 0, card.w - w);
    ny = clamp(ny, 0, card.h - h);
    setGuias({ vx: [...new Set(gv)], hy: [...new Set(gh)] });
    st.mover(d.id, nx, ny);
  }

  function onUp() {
    const d = drag.current;
    // clique sem arrastar sobre um grupo já selecionado → entra no grupo (seleciona o item)
    if (d && d.pendingDrill && !d.moved) useEditor.getState().selecionar(d.pendingDrill, false, true);
    drag.current = null;
    setGuias({ vx: [], hy: [] });
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }

  function startDrag(e: RPointerEvent, info: { mode: "move" | "resize"; dir?: string; id: string }, pularCommit = false, pendingDrill?: string) {
    e.stopPropagation();
    const st = useEditor.getState();
    const el = elementosAtivos(st).find((x) => x.id === info.id)!;
    if (el.bloqueado) return;
    if (!pularCommit) st.commit();
    const ids = info.mode === "move" && st.selectedIds.includes(info.id) && st.selectedIds.length > 1 ? st.selectedIds : [info.id];
    drag.current = { ...info, ids, startX: e.clientX, startY: e.clientY, orig: { x: el.x, y: el.y, w: el.w, h: el.h }, lastDx: 0, lastDy: 0, pendingDrill };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onDownEl(e: RPointerEvent, id: string) {
    const st = useEditor.getState();
    if (e.shiftKey) { st.selecionar(id, true); return; }
    if (e.altKey) {
      // Alt + arrastar = duplicar na hora e arrastar a cópia (padrão de editores gráficos)
      const alvo = elementosAtivos(st).find((x) => x.id === id);
      if (alvo && !alvo.bloqueado) {
        st.duplicarEl(id);
        const novoId = useEditor.getState().selectedId;
        if (novoId) { startDrag(e, { mode: "move", id: novoId }, true); return; }
      }
      st.selecionar(id, false, true); startDrag(e, { mode: "move", id }); return;
    }
    // Grupos: arrastar move o GRUPO; clicar (sem arrastar) num grupo já
    // selecionado ENTRA no grupo e seleciona o objeto individual.
    const els = elementosAtivos(st);
    const el = els.find((x) => x.id === id);
    if (el?.grupo) {
      const grupoIds = els.filter((x) => x.grupo === el.grupo).map((x) => x.id);
      const grupoTodoSel = st.selectedIds.length === grupoIds.length && grupoIds.every((g) => st.selectedIds.includes(g));
      const cur = st.selectedIds.length === 1 ? els.find((x) => x.id === st.selectedIds[0]) : null;
      const dentroDoGrupo = !!cur && cur.grupo === el.grupo;
      if (dentroDoGrupo) {
        // já dentro do grupo: seleciona/arrasta o objeto individual clicado
        st.selecionar(id, false, true);
        startDrag(e, { mode: "move", id });
      } else if (grupoTodoSel) {
        // grupo selecionado: arrasta o grupo inteiro; se for só clique, entra no item
        startDrag(e, { mode: "move", id }, false, id);
      } else {
        // 1º toque: seleciona e arrasta o grupo inteiro
        st.selecionar(id);
        startDrag(e, { mode: "move", id });
      }
      return;
    }
    if (!st.selectedIds.includes(id)) st.selecionar(id);
    startDrag(e, { mode: "move", id });
  }

  function startCardResize(e: RPointerEvent) {
    e.stopPropagation();
    const st = useEditor.getState();
    st.commit();
    const startW = st.doc.card.w, startH = st.doc.card.h, sx = e.clientX, sy = e.clientY;
    const mv = (ev: globalThis.PointerEvent) => {
      const w = Math.max(120, Math.round(startW + (ev.clientX - sx) / zoom));
      const h = Math.max(80, Math.round(startH + (ev.clientY - sy) / zoom));
      useEditor.getState().atualizarCard({ w, h });
    };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  const ehSingle = selectedIds.length <= 1;
  const gridBg =
    "linear-gradient(to right, rgba(127,127,127,.25) 1px, transparent 1px)," +
    "linear-gradient(to bottom, rgba(127,127,127,.25) 1px, transparent 1px)";

  return (
    <div
      className="flex flex-1 items-center justify-center overflow-auto rounded-xl border border-border p-8"
      style={{ background: stageBg === "escuro" ? "#0b1220" : "#eef2f7" }}
      onPointerDown={startMarquee}
    >
      <style>{KEYFRAMES_CSS}</style>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
      <div style={{ width: doc.card.w * zoom, height: doc.card.h * zoom }} className="relative shrink-0">
        {/* rótulo de tamanho + alça para redimensionar o canvas */}
        <span className="absolute -top-6 left-0 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white" style={{ pointerEvents: "none" }}>
          {doc.card.w} × {doc.card.h}
        </span>
        <div
          onPointerDown={startCardResize}
          title="Arraste para redimensionar o canvas"
          className="absolute z-10 flex items-center justify-center rounded-md border border-viz bg-surface shadow"
          style={{ right: -7, bottom: -7, width: 16, height: 16, cursor: "nwse-resize" }}
        >
          <span style={{ width: 6, height: 6, borderRight: "2px solid #06B6D4", borderBottom: "2px solid #06B6D4" }} />
        </div>
        <div
          ref={cardRef}
          className="relative shadow-2xl"
          style={{
            width: doc.card.w,
            height: doc.card.h,
            background: doc.card.fundo,
            borderRadius: doc.card.borderRadius,
            border: (doc.card.borderWidth || 0) > 0 ? `${doc.card.borderWidth}px solid ${doc.card.borderColor}` : undefined,
            boxShadow: (doc.card.sombra || 0) > 0 ? `0 10px ${doc.card.sombra}px rgba(0,0,0,.4)` : undefined,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
          onPointerDown={startMarquee}
        >
          {els.map((el) => {
            if (!el.visivel) return null;
            const selected = selectedIds.includes(el.id);
            return (
              <div
                key={el.id}
                style={{
                  ...estiloReact(el),
                  cursor: el.bloqueado ? "default" : "move",
                  outline: selected ? "2px solid #06B6D4" : undefined,
                  outlineOffset: 1,
                }}
                onPointerDown={(e) => onDownEl(e, el.id)}
                onContextMenu={(e) => onContext(e, el.id)}
                onDoubleClick={(e) => { if (EDITAVEL_TEXTO.has(el.type) && !el.bloqueado) { e.stopPropagation(); useEditor.getState().selecionar(el.id); setEditId(el.id); } }}
              >
                {editId === el.id ? <EditableText el={el} onDone={() => setEditId(null)} /> : <ConteudoEl el={el} foco={selectedIds.length === 1 && selectedIds[0] === el.id ? parteSel : null} />}
                {selected && ehSingle && !el.bloqueado && editId !== el.id &&
                  HANDLES.map((h) => (
                    <span
                      key={h.dir}
                      onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { mode: "resize", dir: h.dir, id: el.id }); }}
                      style={{ position: "absolute", width: 10, height: 10, background: "#fff", border: "1.5px solid #06B6D4", borderRadius: 2, ...h.style }}
                    />
                  ))}
              </div>
            );
          })}

          {guias.vx.map((x, i) => (<div key={`v${i}`} style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1, background: "#F95587", pointerEvents: "none" }} />))}
          {guias.hy.map((y, i) => (<div key={`h${i}`} style={{ position: "absolute", top: y, left: 0, right: 0, height: 1, background: "#F95587", pointerEvents: "none" }} />))}

          {grid && (
            <div style={{ position: "absolute", inset: 0, backgroundImage: gridBg, backgroundSize: "8px 8px", pointerEvents: "none", opacity: 0.5 }} />
          )}

          {marquee && (
            <div style={{ position: "absolute", left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, border: "1px solid #06B6D4", background: "rgba(6,182,212,.12)", pointerEvents: "none" }} />
          )}

          {els.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "rgba(148,163,184,.6)", fontSize: 13, textAlign: "center", padding: 16 }}>
              Canvas vazio — arraste componentes da esquerda ou use um bloco pronto
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
