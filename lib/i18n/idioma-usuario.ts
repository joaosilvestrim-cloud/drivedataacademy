import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { idiomaValido, IDIOMA_PADRAO, type Idioma } from "./idioma";

/* O idioma da pessoa, guardado no perfil.

   O cookie resolve a tela: ele chega junto com a requisição e o servidor
   renderiza no idioma certo. Só que e-mail não tem cookie. Quando o pagamento
   confirma às três da manhã, não existe navegador nenhum na história.

   Por isso a escolha também vai para profiles.locale. A coluna já existia,
   com default 'pt', e estava sem uso: agora ela é o idioma da pessoa para
   tudo que acontece fora da tela. */

export const idiomaDoUsuario = cache(async (userId: string): Promise<Idioma> => {
  try {
    const { data } = await createAdminClient().from("profiles").select("locale").eq("id", userId).maybeSingle();
    return idiomaValido(data?.locale);
  } catch {
    return IDIOMA_PADRAO;
  }
});

/* Pelo e-mail, que é o que as funções de envio têm na mão.

   Sem perfil (lead que baixou um material, por exemplo) volta português, que
   é o idioma de quase todo mundo aqui. */
export const idiomaPorEmail = cache(async (email: string): Promise<Idioma> => {
  if (!email) return IDIOMA_PADRAO;
  try {
    const admin = createAdminClient();

    /* Primeiro a pergunta barata: alguém escolheu outro idioma?
       Hoje a turma é quase toda brasileira, então essa consulta volta vazia
       na maioria dos envios e o e-mail sai sem mais nenhuma ida ao banco. A
       lista de usuários, que é cara, só é buscada quando existe alguém para
       procurar. */
    const { data: perfis } = await admin.from("profiles").select("id, locale").in("locale", ["en", "es"]);
    if (!perfis?.length) return IDIOMA_PADRAO;

    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const alvo = data?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (!alvo) return IDIOMA_PADRAO;
    return idiomaValido(perfis.find((p) => p.id === alvo.id)?.locale);
  } catch {
    return IDIOMA_PADRAO;
  }
});

export async function guardarIdioma(userId: string, idioma: Idioma) {
  await createAdminClient().from("profiles").update({ locale: idioma }).eq("id", userId);
}
