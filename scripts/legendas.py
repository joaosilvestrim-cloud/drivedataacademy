"""Legendas em português, inglês e espanhol para as aulas.

A origem pode ser um vídeo já no Panda (pelo id) ou um arquivo aqui do
computador (mp4, mkv, mov, mp3...). O resto do caminho é o mesmo.

Para cada vídeo:
  1. puxa o áudio: do arquivo local, ou direto do streaming do Panda
     (ffmpeg, sem baixar o vídeo);
  2. transcreve em português com o Whisper large-v3 do Groq;
  3. junta os pedacinhos do Whisper em legendas de verdade (até 2 linhas, ~6s);
  4. traduz para inglês e espanhol em lotes, com contexto e glossário técnico,
     conferindo que volta exatamente uma tradução por legenda;
  5. grava pt.vtt, en.vtt e es.vtt em legendas/<id ou nome do arquivo>/;
  6. com --enviar, sobe as três no Panda pela API (precisa de PANDA_API_KEY).
     Arquivo local não tem para onde subir: fica só o .vtt para revisão.

Cada etapa fica salva em disco, então rodar de novo continua de onde parou e
não gasta transcrição duas vezes.

Uso:
  python scripts/legendas.py <id-do-video> [<id> ...]      vídeos que já estão no Panda
  python scripts/legendas.py aula.mp4 [outra.mp4 ...]      arquivos aqui do computador
  python scripts/legendas.py --pasta <pasta>                todos os vídeos de uma pasta
  python scripts/legendas.py --curso <slug>                  só as aulas de um curso
  python scripts/legendas.py --cursos                       lista os slugs dos cursos
  python scripts/legendas.py --todas --so-transcrever       so o pt.vtt, sem traduzir
  python scripts/legendas.py --curso <slug> --so-enviar     sobe os .vtt que ja existem
  python scripts/legendas.py --todas                        todas as aulas e gravações do banco
  python scripts/legendas.py --todas --enviar               gera e sobe no Panda
  python scripts/legendas.py --listar                       só mostra o que existe no banco
"""

from http.client import HTTPException  # o def http() daqui embaixo apaga o módulo 'http'
import json, os, re, subprocess, sys, time, unicodedata, urllib.request, urllib.error, base64, math

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
# O avatar dos alunos tem cota própria. Legenda é lote grande e demorado, e se
# rodasse no mesmo modelo deixaria o aluno sem assistente no meio do dia.
ASSISTENTE = ENV.get("GROQ_MODEL") or "openai/gpt-oss-120b"
MODELOS = [m.strip() for m in (ENV.get("GROQ_MODEL_TRADUCAO") or "openai/gpt-oss-20b,qwen/qwen3.8-27b").split(",")
           if m.strip() and m.strip() != ASSISTENTE]
_atual = [0]

def modelo_atual():
    return MODELOS[_atual[0] % len(MODELOS)]

def trocar_modelo():
    """Estourou a cota de um: segue no próximo da lista."""
    _atual[0] += 1
    print(f"      cota cheia, mudando para {modelo_atual()}")
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
    "painel = dashboard / panel; relatório = report / informe; "
    "arquitetura medalhão = medallion architecture / arquitectura de medallón; "
    "camada bronze, prata e ouro = bronze, silver and gold layer / capa bronce, plata y oro."
)

# Extensões que o ffmpeg abre sem drama. Serve para separar "isso é um arquivo
# que o João jogou na pasta" de "isso é um id de vídeo do Panda".
VIDEO_LOCAL = re.compile(r"\.(mp4|mkv|mov|m4v|webm|avi|mp3|m4a|wav|aac|flac|ogg)$", re.I)

