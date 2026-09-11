import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- Design System: cor com semântica ----
        ds: {
          bg: "var(--ds-bg)",
          surface: "var(--ds-surface)",
          raised: "var(--ds-raised)",
          line: "var(--ds-line)",
          "line-soft": "var(--ds-line-soft)",
          text: "var(--ds-text)",
          "text-2": "var(--ds-text-2)",
          "text-3": "var(--ds-text-3)",
          accent: "var(--ds-accent)",
          "accent-ink": "var(--ds-accent-ink)",
          info: "var(--ds-info)",
          attention: "var(--ds-attention)",
          danger: "var(--ds-danger)",
        },
        ink: {
          900: "#04070f",
          800: "#070b16",
          700: "#0b1220",
          600: "#111a2e",
        },
        brand: {
          green: "#34e8a0",
          teal: "#2ee6d6",
          blue: "#3b9dff",
          cyan: "#22d3ee",
        },
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
        ctl: "4px",   // controles: botão, campo, badge
        srf: "10px",  // superfícies: painel, imagem, bloco
      },
      boxShadow: {
        overlay: "0 24px 60px -24px rgba(0,0,0,0.72)", // só sobreposição real
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
      },
      animation: {
        "gradient-x": "gradient-x 6s ease infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "spin-slow": "spin-slow 32s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
