"""Legendas em português, inglês e espanhol para os vídeos do Panda.

Para cada vídeo:
  1. puxa o áudio direto do streaming do Panda (ffmpeg, sem baixar o vídeo);
  2. transcreve em português com o Whisper large-v3 do Groq;
  3. junta os pedacinhos do Whisper em legendas de verdade (até 2 linhas, ~6s);
  4. traduz para inglês e espanhol em lotes, com contexto e glossário técnico,
     conferindo que volta exatamente uma tradução por legenda;
  5. grava pt.vtt, en.vtt e es.vtt em legendas/<id>/ para revisão;
  6. com --enviar, sobe as três no Panda pela API (precisa de PANDA_API_KEY).

Cada etapa fica salva em disco, então rodar de novo continua de onde parou e
não gasta transcrição duas vezes.

Uso:
  python scripts/legendas.py <id-do-video> [<id> ...]      gera para esses vídeos
  python scripts/legendas.py --todas                        todas as aulas e gravações do banco
  python scripts/legendas.py --todas --enviar               gera e sobe no Panda
  python scripts/legendas.py --listar                       só mostra o que existe no banco
"""

import json, os, re, subprocess, sys, time, urllib.request, urllib.error, base64, math

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "legendas")
HOST_PADRAO = "b-vz-a566992d-663.tv.pandavideo.com.br"

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
PANDA = ENV.get("PANDA_API_KEY", "")

IDIOMAS = {
    "en": {"nome": "English", "rotulo": "English", "srclang": "en"},
    "es": {"nome": "Latin American Spanish", "rotulo": "Español", "srclang": "es"},
}

GLOSSARIO = (
    "Keep these exactly as written, never translate them: Power BI, DAX, CALCULATE, SUMX, FILTER, Power Query, M, SQL, "
    "HTML, SVG, CSS, Figma, Fabric, Claude, MCP, DriveData, Academy, dashboard, KPI, ETL, Excel, Azure, Copilot, Snowflake, warehouse, Databricks, Python. "
    "Power BI terms (use the official English/Spanish UI names): medida = measure / medida; coluna calculada = calculated column / columna calculada; "
    "tabela fato = fact table / tabla de hechos; tabela dimensão = dimension table / tabla de dimensiones; relacionamento = relationship / relación; "
    "segmentação de dados = slicer / segmentación; visual = visual / objeto visual; modelo semântico = semantic model / modelo semántico; "
    "painel = dashboard / panel; relatório = report / informe."
)

# Frases que o Whisper inventa em trecho de silêncio ou música.
ALUCINACOES = re.compile(r"(legendas? (pela|por) comunidade|amara\.org|obrigad[oa] por assistir|inscreva-se no canal|legenda adriana zanotto)", re.I)


# ------------------------------------------------------------------ utilidades
def http(url, dados=None, cabecalhos=None, metodo=None, tentativas=6):
    for n in range(tentativas):
        req = urllib.request.Request(url, dados, {"User-Agent": "curl/8", **(cabecalhos or {})}, method=metodo)
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                return json.loads(r.read().decode("utf-8") or "null")
        except urllib.error.HTTPError as e:
            corpo = e.read().decode("utf-8", "ignore")[:400]
            if e.code in (429, 500, 502, 503) and n < tentativas - 1:
                espera = float(e.headers.get("retry-after") or 0) or min(90, 15 * (n + 1))
                print(f"      limite do servidor ({e.code}), esperando {int(espera)}s...")
                time.sleep(espera)
                continue
            raise RuntimeError(f"HTTP {e.code}: {corpo}")
        except urllib.error.URLError:
            if n < tentativas - 1:
                time.sleep(10)
                continue
            raise

def tempo_vtt(s):
    h, s = divmod(max(0.0, s), 3600)
    m, s = divmod(s, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"

def quebrar_linhas(texto, largura=42):
    """Legenda boa tem no máximo 2 linhas, quebradas perto do meio."""
    texto = " ".join(texto.split())
    if len(texto) <= largura:
        return texto
    meio = len(texto) // 2
    espacos = [i for i, c in enumerate(texto) if c == " "]
    if not espacos:
        return texto
    corte = min(espacos, key=lambda i: abs(i - meio))
    return texto[:corte] + "\n" + texto[corte + 1:]

def escrever_vtt(caminho, legendas, textos):
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write("WEBVTT\n\n")
        for i, (leg, texto) in enumerate(zip(legendas, textos), 1):
            f.write(f"{i}\n{tempo_vtt(leg['ini'])} --> {tempo_vtt(leg['fim'])}\n{quebrar_linhas(texto)}\n\n")


# ------------------------------------------------------------------ etapas
def extrair_audio(video_id, host, pasta):
    audio = os.path.join(pasta, "audio.mp3")
    if os.path.exists(audio) and os.path.getsize(audio) > 10000:
        return audio
    m3u8 = f"https://{host}/{video_id}/playlist.m3u8"
    print("   extraindo áudio do streaming...")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", m3u8, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", audio], check=True)
    return audio

