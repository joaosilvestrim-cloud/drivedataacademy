/**
 * Categorias do seletor de ícones. Como o lucide-react não traz metadados de
 * categoria, classificamos por palavra-chave no NOME do ícone. É uma
 * conveniência — a busca cobre os 1700+ ícones independentemente da categoria.
 */
export interface CategoriaIcone {
  id: string;
  label: string;
  re: RegExp;
}

export const CATEGORIAS_ICONE: CategoriaIcone[] = [
  { id: "analytics", label: "Análises", re: /chart|graph|trend|activity|gauge|pie|bar|scatter|wave|signal|percent|analytics/ },
  { id: "sales", label: "Vendas", re: /cart|shopping|bag|tag|receipt|gift|store|package|truck|coins|ticket|badge/ },
  { id: "finance", label: "Finanças", re: /dollar|euro|pound|yen|coin|credit-card|wallet|bank|banknote|piggy|currency|landmark|hand-coins|calculator|vault/ },
  { id: "people", label: "Pessoas", re: /user|person|contact|smile|baby|accessibility|footprint|hand|group|people/ },
  { id: "communication", label: "Comunicação", re: /mail|message|send|inbox|bell|phone|at-sign|megaphone|rss|share|reply|voicemail|chat|speech/ },
  { id: "media", label: "Mídia", re: /image|video|music|film|camera|play|pause|volume|mic|headphone|speaker|podcast|clapperboard|disc|radio|photo|gallery/ },
  { id: "devices", label: "Dispositivos", re: /phone|smartphone|tablet|laptop|monitor|tv|watch|keyboard|mouse|printer|server|hard-drive|cpu|battery|plug|usb|webcam|router|screen/ },
  { id: "weather", label: "Clima", re: /cloud|sun|rain|snow|wind|storm|thermometer|umbrella|moon|droplet|tornado|rainbow|sunrise|sunset|haze/ },
  { id: "navigation", label: "Navegação", re: /map|navigation|compass|pin|route|milestone|locate|globe|flag|signpost|waypoint/ },
  { id: "time", label: "Tempo", re: /clock|calendar|timer|alarm|hourglass|watch|history|stopwatch|date/ },
  { id: "files", label: "Arquivos", re: /file|folder|paperclip|archive|clipboard|book|newspaper|scroll|save|notebook|sticky/ },
  { id: "arrows", label: "Setas", re: /arrow|chevron|corner|move|redo|undo|refresh|repeat|rotate|shuffle|expand|shrink|maximize|minimize|fold/ },
  { id: "editing", label: "Edição", re: /pen|pencil|edit|type|bold|italic|underline|highlighter|eraser|scissors|crop|brush|palette|paint|text|strikethrough|baseline/ },
  { id: "security", label: "Segurança", re: /lock|unlock|shield|key|fingerprint|eye|scan|verified|user-check|password/ },
  { id: "layout", label: "Layout", re: /layout|grid|column|rows|sidebar|panel|table|kanban|align|frame|dock|split/ },
  { id: "dev", label: "Dev", re: /code|terminal|git|bug|braces|brackets|binary|database|command|function|variable|hash|regex|webhook/ },
  { id: "shapes", label: "Formas", re: /square|circle|triangle|hexagon|octagon|pentagon|diamond|star|heart|shapes|spline|dot/ },
  { id: "nature", label: "Natureza", re: /leaf|tree|flower|sprout|bug|bird|fish|paw|mountain|flame|feather|snail|shell|clover|cat|dog|rabbit|turtle/ },
  { id: "food", label: "Comida", re: /coffee|pizza|apple|cake|utensils|cup|wine|beer|egg|carrot|cherry|croissant|ice-cream|sandwich|soup|salad|milk|donut|cookie|ham|fish|popcorn/ },
  { id: "transport", label: "Transporte", re: /car|truck|bus|bike|plane|train|ship|rocket|fuel|traffic|anchor|sailboat|tram|caravan|forklift/ },
  { id: "health", label: "Saúde", re: /heart-pulse|pill|stethoscope|syringe|cross|bandage|brain|bone|tooth|dna|hospital|ambulance|activity|accessibility/ },
  { id: "tools", label: "Ferramentas", re: /wrench|hammer|screwdriver|settings|cog|drill|axe|pickaxe|ruler|magnet|tool|gauge|construction/ },
  { id: "education", label: "Educação", re: /book|graduation|school|library|backpack|microscope|atom|calculator|flask|test-tube/ },
  { id: "social", label: "Social", re: /github|twitter|facebook|instagram|linkedin|youtube|slack|figma|chrome|thumbs|heart|smile|share/ },
];
