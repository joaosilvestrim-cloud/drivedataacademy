/**
 * Modelo de cena do editor visual (canvas estruturado por componentes).
 * Um documento é o card (frame) + uma lista ordenada de elementos tipados,
 * posicionados em pixels dentro do card. A ordem do array é o z-index
 * (primeiro = atrás, último = na frente).
 */

export type ElementType =
  | "texto"
  | "kpi"
  | "forma"
  | "icone"
  | "linha"
  | "progresso"
  | "imagem"
  | "gauge"
  | "tendencia"
  | "badge"
  | "botao"
  | "pictograma"
  | "tabela"
  | "rating"
  | "sparkline"
  | "lista"
  | "divisorRotulo"
  | "velocimetro"
  | "bullet"
  | "termometro"
  | "donut"
  | "cartao"
  | "cardGauge"
  | "narrativo"
  | "comparativo"
  | "chip"
  | "filtros"
  | "funil"
  | "waffle"
  | "timeline"
  | "kpiCompleto"
  | "areaMini"
  | "anelKpi"
  | "comparaAB";

export type Direcao = "up" | "down" | "neutral";

// operadores das regras de cor condicional
export type OperadorCor = "<=" | "<" | ">=" | ">" | "=" | "entre";

export interface ColunaTabela {
  coluna: string; // referência DAX da coluna (ex.: "Vendas[Produto]")
  rotulo: string; // cabeçalho exibido
}

export type AnimacaoTipo =
  | "none"
  | "fade"
  | "slide"
  | "zoom"
  | "float"
  | "pulse"
  | "shimmer"
  | "bounce"
  | "swing"
  | "blink"
  | "rotateIn"
  | "wipe";

/** Conteúdo do elemento: fixo (literal) ou dinâmico (referência DAX). */
/** Preset de formatação numérica de uma medida dinâmica (gera FORMAT na DAX). */
export type FormatoNum = "auto" | "moeda" | "percent" | "percentPronto" | "milhar" | "inteiro" | "dec1" | "dec2" | "custom";

export interface Binding {
  dinamico: boolean;
  valor: string; // literal — usado no preview e quando fixo
  ref: string; // referência DAX (ex.: "[Faturamento]") quando dinâmico
  formato?: FormatoNum; // formatação do valor dinâmico (só onde é exibido como texto)
  mascara?: string; // máscara custom quando formato === "custom" (ex.: "#.##0,00")
}

export interface Estilo {
  cor: string; // cor do texto/ícone (ou preenchimento da barra de progresso)
  fundo: string; // cor de fundo do elemento (ou trilho do progresso); "transparent" permitido
  borderColor: string;
  borderWidth: number; // px
  borderRadius: number; // px
  sombra: number; // blur da sombra em px (0 = sem)
  opacidade: number; // 0..1
  fontSize: number; // px
  fontWeight: number; // 400..800
  fontFamily: string; // valor CSS sem aspas (ex.: "Arial,sans-serif"); "" = padrão
  uppercase: boolean; // text-transform: uppercase
  letterSpacing: number; // px
  glow: number; // text-shadow blur em px (0 = sem)
  rotation: number; // graus
  borderStyle: "solid" | "dashed" | "dotted";
  animarFill: boolean; // anima o preenchimento de progresso/gauge (0 -> valor)
  lineHeight: number; // multiplicador (1 = normal)
  padding: number; // px interno
  sombraColor: string; // cor da sombra
  align: "left" | "center" | "right"; // alinhamento horizontal
  alignV?: "start" | "center" | "end"; // alinhamento vertical (default center)
  espessura?: number; // medidores: espessura do arco/traço (px no viewBox)
  corValor?: string; // medidores: cor do texto do valor (independe da cor do arco)
  corTitulo?: string; // cartão: cor do título
  corIcone?: string; // cartão: cor do ícone
  iconeStroke?: number; // ícone: espessura do traço (peso) — default 2
}

export interface Animacao {
  tipo: AnimacaoTipo;
  duracao: number; // segundos
  delay: number; // segundos
}

