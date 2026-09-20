"""Envolve com f() o texto em português dos e-mails.

O lib/email.ts é HTML dentro de template literal: a frase fica entre uma tag e
outra, ou entre uma tag e um ${...}. Este script acha essas frases, envolve
com o tradutor do e-mail e declara o tradutor no topo de cada função de envio.

Roda uma vez. Depois disso, frase nova em e-mail se escreve já com f("...").
"""

import importlib.util, io, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("i18n", os.path.join(RAIZ, "scripts", "i18n.py"))
i18n = importlib.util.module_from_spec(spec)
spec.loader.exec_module(i18n)

ALVO = os.path.join(RAIZ, "lib", "email.ts")

# Texto entre dois pedaços de HTML/expressão. O que está dentro de ${...} é
# código e fica de fora.
ENTRE = re.compile(r"(>|\})([^<>{}$`\"]{4,}?)(<|\$\{)")

def vale(t: str) -> str | None:
    limpo = re.sub(r"\s+", " ", t).strip()
    if len(limpo) < 4:
        return None
    if not re.search(r"[A-Za-zÀ-ÿ]{3}", limpo):
        return None
    # Precisa ter cara de português: acento, palavra de ligação ou ponto final.
    if not (re.search(r"[À-ÿ]", limpo) or i18n.PALAVRA_DE_GENTE.search(limpo) or re.search(r"[.!?]$", limpo)):
        return None
    return limpo

def envolver(texto: str, achadas: set) -> str:
    def troca(m):
        antes, corpo, depois = m.group(1), m.group(2), m.group(3)
        limpo = vale(corpo)
        if not limpo:
            return m.group(0)
        # "Olá${nome}! Seu acesso foi liberado" chega aqui partido, e o pedaço
        # começa com "!". Pontuação de emenda fica fora da chave: ela pertence
        # à frase anterior, e o tradutor não precisa adivinhar isso.
        emenda = re.match(r"^[!?.,:;]+\s*", limpo)
        if emenda:
            limpo = limpo[emenda.end():]
            if not vale(limpo):
                return m.group(0)
        achadas.add(limpo)
        pre = corpo[: len(corpo) - len(corpo.lstrip())] + (emenda.group(0) if emenda else "")
        pos = corpo[len(corpo.rstrip()):]
        return f'{antes}{pre}${{f({json.dumps(limpo, ensure_ascii=False)})}}{pos}{depois}'
    # Duas passadas: o fim de uma frase é o começo da busca da seguinte, e o
    # regex consome o delimitador.
    for _ in range(2):
        texto = ENTRE.sub(troca, texto)
    return texto

# Assunto e título: argumentos soltos na chamada de sendHtmlEmail e shell.
CHAMADA = re.compile(r'\b(sendHtmlEmail\(\s*to\s*,\s*|shell\(\s*)"((?:[^"\\]|\\.)+)"')

def envolver_chamadas(texto: str, achadas: set) -> str:
    def troca(m):
        limpo = vale(m.group(2))
        if not limpo:
            return m.group(0)
        achadas.add(limpo)
        return f'{m.group(1)}f({json.dumps(limpo, ensure_ascii=False)})'
    return CHAMADA.sub(troca, texto)

FUNCAO = re.compile(r"^export async function (send\w*Email|sendOrderNotice)\(", re.M)

def declarar_tradutor(texto: str) -> str:
    defs = list(FUNCAO.finditer(texto))
    for n in range(len(defs) - 1, -1, -1):
        m = defs[n]
        fim = defs[n + 1].start() if n + 1 < len(defs) else len(texto)
        corpo = texto[m.start():fim]
        if "f(" not in corpo or "const f = await tradutorDoEmail" in corpo:
            continue
        abre = i18n.abertura_do_corpo(texto, m.end() - 1, fim)
        if abre < 0:
            print("  ! nao achei o corpo de", m.group(1))
            continue
        # sendOrderNotice manda para a equipe, e a equipe le em portugues.
        destino = "adminTo" if m.group(1) == "sendOrderNotice" else "to"
        texto = texto[: abre + 1] + f"\n  const f = await tradutorDoEmail({destino});" + texto[abre + 1 :]
    return texto

if __name__ == "__main__":
    original = io.open(ALVO, encoding="utf-8").read()
    achadas = set()
    novo = envolver(original, achadas)
    novo = envolver_chamadas(novo, achadas)
    novo = declarar_tradutor(novo)
    if "lib/i18n/email" not in novo:
        novo = 'import { tradutorDoEmail } from "@/lib/i18n/email";\n' + novo
    if "--escrever" in sys.argv:
        io.open(ALVO, "w", encoding="utf-8", newline="\n").write(novo)
        json.dump({k: ["lib/email.ts"] for k in sorted(achadas)},
                  io.open(os.path.join(RAIZ, "lib", "i18n", "pendentes-email.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        print(f"{len(achadas)} frases, arquivo escrito")
    else:
        print(f"{len(achadas)} frases encontradas (use --escrever):")
        for a in sorted(achadas)[:40]:
            print("  -", a[:90])
