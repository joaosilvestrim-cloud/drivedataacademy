import type { ColunaTabela, Direcao, OperadorCor, Pagina, SceneElement, Transicao, VisualDocument } from "./types";
import { iconeSvg, svgDeInner } from "./icones";

/** Normaliza páginas (suporta documentos antigos com `elements` na raiz). */
function paginasDe(doc: VisualDocument): Pagina[] {
  if (doc.paginas?.length) return doc.paginas;
  return [{ id: "p1", nome: "Página 1", elements: doc.elements ?? [] }];
}

function transicaoDe(doc: VisualDocument): Transicao {
  return doc.transicao ?? { tipo: "none", duracao: 0.7, intervalo: 4, auto: false };
}

const SEM_CONTEUDO = new Set(["forma", "linha", "icone", "tabela", "sparkline", "lista", "narrativo", "filtros", "funil", "timeline", "areaMini"]);

/** Elementos que carregam conteúdo simples (viram VAR na DAX). */
export function temConteudo(el: SceneElement): boolean {
  return !SEM_CONTEUDO.has(el.type);
}

const JUSTIFY: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

const ALIGN_V: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
};

// elementos cujo desenho é SVG/interno — o wrapper não deve ter fundo (o `fundo` é o trilho)
const FUNDO_TRANSP = new Set(["gauge", "donut", "velocimetro", "waffle", "anelKpi"]);

/** Arco SVG de ~270° (velocímetro), abertura embaixo. viewBox 100×90. */
const ARCO_270 = "M 20 76 A 40 40 0 1 1 80 76";
/** Semicírculo superior real (meio-gauge): corda 28 = 2×raio 14 → 180°. viewBox 36×24. */
const ARCO_180 = "M 4 20 A 14 14 0 0 1 32 20";

/** Faixas de cor efetivas (fallback: uma faixa única com a cor do elemento). */
function faixasDe(el: SceneElement): { ate: number; cor: string }[] {
  const fx = el.faixas?.length ? el.faixas : [{ ate: el.maximo || 100, cor: el.estilo.cor }];
  return fx.map((f) => ({ ...f, cor: sanitizarCor(f.cor) }));
}

