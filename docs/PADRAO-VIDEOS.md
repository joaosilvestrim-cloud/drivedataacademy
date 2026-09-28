# Padrão de vídeo da Academy

O que precisa estar verdadeiro para uma aula ser considerada publicável, e
como conferir. Escrito depois de legendar 39 aulas e descobrir, no caminho,
que metade dos problemas não aparece olhando a tela.

Para auditar a qualquer momento:

```bash
npx tsx scripts/auditar-videos.ts
```

Para gerar o que a auditoria apontou:

```bash
npx tsx scripts/legendar-panda.ts
```

Sem `--aplicar` ele só mostra o plano e o custo. É o padrão de propósito,
porque cada rodada gasta dinheiro.

## Hospedagem

Tudo no **Panda Video**. O player fica embutido na aula por iframe, e é o `?v=`
dentro dele que amarra o vídeo ao registro da aula no banco.

O Panda tem **dois ids para o mesmo vídeo**: o do player, que aparece na URL, e
o da API, que é outro. Endpoint de legenda usa o da API. Confundir devolve
"Video not found".

## Legendas

**Português e inglês são obrigatórios.** Espanhol é decisão comercial, hoje
presente em 26 dos 56 vídeos por herança do trabalho inicial.

A geração é pela IA do próprio Panda, nível **Legenda Essencial**.

**A cobrança é por trabalho enviado, não por idioma.** Um trabalho custa
1 crédito a cada 30 minutos de vídeo, arredondado para cima, e leva a
transcrição mais todas as traduções pedidas junto no campo `to_langs`.

Um crédito é R$ 1. Uma aula de 45 minutos custa 2 créditos, com português e
inglês inclusos, desde que os dois sejam pedidos na mesma chamada.

**A transcrição não é gratuita**, embora o painel do Panda passe essa
impressão. O painel sempre manda a tradução junto, então a conta aparece uma
vez só e parece que só a tradução custou. Medido em 28/09: um vídeo de 1
minuto, só transcrição, consumiu 1 crédito.

A consequência prática é que pedir português e inglês em duas chamadas custa
o dobro de pedir em uma. É por isso que a geração passou a ser por script, e
não mais pelo painel.

O motor do Panda cobre o vídeo inteiro mesmo com áudio ruim, o que o Whisper
local não conseguiu: em seis aulas ele havia comido trechos grandes.

## O que de fato quebra, e não aparece olhando

**Legenda truncada é pior que legenda ausente.** Na tela a aula parece
legendada, o seletor de idioma aparece, e a legenda simplesmente some no meio.
Uma aula de 74 minutos já ficou com legenda até o minuto 10. Ninguém reclamou:
o aluno assume que é assim mesmo.

Por isso a auditoria não pergunta "tem legenda?". Ela compara o último tempo
da legenda com a duração real do vídeo e reprova abaixo de **92%**. A folga de
8% existe porque é comum o fim ter só música ou despedida cortada.

**Termo técnico volta errado da transcrição.** "Warehouse" vira "DriveCanvas",
"Snowpipe" vira "Snow Pipe". A correção determinística fica em
`scripts/legendas.py`, na lista `CORRECOES`.

Nunca use o parâmetro `prompt` do Whisper como vocabulário. Ele entra como se
fosse o começo da fala e o modelo passa a injetar aquelas palavras no silêncio
e por cima de palavras reais. Já aconteceu e custou dez aulas retranscritas.

**O seletor de legenda precisa estar ligado no player.** Legenda que existe e
o aluno não acha é legenda que não existe. A engrenagem se liga no painel do
Panda, uma vez, para todos os vídeos.

## Depois de legendar: alimentar o assistente

Passo que fecha o ciclo e é fácil esquecer:

```bash
npx tsx scripts/indexar-aulas.ts
```

A transcrição vira trechos pesquisáveis, e o assistente passa a responder
"onde ele explica isso" com a aula e o minuto. Sem este passo a aula nova é
invisível para ele.

## Nomes de arquivo

Hoje convivem três padrões: `Aula6_DataSharing_pratica.mp4`,
`criando_wh_2` e `Aula ao vivo - Figma + SVG no Power BI.mp4`.

O nome do arquivo não aparece para o aluno, então não é urgente. Mas é o que
se lê na auditoria e no painel do Panda, e três padrões tornam difícil achar
o que falta. Sugestão, para o que entrar daqui em diante:

```
<curso>_<numero>_<assunto>_<teorica|pratica|exercicios>
```

## Vídeo fora da plataforma

A conta do Panda guarda material de cliente antigo, arquivos soltos e os
vídeos de exemplo que vêm com a ferramenta. Nenhum deles precisa de legenda.

A auditoria cruza os vídeos do Panda com o que a plataforma realmente aponta,
nas aulas e nas gravações de live, e separa o resto numa lista à parte. Sem
isso a lista de pendências fica com 19 itens onde só 10 importam, e o padrão
passa a parecer inalcançável.

O cruzamento tem uma armadilha: o Panda dá **dois ids ao mesmo vídeo**. O `id`
é o da API, usado nos endpoints. O que a plataforma guarda é o outro, o
`video_external_id`, que é o `?v=` dentro do iframe colado. Comparar o id
errado faz a auditoria dizer que quase tudo está fora da plataforma.

## Checklist da aula nova

1. Subir no Panda e confirmar `status: CONVERTED`.
2. Apontar a aula ou a gravação para o vídeo. Antes disso ele é invisível para
   o script, de propósito.
3. Rodar `scripts/legendar-panda.ts`, conferir o custo, e rodar de novo com
   `--aplicar`.
4. Esperar cerca de 30 minutos: os trabalhos entram numa fila.
5. Rodar `scripts/auditar-videos.ts` e confirmar que ela não aparece em
   nenhuma das listas.
6. Rodar `scripts/indexar-aulas.ts`.
7. Conferir o seletor de idioma abrindo a aula como aluno.