def duracao(audio):
    saida = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio], capture_output=True, text=True).stdout
    return float(saida.strip() or 0)

def transcrever(audio, pasta):
    """Whisper do Groq aceita até ~25 MB por envio: vídeo longo vai em partes de 20 min."""
    arquivo = os.path.join(pasta, "transcricao.json")
    if os.path.exists(arquivo):
        return json.load(open(arquivo, encoding="utf-8"))
    total = duracao(audio)
    parte = 20 * 60
    segmentos = []
    for k in range(math.ceil(total / parte)):
        inicio = k * parte
        pedaco = os.path.join(pasta, f"parte{k}.mp3")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(inicio), "-t", str(parte), "-i", audio, "-c", "copy", pedaco], check=True)
        print(f"   transcrevendo parte {k + 1} de {math.ceil(total / parte)}...")
        limite = "----fronteira" + str(int(time.time() * 1000))
        corpo = b""
        for nome, valor in (("model", "whisper-large-v3"), ("language", "pt"), ("response_format", "verbose_json"), ("temperature", "0")):
            corpo += f"--{limite}\r\nContent-Disposition: form-data; name=\"{nome}\"\r\n\r\n{valor}\r\n".encode()
        corpo += f"--{limite}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"parte.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode()
        corpo += open(pedaco, "rb").read() + f"\r\n--{limite}--\r\n".encode()
        r = http("https://api.groq.com/openai/v1/audio/transcriptions", corpo,
                 {"Authorization": "Bearer " + GROQ, "Content-Type": f"multipart/form-data; boundary={limite}"}, "POST")
        for s in r.get("segments", []):
            texto = s["text"].strip()
            if not texto or ALUCINACOES.search(texto) or s.get("no_speech_prob", 0) > 0.8:
                continue
            segmentos.append({"ini": s["start"] + inicio, "fim": s["end"] + inicio, "texto": texto})
        os.remove(pedaco)
    json.dump(segmentos, open(arquivo, "w", encoding="utf-8"), ensure_ascii=False)
    return segmentos

MAX_CHARS = 84
MAX_SEG = 7.0

def dividir(seg):
    """Quebra um trecho longo em partes de até MAX_CHARS, de preferência depois
    de vírgula ou ponto, e reparte o tempo em proporção ao texto de cada parte."""
    texto, dur = seg["texto"], seg["fim"] - seg["ini"]
    if len(texto) <= MAX_CHARS and dur <= MAX_SEG:
        return [seg]
    partes, resto = [], texto
    alvo = max(30, min(MAX_CHARS, int(len(texto) / max(1, math.ceil(max(len(texto) / MAX_CHARS, dur / MAX_SEG))))) + 8)
    while len(resto) > alvo:
        janela = resto[: alvo + 1]
        corte = max(janela.rfind(", "), janela.rfind(". "), janela.rfind("? "), janela.rfind("! "))
        corte = corte + 1 if corte >= alvo * 0.5 else janela.rfind(" ")
        if corte <= 0:
            corte = alvo
        partes.append(resto[:corte].strip())
        resto = resto[corte:].strip()
    if resto:
        partes.append(resto)
    total = sum(len(x) for x in partes) or 1
    t, saida = seg["ini"], []
    for x in partes:
        d = dur * len(x) / total
        saida.append({"ini": t, "fim": t + d, "texto": x})
        t += d
    return saida