export interface SceneElement {
  id: string;
  type: ElementType;
  nome: string; // vira o nome da VAR na DAX
  x: number;
  y: number;
  w: number;
  h: number;
  visivel: boolean;
  bloqueado?: boolean; // trava posição/tamanho no canvas
  grupo?: string; // id do grupo (elementos do mesmo grupo selecionam/movem juntos)
  direcao?: Direcao; // elemento tendência: seta para cima/baixo/neutro
  contain?: boolean; // imagem: object-fit contain (true) ou cover (false)
  href?: string; // botão: URL para abrir (target _blank)
  quantidade?: number; // pictograma: quantos ícones
  iconeNome?: string; // pictograma/lista/cartão: nome do ícone secundário
  iconeNomePaths?: string; // pictograma/lista/cartão: miolo do <svg> do iconeNome (biblioteca grande)
  iconePaths?: string; // ícone: miolo do <svg> (paths) do ícone escolhido (biblioteca grande)
  tabela?: string; // tabela: nome da tabela do Power BI
  colunas?: ColunaTabela[]; // tabela: colunas configuradas
  barras?: number[]; // sparkline: alturas das barras (0..100)
  itens?: string[]; // lista/timeline: linhas de texto / rótulos das etapas
  etapas?: { rotulo: string; valor: number }[]; // funil: etapas fixas (nome + valor)
  orientacao?: "h" | "v"; // timeline: horizontal ou vertical
  formato?: "anel" | "semi"; // donut/anelKpi: anel completo ou meio-gauge (semicírculo)
  mostrarConversao?: boolean; // funil: mostra a % de conversão entre etapas
  titulo?: string; // cartão: texto do título
  maximo?: number; // velocímetro/bullet/termômetro: valor máximo da escala
  faixas?: { ate: number; cor: string }[]; // velocímetro/termômetro: faixas de cor (verde/amarelo/vermelho) por limite superior
  corCond?: {
    ativo: boolean;
    ref: string; // medida DAX avaliada (vazio = usa o binding.ref do elemento)
    // cada regra tem um operador; a última (sem op) é o "senão".
    // op ausente = "<=" (compatibilidade com docs antigos). "entre" usa ate..ate2.
    regras: { ate: number; ate2?: number; op?: OperadorCor; cor: string }[];
  }; // cor condicional: a cor principal muda conforme o valor (SWITCH na DAX)
  // medidas extras (além da principal): usadas por Texto narrativo e Card
  // comparativo. Cada uma vira o placeholder {{id__chave}} → uma VAR na DAX.
  medidas?: { chave: string; rotulo?: string; cor?: string; binding: Binding }[];
  binding: Binding; // texto/kpi/icone/progresso usam; forma/linha ignoram
  estilo: Estilo;
  animacao: Animacao;
}

export interface CardFrame {
  w: number;
  h: number;
  fundo: string; // fundo do card (sólido ou gradiente CSS)
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  sombra: number; // blur da sombra do card (0 = sem)
}

/** Tokens de tipografia do tema (design system do documento). */
export interface TemaDoc {
  fonte: string; // fontFamily padrão (valor CSS sem aspas); "" = padrão
  tamTitulo: number;
  tamSubtitulo: number;
  tamCorpo: number;
  corTexto: string; // cor de texto principal (legível no fundo do tema)
  corTextoFraco: string; // cor de texto secundário/legenda
}

/** Uma página (lado) do card: nome + sua própria cena de elementos. */
export interface Pagina {
  id: string;
  nome: string;
  elements: SceneElement[];
}

export type TransicaoTipo = "none" | "flip" | "fade" | "slide";

/** Como as páginas se sucedem no visual final (renderizado em CSS). */
export interface Transicao {
  tipo: TransicaoTipo;
  duracao: number; // segundos da animação de virada/fade
  intervalo: number; // segundos que cada página fica visível (modo automático)
  auto: boolean; // flip: vira sozinho (true) ou no hover (false)
}

export interface VisualDocument {
  nome: string; // base do nome da medida
  card: CardFrame;
  paleta: string[]; // paleta de cores do documento (swatches)
  tema: TemaDoc; // tipografia padrão (design system)
  paginas: Pagina[]; // páginas/lados do card (>= 1)
  transicao: Transicao; // transição entre páginas
  /** @deprecated mantido só para migração de documentos antigos */
  elements?: SceneElement[];
}
