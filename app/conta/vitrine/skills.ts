/* O campo `skills` do perfil é texto livre separado por vírgula, preenchido
   pelo aluno ou pelo extrator de currículo. Aqui ele vira lista de etiquetas.

   "Power BI, SQL , power bi ;; Python" devolve ["Power BI", "SQL", "Python"]:
   tira espaço sobrando, aceita ponto e vírgula e barra como separador, descarta
   vazio e não repete quem escreveu a mesma coisa com outra caixa. */
export function listaSkills(raw: string | null | undefined): string[] {
  const vistas = new Set<string>();
  const fora: string[] = [];
  for (const parte of (raw || "").split(/[,;|/]/)) {
    const s = parte.trim().replace(/\s+/g, " ");
    if (!s) continue;
    const chave = s.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    fora.push(s);
  }
  return fora;
}