def montar_legendas(segmentos):
    """Junta os pedaços do Whisper até formar uma legenda legível."""
    legendas, atual = [], None
    segmentos = [p for s in segmentos for p in dividir(s)]
    for s in segmentos:
        if atual:
            junto = atual["texto"] + " " + s["texto"]
            pausa = s["ini"] - atual["fim"]
            fecha_frase = re.search(r"[.!?…]$", atual["texto"]) and len(atual["texto"]) >= 30
            if len(junto) <= MAX_CHARS and s["fim"] - atual["ini"] <= 6.5 and pausa < 1.2 and not fecha_frase:
                atual["texto"], atual["fim"] = junto, s["fim"]
                continue
            legendas.append(atual)
        atual = dict(s)
    if atual:
        legendas.append(atual)
    # Legenda some rápido demais é ilegível: mínimo de 1,2s sem invadir a próxima.
    for i, l in enumerate(legendas):
        proxima = legendas[i + 1]["ini"] if i + 1 < len(legendas) else l["fim"] + 2
        l["fim"] = max(l["fim"], min(l["ini"] + 1.2, proxima - 0.05))
    return legendas

def pedir_traducao(itens, contexto, idioma):
    """itens: lista de (numero, texto). Devolve {numero: traducao} com o que voltou.

    Linhas numeradas em vez de JSON: o modelo erra menos, e quando esquece uma
    linha dá para pedir de novo só ela, sem perder o lote inteiro."""
    entrada = "\n".join(f"{n}|{t}" for n, t in itens)
    pedido = (
        f"You are subtitling a Brazilian Portuguese Power BI / data analytics class into {idioma}. "
        "Each line below is 'number|subtitle'. Reply with the same numbered lines as 'number|translation', exactly one per input line, "
        "nothing else. Never merge or split lines, even when a sentence continues on the next line: translate each fragment so the "
        "sequence reads naturally. Spoken, friendly tone, short lines.\n"
        f"{GLOSSARIO}\n"
        + (f"Previous subtitles, context only, do not translate: {' / '.join(contexto)}\n" if contexto else "")
        + "\n" + entrada
    )
    r = http("https://api.groq.com/openai/v1/chat/completions",
             json.dumps({"model": MODELO, "temperature": 0.2, "reasoning_effort": "low", "max_completion_tokens": 6000,
                         "messages": [{"role": "user", "content": pedido}]}).encode(),
             {"Authorization": "Bearer " + GROQ, "Content-Type": "application/json"}, "POST")
    saida = r["choices"][0]["message"].get("content") or ""
    pedidos = {n for n, _ in itens}
    voltou = {}
    for m in re.finditer(r"^\s*(\d+)\s*\|\s*(.+?)\s*$", saida, re.M):
        n = int(m.group(1))
        if n in pedidos and m.group(2):
            voltou[n] = m.group(2)
    return voltou

def suspeita(original, traducao):
    if len(original) < 15:
        return False
    razao = len(traducao) / len(original)
    return not (0.45 <= razao <= 2.0)

def traduzir(legendas, sigla, pasta):
    arquivo = os.path.join(pasta, f"traducao-{sigla}.json")
    feito = json.load(open(arquivo, encoding="utf-8")) if os.path.exists(arquivo) else []
    textos = [l["texto"] for l in legendas]
    idioma = IDIOMAS[sigla]["nome"]
    lote = 30
    while len(feito) < len(textos):
        i = len(feito)
        itens = [(i + k + 1, t) for k, t in enumerate(textos[i:i + lote])]
        contexto = textos[max(0, i - 3):i]
        resultado = {}
        for tentativa in range(4):
            faltam = [(n, t) for n, t in itens if n not in resultado]
            if not faltam:
                break
            try:
                resultado.update(pedir_traducao(faltam, contexto, idioma))
            except RuntimeError as e:
                print(f"      lote {i}: {str(e)[:120]}")
            if any(n not in resultado for n, _ in itens):
                time.sleep(4 * (tentativa + 1))
        faltam = [n for n, _ in itens if n not in resultado]
        if faltam:
            raise RuntimeError(f"sem tradução para as legendas {faltam} depois de 4 tentativas")
        # Em lote, o modelo às vezes escorrega uma frase para a linha do lado.
        # Tamanho muito fora do original denuncia isso: essas vão sozinhas, com
        # a vizinhança como contexto, onde não tem como trocar de lugar.
        for n, t in itens:
            if suspeita(t, resultado[n]):
                viz = [textos[j] for j in (n - 2, n) if 0 <= j < len(textos)]
                try:
                    unica = pedir_traducao([(n, t)], viz, idioma).get(n)
                    if unica:
                        resultado[n] = unica
                except RuntimeError:
                    pass
        feito += [resultado[n] for n, _ in itens]
        json.dump(feito, open(arquivo, "w", encoding="utf-8"), ensure_ascii=False)
        print(f"   {sigla}: {len(feito)}/{len(textos)}")
        time.sleep(3)  # respeita o limite por minuto da conta do Groq
    return feito