# Aqui existia um VOCABULARIO, um texto mandado junto de cada transcrição para
# enviesar a escuta do Whisper. Saiu, e não volta.
#
# O prompt do Whisper não é uma dica: ele entra como se fosse o começo da fala.
# Com os nomes da casa dentro, o modelo passou a escrever "DriveCanvas" e
# "Acompanhe o vídeo" em cima de silêncio e, pior, no lugar de palavra real.
# Uma aula de Snowflake ganhou "Atenção, o DriveCanvas é um dos melhores
# produtos da marca". No teste lado a lado, o mesmo trecho sem prompt nenhum
# voltou certo e ainda com as frases cortadas no lugar certo: 14 legendas
# contra 8 blocos grudados.
#
# Nome próprio se conserta aqui embaixo, no CORRECOES, que é determinístico e
# não inventa.

# O punhado de palavras que o Whisper erra sempre do mesmo jeito.
# Sai daqui em português, então o erro não se propaga para o inglês e o espanhol.
CORRECOES = [
    ("medalhal", "medalhão"), ("medalhao", "medalhão"), ("medalhão", "medalhão"),
    ("Drive Data", "DriveData"), ("Drive Canvas", "DriveCanvas"),
    ("Power Bi", "Power BI"), ("PowerBI", "Power BI"), ("power bi", "Power BI"),
    ("dax", "DAX"), ("sql", "SQL"), ("kpi", "KPI"), ("etl", "ETL"),
    ("mercatrônica", "mecatrônica"), ("mercatronica", "mecatrônica"),
]

def corrigir(texto):
    for errado, certo in CORRECOES:
        if errado.lower() in texto.lower():
            texto = re.sub(re.escape(errado), certo, texto, flags=re.I)
    return texto

# Frases que o Whisper inventa em trecho de silêncio ou música.
ALUCINACOES = re.compile(r"(legendas? (pela|por) comunidade|amara\.org|obrigad[oa] por assistir|inscreva-se no canal|legenda adriana zanotto|acompanhe o v[ií]deo em)", re.I)

def so_endereco(texto):
    """Legenda que é só um site é invenção do Whisper em cima de silêncio ou
    música. Ele chutou 'www.drivecantv.com.br' e 'www.drivecancas.com.br' em
    trechos de 10 segundos sem fala nenhuma."""
    limpo = texto.strip().strip(".,!?").lower()
    return limpo.startswith(("www.", "http")) and " " not in limpo

def enchimento(texto, segundos):
    """Outras duas marcas de invenção, as duas vindas de trecho sem fala.

    A primeira é texto curto ocupando muito tempo: 15 segundos com menos de 60
    caracteres dá 4 caracteres por segundo. Quem fala de verdade faz uns 13,
    e mesmo pausado não chega perto disso. O corte já foi em 100 caracteres e
    levou fala real junto, do tipo "com id, name, email, cidade, state, eita,
    saiu tudo junto", que é alguém lendo devagar na tela.

    A segunda é a chamada de site que ele cola no fim do vídeo. Apareceu como
    'Acompanhe o curso em www.drivecantv.com.br' num silêncio de 30 segundos."""
    t = texto.lower()
    if segundos >= 15 and len(texto) < 60:
        return True
    return "acompanhe o" in t and ("www." in t or " o v " in t)


# ------------------------------------------------------------------ utilidades
class Estourou(RuntimeError):
    """429. Carrega o tempo que o servidor pediu, para quem chamou decidir."""
    def __init__(self, mensagem, segundos):
        super().__init__(mensagem)
        self.segundos = segundos

