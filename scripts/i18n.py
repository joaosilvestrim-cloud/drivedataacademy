"""Traduz a interface da Academy para inglês e espanhol.

Três etapas, cada uma conferível sozinha:

  python scripts/i18n.py --extrair <telas.tsx...>  lista as frases em português
  python scripts/i18n.py --extrair-campos <.ts>    o mesmo, para arquivo de dados
  python scripts/i18n.py --traduzir                traduz as pendentes (Groq)
  python scripts/i18n.py --aplicar <arquivos...>   envolve as frases com tr()

Por que pelo próprio português como chave: quem abre o componente continua
lendo a frase inteira, e frase sem tradução cai no português em vez de sumir.

O --aplicar mexe em código, então é conservador de propósito: só troca texto
puro entre tags e os atributos de texto visível (placeholder, title,
aria-label). Qualquer coisa com chave, expressão, número solto ou tag dentro
fica como está, para ser feita à mão.
"""

import json, os, re, sys, time, urllib.request, urllib.error

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GERADAS = os.path.join(RAIZ, "lib", "i18n", "frases-geradas.ts")
PENDENTES = os.path.join(RAIZ, "lib", "i18n", "frases-pendentes.json")

def env():
    valores = {}
    for linha in open(os.path.join(RAIZ, ".env.local"), encoding="utf-8"):
        if "=" in linha and not linha.startswith("#"):
            k, v = linha.split("=", 1)
            valores[k.strip()] = v.strip().strip('"')
    return valores

ENV = env()
GROQ = ENV.get("GROQ_API_KEY", "")
MODELO = ENV.get("GROQ_MODEL") or "openai/gpt-oss-120b"

GLOSSARIO = (
    "This is a Brazilian data/BI school (DriveData Academy). Keep product and brand names exactly: "
    "Power BI, DAX, SQL, Power Query, Excel, Oracle, Protheus, Snowflake, Fabric, Figma, DriveCanvas, DataFlow Lab, "
    "Decision Lab, Knowledge Universe, Raio-X do Dashboard, Arena SQL, Forja DAX, Caixa-Preta, DriveData, Academy, Pix. "
    "UI terms: aluno = student / alumno; assinatura = subscription / suscripción; aula = lesson / clase; "
    "curso = course / curso; trilha = track / ruta; desafio = challenge / desafío; gravação = recording / grabación; "
    "ao vivo = live / en vivo; comunidade = community / comunidad; certificado = certificate / certificado; "
    "ferramenta = tool / herramienta; painel = dashboard / panel; vitrine = directory / directorio. "
    "Tone: direct, warm, no corporate jargon, same sentence length. Keep punctuation, emoji and leading/trailing spaces."
)

# ------------------------------------------------------------------ extração
# Texto puro entre tags: <p ...>Texto</p>, sem { } < > dentro.
TEXTO_TAG = re.compile(r">(\s*[^<>{}\n][^<>{}]*?)<", re.S)
# Atributos que aparecem para quem usa.
ATRIBUTO = re.compile(r'\b(placeholder|title|aria-label|alt|label|rotulo|lede|context|description)="([^"{}\n]{2,})"')

def normalizar(t: str) -> str:
    """No JSX, quebra de linha e recuo viram um espaço só na tela. A chave do
    dicionário segue a mesma regra, senão a mesma frase entra duas vezes."""
    return re.sub(r"\s+", " ", t).strip()

# Frase que não é frase: código, classe, símbolo, número.
def texto_valido(t: str) -> bool:
    limpo = normalizar(t)
    if len(limpo) < 2 or len(limpo) > 400:
        return False
    if not re.search(r"[A-Za-zÀ-ÿ]{2}", limpo):
        return False
    # sinais de que é código e não fala humana
    CODIGO = r"""(className|https?://|[{}<>$`"[\]]|=>|===|!==|\|\||&&|\(\)|\.length|\)\s*:|\?\s*\(\s*$|\.\w+\(|eslint|;\s*$|;\s*[})]|\breturn\b|\bconst\b|\bfunction\b|/\*|\*/)"""
    if re.search(CODIGO, limpo):
        return False
    if re.fullmatch(r"[\d\s.,:%/-]+", limpo):
        return False
    # precisa de ao menos uma letra acentuada, uma palavra comum em português
    # ou duas palavras: evita capturar "id", "ok", "sm", "px-2"
    if re.search(r"[À-ÿ]", limpo):
        return True
    comuns = r"\b(o|a|os|as|um|uma|de|do|da|em|no|na|para|por|com|que|seu|sua|você|voce|não|nao|mais|já|ja|ver|abrir|salvar|enviar|criar|buscar|copiar|aluno|curso|aula|live|conta|e|ou)\b"
    if re.search(comuns, limpo, re.I) or len(limpo.split()) >= 2:
        return True
    # Palavra sozinha em botão: "Conferir", "Publicar", "Fechar". Vale se for
    # palavra mesmo (só letras, 4 ou mais) e não sigla técnica em caixa alta,
    # que fica igual nos três idiomas: DAX, SQL, CSV.
    return bool(re.fullmatch(r"[A-Za-zÀ-ÿ]{4,}", limpo)) and limpo != limpo.upper()

