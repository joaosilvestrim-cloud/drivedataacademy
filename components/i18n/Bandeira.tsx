import type { Idioma } from "@/lib/i18n/idioma";

/* As bandeiras do seletor de idioma, desenhadas à mão.

   Por que não emoji: no Windows não existe fonte de bandeira, e 🇧🇷 aparece
   como as duas letras "BR". Metade da turma usa Windows, então o emoji
   resolveria só para a outra metade.

   Por que não imagem: são três ícones de 20 pixels que aparecem em toda tela.
   Em SVG eles vêm junto com o HTML, sem mais três requisições, e ficam
   nítidos em qualquer densidade de tela.

   O desenho é simplificado de propósito. Nesse tamanho, o brasão da Espanha e
   as 50 estrelas viram borrão; o que precisa sobreviver é o que identifica a
   bandeira de relance — as faixas, as cores e a forma do meio.

   Bandeira é país, não idioma: quem lê com leitor de tela ou passa o mouse
   recebe o nome do idioma, que é o dado verdadeiro.

   E o nome de cada idioma não se traduz: num seletor, "Português" é
   "Português" em qualquer tela, porque quem procura a própria língua procura
   pelo nome que conhece. */

const TITULO: Record<Idioma, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

function Brasil() {
  return (
    <>
      <rect width="21" height="15" rx="2" fill="#009B3A" />
      <path d="M10.5 1.9 19 7.5l-8.5 5.6L2 7.5z" fill="#FEDF00" />
      <circle cx="10.5" cy="7.5" r="3.1" fill="#002776" />
      {/* A faixa branca da esfera, cortada pelo círculo. */}
      <path d="M7.6 6.3a8 8 0 0 1 5.9 2.3" stroke="#fff" strokeWidth="1.1" fill="none" />
    </>
  );
}

function EstadosUnidos() {
  return (
    <>
      <rect width="21" height="15" rx="2" fill="#fff" />
      {/* Sete listras em vez de treze: a treze, neste tamanho, vira cinza. */}
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={i * 2.14} width="21" height="2.14" fill="#B22234" />
      ))}
      <rect width="9" height="8.6" fill="#3C3B6E" />
      {[
        [1.8, 1.8], [4.5, 1.8], [7.2, 1.8],
        [3.15, 3.6], [5.85, 3.6],
        [1.8, 5.4], [4.5, 5.4], [7.2, 5.4],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.62" fill="#fff" />
      ))}
    </>
  );
}

function Espanha() {
  return (
    <>
      <rect width="21" height="15" rx="2" fill="#AA151B" />
      <rect y="3.75" width="21" height="7.5" fill="#F1BF00" />
    </>
  );
}

const DESENHO: Record<Idioma, () => JSX.Element> = {
  pt: Brasil,
  en: EstadosUnidos,
  es: Espanha,
};

export default function Bandeira({ idioma, tamanho = 21 }: { idioma: Idioma; tamanho?: number }) {
  const Desenho = DESENHO[idioma];
  return (
    <svg
      viewBox="0 0 21 15"
      width={tamanho}
      height={Math.round((tamanho * 15) / 21)}
      role="img"
      aria-label={TITULO[idioma]}
      className="block shrink-0 rounded-[3px]"
    >
      <title>{TITULO[idioma]}</title>
      <Desenho />
      {/* Contorno de dentro: separa a bandeira do fundo escuro sem ocupar
          espaço, e dá conta do branco dos Estados Unidos encostando na borda. */}
      <rect x="0.4" y="0.4" width="20.2" height="14.2" rx="1.8" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="0.8" />
    </svg>
  );
}

export { TITULO as NOME_DA_BANDEIRA };
