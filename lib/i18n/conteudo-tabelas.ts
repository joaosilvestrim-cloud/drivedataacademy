/* Quais tabelas e campos do banco valem a pena traduzir.

   Arquivo puro de propósito: o mapa é lido pela tela do admin, pelas telas do
   aluno e pelo script que traduz em lote, e esse último roda fora do Next.
   Se o mapa morasse junto do código que fala com o Supabase, o script não
   conseguiria importá-lo sem arrastar o "server-only" junto. */

export const TRADUZIVEIS = {
  courses: ["title", "subtitle", "description", "level"],
  course_modules: ["title"],
  lessons: ["title", "content"],
  live_events: ["title", "description"],
  materials: ["title", "subtitle", "description", "cta_text"],
  forum_channels: ["name", "description"],
  posts: ["title", "excerpt", "category", "content"],
  ebooks: ["title", "subtitle", "description"],
} as const;

export type TabelaTraduzivel = keyof typeof TRADUZIVEIS;