# Conteúdo que mora em arquivo de dados (.ts), não em tela: os verbetes da
# Biblioteca, os desafios do Dojo, as dicas do mascote. Aqui a frase não está
# entre tags, está num campo do objeto. O tr() entra depois, no componente que
# mostra o campo, então este modo só junta as frases para traduzir.
CAMPO = re.compile(
    r'\b(titulo|subtitulo|quando|explicacao|armadilha|enunciado|dica|porque|recado|'
    r'nome|descricao|resumo|texto|rotulo|pergunta|resposta|legenda|acao|final)\s*:\s*"((?:[^"\\]|\\.)*)"'
)

def extrair_campos(caminhos):
    achadas = {}
    for c in caminhos:
        texto = open(c, encoding="utf-8").read()
        for m in CAMPO.finditer(texto):
            try:
                valor = json.loads('"' + m.group(2) + '"')
            except json.JSONDecodeError:
                continue
            if texto_valido(valor):
                achadas.setdefault(normalizar(valor), []).append(os.path.relpath(c, RAIZ))
    return achadas

# Frase que mora numa constante da própria tela: o mapa de rótulos no topo do
# arquivo, o texto de um estado vazio. Não está entre tags nem num atributo,
# então só entra na lista para traduzir; o tr() vai à mão no lugar que usa.
LITERAL = re.compile(
    r'(?:(\w+)\s*:\s*'                                   # campo de objeto
    r'|\b(?:const|let|var)\s+\w+(?:\s*:[^=\n]*)?\s*=\s*)'  # constante do arquivo
    r'"((?:[^"\\\n]|\\.){4,})"'
)

# Campos cujo valor é endereço, classe ou apelido de busca: parecem frase, mas
# traduzir quebra o link ou o atalho.
CHAVE_TECNICA = {
    "busca", "href", "src", "icon", "className", "id", "key", "type", "role",
    "slug", "chave", "path", "d", "viewBox", "fill", "stroke", "name", "value",
}

def extrair(caminhos):
    achadas = {}
    for c in caminhos:
        texto = open(c, encoding="utf-8").read()
        for m in TEXTO_TAG.finditer(texto):
            t = m.group(1)
            if texto_valido(t):
                achadas.setdefault(normalizar(t), []).append(os.path.relpath(c, RAIZ))
        for m in ATRIBUTO.finditer(texto):
            t = m.group(2)
            if texto_valido(t):
                achadas.setdefault(normalizar(t), []).append(os.path.relpath(c, RAIZ))
    return achadas

PALAVRA_DE_GENTE = re.compile(
    r"\b(o|a|os|as|um|uma|de|do|da|dos|das|em|no|na|nos|nas|ao|à|para|por|com|sem|que|se|"
    r"seu|sua|você|não|mais|já|quando|onde|como|aqui|ainda|só|também|entre|sobre)\b",
    re.I,
)
SVG = re.compile(r"^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$")

def frase_de_gente(t: str) -> bool:
    """Um literal solto no meio do código é quase sempre rota, classe, slug ou
    desenho de ícone. Frase para ler tem espaço e tem cara de português: acento,
    palavra de ligação ou ponto final. O resto fica de fora."""
    if " " not in t or t.startswith("/") or SVG.match(t):
        return False
    return bool(re.search(r"[À-ÿ]", t) or PALAVRA_DE_GENTE.search(t) or re.search(r"[.?!]$", t))

def extrair_literais(caminhos):
    achadas = {}
    for c in caminhos:
        texto = open(c, encoding="utf-8").read()
        for m in LITERAL.finditer(texto):
            if m.group(1) in CHAVE_TECNICA:
                continue
            try:
                valor = json.loads('"' + m.group(2) + '"')
            except json.JSONDecodeError:
                continue
            if texto_valido(valor) and frase_de_gente(normalizar(valor)):
                achadas.setdefault(normalizar(valor), []).append(os.path.relpath(c, RAIZ))
    return achadas