def http(url, dados=None, cabecalhos=None, metodo=None, tentativas=6, espera=120, insistir_429=True):
    """espera e o timeout de uma tentativa, em segundos.

    O padrao era 600 para tudo, o que so faz sentido para subir 20 minutos de
    audio. Numa chamada de traducao, que responde em segundos, um socket
    pendurado custava 10 minutos, e com as 6 tentativas virava uma hora parado.
    Aconteceu de verdade: uma aula de 37 minutos levou 4 horas e meia."""
    for n in range(tentativas):
        req = urllib.request.Request(url, dados, {"User-Agent": "curl/8", **(cabecalhos or {})}, method=metodo)
        try:
            with urllib.request.urlopen(req, timeout=espera) as r:
                return json.loads(r.read().decode("utf-8") or "null")
        except urllib.error.HTTPError as e:
            corpo = e.read().decode("utf-8", "ignore")[:400]
            if e.code == 429 and not insistir_429:
                # Traducao tem modelo reserva. Ficar esperando aqui e pior do
                # que devolver na hora e deixar quem chamou trocar de modelo:
                # antes o script gastava 6 tentativas de 200s no modelo cheio
                # antes de sequer tentar o outro.
                raise Estourou(f"HTTP 429: {corpo}", float(e.headers.get("retry-after") or 0) or 60)
            if e.code in (429, 500, 502, 503) and n < tentativas - 1:
                pausa = float(e.headers.get("retry-after") or 0) or min(90, 15 * (n + 1))
                print(f"      limite do servidor ({e.code}), esperando {int(pausa)}s...")
                time.sleep(pausa)
                continue
            raise RuntimeError(f"HTTP {e.code}: {corpo}")
        except (urllib.error.URLError, ConnectionError, TimeoutError, HTTPException):
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

def apelido(caminho):
    """Nome de pasta a partir do arquivo. 'Aula 03 - Introdução.mp4' vira
    'aula-03-introducao', que é o que aparece em legendas/ e no nome dos .vtt."""
    base = os.path.splitext(os.path.basename(caminho))[0].lower()
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base or "video"

def escrever_vtt(caminho, legendas, textos):
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write("WEBVTT\n\n")
        for i, (leg, texto) in enumerate(zip(legendas, textos), 1):
            f.write(f"{i}\n{tempo_vtt(leg['ini'])} --> {tempo_vtt(leg['fim'])}\n{quebrar_linhas(texto)}\n\n")


# ------------------------------------------------------------------ etapas
def extrair_audio(origem, host, pasta):
    """origem é o caminho de um arquivo aqui, ou o id de um vídeo do Panda.
    Nos dois casos sai o mesmo audio.mp3 mono de 16 kHz, que é tudo que o
    Whisper precisa e o que faz uma aula de 1h30 caber em poucos megabytes."""
    audio = os.path.join(pasta, "audio.mp3")
    if os.path.exists(audio) and os.path.getsize(audio) > 10000:
        return audio
    if os.path.exists(origem):
        entrada = origem
        print("   extraindo áudio do arquivo...")
    else:
        entrada = f"https://{host}/{origem}/playlist.m3u8"
        print("   extraindo áudio do streaming...")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", entrada, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", audio], check=True)
    return audio

def mudo(audio):
    """Verdadeiro quando o arquivo nao tem fala nenhuma.

    A aula "Boas-vindas ao curso" tem 2m24 de silencio absoluto, -91 dB do
    inicio ao fim, e o Whisper devolveu cinco vezes "Acompanhe a producao de
    dados em nosso site www.drive.com.br". Sem audio ele inventa, sempre.

    -50 dB de media e bem abaixo de qualquer fala, ate sussurro, entao aula de
    verdade nunca cai aqui."""
    saida = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", audio, "-af", "volumedetect", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", saida)
    return bool(m) and float(m.group(1)) < -50

def repetida(segmentos, vezes=3):
    """Tira o texto que aparece identico varias vezes.

    Nao e jeito de falar: quando o Whisper entra em loop ele repete a mesma
    frase palavra por palavra, e foi assim nos cinco blocos do video mudo."""
    conta = {}
    for s in segmentos:
        chave = " ".join(s["texto"].lower().split())
        conta[chave] = conta.get(chave, 0) + 1
    return [s for s in segmentos if conta[" ".join(s["texto"].lower().split())] < vezes]

def duracao(audio):
    saida = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio], capture_output=True, text=True).stdout
    return float(saida.strip() or 0)

MIN_BURACO = 8.0

