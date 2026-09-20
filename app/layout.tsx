import { tr } from "@/lib/i18n/traduzir-servidor";
import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { TAG_HTML } from "@/lib/i18n/idioma";
import { idiomaAtual } from "@/lib/i18n/idioma-servidor";
import RastreioDeUso from "@/components/RastreioDeUso";
import AvisoMateriaisLiberados from "@/components/AvisoMateriaisLiberados";

// Três papéis, um sistema. Archivo carrega os títulos, Plex Sans o texto lido,
// Plex Mono todo número medido. Antes o produto não carregava fonte nenhuma:
// as variáveis apontavam para Inter e Sora, que nunca eram servidas, então
// tudo caía em Segoe UI. Daí a sensação de tipografia sem personalidade.
const display = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang={TAG_HTML[idioma]} className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider inicial={idioma}>{children}</LanguageProvider>
        <RastreioDeUso />
        <AvisoMateriaisLiberados />
      </body>
    </html>
  );
}