def aplicar_literais(caminhos, mapa):
    """Envolve com tr() a frase que está numa constante, e não entre tags.

    Só onde o tr existe: em tela de servidor ele é import e vale no arquivo
    inteiro; em tela de navegador é hook, então vale dentro do componente. O
    que ficar de fora é listado, para resolver à mão."""
    for c in caminhos:
        texto = open(c, encoding="utf-8").read()
        cliente = texto.lstrip().startswith('"use client"')
        trocas = 0
        pendente = []

        # Onde cada componente começa e termina, para saber se o tr alcança.
        # Aqui o corpo é medido de chave a chave, e não até a próxima função:
        # entre um componente e o seguinte costuma haver constante de módulo,
        # onde o tr do hook ainda não existe.
        faixas = []
        for d in DEFINICAO.finditer(texto):
            nome = d.group(1) or d.group(2)
            abre = abertura_do_corpo(texto, d.end() - 1, len(texto))
            if abre < 0:
                continue
            faixas.append((abre, fim_do_bloco(texto, abre), bool(nome[:1].isupper())))

        def dentro_de_componente(pos):
            return any(ini < pos < fim and comp for ini, fim, comp in faixas)

        def troca(m):
            nonlocal trocas
            if m.group(1) in CHAVE_TECNICA:
                return m.group(0)
            try:
                valor = json.loads('"' + m.group(2) + '"')
            except json.JSONDecodeError:
                return m.group(0)
            chave = normalizar(valor)
            if chave not in mapa:
                return m.group(0)
            if cliente and not dentro_de_componente(m.start()):
                pendente.append(chave)
                return m.group(0)
            trocas += 1
            prefixo = m.group(0)[: m.group(0).index('"')]
            return f"{prefixo}tr({json.dumps(chave, ensure_ascii=False)})"

        texto = LITERAL.sub(troca, texto)
        if pendente:
            print(f"      ! {os.path.relpath(c, RAIZ)}: fora de componente, à mão: {len(pendente)}")
            for p in pendente[:4]:
                print(f"          {p[:70]}")
        if not trocas:
            continue
        if cliente:
            texto = ligar_hook(texto, os.path.relpath(c, RAIZ))
        elif "traduzir-servidor" not in texto:
            texto = 'import { tr } from "@/lib/i18n/traduzir-servidor";\n' + texto
        open(c, "w", encoding="utf-8", newline="\n").write(texto)
        print(f"   {os.path.relpath(c, RAIZ)}: {trocas}")

