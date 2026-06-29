import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

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
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
