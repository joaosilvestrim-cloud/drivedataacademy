# Design System — Academy

Direção **Instrumento**. A Academy mede conhecimento com evidência rastreável
que decai no tempo. A interface deve ser lida como um instrumento: cada número
aparece porque é possível dizer de onde ele veio.

Camada nova, adotada **por página**. As 76 páginas ainda não migradas continuam
funcionando com a escala Tailwind antiga.

---

## Regra da tipografia Mono

`IBM Plex Mono` é assinatura, não fonte de interface. Se virar padrão para todo
número, deixa de significar alguma coisa.

**Use Mono quando o número for uma medição:**

- métricas e indicadores (régua de dados)
- percentuais e scores (`68/100`, `33%`)
- valores e resultados
- carimbo de quando uma evidência entrou
- pontos por dimensão na Barra de Evidência
- frescor dentro do Halo
- IDs e códigos, quando precisarem ser lidos caractere a caractere

**Não use Mono para:**

- números dentro de texto corrido (`8 de 24 aulas concluídas`)
- contagens utilitárias (`3 votos`, `2 entregas`)
- horários de agenda e datas de navegação
- rótulos, eyebrows e cabeçalho de tabela
- qualquer texto que apenas contenha um número por acaso

Sempre acompanhe Mono de `tabular-nums` quando os dígitos se alinharem em coluna.

---

## Regra da iconografia

**Nenhum ícone sem função.** Não é "nenhum ícone".

Biblioteca única: `lucide-react`. Traço `1.75`. Três tamanhos, em `ICON`:
`sm 14` · `md 16` · `lg 18`.

**Use ícone quando ele melhorar:**

- reconhecimento (item de menu, tipo de conteúdo)
- escaneabilidade (varrer uma lista longa)
- orientação e navegação (seta que indica para onde a linha leva)
- estado (sucesso, atenção, erro, junto de texto)
- ação (direção do botão principal)

**Não use ícone para:**

- decorar título de seção
- preencher espaço em um componente
- repetir o que o rótulo ao lado já diz

Ícone decorativo leva `aria-hidden="true"`. Ícone que carrega significado
sozinho precisa de rótulo acessível.

---

## Tokens

| Grupo | Tokens |
| --- | --- |
| Superfície | `ds-bg` · `ds-surface` · `ds-raised` |
| Traço | `ds-line` · `ds-line-soft` |
| Texto | `ds-text` · `ds-text-2` · `ds-text-3` |
| Semântica | `ds-accent` (aprendizagem e evidência) · `ds-info` · `ds-attention` (decaimento) · `ds-danger` (só erro) |
| Foco | `--ds-focus` |
| Movimento | `--ds-dur-fast 140ms` · `--ds-dur 200ms` · `--ds-dur-slow 320ms` · `--ds-ease` |
| Camada | `--ds-z-sticky` · `--ds-z-nav` · `--ds-z-overlay` · `--ds-z-toast` |

Raio: `rounded-ctl` (4px, controles) e `rounded-srf` (10px, superfícies).
`rounded-full` fica reservado a avatar e pílula de status.

Sombra: só `shadow-overlay`, e só em sobreposição real. Superfície usa traço.

### Cor em canais, não em hexadecimal

Cada cor vive em duas variáveis: `--ds-accent-c: 52 232 160` (os canais) e
`--ds-accent: rgb(var(--ds-accent-c))` (a cor pronta). O Tailwind aponta para a
primeira, como `rgb(var(--ds-accent-c) / <alpha-value>)`.

Isso não é enfeite. Enquanto o token era hexadecimal, **toda classe com barra era
descartada em silêncio**: `bg-ds-raised/50`, `border-ds-accent/35` e outras onze
simplesmente não existiam no CSS gerado, sem erro de build e sem aviso. O hover
das linhas de tabela e o realce do cartão selecionado não apareciam por isso.

Regra: cor nova entra sempre como `--ds-x-c` em canais, mais o `--ds-x` pronto
para quem escreve CSS na mão. Nunca só o hexadecimal.

---

## Escala tipográfica

Nomeada por papel, nunca por tamanho.

| Token | Uso |
| --- | --- |
| `text-display` | Título de página em contexto de marca |
| `text-title` | Título de página no produto |
| `text-section` | Título de seção |
| `text-component` | Título de item em lista |
| `text-body` | Texto lido. **15px, peso normal** |
| `text-body-sm` | Apoio |
| `text-label` | Rótulo de campo e link de ação |
| `text-caption` | Descrição auxiliar |
| `text-meta` | Metadado e eyebrow. **Mínimo 12px** |
| `text-data` / `text-data-lg` | Número medido |

Peso: a maior parte do texto fica em `400`. `500` e `600` são exceção, no
máximo um elemento por bloco. O produto antigo tinha 895 usos de peso forte
contra 6 de normal.

---

## Card não é padrão

Antes de adicionar card, borda, fundo ou sombra, tente resolver com
agrupamento, alinhamento, espaço, régua, tipografia e contraste.

`Surface` tem três tons: `flat` é o caminho normal. `outlined` só quando o
bloco é uma unidade real de informação ou algo clicável. `raised` é exceção.

---

## Componentes

**Prontos:** Button · Surface · Divider · Badge · Status · Skeleton · Field ·
Input · Textarea · Select · Checkbox · Toggle · PageHeader · SectionHeader ·
EmptyState · ErrorState · Alert · TableWrap/Th/Td.

**Assinatura:** DataRule · EvidenceBar · FreshnessRing.

**Adiados de propósito:** Modal, Drawer, Tooltip, Dropdown, Tabs, Toast,
Pagination, Search, Filter, Breadcrumb. Ainda não existe padrão real
consolidado para eles no produto, e inventar a forma antes do uso produz
abstração especulativa. O segundo piloto no admin é quem vai revelar a forma
certa de tabela, filtro, busca e paginação.
