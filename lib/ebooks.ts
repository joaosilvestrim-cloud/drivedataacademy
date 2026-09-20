/* Ebooks da Academy: o que o admin e a área do aluno compartilham.

   Sem "server-only" porque o componente de envio, que roda no navegador,
   também precisa do nome do bucket e do tamanho legível. */

import { IDIOMAS, type Idioma } from "@/lib/i18n/idioma";

export const BUCKET_EBOOKS = "ebooks";

/** Limite do arquivo. Ebook é PDF de leitura, não é vídeo. */
export const LIMITE_MB = 30;

export type Ebook = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  autor: string | null;
  paginas: number | null;
  cover_url: string | null;
  published: boolean;
  position: number;
};

export type ArquivoDoEbook = {
  ebook_id: string;
  idioma: Idioma;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
};

/* Qual edição entregar para quem está lendo.

   Primeiro a língua da pessoa. Não tendo, o português, que é onde a Academy
   escreve. Não tendo nem isso, qualquer uma que exista: um ebook em inglês é
   melhor do que um botão que não faz nada. */
export function edicaoPara(arquivos: ArquivoDoEbook[], idioma: Idioma): ArquivoDoEbook | null {
  return (
    arquivos.find((a) => a.idioma === idioma) ??
    arquivos.find((a) => a.idioma === "pt") ??
    arquivos[0] ??
    null
  );
}

/** As edições que existem, na ordem dos idiomas da plataforma. */
export function edicoes(arquivos: ArquivoDoEbook[]): ArquivoDoEbook[] {
  return IDIOMAS.map((l) => arquivos.find((a) => a.idioma === l)).filter(Boolean) as ArquivoDoEbook[];
}

export function tamanhoLegivel(bytes: number | null | undefined): string {
  const b = Number(bytes || 0);
  if (b <= 0) return "";
  const mb = b / (1024 * 1024);
  return mb < 1 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${mb < 10 ? mb.toFixed(1).replace(".", ",") : Math.round(mb)} MB`;
}

/** Slug a partir do título, para o endereço do ebook. */
export function slugDe(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