// Escapa texto controlado pelo usuário (título, rótulos, itens…) antes de
// embutir no HTML. O output final roda no Power BI FORA de sandbox, então
// rótulos estáticos precisam ser neutralizados aqui (o preview escapa só os
// valores; os rótulos vêm deste módulo, que alimenta a DAX de produção).
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Neutraliza cores (o ColorPicker aceita TEXTO LIVRE) antes de entrarem em
// atributos style='…'/SVG e em literais DAX. Cores válidas (#hex, rgb()/hsl(),
// gradientes, nomes CSS) não usam < > ' " ` ; { } \ & — então removê-los não
// afeta cores legítimas, mas impede quebrar o atributo/estilo ou a string DAX.
export function sanitizarCor(c: unknown): string {
  return String(c ?? "").replace(/[<>'"`;{}\\&]/g, "").slice(0, 200);
}

// Campos de cor de um Estilo, já saneados (usado como `e` no render).
const CAMPOS_COR = ["cor", "fundo", "borderColor", "sombraColor", "corValor", "corTitulo", "corIcone"] as const;
function estiloSeguro(estilo: SceneElement["estilo"]): SceneElement["estilo"] {
  const out = { ...estilo };
  for (const k of CAMPOS_COR) {
    const v = (out as Record<string, unknown>)[k];
    if (typeof v === "string") (out as Record<string, unknown>)[k] = sanitizarCor(v);
  }
  return out;
}

// Só permite esquemas seguros no href do botão; escapa aspas/sinais para não
// quebrar/injetar o atributo. O output vai para o Power BI FORA de sandbox.
const HREF_OK = /^(https?:|mailto:|#|\/)/i;
function sanitizarHref(href: string): string {
  const h = (href || "").trim();
  if (!h || !HREF_OK.test(h)) return "#";
  return h.replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Colunas efetivas de uma tabela (fallback único e CONSISTENTE se vazio). */
function colunasEfetivas(el: SceneElement): ColunaTabela[] {
  return el.colunas && el.colunas.length
    ? el.colunas
    : [{ coluna: `${el.tabela ?? "Tabela"}[Coluna]`, rotulo: "Coluna" }];
}

/** Cor principal do elemento: placeholder dinâmico se cor condicional ativa. */
function corDe(el: SceneElement): string {
  // o placeholder {{…}} é interno (não sanear); a cor livre do usuário, sim
  return el.corCond?.ativo ? `{{${el.id}__cor}}` : sanitizarCor(el.estilo.cor);
}

/** Avalia uma regra (operador) para um valor. */
function regraBate(r: { ate: number; ate2?: number; op?: OperadorCor }, val: number): boolean {
  switch (r.op ?? "<=") {
    case "<": return val < r.ate;
    case ">=": return val >= r.ate;
    case ">": return val > r.ate;
    case "=": return val === r.ate;
    case "entre": return val >= Math.min(r.ate, r.ate2 ?? r.ate) && val <= Math.max(r.ate, r.ate2 ?? r.ate);
    default: return val <= r.ate; // "<="
  }
}

/** Resolve a cor de uma lista de regras para um valor (última = senão). */
export function corDasRegras(regras: { ate: number; ate2?: number; op?: OperadorCor; cor: string }[], val: number): string {
  if (!regras.length) return "#000000";
  for (let i = 0; i < regras.length - 1; i++) if (regraBate(regras[i], val)) return regras[i].cor;
  return regras[regras.length - 1].cor;
}

const KEYFRAMES: Record<string, string> = {
  fade: "@keyframes fd{from{opacity:0}to{opacity:1}}",
  slide: "@keyframes sl{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}",
  zoom: "@keyframes zm{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}",
  float: "@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}",
  pulse: "@keyframes pu{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}",
  shimmer: "@keyframes sh{0%,100%{filter:brightness(1)}50%{filter:brightness(1.45)}}",
  bounce: "@keyframes bn{0%,20%,53%,100%{transform:translateY(0)}40%,43%{transform:translateY(-14px)}70%{transform:translateY(-7px)}90%{transform:translateY(-2px)}}",
  swing: "@keyframes sw{20%{transform:rotate(8deg)}40%{transform:rotate(-6deg)}60%{transform:rotate(4deg)}80%{transform:rotate(-2deg)}100%{transform:rotate(0)}}",
  blink: "@keyframes bk{0%,100%{opacity:1}50%{opacity:.35}}",
  rotateIn: "@keyframes ri{from{opacity:0;transform:rotate(-12deg) scale(.9)}to{opacity:1;transform:rotate(0) scale(1)}}",
  wipe: "@keyframes wp{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}",
};
const KF_NOME: Record<string, string> = {
  fade: "fd",
  slide: "sl",
  zoom: "zm",
  float: "fl",
  pulse: "pu",
  shimmer: "sh",
  bounce: "bn",
  swing: "sw",
  blink: "bk",
  rotateIn: "ri",
  wipe: "wp",
};
const CONTINUAS = new Set(["float", "pulse", "shimmer", "bounce", "swing", "blink"]);

// animações de preenchimento (0 -> valor), sempre disponíveis
const FILL_KEYFRAMES =
  "@keyframes gw{from{width:0}}@keyframes ga{from{stroke-dasharray:0 100}}" +
  "@keyframes ndl{from{transform:translateX(-50%) rotate(-135deg)}}@keyframes mkr{from{bottom:0}}" +
  "@keyframes gh{from{height:0}}@keyframes ln{from{stroke-dashoffset:100}}@keyframes ap{from{opacity:0;transform:translateY(6px)}}@keyframes bl{from{left:0}}";

/** Seta SVG da tendência (para cima/baixo/neutro), na cor informada. */
export function setaSvg(direcao: Direcao, cor: string): string {
  if (direcao === "down")
    return `<svg width='15' height='15' viewBox='0 0 24 24' style='flex-shrink:0'><path d='M12 20L4 7h16z' fill='${cor}'></path></svg>`;
  if (direcao === "neutral")
    return `<svg width='15' height='15' viewBox='0 0 24 24' style='flex-shrink:0'><rect x='4' y='10.5' width='16' height='3' rx='1.5' fill='${cor}'></rect></svg>`;
  return `<svg width='15' height='15' viewBox='0 0 24 24' style='flex-shrink:0'><path d='M12 4l8 13H4z' fill='${cor}'></path></svg>`;
}

/** String de estilo inline (atributo) de um elemento. Sem aspas (DAX-safe). */
function estiloInline(el: SceneElement): string {
  const e = estiloSeguro(el.estilo);
  const partes = [
    "position:absolute",
    `left:${Math.round(el.x)}px`,
    `top:${Math.round(el.y)}px`,
    `width:${Math.round(el.w)}px`,
    `height:${Math.round(el.h)}px`,
    "display:flex",
    `align-items:${ALIGN_V[e.alignV ?? "center"]}`,
    `justify-content:${JUSTIFY[e.align]}`,
    `color:${corDe(el)}`,
    `background:${FUNDO_TRANSP.has(el.type) ? "transparent" : e.fundo}`,
    `border-radius:${e.borderRadius}px`,
    `font-size:${e.fontSize}px`,
    `font-weight:${e.fontWeight}`,
    "overflow:hidden",
  ];
  if (e.fontFamily) partes.push(`font-family:${e.fontFamily}`);
  if (e.uppercase) partes.push("text-transform:uppercase");
  if (e.letterSpacing) partes.push(`letter-spacing:${e.letterSpacing}px`);
  if (e.lineHeight) partes.push(`line-height:${e.lineHeight}`);
  if (e.padding > 0) partes.push(`padding:${e.padding}px`);
  if (e.glow > 0) partes.push(`text-shadow:0 0 ${e.glow}px ${corDe(el)}`);
  if (e.borderWidth > 0) partes.push(`border:${e.borderWidth}px ${e.borderStyle || "solid"} ${e.borderColor}`);
  if (e.sombra > 0) partes.push(`box-shadow:0 8px ${e.sombra}px ${e.sombraColor || "rgba(0,0,0,.35)"}`);
  if (e.opacidade < 1) partes.push(`opacity:${e.opacidade}`);
  if (e.rotation) partes.push(`transform:rotate(${e.rotation}deg)`);
  if (el.animacao.tipo !== "none") {
    const cont = CONTINUAS.has(el.animacao.tipo);
    partes.push(
      `animation:${KF_NOME[el.animacao.tipo]} ${el.animacao.duracao}s ${cont ? "ease-in-out" : "ease"} ${el.animacao.delay}s ${cont ? "infinite" : "both"}`,
    );
  }
  return partes.join(";");
}

/** SVG do ícone secundário (iconeNome), preferindo os paths da biblioteca grande. */
function iconeNomeSvg(el: SceneElement, ico: string, cor: string, tam: string): string {
  return el.iconeNomePaths ? svgDeInner(el.iconeNomePaths, cor, 2, tam) : iconeSvg(ico, cor, tam);
}

function elementoHtml(el: SceneElement): string {
  const style = estiloInline(el);
  const e = estiloSeguro(el.estilo); // fundo/borderColor/corValor/corTitulo/corIcone já saneados
  const id = el.id;
  const cor = corDe(el); // cor principal (placeholder dinâmico se cor condicional ativa)

  if (el.type === "forma" || el.type === "linha") {
    return `<div style='${style}'></div>`;
  }
  if (el.type === "progresso") {
    const anim = e.animarFill ? ";animation:gw .9s ease both" : "";
    const fill = `<div style='height:100%;width:{{${id}}}%;background:${cor};border-radius:${e.borderRadius}px${anim}'></div>`;
    return `<div style='${style}'>${fill}</div>`;
  }
  if (el.type === "imagem") {
    const fit = el.contain ? "contain" : "cover";
    return `<div style='${style}'><img src='{{${id}}}' style='width:100%;height:100%;object-fit:${fit};border-radius:${e.borderRadius}px'></div>`;
  }
  if (el.type === "tendencia") {
    const seta = setaSvg(el.direcao ?? "up", cor);
    return `<div style='${style}'>${seta}<span style='margin-left:6px'>{{${id}}}</span></div>`;
  }
  if (el.type === "icone") {
    // ícone é estático (escolhido no editor): SVG da biblioteca (iconePaths),
    // do conjunto curado, ou o caractere literal. Wrapper 100% centralizado.
    const stroke = e.iconeStroke ?? 2;
    const inner = el.iconePaths ? svgDeInner(el.iconePaths, cor, stroke) : (iconeSvg(el.binding.valor, cor, "62%", stroke) || el.binding.valor);
    return `<div style='${style}'><div style='width:100%;height:100%;display:flex;align-items:center;justify-content:center'>${inner}</div></div>`;
  }
  if (el.type === "botao") {
    const href = sanitizarHref(el.href || "");
    return `<a href='${href}' target='_blank' rel='noopener' style='${style};text-decoration:none;cursor:pointer'>{{${id}}}</a>`;
  }
  if (el.type === "pictograma") {
    const n = Math.max(1, el.quantidade || 10);
    const ico = el.iconeNome || "users";
    const anim = e.animarFill ? ";animation:gw .8s ease both" : "";
    const item = (c: string) => `<span style='flex:1;display:flex;align-items:center;justify-content:center;height:100%'>${iconeNomeSvg(el, ico, c, "85%")}</span>`;
    const fileira = (c: string, w: string) => `<div style='display:flex;align-items:center;gap:4px;width:${w};height:100%'>${item(c).repeat(n)}</div>`;
    return `<div style='${style};position:relative'>${fileira("rgba(148,163,184,.35)", "100%")}<div style='position:absolute;top:0;left:0;height:100%;width:{{${id}}}%;overflow:hidden${anim}'>${fileira(cor, Math.round(el.w) + "px")}</div></div>`;
  }
  if (el.type === "rating") {
    const n = Math.max(1, el.quantidade || 5);
    const anim = e.animarFill ? ";animation:gw .8s ease both" : "";
    const star = (c: string) => iconeSvg("star", c, "88%");
    const fileira = (c: string, w: string) => `<div style='display:flex;align-items:center;gap:2px;width:${w};height:100%'>${`<span style='flex:1;display:flex;align-items:center;justify-content:center;height:100%'>${star(c)}</span>`.repeat(n)}</div>`;
    return `<div style='${style};position:relative'>${fileira("rgba(148,163,184,.35)", "100%")}<div style='position:absolute;top:0;left:0;height:100%;width:calc(100% * {{${id}}} / ${n});overflow:hidden${anim}'>${fileira(cor, Math.round(el.w) + "px")}</div></div>`;
  }
  if (el.type === "sparkline") {
    if (el.binding.dinamico) {
      // uma barra por linha da tabela (geradas via CONCATENATEX na DAX)
      return `<div style='${style};align-items:flex-end;gap:3px'>{{${id}__spark}}</div>`;
    }
    const vals = el.barras && el.barras.length ? el.barras : [40, 65, 30, 80, 55, 70];
    const max = Math.max(...vals, 1);
    const bars = vals.map((v, bi) => `<div style='flex:1;height:${Math.max(4, Math.round((v / max) * 100))}%;background:${cor};border-radius:${e.borderRadius || 2}px${e.animarFill ? `;animation:gh .7s ease ${(bi * 0.05).toFixed(2)}s both` : ""}'></div>`).join("");
    return `<div style='${style};align-items:flex-end;gap:3px'>${bars}</div>`;
  }
  if (el.type === "lista") {
    const itens = el.itens && el.itens.length ? el.itens : ["Item"];
    const ic = el.iconeNome || "check";
    const li = itens
      .map((t) => `<div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'><span style='flex-shrink:0;display:flex'>${iconeNomeSvg(el, ic, cor, "16px")}</span><span>${esc(t)}</span></div>`)
      .join("");
    return `<div style='${style};flex-direction:column;align-items:stretch;justify-content:center'>${li}</div>`;
  }
  if (el.type === "divisorRotulo") {
    const linha = `<div style='flex:1;height:1px;background:${e.borderColor || "rgba(148,163,184,.4)"}'></div>`;
    return `<div style='${style};gap:10px'>${linha}<span style='white-space:nowrap'>{{${id}}}</span>${linha}</div>`;
  }
  if (el.type === "velocimetro") {
    const max = el.maximo || 100;
    let prev = 0;
    const segs = faixasDe(el)
      .map((f) => {
        const start = Math.max(0, Math.min(100, (prev / max) * 100));
        const len = Math.max(0, Math.min(100, ((f.ate - prev) / max) * 100));
        prev = f.ate;
        return `<path d='${ARCO_270}' pathLength='100' fill='none' stroke='${f.cor}' stroke-width='${e.espessura ?? 9}' stroke-dasharray='${len.toFixed(2)} 100' stroke-dashoffset='-${start.toFixed(2)}'></path>`;
      })
      .join("");
    const anim = e.animarFill ? ";animation:ndl .9s cubic-bezier(.34,1.4,.6,1) both" : "";
    return (
      `<div style='${style};position:relative'>` +
      `<svg viewBox='0 0 100 90' style='position:absolute;top:0;left:0;width:100%;height:80%'>` +
      `<path d='${ARCO_270}' pathLength='100' fill='none' stroke='${e.fundo}' stroke-width='${e.espessura ?? 9}' stroke-linecap='round'></path>` +
      segs +
      `</svg>` +
      `<div style='position:absolute;left:50%;top:26%;width:3px;height:36%;background:#334155;border-radius:2px;transform-origin:bottom center;transform:translateX(-50%) rotate(calc({{${id}}} / ${max} * 270deg - 135deg))${anim}'></div>` +
      `<div style='position:absolute;left:50%;top:62%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#94a3b8'></div>` +
      `<div style='position:absolute;left:0;right:0;bottom:0;text-align:center;font-weight:800;color:${e.corValor || cor};font-size:${e.fontSize}px'>{{${id}}}</div>` +
      `</div>`
    );
  }
  if (el.type === "bullet") {
    const max = el.maximo || 100;
    const zona = (op: number) => `<div style='flex:1;background:${cor};opacity:${op}'></div>`;
    return (
      `<div style='${style};position:relative;overflow:visible'>` +
      `<div style='position:absolute;inset:0;display:flex;border-radius:${e.borderRadius}px;overflow:hidden'>${zona(0.35)}${zona(0.6)}${zona(1)}</div>` +
      `<div style='position:absolute;top:-2px;bottom:-2px;left:calc({{${id}}} / ${max} * 100%);width:3px;background:#0f172a;border-radius:2px;transform:translateX(-50%)${e.animarFill ? ";animation:bl .8s cubic-bezier(.34,1.4,.6,1) both" : ""}'></div>` +
      `</div>`
    );
  }
  if (el.type === "termometro") {
    const max = el.maximo || 100;
    let prev = 0;
    const bandas = faixasDe(el)
      .map((f) => {
        const h = Math.max(0, Math.min(100, ((f.ate - prev) / max) * 100));
        prev = f.ate;
        return `<div style='width:100%;height:${h.toFixed(2)}%;background:${f.cor}'></div>`;
      })
      .reverse()
      .join("");
    const anim = e.animarFill ? ";animation:mkr .9s cubic-bezier(.34,1.4,.6,1) both" : "";
    return (
      `<div style='${style};position:relative;overflow:visible'>` +
      `<div style='position:absolute;inset:0;display:flex;flex-direction:column;border-radius:${e.borderRadius}px;overflow:hidden'>${bandas}</div>` +
      `<div style='position:absolute;left:-3px;right:-3px;bottom:calc({{${id}}} / ${max} * 100%);height:4px;background:${cor};border-radius:3px;box-shadow:0 0 0 2px rgba(255,255,255,.55);transform:translateY(50%)${anim}'></div>` +
      `</div>`
    );
  }
  if (el.type === "donut") {
    const anim = e.animarFill ? " style='animation:ga .9s ease both'" : "";
    const esp = e.espessura ?? 4.5;
    if (el.formato === "semi") {
      // meio-gauge (semicírculo) — mesmo componente, formato diferente
      const svg =
        `<svg viewBox='0 0 36 24' style='width:100%;height:100%'>` +
        `<path d='${ARCO_180}' fill='none' stroke='${e.fundo}' stroke-width='${esp}' stroke-linecap='round' pathLength='100'></path>` +
        `<path d='${ARCO_180}' fill='none' stroke='${cor}' stroke-width='${esp}' stroke-linecap='round' pathLength='100' stroke-dasharray='{{${id}}} 100'${anim}></path>` +
        `<text x='18' y='20' text-anchor='middle' font-size='7' font-weight='800' fill='${e.corValor || cor}' font-family='Segoe UI,sans-serif'>{{${id}}}%</text>` +
        `</svg>`;
      return `<div style='${style}'>${svg}</div>`;
    }
    const svg =
      `<svg viewBox='0 0 36 36' style='width:100%;height:100%'>` +
      `<circle cx='18' cy='18' r='15.9155' fill='none' stroke='${e.fundo}' stroke-width='${esp}'></circle>` +
      `<circle cx='18' cy='18' r='15.9155' fill='none' stroke='${cor}' stroke-width='${esp}' stroke-linecap='round' pathLength='100' stroke-dasharray='{{${id}}} 100' transform='rotate(-90 18 18)'${anim}></circle>` +
      `<text x='18' y='19' text-anchor='middle' dominant-baseline='middle' font-size='8' font-weight='800' fill='${e.corValor || cor}' font-family='Segoe UI,sans-serif'>{{${id}}}%</text>` +
      `</svg>`;
    return `<div style='${style}'>${svg}</div>`;
  }
  if (el.type === "gauge") {
    const anim = e.animarFill ? " style='animation:ga .9s ease both'" : "";
    const svg =
      `<svg viewBox='0 0 36 24' style='width:100%;height:100%'>` +
      `<path d='${ARCO_180}' fill='none' stroke='${e.fundo}' stroke-width='${e.espessura ?? 3.5}' stroke-linecap='round' pathLength='100'></path>` +
      `<path d='${ARCO_180}' fill='none' stroke='${cor}' stroke-width='${e.espessura ?? 3.5}' stroke-linecap='round' pathLength='100' stroke-dasharray='{{${id}}} 100'${anim}></path>` +
      `<text x='18' y='20' text-anchor='middle' font-size='7' font-weight='800' fill='${e.corValor || cor}' font-family='Segoe UI,sans-serif'>{{${id}}}%</text>` +
      `</svg>`;
    return `<div style='${style}'>${svg}</div>`;
  }
  if (el.type === "cartao") {
    const ic = el.iconeNome || "dollar";
    const iconeCor = e.corIcone || cor;
    const tituloCor = e.corTitulo || "#94A3B8";
    return (
      `<div style='${style};display:block;padding:16px 18px;position:relative'>` +
      `<div style='position:absolute;top:16px;left:18px;width:40px;height:40px;border-radius:12px;background:rgba(6,182,212,.16);display:flex;align-items:center;justify-content:center'>${iconeNomeSvg(el, ic, iconeCor, "22px")}</div>` +
      `<div style='margin-left:52px;font-size:13px;font-weight:600;color:${tituloCor}'>${esc(el.titulo || "")}</div>` +
      `<div style='margin-top:16px;font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${cor};line-height:1'>{{${id}}}</div>` +
      `</div>`
    );
  }
  if (el.type === "cardGauge") {
    const tituloCor = e.corTitulo || "#94A3B8";
    const gCor = e.corIcone || "#06B6D4";
    const gEsp = e.espessura ?? 4;
    const gauge =
      `<svg viewBox='0 0 36 36' style='width:100%;height:100%'>` +
      `<circle cx='18' cy='18' r='15.9155' fill='none' stroke='rgba(148,163,184,.2)' stroke-width='${gEsp}'></circle>` +
      `<circle cx='18' cy='18' r='15.9155' fill='none' stroke='${gCor}' stroke-width='${gEsp}' stroke-linecap='round' pathLength='100' stroke-dasharray='{{${id}}} 100' transform='rotate(-90 18 18)'></circle>` +
      `</svg>`;
    return (
      `<div style='${style};display:block;padding:16px 18px;position:relative'>` +
      `<div style='position:absolute;top:16px;left:18px;right:98px'>` +
      `<div style='font-size:13px;font-weight:600;color:${tituloCor}'>${esc(el.titulo || "")}</div>` +
      `<div style='margin-top:10px;font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${cor};line-height:1'>{{${id}}}%</div>` +
      `</div>` +
      `<div style='position:absolute;top:50%;right:16px;transform:translateY(-50%);width:84px;height:84px'>${gauge}</div>` +
      `</div>`
    );
  }
  if (el.type === "narrativo") {
    // texto com medidas embutidas: {chave} vira {{id__chave}}, cada uma na sua cor
    const porChave = new Map((el.medidas ?? []).map((m) => [m.chave, m]));
    // escapa primeiro (esc não toca em { }), depois troca os tokens {chave}
    const html = esc(el.binding.valor || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k: string) => {
      const med = porChave.get(k);
      if (!med) return m;
      const c = sanitizarCor(med.cor) || e.corValor || cor;
      return `<span style='color:${c};font-weight:700'>{{${id}__${k}}}</span>`;
    });
    return `<div style='${style};display:block;white-space:pre-wrap'>${html}</div>`;
  }
  if (el.type === "chip") {
    const ic = el.iconeNome || "flame";
    const iconeCor = e.corIcone || "#06B6D4";
    const rotuloCor = e.corTitulo || "#94A3B8";
    return (
      `<div style='${style};display:flex;align-items:center;gap:8px;padding:0 14px'>` +
      `<span style='flex-shrink:0;display:flex'>${iconeNomeSvg(el, ic, iconeCor, "20px")}</span>` +
      `<span style='font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${cor};line-height:1'>{{${id}}}</span>` +
      `<span style='font-size:12px;color:${rotuloCor};white-space:nowrap'>${esc(el.titulo || "")}</span>` +
      `</div>`
    );
  }
  if (el.type === "filtros") {
    const rotuloCor = e.corTitulo || "#94A3B8";
    const pill = e.fundo && e.fundo !== "transparent" ? e.fundo : "rgba(148,163,184,.16)";
    const chips = (el.medidas ?? [])
      .map((m) =>
        `<span style='display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:${e.borderRadius}px;background:${pill};font-size:${e.fontSize}px;font-weight:${e.fontWeight};white-space:nowrap'>` +
        `<span style='color:${rotuloCor}'>${esc(m.rotulo || m.chave)}:</span><span style='color:${cor}'>{{${id}__${m.chave}}}</span>` +
        `</span>`,
      )
      .join("");
    return `<div style='${style};display:flex;flex-wrap:wrap;align-items:flex-start;align-content:flex-start;gap:6px'>${chips}</div>`;
  }
  if (el.type === "funil") {
    const etapas = el.etapas && el.etapas.length ? el.etapas : [{ rotulo: "Etapa", valor: 1 }];
    const max = Math.max(...etapas.map((et) => et.valor), 1);
    const linhas = etapas
      .map((et, fi) => {
        const w = Math.max(12, Math.round((et.valor / max) * 100));
        const a = e.animarFill ? `;animation:gw .7s ease ${(fi * 0.08).toFixed(2)}s both` : "";
        const anterior = etapas[fi - 1]?.valor;
        const conv = el.mostrarConversao && fi > 0 && anterior ? `<div style='position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700;color:${e.corTitulo || "#94A3B8"}'>${Math.round((et.valor / anterior) * 100)}%</div>` : "";
        return `<div style='flex:1;position:relative;display:flex;align-items:center;justify-content:center'><div style='width:${w}%;height:82%;background:${cor};border-radius:${e.borderRadius}px;display:flex;align-items:center;justify-content:center;gap:6px;color:${e.corValor || "#fff"};font-size:${e.fontSize}px;font-weight:${e.fontWeight};white-space:nowrap;overflow:hidden;padding:0 8px${a}'>${esc(et.rotulo)} · ${et.valor}</div>${conv}</div>`;
      })
      .join("");
    return `<div style='${style};flex-direction:column;align-items:stretch;justify-content:center;gap:4px'>${linhas}</div>`;
  }
  if (el.type === "waffle") {
    const gap = 3;
    const anim = e.animarFill ? ";animation:gh .8s ease both" : "";
    const grade = (c: string) => `<div style='display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);gap:${gap}px;width:100%;height:100%'>${`<div style='border-radius:${e.borderRadius}px;background:${c}'></div>`.repeat(100)}</div>`;
    return `<div style='${style};position:relative'>${grade(e.fundo)}<div style='position:absolute;left:0;right:0;bottom:0;height:{{${id}}}%;overflow:hidden${anim}'><div style='position:absolute;bottom:0;left:0;width:100%;height:${Math.round(el.h)}px'>${grade(cor)}</div></div></div>`;
  }
  if (el.type === "timeline") {
    const passos = el.itens && el.itens.length ? el.itens : ["Passo"];
    const vert = el.orientacao === "v";
    const linha = e.fundo || "rgba(148,163,184,.25)";
    const miolo = (i: number) => (el.iconeNome ? iconeNomeSvg(el, el.iconeNome, e.corValor || "#fff", "16px") : `${i + 1}`);
    const bola = (i: number) => `<div style='flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${cor};color:${e.corValor || "#fff"};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800'>${miolo(i)}</div>`;
    const rotulo = (t: string, extra: string) => `<div style='color:${e.corTitulo || "#94A3B8"};font-size:${e.fontSize}px;font-weight:${e.fontWeight};${extra}'>${esc(t)}</div>`;
    const aStep = (i: number) => (e.animarFill ? `;animation:ap .5s ease ${(i * 0.09).toFixed(2)}s both` : "");
    if (vert) {
      const itens = passos.map((t, i) => `<div style='display:flex;align-items:center;gap:10px;flex:1;min-height:0${aStep(i)}'>${bola(i)}${rotulo(t, "")}</div>`).join("");
      return `<div style='${style};flex-direction:column;align-items:stretch;position:relative'><div style='position:absolute;top:14px;bottom:14px;left:13px;width:2px;background:${linha}'></div>${itens}</div>`;
    }
    const itens = passos.map((t, i) => `<div style='flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;z-index:1${aStep(i)}'>${bola(i)}${rotulo(t, "text-align:center")}</div>`).join("");
    return `<div style='${style};align-items:flex-start;justify-content:space-between;position:relative;padding-top:2px'><div style='position:absolute;top:16px;left:8%;right:8%;height:2px;background:${linha}'></div>${itens}</div>`;
  }
  if (el.type === "kpiCompleto") {
    const tituloCor = e.corTitulo || "#94A3B8";
    const valorCor = e.corValor || "#fff";
    const dir = el.direcao ?? "up";
    const setaCor = dir === "up" ? "#22C55E" : dir === "down" ? "#EF4444" : "#94A3B8";
    const vals = el.barras && el.barras.length ? el.barras : [40, 60, 50, 70];
    const maxb = Math.max(...vals, 1);
    const bars = vals.map((v, bi) => `<div style='flex:1;height:${Math.max(8, Math.round((v / maxb) * 100))}%;background:${cor};border-radius:2px;opacity:.85${e.animarFill ? `;animation:gh .6s ease ${(bi * 0.05).toFixed(2)}s both` : ""}'></div>`).join("");
    return (
      `<div style='${style};display:block;padding:14px 16px;position:relative'>` +
      `<div style='font-size:12px;font-weight:600;color:${tituloCor};text-transform:uppercase;letter-spacing:.03em'>${esc(el.titulo || "")}</div>` +
      `<div style='margin-top:4px;font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${valorCor};line-height:1'>{{${id}}}</div>` +
      `<div style='margin-top:5px;display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:${setaCor}'>${setaSvg(dir, setaCor)}<span>{{${id}__var}}</span></div>` +
      `<div style='position:absolute;left:16px;right:16px;bottom:12px;height:24px;display:flex;align-items:flex-end;gap:2px'>${bars}</div>` +
      `</div>`
    );
  }
  if (el.type === "areaMini") {
    const vals = el.barras && el.barras.length ? el.barras : [30, 50, 40, 65, 55, 75, 60, 85];
    const max = Math.max(...vals), min = Math.min(...vals);
    const range = max - min || 1;
    const W = 100, H = 34;
    const den = Math.max(1, vals.length - 1); // evita divisão por zero com 1 ponto
    const pts = vals.map((v, i) => `${((i / den) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`);
    const linha = pts.join(" ");
    const animL = e.animarFill ? ` pathLength='100' stroke-dasharray='100' style='animation:ln 1s ease both'` : "";
    const gid = `ga${id}`;
    // pontos redondos via overlay HTML (a SVG estica com preserveAspectRatio=none)
    const pontos = vals
      .map((v, i) => `<div style='position:absolute;left:${((i / den) * 100).toFixed(1)}%;top:${((1 - (v - min) / range) * 100).toFixed(1)}%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:${cor}'></div>`)
      .join("");
    return (
      `<div style='${style};position:relative'>` +
      `<svg viewBox='0 0 ${W} ${H}' preserveAspectRatio='none' style='position:absolute;inset:0;width:100%;height:100%'>` +
      `<defs><linearGradient id='${gid}' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='${cor}' stop-opacity='0.32'></stop><stop offset='100%' stop-color='${cor}' stop-opacity='0'></stop></linearGradient></defs>` +
      `<polygon points='0,${H} ${linha} ${W},${H}' fill='url(#${gid})'></polygon>` +
      `<polyline points='${linha}' fill='none' stroke='${cor}' stroke-width='2' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke'${animL}></polyline></svg>` +
      `<div style='position:absolute;inset:0'>${pontos}</div>` +
      `</div>`
    );
  }
  if (el.type === "anelKpi") {
    const esp = e.espessura ?? 4;
    const anim = e.animarFill ? " style='animation:ga .9s ease both'" : "";
    const rotulo = el.titulo ? `<div style='font-size:12px;color:${e.corTitulo || "#94A3B8"};margin-top:2px'>${esc(el.titulo)}</div>` : "";
    const numero = `<div style='font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${e.corValor || "#fff"};line-height:1'>{{${id}}}%</div>`;
    if (el.formato === "semi") {
      // semicírculo real com o número GRANDE na abertura (padrão gauge de KPI)
      const ring =
        `<svg viewBox='0 0 36 24' preserveAspectRatio='xMidYMid meet' style='position:absolute;top:0;left:0;width:100%;height:100%'>` +
        `<path d='${ARCO_180}' fill='none' stroke='${e.fundo}' stroke-width='${esp}' stroke-linecap='round' pathLength='100'></path>` +
        `<path d='${ARCO_180}' fill='none' stroke='${cor}' stroke-width='${esp}' stroke-linecap='round' pathLength='100' stroke-dasharray='{{${id}}} 100'${anim}></path>` +
        `</svg>`;
      return `<div style='${style};position:relative'>${ring}<div style='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:15%'>${numero}${rotulo}</div></div>`;
    }
    const ring =
      `<svg viewBox='0 0 36 36' style='position:absolute;inset:0;width:100%;height:100%'>` +
      `<circle cx='18' cy='18' r='15.9155' fill='none' stroke='${e.fundo}' stroke-width='${esp}'></circle>` +
      `<circle cx='18' cy='18' r='15.9155' fill='none' stroke='${cor}' stroke-width='${esp}' stroke-linecap='round' pathLength='100' stroke-dasharray='{{${id}}} 100' transform='rotate(-90 18 18)'${anim}></circle>` +
      `</svg>`;
    return `<div style='${style};position:relative'>${ring}<div style='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center'>${numero}${rotulo}</div></div>`;
  }
  if (el.type === "comparaAB") {
    const tituloCor = e.corTitulo || "#94A3B8";
    const valorCor = e.corValor || "#fff";
    const labelB = (el.medidas ?? []).find((m) => m.chave === "b")?.rotulo || "Anterior";
    return (
      `<div style='${style};display:flex;align-items:center;padding:14px 16px;gap:12px'>` +
      `<div style='flex:1;min-width:0'><div style='font-size:12px;font-weight:600;color:${tituloCor}'>${esc(el.titulo || "Atual")}</div><div style='margin-top:4px;font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${valorCor};line-height:1'>{{${id}}}</div></div>` +
      `<div style='width:1px;align-self:stretch;background:rgba(148,163,184,.25)'></div>` +
      `<div style='flex:1;min-width:0'><div style='font-size:12px;font-weight:600;color:${tituloCor}'>${esc(labelB)}</div><div style='margin-top:4px;font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${valorCor};opacity:.65;line-height:1'>{{${id}__b}}</div></div>` +
      `</div>`
    );
  }
  if (el.type === "comparativo") {
    const tituloCor = e.corTitulo || "#94A3B8";
    const valorCor = e.corValor || cor;
    const barCor = e.corIcone || "#06B6D4";
    return (
      `<div style='${style};display:block;padding:16px 18px'>` +
      `<div style='font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${tituloCor}'>${esc(el.titulo || "")}</div>` +
      `<div style='margin-top:6px;font-size:${e.fontSize}px;font-weight:${e.fontWeight};color:${valorCor};line-height:1.05'>{{${id}}}</div>` +
      `<div style='margin-top:6px;font-size:12px;color:${tituloCor}'>Meta: <b style='color:inherit'>{{${id}__meta}}</b></div>` +
      `<div style='margin-top:8px;height:6px;border-radius:6px;background:rgba(148,163,184,.2);overflow:hidden'><div style='height:100%;width:{{${id}__pct}}%;background:${barCor};border-radius:6px'></div></div>` +
      `</div>`
    );
  }
  if (el.type === "tabela") {
    const cols = colunasEfetivas(el);
    const ths = cols.map((c) => `<th style='text-align:left;padding:6px 8px;font-weight:600;opacity:.7'>${esc(c.rotulo)}</th>`).join("");
    return `<div style='${style};overflow:auto'><table style='width:100%;border-collapse:collapse;font-size:${e.fontSize}px;color:${cor}'><thead><tr>${ths}</tr></thead><tbody>{{${id}__rows}}</tbody></table></div>`;
  }
  // texto, kpi, badge
  return `<div style='${style}'>{{${id}}}</div>`;
}

export interface ConteudoMapa {
  id: string;
  nome: string;
  binding: SceneElement["binding"];
}

export interface TabelaCena {
  rowsKey: string; // chave do placeholder {{id__rows}}
  nome: string;
  tabela: string;
  colunas: ColunaTabela[];
}

export interface SparkCena {
  rowsKey: string; // chave do placeholder {{id__spark}}
  nome: string;
  tabela: string;
  coluna: string; // referência DAX da coluna de valor
  cor: string;
  radius: number;
}

export interface CorCondCena {
  corKey: string; // chave do placeholder {{id__cor}}
  nome: string;
  ref: string; // medida DAX avaliada
  regras: { ate: number; ate2?: number; op?: OperadorCor; cor: string }[];
  amostra: number; // valor literal (usado no preview)
}

export interface Cena {
  css: string;
  htmlTemplate: string;
  conteudos: ConteudoMapa[];
  tabelas: TabelaCena[];
  sparklines: SparkCena[];
  coresCond: CorCondCena[];
}

interface PaginaBuild {
  corpo: string; // html dos elementos (com placeholders), sem wrapper do card
  conteudos: ConteudoMapa[];
  tabelas: TabelaCena[];
  sparklines: SparkCena[];
  coresCond: CorCondCena[];
}

/** Monta o corpo (elementos posicionados) de uma página. */
function buildPagina(p: Pagina): PaginaBuild {
  const visiveis = (p.elements ?? []).filter((e) => e.visivel);
  return {
    corpo: visiveis.map(elementoHtml).join(""),
    conteudos: [
      ...visiveis.filter(temConteudo).map((e) => ({ id: e.id, nome: e.nome, binding: e.binding })),
      // medidas extras (Texto narrativo / Card comparativo) → placeholder {{id__chave}}
      ...visiveis.flatMap((e) => {
        // no narrativo, só conta a medida cujo {chave} realmente aparece no texto
        // (evita VAR morta na DAX quando o token é renomeado/removido)
        const meds = e.type === "narrativo"
          ? (e.medidas ?? []).filter((m) => new RegExp(`\\{${m.chave}\\}`).test(e.binding.valor || ""))
          : (e.medidas ?? []);
        return meds.map((m) => ({ id: `${e.id}__${m.chave}`, nome: m.rotulo?.trim() || `${e.nome} ${m.chave}`, binding: m.binding }));
      }),
    ],
    tabelas: visiveis
      .filter((e) => e.type === "tabela")
      .map((e) => ({ rowsKey: `${e.id}__rows`, nome: e.nome, tabela: e.tabela ?? "Tabela", colunas: colunasEfetivas(e) })),
    sparklines: visiveis
      .filter((e) => e.type === "sparkline" && e.binding.dinamico)
      .map((e) => ({ rowsKey: `${e.id}__spark`, nome: e.nome, tabela: e.tabela ?? "Tabela", coluna: e.binding.ref || `${e.tabela ?? "Tabela"}[Valor]`, cor: e.estilo.cor, radius: e.estilo.borderRadius || 2 })),
    coresCond: visiveis
      .filter((e) => e.corCond?.ativo && (e.corCond.regras?.length ?? 0) > 0)
      .map((e) => ({ corKey: `${e.id}__cor`, nome: e.nome, ref: e.corCond!.ref?.trim() || e.binding.ref?.trim() || "[Valor]", regras: e.corCond!.regras, amostra: Number(e.binding.valor) || 0 })),
  };
}

/** CSS do flip (frente/verso). Vira no hover ou automático. */
function flipCss(t: Transicao): string {
  const base =
    ".ddflip{width:100%;height:100%;perspective:1400px}" +
    `.ddflip-in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform ${t.duracao}s cubic-bezier(.4,0,.2,1)}` +
    ".ddface{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;border-radius:inherit}" +
    ".ddback{transform:rotateY(180deg)}";
  if (t.auto) {
    // ciclo: frente (intervalo) → vira → verso (intervalo) → volta
    const ciclo = +(t.intervalo * 2 + t.duracao * 2).toFixed(2);
    const i = t.intervalo, d = t.duracao;
    const p1 = ((i) / ciclo) * 100;
    const p2 = ((i + d) / ciclo) * 100;
    const p3 = ((i + d + i) / ciclo) * 100;
    return (
      base +
      `@keyframes ddflipauto{0%,${p1.toFixed(1)}%{transform:rotateY(0deg)}${p2.toFixed(1)}%,${p3.toFixed(1)}%{transform:rotateY(180deg)}100%{transform:rotateY(360deg)}}` +
      `.ddflip-in{animation:ddflipauto ${ciclo}s ease-in-out infinite}`
    );
  }
  return base + ".ddflip:hover .ddflip-in{transform:rotateY(180deg)}";
}

/** CSS do slideshow (fade ou slide) automático sobre N páginas. */
function slideshowCss(t: Transicao, n: number): string {
  const total = +(n * t.intervalo).toFixed(2);
  const slotPct = 100 / n;
  const fadePct = Math.min(slotPct / 2, (t.duracao / total) * 100);
  const inPct = fadePct.toFixed(2);
  const fullEnd = (slotPct - fadePct).toFixed(2);
  const outPct = slotPct.toFixed(2);
  const desliza = t.tipo === "slide";
  const kf = desliza
    ? `@keyframes ddslide{0%{opacity:0;transform:translateX(24px)}${inPct}%{opacity:1;transform:translateX(0)}${fullEnd}%{opacity:1;transform:translateX(0)}${outPct}%{opacity:0;transform:translateX(-24px)}100%{opacity:0}}`
    : `@keyframes ddfade{0%{opacity:0}${inPct}%{opacity:1}${fullEnd}%{opacity:1}${outPct}%{opacity:0}100%{opacity:0}}`;
  const nome = desliza ? "ddslide" : "ddfade";
  return (
    ".ddss{position:relative;width:100%;height:100%}" +
    `.ddss>.ddpg{position:absolute;inset:0;opacity:0;animation:${nome} ${total}s linear infinite}` +
    kf
  );
}

export function buildScene(doc: VisualDocument): Cena {
  const paginas = paginasDe(doc);
  const trans = transicaoDe(doc);
  const multi = paginas.length > 1 && trans.tipo !== "none";

  const builds = paginas.map(buildPagina);
  const conteudos = builds.flatMap((b) => b.conteudos);
  const tabelas = builds.flatMap((b) => b.tabelas);
  const sparklines = builds.flatMap((b) => b.sparklines);
  const coresCond = builds.flatMap((b) => b.coresCond);

  const animUsadas = new Set(
    paginas.flatMap((p) => (p.elements ?? []).filter((e) => e.visivel).map((e) => e.animacao.tipo)).filter((t) => t !== "none"),
  );
  const keyframes = [...animUsadas].map((t) => KEYFRAMES[t]).join("");

  const c = doc.card;
  let cardStyle = `position:relative;width:${c.w}px;height:${c.h}px;background:${sanitizarCor(c.fundo)};border-radius:${c.borderRadius}px;overflow:hidden`;
  if ((c.borderWidth || 0) > 0) cardStyle += `;border:${c.borderWidth}px solid ${sanitizarCor(c.borderColor)}`;
  if ((c.sombra || 0) > 0) cardStyle += `;box-shadow:0 10px ${c.sombra}px rgba(0,0,0,.4)`;

  let inner: string;
  let transCss = "";
  if (!multi) {
    inner = builds[0]?.corpo ?? "";
  } else if (trans.tipo === "flip") {
    const front = builds[0]?.corpo ?? "";
    const back = builds[1]?.corpo ?? "";
    inner = `<div class='ddflip'><div class='ddflip-in'><div class='ddface'>${front}</div><div class='ddface ddback'>${back}</div></div></div>`;
    transCss = flipCss(trans);
  } else {
    const n = builds.length;
    const layers = builds
      .map((b, i) => `<div class='ddpg' style='animation-delay:${(-(((n - i) % n) * trans.intervalo)).toFixed(2)}s'>${b.corpo}</div>`)
      .join("");
    inner = `<div class='ddss'>${layers}</div>`;
    transCss = slideshowCss(trans, n);
  }

  const css =
    "*{margin:0;padding:0;box-sizing:border-box}" +
    ".card{font-family:'Segoe UI',system-ui,-apple-system,sans-serif}" +
    "body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent}" +
    FILL_KEYFRAMES +
    keyframes +
    transCss;

  const htmlTemplate = `<div class='card' style='${cardStyle}'>${inner}</div>`;

  return { css, htmlTemplate, conteudos, tabelas, sparklines, coresCond };
}
