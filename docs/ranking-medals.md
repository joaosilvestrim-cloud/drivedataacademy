# Medalhas do ranking

## Análise da função existente

`app/conta/ranking/page.tsx` exige login e acesso à comunidade. Busca a pontuação agregada por `pointsByUser`, ordena por pontos decrescentes, mostra os 50 primeiros e calcula a posição do aluno na classificação completa. Nomes e selos são obtidos por `loadProfiles`; nenhum e-mail é exibido. O perfil usa a mesma fonte de pontos.

`pointsByUser` usa a RPC `points_by_user`, com fallback JS. Soma eventos de pontuação, curtidas de outras pessoas (+2) e mensagens (até cinco pontos diários). Os eventos também podem incluir marcos do Knowledge Universe. O ranking consultado não recebe período e não mantém snapshots de colocação. Empates seguem a ordem existente, sem regra de desempate explícita. O fallback agrupa mensagens por data UTC, enquanto a definição SQL usa America/Sao_Paulo — diferença preexistente que merece revisão própria. A comunicação de prêmio não representa, por si só, um mecanismo de fechamento e concessão automática.

## Alteração visual

- Ouro, prata e bronze nas três primeiras posições; esmeralda nas posições 4–10 e safira nas seguintes. As duas últimas são categorias visuais, sem bônus de pontos.
- Moedas com espessura em CSS 3D, face gravada em SVG, brilho animado, louros, número da colocação e verso com o logo original DriveData.
- Modal com giro por arraste/toque, setas do teclado, virar 180° e restaurar. Escape fecha; foco retorna ao acionador. Movimento reduzido remove animações automáticas.
- Medalhas pequenas na linha do aluno e nas demais posições. Pódio não reserva vagas vazias: um participante centralizado; dois e três em ordem visual 2–1–3.
- As medalhas representam a classificação atual, não uma conquista permanente. Não foram alterados pontos, permissões, recompensas, desempates ou dados dos alunos.
- `/ranking/medalhas` demonstra os componentes com nomes fictícios e permite conferir um, dois ou três participantes, sem consultar dados privados. Página com noindex.

## Próxima dimensão temporal

Uma experiência 4D real precisaria de períodos definidos e snapshots de posição/pontuação para reproduzir a evolução. Essa entrega é 3D interativa com efeitos animados, sem inventar histórico. Fechamento de temporadas, desempate e regras de entrega dos prêmios devem ser definidos separadamente antes de conceder medalhas permanentes.
