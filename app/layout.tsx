import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

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

export const metadata: Metadata = {
  title: "Drive Data Academy — Domine dados e IA para decidir melhor",
  description:
    "A escola de dados da DriveData. Formação prática em Power BI, Análise de Dados e Inteligência Artificial aplicada a negócios — para profissionais e times.",
  openGraph: {
    title: "Drive Data Academy",
    description:
      "Formação prática em Power BI, Análise de Dados e IA aplicada a negócios. Aprenda a transformar dados em decisões.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
