import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import paletaTailwind from "tailwindcss/colors";

/* ---- Tema claro com as cores do logo ---------------------------------------
   Estrutura do sistema de referência (Paper, pílulas, manchete 900, faixas
   escuras), com a paleta do logo DriveData: verde do "D" na ação principal,
   azul-noite (o azul do logo escurecido) nas faixas escuras e o azul do logo
   como cor de link e de destaque em texto.

   O produto nasceu escuro e as telas pintam com a paleta direto (text-slate-300,
   bg-ink-800, text-white, border-white/10). Em vez de reescrever 319 telas, as
   cores que as telas usam viram variáveis, e o tema decide o valor:

   - no :root (claro), cada tom "de fundo escuro" vira o equivalente claro. O
     slate-300, que era texto claro sobre o escuro, vira texto escuro sobre o
     branco. As outras paletas invertem a escala (300 vira 700).
   - dentro de .escuro (faixas azul-noite, o 4D, o player), volta o valor
     original da paleta, sobre fundo azul-noite.

   Nova tela deve usar os tokens ds-* e as cores com nome (marca, marca-verde...). */
const canais = (hex: string) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
};
const TONS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const INVERSO: Record<string, string> = { "50": "950", "100": "900", "200": "800", "300": "700", "400": "700", "500": "600", "600": "500", "700": "300", "800": "200", "900": "100", "950": "50" };
const PALETAS = ["red", "amber", "teal", "sky", "emerald", "violet", "orange", "rose"] as const;
// Neutro frio, puxado para o azul do logo. No .escuro volta o slate original do Tailwind.
const NEUTRO_CLARO: Record<string, string> = { "50": "#0b1220", "100": "#152033", "200": "#263247", "300": "#3d4859", "400": "#4f5a6b", "500": "#5f6b7c", "600": "#8b95a4", "700": "#c6ccd6", "800": "#e7ebf0", "900": "#f1f4f7", "950": "#f7f9fb" };
const NEUTRO_ESCURO: Record<string, string> = (paletaTailwind as any).slate;

const variavel = (nome: string) => `rgb(var(--p-${nome}) / <alpha-value>)`;
const escala = (nome: string) => Object.fromEntries(TONS.map((t) => [t, variavel(`${nome}-${t}`)]));