def buracos(segmentos, total):
    """Trechos sem legenda que valem uma segunda tentativa.

    O Whisper às vezes troca meio minuto de fala por uma frase inventada. O
    filtro derruba a frase e sobra um buraco no meio da aula. Recortado sozinho,
    o mesmo trecho volta certo, então é isso que a gente faz: pede de novo só o
    buraco, com 2 segundos de folga de cada lado para não cortar palavra."""
    fila, fim = [], 0.0
    for s in sorted(segmentos, key=lambda x: x["ini"]):
        if s["ini"] - fim >= MIN_BURACO:
            fila.append((fim, s["ini"]))
        fim = max(fim, s["fim"])
    if total - fim >= MIN_BURACO:
        fila.append((fim, total))
    saida = []
    for a, b in fila:
        ini = max(0.0, a - 2)
        saida.append((ini, min(total, b + 2) - ini, f"de novo o trecho {int(a)}s-{int(b)}s", (a, b)))
    return saida

def sem_sobra(segmentos):
    """Rede de segurança contra frase repetida na emenda de dois pedidos.

    Só cai o que está inteiro dentro do anterior. Encostar não basta: a regra
    antiga derrubava tudo que começasse antes do fim do vizinho, e um segmento
    longo levava junto a fala seguinte. Foi assim que sumiram 14 segundos da
    aula 09 e 19 da 11."""
    saida = []
    for s in sorted(segmentos, key=lambda x: (x["ini"], x["fim"])):
        if saida and s["fim"] <= saida[-1]["fim"] + 0.3:
            continue
        saida.append(s)
    return saida

def transcrever(audio, pasta):
    """Whisper do Groq aceita até ~25 MB por envio: vídeo longo vai em partes de 20 min."""
    arquivo = os.path.join(pasta, "transcricao.json")
    if os.path.exists(arquivo):
        return json.load(open(arquivo, encoding="utf-8"))
    total = duracao(audio)
    parte = 20 * 60
    segmentos = []
    # Fila de trechos a transcrever. Começa com o vídeo fatiado em 20 minutos,
    # que é o que cabe num envio. Terminada a primeira volta, os buracos entram
    # na fila e são pedidos de novo, cada um sozinho.
    fatias = math.ceil(total / parte)
    janelas = [(k * parte, parte, f"parte {k + 1} de {fatias}", None) for k in range(fatias)]
    # Às vezes o pedido do buraco também volta inventado e o buraco continua
    # lá. Então a busca se repete, e cada trecho tem direito a duas tentativas.
    proxima_busca, tentados = fatias, {}
    k = 0
    while k < len(janelas):
        inicio, tamanho, rotulo, limites = janelas[k]
        pedaco = os.path.join(pasta, f"parte{k}.mp3")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(inicio), "-t", str(tamanho), "-i", audio, "-c", "copy", pedaco], check=True)
        print(f"   transcrevendo {rotulo}...")
        limite = "----fronteira" + str(int(time.time() * 1000))
        corpo = b""
        for nome, valor in (("model", "whisper-large-v3"), ("language", "pt"), ("response_format", "verbose_json"), ("temperature", "0")):
            corpo += f"--{limite}\r\nContent-Disposition: form-data; name=\"{nome}\"\r\n\r\n{valor}\r\n".encode()
        corpo += f"--{limite}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"parte.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode()
        corpo += open(pedaco, "rb").read() + f"\r\n--{limite}--\r\n".encode()
        r = http("https://api.groq.com/openai/v1/audio/transcriptions", corpo,
                 {"Authorization": "Bearer " + GROQ, "Content-Type": f"multipart/form-data; boundary={limite}"}, "POST",
                 espera=600)
        for s in r.get("segments", []):
            texto = s["text"].strip()
            if (not texto or ALUCINACOES.search(texto) or so_endereco(texto)
                    or enchimento(texto, s["end"] - s["start"]) or s.get("no_speech_prob", 0) > 0.8):
                continue
            ini, fim = s["start"] + inicio, s["end"] + inicio
            # O pedido de buraco leva 2 segundos de folga de cada lado só para
            # não cortar palavra. O que cai na folga já existe, então fica fora.
            if limites and not (limites[0] - 0.5 <= (ini + fim) / 2 <= limites[1] + 0.5):
                continue
            segmentos.append({"ini": ini, "fim": fim, "texto": corrigir(texto)})
        os.remove(pedaco)
        k += 1
        if k == proxima_busca:
            novos = [j for j in buracos(segmentos, total) if tentados.get(int(j[3][0]), 0) < 2]
            for j in novos:
                tentados[int(j[3][0])] = tentados.get(int(j[3][0]), 0) + 1
            janelas += novos
            proxima_busca = len(janelas)
    segmentos = sem_sobra(repetida(segmentos))
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
    # Teto proporcional ao lote. Fixo em 6000 o qwen recusava, porque ele limita
    # tokens de saída por minuto e não por pedido.
    teto = min(6000, 200 + 90 * len(itens))

    def uma_vez():
        return http("https://api.groq.com/openai/v1/chat/completions",
                    json.dumps({"model": modelo_atual(), "temperature": 0.2, "reasoning_effort": "low",
                                "max_completion_tokens": teto,
                                "messages": [{"role": "user", "content": pedido}]}).encode(),
                    {"Authorization": "Bearer " + GROQ, "Content-Type": "application/json"}, "POST",
                    insistir_429=False)

    # Primeiro tenta todos os modelos. So espera quando todos estao cheios, e
    # espera o menor tempo que algum deles pediu.
    r = None
    for rodada in range(4):
        menor = None
        for _ in range(len(MODELOS)):
            try:
                r = uma_vez()
                break
            except Estourou as e:
                menor = e.segundos if menor is None else min(menor, e.segundos)
                trocar_modelo()
        if r is not None:
            break
        pausa = min(120, menor or 60)
        print(f"      todos os modelos cheios, esperando {int(pausa)}s...")
        time.sleep(pausa)
    if r is None:
        raise RuntimeError("todos os modelos de traducao cheios depois de 4 rodadas")
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

