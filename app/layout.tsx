import { tr } from "@/lib/i18n/traduzir-servidor";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { TAG_HTML } from "@/lib/i18n/idioma";
import { idiomaAtual } from "@/lib/i18n/idioma-servidor";
import RastreioDeUso from "@/components/RastreioDeUso";
import AvisoMateriaisLiberados from "@/components/AvisoMateriaisLiberados";

// Tema claro (set/2026): Inter faz tudo. O peso 900 bem fechado faz a
// manchete (.grito), no lugar da Wise Sans, que é proprietária; 600 e 700 os
// títulos de seção; 400 e 500 o texto. Plex Mono segue só para número medido.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

const TEMA_ANTES_DE_PINTAR = `try{if(localStorage.getItem("tema")==="escuro")document.documentElement.dataset.tema="escuro"}catch(e){}`;

/* Função, e não constante: constante de módulo é avaliada uma vez, quando o
   arquivo carrega, fora de qualquer requisição. O tr() ali não enxergaria o
   cookie e o título da aba ficaria em português para sempre. */
export function generateMetadata(): Metadata {
  return {
    title: tr("Drive Data Academy — Domine dados e IA para decidir melhor"),
    description: tr(
      "A escola de dados da DriveData. Formação prática em Power BI, Análise de Dados e Inteligência Artificial aplicada a negócios — para profissionais e times.",
    ),
    openGraph: {
      title: tr("Drive Data Academy"),
      description: tr(
        "Formação prática em Power BI, Análise de Dados e IA aplicada a negócios. Aprenda a transformar dados em decisões.",
      ),
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const idioma = idiomaAtual();
  return (
    <html lang={TAG_HTML[idioma]} className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica o modo escuro antes da primeira pintura (components/tema/AlternarTema.tsx). */}
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DE_PINTAR }} />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider inicial={idioma}>{children}</LanguageProvider>
        <RastreioDeUso />
        <AvisoMateriaisLiberados />
      </body>
    </html>
  );
}