def enviar(video_id, pasta):
    registro = os.path.join(pasta, "enviado.json")
    enviados = json.load(open(registro, encoding="utf-8")) if os.path.exists(registro) else []
    for sigla, rotulo, srclang in (("pt", "Português", "pt-br"), ("en", IDIOMAS["en"]["rotulo"], "en"), ("es", IDIOMAS["es"]["rotulo"], "es")):
        if sigla in enviados:
            continue
        conteudo = base64.b64encode(open(os.path.join(pasta, f"{sigla}.vtt"), "rb").read()).decode()
        http(f"https://api-v2.pandavideo.com.br/subtitles/{video_id}",
             json.dumps({"label": rotulo, "srclang": srclang, "file": f"data:text/vtt;name={sigla}.vtt;base64,{conteudo}"}).encode(),
             {"Authorization": PANDA, "accept": "application/json", "content-type": "application/json"}, "POST")
        enviados.append(sigla)
        json.dump(enviados, open(registro, "w", encoding="utf-8"))
        print(f"   enviado ao Panda: {rotulo}")

def processar(video_id, host, titulo, subir):
    pasta = os.path.join(SAIDA, video_id)
    os.makedirs(pasta, exist_ok=True)
    json.dump({"titulo": titulo, "host": host}, open(os.path.join(pasta, "info.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"\n== {titulo or video_id}")
    audio = extrair_audio(video_id, host, pasta)
    legendas = montar_legendas(transcrever(audio, pasta))
    if not legendas:
        print("   sem fala detectada, pulando")
        return
    escrever_vtt(os.path.join(pasta, "pt.vtt"), legendas, [l["texto"] for l in legendas])
    for sigla in IDIOMAS:
        escrever_vtt(os.path.join(pasta, f"{sigla}.vtt"), legendas, traduzir(legendas, sigla, pasta))
    print(f"   pronto: {len(legendas)} legendas em pt, en e es")
    if subir:
        if not PANDA:
            print("   PANDA_API_KEY vazia no .env.local: gerei os arquivos, mas não subi.")
        else:
            enviar(video_id, pasta)


# ------------------------------------------------------------------ vídeos do banco
def videos_do_banco():
    url, chave = ENV["NEXT_PUBLIC_SUPABASE_URL"], ENV["SUPABASE_SERVICE_ROLE_KEY"]
    cab = {"apikey": chave, "Authorization": "Bearer " + chave}
    aulas = http(f"{url}/rest/v1/lessons?select=title,video_id,video_provider&video_provider=eq.panda", cabecalhos=cab)
    lives = http(f"{url}/rest/v1/live_events?select=title,recording_url&recording_url=not.is.null", cabecalhos=cab)
    vistos, lista = set(), []
    for titulo, bruto in [(a["title"], a["video_id"]) for a in aulas] + [(l["title"], l["recording_url"]) for l in lives]:
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", bruto or "", re.I)
        if not m or m.group(1) in vistos:
            continue
        h = re.search(r"player-(vz-[a-z0-9-]+\.tv\.pandavideo\.com\.br)", bruto or "")
        vistos.add(m.group(1))
        lista.append((m.group(1), "b-" + h.group(1) if h else HOST_PADRAO, titulo))
    return lista


if __name__ == "__main__":
    args = sys.argv[1:]
    if not GROQ:
        sys.exit("GROQ_API_KEY vazia no .env.local")
    subir = "--enviar" in args
    if "--listar" in args or "--todas" in args:
        lista = videos_do_banco()
        if "--listar" in args:
            for vid, host, titulo in lista:
                pronto = os.path.exists(os.path.join(SAIDA, vid, "es.vtt"))
                print(f"{'ok ' if pronto else '   '} {vid}  {titulo}")
            print(f"\n{len(lista)} vídeos únicos")
            sys.exit(0)
    else:
        lista = [(a, HOST_PADRAO, "") for a in args if re.fullmatch(r"[0-9a-f-]{36}", a)]
    if not lista:
        sys.exit(__doc__)
    for vid, host, titulo in lista:
        try:
            processar(vid, host, titulo, subir)
        except Exception as e:
            print(f"   ERRO em {vid}: {e}")
