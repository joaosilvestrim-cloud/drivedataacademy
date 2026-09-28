# Padrão de vídeo da Academy

O que precisa estar verdadeiro para uma aula ser considerada publicável, e
como conferir. Escrito depois de legendar 39 aulas e descobrir, no caminho,
que metade dos problemas não aparece olhando a tela.

Para auditar a qualquer momento:

```bash
npx tsx scripts/auditar-videos.ts
```

## Hospedagem

Tudo no **Panda Video**. O player fica embutido na aula por iframe, e é o `?v=`
dentro dele que amarra o vídeo ao registro da aula no banco.

O Panda tem **dois ids para o mesmo vídeo**: o do player, que aparece na URL, e
o da API, que é outro. Endpoint de legenda usa o da API. Confundir devolve
"Video not found".

## Legendas

**Português e inglês são obrigatórios.** Espanhol é decisão comercial, hoje
presente em 26 dos 56 vídeos por herança do trabalho inicial.

A geração é pela IA do próprio Panda, nível **Legenda Essencial**:

| | Custo |
| --- | --- |
| Transcrição no idioma original | **gratuita** |
| Cada idioma adicional | 1 crédito a cada 30 min de vídeo |

Um crédito é R$ 1, e o tempo arredonda para cima por vídeo. Uma aula de 45
minutos custa 2 créditos por idioma traduzido.

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

## Checklist da aula nova

1. Subir no Panda e confirmar `status: CONVERTED`.
2. Gerar legenda pela IA do Panda, português mais inglês.
3. Rodar `scripts/auditar-videos.ts` e confirmar que ela não aparece em
   nenhuma das três listas.
4. Rodar `scripts/indexar-aulas.ts`.
5. Conferir o seletor de idioma abrindo a aula como aluno.