const claro: Record<string, string> = {};
const escuro: Record<string, string> = {};
for (const t of TONS) {
  claro[`--p-slate-${t}`] = canais(NEUTRO_CLARO[t]);
  escuro[`--p-slate-${t}`] = canais(NEUTRO_ESCURO[t]);
  for (const p of PALETAS) {
    const orig = (paletaTailwind as any)[p];
    claro[`--p-${p}-${t}`] = canais(orig[INVERSO[t]]);
    escuro[`--p-${p}-${t}`] = canais(orig[t]);
  }
}
Object.assign(claro, {
  "--p-ink-900": "255 255 255", "--p-ink-800": "255 255 255", "--p-ink-700": "247 249 251", "--p-ink-600": "233 237 242",
  "--p-tinta": "11 18 32", "--p-acento": "11 98 207",
  "--p-brand-green": "95 224 106", "--p-brand-teal": "31 140 144", "--p-brand-blue": "11 98 207", "--p-brand-cyan": "8 125 170",
});
Object.assign(escuro, {
  "--p-ink-900": "6 26 51", "--p-ink-800": "10 38 71", "--p-ink-700": "17 50 96", "--p-ink-600": "26 63 115",
  "--p-tinta": "255 255 255", "--p-acento": "95 224 106",
  "--p-brand-green": "95 224 106", "--p-brand-teal": "46 230 214", "--p-brand-blue": "90 169 255", "--p-brand-cyan": "34 211 238",
});
const temas = plugin(({ addBase }) => {
  addBase({ ":root": claro, ".escuro": { ...escuro, color: "rgb(var(--p-tinta))" } });
});

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- Design System: cor com semântica ----
        // Canais + <alpha-value>: é o que permite bg-ds-raised/50 e
        // border-ds-accent/35 existirem. Com "var(--ds-x)" cru o Tailwind
        // descarta a classe com barra em silêncio.
        ds: {
          bg: "rgb(var(--ds-bg-c) / <alpha-value>)",
          surface: "rgb(var(--ds-surface-c) / <alpha-value>)",
          raised: "rgb(var(--ds-raised-c) / <alpha-value>)",
          line: "rgb(var(--ds-line-c) / <alpha-value>)",
          "line-soft": "rgb(var(--ds-line-soft-c) / <alpha-value>)",
          text: "rgb(var(--ds-text-c) / <alpha-value>)",
          "text-2": "rgb(var(--ds-text-2-c) / <alpha-value>)",
          "text-3": "rgb(var(--ds-text-3-c) / <alpha-value>)",
          accent: "rgb(var(--ds-accent-c) / <alpha-value>)",
          "accent-ink": "rgb(var(--ds-accent-ink-c) / <alpha-value>)",
          info: "rgb(var(--ds-info-c) / <alpha-value>)",
          attention: "rgb(var(--ds-attention-c) / <alpha-value>)",
          danger: "rgb(var(--ds-danger-c) / <alpha-value>)",
        },
        ink: { 900: variavel("ink-900"), 800: variavel("ink-800"), 700: variavel("ink-700"), 600: variavel("ink-600") },
        brand: { green: variavel("brand-green"), teal: variavel("brand-teal"), blue: variavel("brand-blue"), cyan: variavel("brand-cyan") },
        slate: escala("slate"),
        ...Object.fromEntries(PALETAS.map((p) => [p, escala(p)])),
        // "tinta" é o antigo white das telas: texto e traço de maior contraste.
        tinta: variavel("tinta"),
        // Texto de destaque. No claro é o azul do logo; no .escuro, o verde do logo.
        acento: variavel("acento"),
        "sobre-acento": "#0a2647",
        // Paleta do logo, com nome, para tela nova.
        marca: "#0a2647",         // azul-noite: faixa escura, menu, texto de peso
        "marca-verde": "#5fe06a", // verde do "D": ação principal, estado ativo
        "marca-azul": "#0b62cf",  // azul do logo: link e destaque em texto
        "marca-ciano": "#13b8ef", // ciano do logo: detalhe, nunca texto no claro
        "marca-nevoa": "#e6f8e8", // verde bem claro: selo, hover, bloco de destaque
        spruce: "#1f9fa3",
        "signal-blue": "#0b62cf",
        "alarm-red": "#cb272f",
        charcoal: "#3d4859",
        obsidian: "#0b1220",
        pebble: "#8b95a4",
        fog: "#e9edf2",
        // Tokens da Ferramenta de Visuais (editor). Tema claro próprio.
        viz: {
          DEFAULT: "#0891b2",
          light: "#06b6d4",
          dark: "#0e7490",
        },
        surface: "#ffffff",
        border: "#e2e8f0",
        muted: "#64748b",
        foreground: "#0f172a",
        background: "#f8fafc",
      },
      // ---- Design System: escala tipográfica oficial ----------------
      // Nomes por PAPEL, não por tamanho. Aditivo: text-sm e text-xs
      // continuam existindo para as páginas ainda não migradas.
      fontSize: {
        display:   ["clamp(2.125rem, 4.2vw, 2.75rem)", { lineHeight: "1.06", letterSpacing: "-0.028em" }],
        title:     ["1.75rem",    { lineHeight: "1.14", letterSpacing: "-0.022em" }],
        section:   ["1.1875rem",  { lineHeight: "1.32", letterSpacing: "-0.012em" }],
        component: ["1rem",       { lineHeight: "1.4",  letterSpacing: "-0.006em" }],
        body:      ["0.9375rem",  { lineHeight: "1.62" }],
        "body-sm": ["0.875rem",   { lineHeight: "1.55" }],
        label:     ["0.8125rem",  { lineHeight: "1.35" }],
        caption:   ["0.75rem",    { lineHeight: "1.5" }],
        meta:      ["0.75rem",    { lineHeight: "1.4",  letterSpacing: "0.07em" }],
        data:      ["1.5rem",     { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "data-lg": ["2.25rem",    { lineHeight: "1.02", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        ctl: "10px",  // campos e controles; botão e selo são pílula (rounded-full)
        srf: "10px",  // superfícies: cartão, imagem, bloco
        grande: "28px", // cartão grande e faixa escura
      },
      boxShadow: {
        overlay: "rgba(0,0,0,0.15) 0px 10px 32px 0px, rgba(0,0,0,0.04) 0px 40px 40px 0px", // só sobreposição real
        fio: "rgba(14,15,12,0.12) 0px 0px 0px 1px",
        painel: "rgba(0,0,0,0.08) 0px 6px 20px 0px",
      },
      transitionDuration: { fast: "140ms", base: "200ms", slow: "320ms" },
      transitionTimingFunction: { ds: "cubic-bezier(0.2,0.6,0.3,1)" },
      screens: { tablet: "768px" },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        // Cartão que entra subindo, escalonado pela ordem na grade.
        sobe: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Brilho que atravessa o selo de "novo" de tempos em tempos.
        brilho: {
          "0%, 65%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      animation: {
        "gradient-x": "gradient-x 6s ease infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "spin-slow": "spin-slow 32s linear infinite",
        sobe: "sobe 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        brilho: "brilho 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [temas],
};

export default config;