_catalogo = {}

def id_da_api(video_id):
    """O Panda tem dois ids para o mesmo vídeo.

    O que aparece na URL do player, no '?v=', é o que está gravado no nosso
    banco dentro do iframe. Já o endpoint de legenda quer o id interno da API,
    que é outro. Sem essa tradução o envio volta 'Video not found' nos 11.

    A lista vem uma vez só e fica em memória."""
    if not _catalogo:
        pagina = 1  # página 0 faz o Panda devolver 500: vira OFFSET negativo lá dentro
        while True:
            r = http(f"https://api-v2.pandavideo.com.br/videos?limit=100&page={pagina}",
                     cabecalhos={"Authorization": PANDA, "accept": "application/json"})
            achados = r.get("videos") or []
            for v in achados:
                m = re.search(r"[?&]v=([0-9a-f-]{36})", v.get("video_player") or "")
                if m:
                    _catalogo[m.group(1)] = v["id"]
            pagina += 1
            if not achados or len(_catalogo) >= (r.get("total") or 0) or pagina > 50:
                break
        print(f"   catálogo do Panda: {len(_catalogo)} vídeos")
    return _catalogo.get(video_id)

def enviar(video_id, pasta):
    registro = os.path.join(pasta, "enviado.json")
    enviados = json.load(open(registro, encoding="utf-8")) if os.path.exists(registro) else []
    alvo = id_da_api(video_id)
    if not alvo:
        print(f"   esse vídeo não está na conta dessa chave de API, pulando")
        return
    for sigla, rotulo, srclang in (("pt", "Português", "pt-br"), ("en", IDIOMAS["en"]["rotulo"], "en"), ("es", IDIOMAS["es"]["rotulo"], "es")):
        if sigla in enviados:
            continue
        conteudo = base64.b64encode(open(os.path.join(pasta, f"{sigla}.vtt"), "rb").read()).decode()
        http(f"https://api-v2.pandavideo.com.br/subtitles/{alvo}",
             json.dumps({"label": rotulo, "srclang": srclang, "file": f"data:text/vtt;name={sigla}.vtt;base64,{conteudo}"}).encode(),
             {"Authorization": PANDA, "accept": "application/json", "content-type": "application/json"}, "POST")
        enviados.append(sigla)
        json.dump(enviados, open(registro, "w", encoding="utf-8"))
        print(f"   enviado ao Panda: {rotulo}")
    if enviados:
        marcar_no_banco(video_id, sorted(enviados))

