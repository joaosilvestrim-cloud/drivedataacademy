"""Encaixe para traduzir legenda sem modelo externo.

O Whisper transcreve e gera o pt.vtt. A tradução quem faz é o Claude, aqui no
chat. Este script só cuida da parte mecânica, que é onde dá erro quando é na
mão: casar cada frase com o tempo dela e não perder nenhuma linha.

    --extrair <pasta>                 escreve pt.txt, uma legenda por linha
    --aplicar <pasta> <sigla> <txt>   monta <sigla>.vtt com os tempos do pt.vtt
    --pendentes                       lista o que tem pt.vtt e falta traduzir

O pt.txt sai numerado. O arquivo de tradução volta no mesmo formato, mesma
quantidade de linhas, mesmos números. Se faltar ou sobrar linha, o --aplicar
recusa e diz quais, em vez de gravar um vtt torto que só aparece na aula.

Legenda de duas linhas vira uma só no pt.txt, com " / " no lugar da quebra. A
quebra é decisão de layout, não de texto, e o --aplicar refaz sozinho.
"""

import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "legendas")


def ler_vtt(caminho):
    """Devolve [(tempo, texto)] na ordem do arquivo."""
    blocos = []
    atual = None
    for linha in open(caminho, encoding="utf-8"):
        linha = linha.rstrip("\n")
        if "-->" in linha:
            atual = [linha, []]
            blocos.append(atual)
        elif atual is not None and linha.strip():
            atual[1].append(linha)
        elif not linha.strip():
            atual = None
    return [(t, " / ".join(ls)) for t, ls in blocos]


def quebrar_linhas(texto, largura=42):
    """Mesma regra do legendas.py: até 2 linhas, cortando perto do meio."""
    texto = " ".join(texto.split())
    if len(texto) <= largura:
        return texto
    meio = len(texto) // 2
    espacos = [i for i, c in enumerate(texto) if c == " "]
    if not espacos:
        return texto
    corte = min(espacos, key=lambda i: abs(i - meio))
    return texto[:corte] + "\n" + texto[corte + 1:]


def extrair(pasta):
    origem = os.path.join(pasta, "pt.vtt")
    if not os.path.exists(origem):
        sys.exit(f"não achei {origem}")
    blocos = ler_vtt(origem)
    destino = os.path.join(pasta, "pt.txt")
    with open(destino, "w", encoding="utf-8", newline="\n") as f:
        for i, (_, texto) in enumerate(blocos, 1):
            f.write(f"{i}|{texto}\n")
    print(f"{destino}: {len(blocos)} legendas")


def aplicar(pasta, sigla, arquivo):
    blocos = ler_vtt(os.path.join(pasta, "pt.vtt"))
    traduzidas = {}
    for linha in open(arquivo, encoding="utf-8"):
        m = re.match(r"^\s*(\d+)\s*\|\s*(.*?)\s*$", linha)
        if m and m.group(2):
            traduzidas[int(m.group(1))] = m.group(2)

    # Linha com "-" sai do vtt. O Whisper inventa frase em cima de silêncio, do
    # tipo "Acompanhe o vídeo para saber mais sobre o DriveCanvas" no meio de
    # uma aula de Snowflake. Traduzir isso seria carimbar a invenção em mais
    # dois idiomas; melhor a legenda não existir naquele segundo.
    cortadas = {i for i, t in traduzidas.items() if t.strip() == "-"}
    for i in cortadas:
        del traduzidas[i]

    faltam = [i for i in range(1, len(blocos) + 1) if i not in traduzidas and i not in cortadas]
    sobram = [i for i in traduzidas if i > len(blocos)]
    if faltam or sobram:
        recado = []
        if faltam:
            recado.append(f"faltam as linhas {faltam[:20]}{' ...' if len(faltam) > 20 else ''}")
        if sobram:
            recado.append(f"sobram as linhas {sobram[:20]}")
        sys.exit(f"{arquivo}: " + "; ".join(recado) + f" (o pt.vtt tem {len(blocos)})")

    destino = os.path.join(pasta, f"{sigla}.vtt")
    saiu = 0
    with open(destino, "w", encoding="utf-8", newline="\n") as f:
        f.write("WEBVTT\n\n")
        for i, (tempo, _) in enumerate(blocos, 1):
            if i in cortadas:
                continue
            saiu += 1
            f.write(f"{saiu}\n{tempo}\n{quebrar_linhas(traduzidas[i])}\n\n")
    print(f"{destino}: {saiu} legendas" + (f", {len(cortadas)} cortadas" if cortadas else ""))


def pendentes():
    import json
    total = 0
    for vid in sorted(os.listdir(SAIDA)):
        pasta = os.path.join(SAIDA, vid)
        if not os.path.isdir(pasta) or vid.startswith("_"):
            continue
        if not os.path.exists(os.path.join(pasta, "pt.vtt")):
            continue
        falta = [s for s in ("en", "es") if not os.path.exists(os.path.join(pasta, f"{s}.vtt"))]
        if not falta:
            continue
        n = len(ler_vtt(os.path.join(pasta, "pt.vtt")))
        info = os.path.join(pasta, "info.json")
        titulo = json.load(open(info, encoding="utf-8")).get("titulo", "") if os.path.exists(info) else ""
        total += n
        print(f"{vid}  {n:>4}  falta {','.join(falta):5s}  {titulo[:42]}")
    print(f"\n{total} legendas para traduzir")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == "--pendentes":
        pendentes()
    elif args[0] == "--extrair":
        extrair(args[1])
    elif args[0] == "--aplicar":
        aplicar(args[1], args[2], args[3])
    else:
        sys.exit(__doc__)
