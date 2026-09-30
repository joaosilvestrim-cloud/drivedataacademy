/* O texto de uma mensagem da comunidade, com o mínimo de formatação:

   - endereço (https://...) vira link clicável, abrindo em outra aba;
   - **trecho** vira negrito, para títulos curtos dentro de um aviso;
   - quebras de linha são mantidas pelo whitespace-pre-line de quem usa.

   Nada de HTML vindo do aluno: tudo é texto montado em elementos React, então
   não há como injetar marcação. Sem hooks, serve em tela de servidor e de
   cliente. */

const PADRAO = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])|(\*\*[^*\n]{1,120}\*\*)/g;

export default function CorpoDaMensagem({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  let i = 0;
  for (const m of texto.matchAll(PADRAO)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio));
    if (m[1]) {
      partes.push(
        <a key={i++} href={m[1]} target="_blank" rel="noopener noreferrer" className="break-all text-acento underline decoration-acento/40 underline-offset-2 hover:decoration-acento">
          {m[1].replace(/^https?:\/\//, "")}
        </a>,
      );
    } else if (m[2]) {
      partes.push(
        <strong key={i++} className="font-semibold text-tinta">
          {m[2].slice(2, -2)}
        </strong>,
      );
    }
    ultimo = inicio + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return <>{partes}</>;
}