def marcar_no_banco(video_id, siglas):
    """Anota no banco que esse vídeo ganhou legenda, e em quais idiomas.

    É o que faz a dica aparecer embaixo do player só nas aulas que têm. O
    script é a única fonte que sabe o que realmente subiu no Panda.

    O id que está no banco é o do player, dentro do iframe ou da URL da
    gravação, então a busca é por trecho e não por igualdade."""
    url, chave = ENV.get("NEXT_PUBLIC_SUPABASE_URL"), ENV.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and chave):
        return
    cab = {"apikey": chave, "Authorization": "Bearer " + chave,
           "Content-Type": "application/json", "Prefer": "return=minimal"}
    corpo = json.dumps({"subtitle_langs": siglas}).encode()
    for tabela, campo in (("lessons", "video_id"), ("live_events", "recording_url")):
        try:
            http(f"{url}/rest/v1/{tabela}?{campo}=like.*{video_id}*", corpo, cab, "PATCH", tentativas=2)
        except RuntimeError as e:
            if "subtitle_langs" in str(e):
                print("   a migration 20260921_legendas.sql ainda não rodou: subi as faixas, mas não marquei no banco")
                return
            raise

def processar(origem, host, titulo, subir, so_transcrever=False, so_enviar=False):
    """A pasta de saída é o id do vídeo, ou o nome do arquivo quando a aula
    veio de fora. Assim dá para achar o .vtt pelo nome da aula."""
    local = os.path.exists(origem)
    chave = apelido(origem) if local else origem
    pasta = os.path.join(SAIDA, chave)
    os.makedirs(pasta, exist_ok=True)
    json.dump({"titulo": titulo, "host": host, "origem": origem}, open(os.path.join(pasta, "info.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"\n== {titulo or chave}")

    if so_enviar:
        """Sobe o que ja existe e sai.

        Existe porque a traducao agora e feita a mao, fora do script, e o
        caminho normal passaria pelo modelo de chat e sobrescreveria os .vtt
        revisados com uma traducao automatica. Subir nao pode depender de
        gerar."""
        faltando = [s for s in ("pt", "en", "es") if not os.path.exists(os.path.join(pasta, f"{s}.vtt"))]
        if faltando:
            print(f"   falta {', '.join(faltando)}, nao subi")
            return
        if not PANDA:
            print("   PANDA_API_KEY vazia no .env.local")
            return
        if local:
            print("   arquivo local nao tem id no Panda")
            return
        enviar(origem, pasta)
        return

    audio = extrair_audio(origem, host, pasta)
    if mudo(audio):
        print("   sem audio nenhum, nao tem o que legendar")
        return
    legendas = montar_legendas(transcrever(audio, pasta))
    if not legendas:
        print("   sem fala detectada, pulando")
        return
    escrever_vtt(os.path.join(pasta, "pt.vtt"), legendas, [l["texto"] for l in legendas])
    if so_transcrever:
        # A traducao sai daqui e vai para o Claude, que nao tem teto diario.
        # O modelo de chat da Groq limita 200 mil tokens por dia e era isso que
        # segurava o lote: transcrever tem cota por hora, que renova sozinha.
        print(f"   {len(legendas)} legendas em portugues, pronto para traduzir")
        return
    for sigla in IDIOMAS:
        escrever_vtt(os.path.join(pasta, f"{sigla}.vtt"), legendas, traduzir(legendas, sigla, pasta))
    print(f"   pronto: {len(legendas)} legendas em pt, en e es  ->  {pasta}")
    if subir:
        if local:
            print("   arquivo local não tem id no Panda: suba o vídeo primeiro e depois rode com o id.")
        elif not PANDA:
            print("   PANDA_API_KEY vazia no .env.local: gerei os arquivos, mas não subi.")
        else:
            enviar(origem, pasta)


# ------------------------------------------------------------------ vídeos do banco
def nao_legendar():
    """Ids que ficam de fora, um por linha em legendas/nao-legendar.txt.

    Nem todo video do catalogo e aula. Gravacao de reuniao interna, por
    exemplo, gasta cota de transcricao e nao serve para ninguem em tres
    idiomas. Como e uma decisao de conteudo e nao de codigo, mora num arquivo
    que qualquer um edita sem mexer aqui.

    O que vem depois de '#' na linha e comentario."""
    caminho = os.path.join(SAIDA, "nao-legendar.txt")
    if not os.path.exists(caminho):
        return {}
    fora = {}
    for linha in open(caminho, encoding="utf-8"):
        linha = linha.strip()
        if not linha or linha.startswith("#"):
            continue
        vid, _, motivo = linha.partition("#")
        vid = vid.strip()
        if vid:
            fora[vid] = motivo.strip() or "na lista de fora"
    return fora

def videos_do_banco(curso=None):
    """Sem curso, pega tudo: aulas do Panda e gravações de live. Com o slug de
    um curso, só as aulas dele, que é como a gente legenda uma turma por vez."""
    url, chave = ENV["NEXT_PUBLIC_SUPABASE_URL"], ENV["SUPABASE_SERVICE_ROLE_KEY"]
    cab = {"apikey": chave, "Authorization": "Bearer " + chave}
    if curso:
        achados = http(f"{url}/rest/v1/courses?select=id&slug=eq.{curso}", cabecalhos=cab)
        if not achados:
            sys.exit(f"não achei o curso '{curso}'. Rode --cursos para ver os slugs.")
        modulos = http(f"{url}/rest/v1/course_modules?select=id&course_id=eq.{achados[0]['id']}", cabecalhos=cab)
        ids = ",".join(m["id"] for m in modulos)
        aulas = http(f"{url}/rest/v1/lessons?select=title,video_id,video_provider&video_provider=eq.panda&module_id=in.({ids})&order=title", cabecalhos=cab) if ids else []
        lives = []
    else:
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
    fora = nao_legendar()
    for vid, motivo in fora.items():
        if vid in vistos:
            print(f"   fora da fila: {motivo}")
    return [x for x in lista if x[0] not in fora]


if __name__ == "__main__":
    args = sys.argv[1:]
    if not GROQ:
        sys.exit("GROQ_API_KEY vazia no .env.local")
    subir = "--enviar" in args
    so_transcrever = "--so-transcrever" in args
    so_enviar = "--so-enviar" in args
    if "--cursos" in args:
        url, chave = ENV["NEXT_PUBLIC_SUPABASE_URL"], ENV["SUPABASE_SERVICE_ROLE_KEY"]
        for c in http(f"{url}/rest/v1/courses?select=slug,title&order=title", cabecalhos={"apikey": chave, "Authorization": "Bearer " + chave}):
            print(f"{c['slug']:45s} {c['title']}")
        sys.exit(0)
    curso = args[args.index("--curso") + 1] if "--curso" in args else None
    if curso or "--listar" in args or "--todas" in args:
        lista = videos_do_banco(curso)
        if "--listar" in args:
            for vid, host, titulo in lista:
                pronto = os.path.exists(os.path.join(SAIDA, vid, "es.vtt"))
                print(f"{'ok ' if pronto else '   '} {vid}  {titulo}")
            print(f"\n{len(lista)} vídeos únicos")
            sys.exit(0)
    elif "--pasta" in args:
        raiz = args[args.index("--pasta") + 1]
        lista = [(os.path.join(raiz, n), "", n) for n in sorted(os.listdir(raiz)) if VIDEO_LOCAL.search(n)]
    else:
        lista = [(a, HOST_PADRAO, "") for a in args if re.fullmatch(r"[0-9a-f-]{36}", a)]
        lista += [(os.path.abspath(a), "", os.path.basename(a)) for a in args if VIDEO_LOCAL.search(a)]
    if not lista:
        sys.exit(__doc__)
    for vid, host, titulo in lista:
        try:
            processar(vid, host, titulo, subir, so_transcrever, so_enviar)
        except Exception as e:
            print(f"   ERRO em {vid}: {e}")