# ------------------------------------------------------------------ tradução
def http(url, dados, cabecalhos, tentativas=6):
    for n in range(tentativas):
        req = urllib.request.Request(url, dados, {"User-Agent": "curl/8", **cabecalhos}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            corpo = e.read().decode("utf-8", "ignore")[:300]
            if e.code in (429, 500, 502, 503) and n < tentativas - 1:
                espera = float(e.headers.get("retry-after") or 0) or min(90, 12 * (n + 1))
                print(f"   limite do servidor ({e.code}), esperando {int(espera)}s")
                time.sleep(espera)
                continue
            raise RuntimeError(f"HTTP {e.code}: {corpo}")
        except urllib.error.URLError:
            if n < tentativas - 1:
                time.sleep(8)
                continue
            raise

def traduzir_lote(frases, idioma_nome):
    entrada = "\n".join(f"{i+1}|{f}" for i, f in enumerate(frases))
    pedido = (
        f"Translate these Brazilian Portuguese UI strings into {idioma_nome}.\n"
        "Each line is 'number|text'. Reply with the same numbered lines as 'number|translation', exactly one per input "
        "line, nothing else. Never merge or split lines. Keep it as short as the original: it goes in buttons and labels.\n"
        f"{GLOSSARIO}\n\n{entrada}"
    )
    r = http("https://api.groq.com/openai/v1/chat/completions",
             json.dumps({"model": MODELO, "temperature": 0.2, "reasoning_effort": "low",
                         "max_completion_tokens": 8000,
                         "messages": [{"role": "user", "content": pedido}]}).encode(),
             {"Authorization": "Bearer " + GROQ, "Content-Type": "application/json"})
    saida = r["choices"][0]["message"].get("content") or ""
    voltou = {}
    for m in re.finditer(r"^\s*(\d+)\s*\|\s*(.+?)\s*$", saida, re.M):
        i = int(m.group(1)) - 1
        if 0 <= i < len(frases) and m.group(2):
            voltou[frases[i]] = m.group(2)
    return voltou

def carregar_geradas():
    texto = open(GERADAS, encoding="utf-8").read()
    # o primeiro "{" do arquivo é o do tipo (Record<string, { en... }>), não o
    # do dicionário: o que interessa começa depois do "=".
    corte = texto.find("= {")
    i, j = (corte + 2 if corte >= 0 else -1), texto.rfind("}")
    if i < 0 or j <= i:
        return {}
    try:
        return json.loads(texto[i:j + 1])
    except json.JSONDecodeError:
        return {}

def gravar_geradas(mapa):
    corpo = json.dumps(mapa, ensure_ascii=False, indent=2, sort_keys=True)
    with open(GERADAS, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* Gerado por scripts/i18n.py. Não edite à mão: correção revisada entra em\n")
        f.write("   CORRECOES, dentro de lib/i18n/frases.ts. */\n")
        f.write("export const GERADAS: Record<string, { en: string; es: string }> = ")
        f.write(corpo)
        f.write(";\n")

def traduzir():
    pendentes = json.load(open(PENDENTES, encoding="utf-8")) if os.path.exists(PENDENTES) else {}
    mapa = carregar_geradas()
    faltam = [f for f in pendentes if f not in mapa]
    print(f"{len(faltam)} frases novas de {len(pendentes)} extraídas")
    lote = 25
    for k in range(0, len(faltam), lote):
        pedaco = faltam[k:k + lote]
        for sigla, nome in (("en", "English"), ("es", "Latin American Spanish")):
            tentativa = 0
            while True:
                voltou = traduzir_lote(pedaco, nome)
                faltando = [f for f in pedaco if f not in voltou]
                for f, t in voltou.items():
                    mapa.setdefault(f, {"en": "", "es": ""})[sigla] = t
                if not faltando or tentativa >= 2:
                    for f in faltando:
                        mapa.setdefault(f, {"en": "", "es": ""})[sigla] = f  # fica no português
                    break
                pedaco_falta = faltando
                tentativa += 1
                time.sleep(4)
                voltou2 = traduzir_lote(pedaco_falta, nome)
                for f, t in voltou2.items():
                    mapa.setdefault(f, {"en": "", "es": ""})[sigla] = t
                if all(f in mapa and mapa[f].get(sigla) for f in pedaco):
                    break
            time.sleep(2)
        gravar_geradas(mapa)
        print(f"   {min(k + lote, len(faltam))}/{len(faltam)}")
    gravar_geradas(mapa)

# ------------------------------------------------------------------ aplicação
# Um arquivo de navegador costuma ter vários componentes, e o hook vale por
# componente. Para achá-los sem escrever um parser: componente de verdade é
# declarado na margem do arquivo, coluna zero. O que está indentado é função
# de dentro (um onClick, um map) e enxerga o tr do componente que a contém.
DEFINICAO = re.compile(
    r"^(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_]\w*)\s*[(<]"
    r"|^(?:export\s+)?(?:const|let)\s+([A-Za-z_]\w*)\s*(?::[^=\n]*)?=\s*(?:async\s*)?[(<]",
    re.M,
)

def ligar_hook(texto: str, nome_arquivo: str) -> str:
    if "usarTraducao" not in texto:
        texto = re.sub(r'("use client";\n)',
                       r'\1\nimport { usarTraducao } from "@/lib/i18n/usarTraducao";\n',
                       texto, count=1)

    # De trás para frente, para as inserções não moverem as posições seguintes.
    defs = list(DEFINICAO.finditer(texto))
    for n in range(len(defs) - 1, -1, -1):
        m = defs[n]
        nome = m.group(1) or m.group(2)
        corpo_ate = defs[n + 1].start() if n + 1 < len(defs) else len(texto)
        corpo = texto[m.start():corpo_ate]
        if "tr(" not in corpo or "const tr = usarTraducao();" in corpo:
            continue
        if not nome[:1].isupper():
            print(f"      ! {nome_arquivo}: {nome}() usa tr() mas não é componente, resolva à mão")
            continue
        abre = abertura_do_corpo(texto, m.end() - 1, corpo_ate)
        if abre < 0:
            print(f"      ! {nome_arquivo}: não achei o corpo de {nome}(), resolva à mão")
            continue
        texto = texto[:abre + 1] + "\n  const tr = usarTraducao();" + texto[abre + 1:]
    return texto

def fim_do_bloco(texto: str, abre: int) -> int:
    """A chave que fecha o bloco aberto em `abre`, pulando texto entre aspas.

    Não é um parser de JavaScript: só conta chaves e ignora o que está dentro
    de aspas, que é onde mora quase toda chave solta. Basta para dizer se uma
    linha está dentro de um componente ou solta no arquivo."""
    nivel = 0
    i = abre
    while i < len(texto):
        c = texto[i]
        if c in "\"'`":
            fecha = c
            i += 1
            while i < len(texto) and texto[i] != fecha:
                i += 2 if texto[i] == "\\" else 1
        elif c == "{":
            nivel += 1
        elif c == "}":
            nivel -= 1
            if nivel == 0:
                return i
        i += 1
    return len(texto)

def abertura_do_corpo(texto: str, desde: int, limite: int) -> int:
    """A chave que abre o corpo da função, e não a do parâmetro desestruturado.

    `function Painel({ aluno }: Props) {` tem duas chaves antes do corpo. O
    jeito de não errar é pular a lista de parâmetros contando parênteses."""
    abre_par = texto.find("(", desde, limite)
    if abre_par < 0:
        return -1
    nivel = 0
    i = abre_par
    while i < limite:
        if texto[i] == "(":
            nivel += 1
        elif texto[i] == ")":
            nivel -= 1
            if nivel == 0:
                break
        i += 1
    else:
        return -1
    # depois do último parêntese ainda pode vir `: Tipo` e `=>` antes do corpo
    resto = texto[i + 1:limite]
    m = re.match(r"[^{;=<>]*(?:=>)?\s*\{", resto, re.S)
    return i + 1 + m.end() - 1 if m else -1

def aplicar(caminhos, mapa):
    for c in caminhos:
        texto = open(c, encoding="utf-8").read()
        cliente = texto.lstrip().startswith('"use client"')
        original = texto
        trocas = 0

        def troca_tag(m):
            nonlocal trocas
            bruto = m.group(1)
            chave = normalizar(bruto)
            if chave not in mapa:
                return m.group(0)
            trocas += 1
            antes = bruto[: len(bruto) - len(bruto.lstrip())]
            depois = bruto[len(bruto.rstrip()):]
            return f">{antes}{{tr({json.dumps(chave, ensure_ascii=False)})}}{depois}<"

        texto = TEXTO_TAG.sub(troca_tag, texto)

        def troca_attr(m):
            nonlocal trocas
            nome, valor = m.group(1), m.group(2)
            chave = normalizar(valor)
            if chave not in mapa:
                return m.group(0)
            trocas += 1
            return f"{nome}={{tr({json.dumps(chave, ensure_ascii=False)})}}"

        texto = ATRIBUTO.sub(troca_attr, texto)

        if not trocas:
            continue

        # No servidor o tr sai do cookie da requisição, então basta importar.
        # No navegador ele vem do contexto, que é por render: cada componente
        # do arquivo precisa da sua linha `const tr = usarTraducao()`.
        if cliente:
            texto = ligar_hook(texto, os.path.relpath(c, RAIZ))
        else:
            if "traduzir-servidor" not in texto:
                texto = 'import { tr } from "@/lib/i18n/traduzir-servidor";\n' + texto

        open(c, "w", encoding="utf-8", newline="\n").write(texto)
        print(f"   {os.path.relpath(c, RAIZ)}: {trocas}")
        if texto == original:
            print("      (sem mudança)")

if __name__ == "__main__":
    args = sys.argv[1:]
    if "--extrair" in args or "--extrair-campos" in args:
        campos = "--extrair-campos" in args
        alvos = [a for a in args if a.endswith(".tsx") or (campos and a.endswith(".ts"))]
        achadas = extrair_campos(alvos) if campos else extrair(alvos)
        antigas = json.load(open(PENDENTES, encoding="utf-8")) if os.path.exists(PENDENTES) else {}
        antigas.update({k: sorted(set(v)) for k, v in achadas.items()})
        json.dump(antigas, open(PENDENTES, "w", encoding="utf-8"), ensure_ascii=False, indent=2, sort_keys=True)
        print(f"{len(achadas)} frases neste lote, {len(antigas)} no total")
    elif "--traduzir" in args:
        if not GROQ:
            sys.exit("GROQ_API_KEY vazia no .env.local")
        traduzir()
    elif "--aplicar" in args:
        alvos = [a for a in args if a.endswith(".tsx")]
        aplicar(alvos, carregar_geradas())
    else:
        print(__doc__)
