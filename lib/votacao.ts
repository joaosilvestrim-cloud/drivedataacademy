import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Votação pública: o time pergunta, a turma escolhe. Serve para decidir tema
   das próximas lives, horário, formato. O link é aberto, o voto é por e-mail e
   cada pessoa vota uma vez em cada enquete. */

export type Votacao = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  max_choices: number;
  published: boolean;
  closes_at: string | null;
  allow_suggestion: boolean;
  show_results: boolean;
};

export type Opcao = { id: string; poll_id: string; label: string; description: string | null; position: number };
export type Voto = { email: string; name: string | null; options: string[]; suggestion: string | null; created_at: string };

export const CAMPOS_VOTACAO = "id, slug, title, description, max_choices, published, closes_at, allow_suggestion, show_results";

export function encerrada(v: Votacao, agora = Date.now()): boolean {
  return !!v.closes_at && new Date(v.closes_at).getTime() < agora;
}

export function aberta(v: Votacao, agora = Date.now()): boolean {
  return v.published && !encerrada(v, agora);
}

/* Carrega a enquete com as opções. Sem slug, pega a mais recente publicada,
   que é o destino do link curto /votacao. */
export async function carregarVotacao(admin: SupabaseClient, slug?: string | null) {
  const busca = admin.from("polls").select(CAMPOS_VOTACAO);
  const { data } = slug
    ? await busca.eq("slug", slug).maybeSingle()
    : await busca.eq("published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const votacao = (data as Votacao) || null;
  if (!votacao) return { votacao: null, opcoes: [] as Opcao[] };

  const { data: opcoes } = await admin
    .from("poll_options")
    .select("id, poll_id, label, description, position")
    .eq("poll_id", votacao.id)
    .order("position");

  return { votacao, opcoes: (opcoes ?? []) as Opcao[] };
}

/* Apuração. Voto guardado como lista de ids, então um id de opção apagada é
   simplesmente ignorado aqui. */
export function apurar(opcoes: Opcao[], votos: Voto[]) {
  const total: Record<string, number> = {};
  for (const o of opcoes) total[o.id] = 0;
  for (const v of votos) for (const id of v.options || []) if (id in total) total[id] += 1;

  const maior = Math.max(1, ...Object.values(total));
  return opcoes
    .map((o) => ({ ...o, votos: total[o.id], porcento: Math.round((total[o.id] / maior) * 100) }))
    .sort((a, b) => b.votos - a.votos || a.position - b.position);
}

export function slugDeTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
