# Achados da migração

Registro operacional da Onda 1. **Registrar aqui não autoriza corrigir.** Cada
correção precisa de autorização própria, fora do lote em que foi descoberta.

Tipos: `BUG` quebra ou mente sobre o resultado · `RISCO` ação destrutiva sem
proteção · `DÍVIDA` decisão que cobra juros depois · `PRODUTO` pergunta que
não é técnica.

Status: `aberto` · `autorizado` · `corrigido` · `descartado`.

| ID | Tipo | Rota | Descrição | Impacto | Status | Descoberto em |
| --- | --- | --- | --- | --- | --- | --- |
| M-001 | BUG | `/admin/lives` | `required` vale só na criação. O mesmo formulário em modo edição aceita título e data vazios. | Live salva sem título aparece em branco na agenda do aluno. | aberto | Onda 1, estágio 1 |
| M-002 | RISCO | `/admin/lives` | Excluir não pede confirmação. | Um clique apaga a live e as vendas ficam órfãs. | aberto | Onda 1, estágio 1 |
| M-003 | BUG | `/admin/materiais` | Falha no envio do arquivo é engolida. A tela diz que salvou. | O lead recebe e-mail sem o material, ou com o arquivo antigo. | aberto | Onda 1, estágio 2 |
| M-004 | RISCO | `/admin/cobranca` | Excluir produto não pede confirmação. | Produto ativo some do checkout sem aviso. | aberto | Onda 1, lote A |
| M-005 | BUG | `/admin/posts` | `published_at` é regravado a cada salvamento porque o formulário não envia o campo e a action cai no `new Date()`. | A data de publicação vira a data do último salvamento. | aberto | Onda 1, lote C |
| M-006 | BUG | `/admin/posts` | Falha no envio da capa é engolida, igual a M-003. | Post salva com a capa antiga e a tela diz que deu certo. | aberto | Onda 1, lote C |
| M-007 | PRODUTO | `/admin/posts` | Não existe rota de blog neste repositório. A tela administra uma tabela cujo consumidor não foi identificado. | Pode ser trabalho mantido sem destino. | aberto | Onda 1, lote C |
| M-008 | DÍVIDA | `/admin/turma` e `/admin/turmas` | Singular é a assinatura mensal, plural é gestão de turmas. As duas pastas têm um arquivo `TurmaForm.tsx`. | Erro de navegação e de edição. Renomear muda rota e URL. | aberto | Onda 1, lote B |
| M-009 | DÍVIDA | `/admin/cursos` | `Curriculum.tsx` importa `setModuleRelease` de `/admin/lives`. | Acoplamento entre áreas que dificulta migrar qualquer uma das duas. | aberto | Pré-auditoria do lote D |
| M-010 | DÍVIDA | Design System | O fundo do estado desabilitado (`disabled:bg-ds-raised`) não prevalece sobre o fundo normal do controle. O estado continua inequívoco por opacidade, cursor e foco. | Cosmético. Medido em desenvolvimento, falta confirmar em produção. | aberto | Onda 1, lote D1 |
| M-011 | DÍVIDA | `/admin/universo` | A tela aceita construir configuração inválida e só avisa ao salvar: soma de pesos diferente de 100, pré-requisito de uma competência para ela mesma, relação de uma competência para ela mesma. O servidor rejeita nas três. | O administrador pode montar várias regras erradas e descobrir tudo de uma vez, numa única mensagem. | aberto | Onda 1, lote D2 |
| M-012 | BUG | `/admin/universo` | `revokeKnowledgeAccess` roda um update sem conferir quantas linhas mudaram. Aluno sem concessão individual gera zero linhas afetadas e a tela responde "A concessão individual foi encerrada". | Alto. O administrador acredita ter encerrado um acesso que nunca existiu, ou que existe por outro caminho, e não percebe. O seletor lista todos os alunos, não só os que têm concessão. | aberto | Onda 1, lote D3 |
| M-013 | DÍVIDA | `/admin/universo` | `grantKnowledgeAccess` faz upsert na chave primária de `ku_entitlements`. Conceder de novo sobrescreve validade e `granted_by`, sem histórico. Encerrar só carimba `expires_at` e não registra quem encerrou. | Alto para rastreabilidade. Não há como reconstruir quem concedeu o quê, por quanto tempo, nem quem encerrou. Contrasta com a evidência prática, que é append-only e auditável. | aberto | Onda 1, lote D3 |
| M-014 | BUG | `/admin/cursos` | `saveCourse` descarta o resultado do Supabase no update e no insert. Erro de banco não interrompe nada: a action segue para o redirect como se tivesse gravado. No insert que falha, o redirect vai para `/admin/cursos/` com id vazio. | Alto. O administrador edita um curso, é levado de volta à página do curso e acredita ter salvo. É a mesma classe de M-003 e M-006, agora sobre a gravação inteira e não só sobre o upload. | aberto | Onda 1, lote D4 |
| M-015 | BUG | `/admin/cursos` | `buildOptions` descarta alternativa em branco, inclusive quando é a marcada como correta. A pergunta é gravada sem nenhuma opção correta e nada avisa. Na correção, `opts[picked]?.correct` nunca é verdadeiro para ela. | Alto. Uma pergunta assim é impossível de acertar e trava a nota máxima abaixo do mínimo de aprovação. Com três perguntas e uma quebrada, o teto é 67% contra um mínimo padrão de 70%: ninguém passa e ninguém emite certificado. | aberto | Onda 1, lote D5 |
| M-016 | RISCO | `/admin/cursos` | Excluir avaliação e excluir pergunta não pedem confirmação. Excluir a avaliação leva junto todas as perguntas. | Médio. Um clique apaga o banco de perguntas do curso sem volta. | aberto | Onda 1, lote D5 |
| M-017 | BUG | `/admin/cursos` | Excluir módulo ou aula não pede confirmação e o banco apaga em cascata: módulo leva as aulas, e aula leva `lesson_progress` e `lesson_comments`. | Crítico. Um clique destrói progresso e comentários de aluno, não só conteúdo do administrador, e não há como desfazer. | aberto | Pré-auditoria do D6 |
| M-018 | BUG | `/admin/cursos` | `ku_activity_events` não tem chave estrangeira para `lessons`. Apagar uma aula remove o progresso mas mantém a evidência já registrada no Knowledge Universe. | Alto. O aluno fica com evidência de uma aula que não existe mais, e o score continua contando por ela. Anda junto com M-017. | aberto | Pré-auditoria do D6 |
| M-019 | RISCO | `/admin/cursos` | `moveItem` recebe `table` e `filter_col` por campo oculto e os usa direto em `from(table).eq(filterCol, ...)`, sem lista de valores permitidos, com cliente de service role. | Alto. Exige sessão de administrador, então não escala privilégio, mas é entrada do formulário chegando crua na consulta. Alcança qualquer tabela que tenha uma coluna `position`. | aberto | Pré-auditoria do D6 |
| M-020 | DÍVIDA | `/admin/cursos` | Das oito actions do Curriculum, só `saveLesson` dá retorno, por redirect com `?ok`. As outras sete não avisam nada, e nenhuma confere o resultado do banco. | Médio. O administrador renomeia, libera, cria ou apaga e não recebe confirmação nem erro. Mesma raiz de M-014. | aberto | Pré-auditoria do D6 |
| M-021 | DÍVIDA | `/admin/acessos` | A lista de pedidos traz `.limit(50)` e não existe paginação nem busca. Pedidos mais antigos não têm como ser alcançados por esta tela. | Médio. O administrador não consegue auditar um pagamento antigo. A tela migrada passou a dizer isso em palavras, mas dizer não resolve. | aberto | Onda 2, lote T1 |
| M-022 | DÍVIDA | `/admin/acessos` | A lista de acessos não tem limite: carrega todas as linhas de `memberships` e ainda pede `listUsers` com 1000 por página, em toda visita. | Médio hoje, alto com crescimento. A página não degrada aos poucos, ela para de abrir. Nenhuma busca ou filtro existe para reduzir o conjunto. | aberto | Onda 2, lote T1 |
| M-023 | DÍVIDA | `/admin/suporte` | `?status=abc` devolve lista vazia, não marca nenhuma opção como atual e mantém a URL inválida. Não há correção nem redirecionamento. | Baixo. O administrador pode chegar por um link torto e concluir que não há chamados. O texto de vazio agora diz o total existente, o que reduz a confusão sem mudar o comportamento. | aberto | Onda 2, lote T2 |

## Observações

**M-003 e M-006** são a mesma classe de defeito em dois lugares: o erro do
Storage é verificado e descartado. A correção é a mesma nos dois.

**M-005** só importa se algo ordenar ou exibir por `published_at`. Depende de
M-007.

**M-008** é decisão de produto, não de código. Renomear quebra links salvos.

**M-010** nasceu de uma medição no lote D1 e é o único item que toca a fundação,
que está congelada. Não reabre nada sozinho: é cosmético e o estado já é
perceptível por três outros sinais. Reapareceu no lote D2, nos mesmos termos e
sem impacto novo: mesmo consumidor, o `fieldset` do universo, agora cobrindo
também os cinco campos de peso e os seis de relação. Continua sem justificar
reabrir a fundação.

**M-011** é comportamento desenhado, não defeito: o cliente deixa montar e o
servidor valida em `validateDocument`, que checa a soma dos pesos e roda
detecção de ciclo nos pré-requisitos. O que se registra é o momento do retorno,
não a regra. Mexer nisso seria acrescentar validação que o código não tem, e o
D2 tinha instrução explícita de não fazer isso.

**M-012 e M-013** saíram da auditoria das actions no lote D3 e são de prioridade
alta porque tocam acesso e vigência. Nenhum dos dois foi corrigido: o D3 era
migração de apresentação, e corrigir exige autorização própria.

**M-012** tem a mesma forma do bug de perfil já resolvido em outro ponto do
produto: `update` sem linha afetada não é erro no PostgREST.

**M-013** é decisão de modelagem, não descuido: `ku_entitlements` tem `user_id`
como chave primária, então uma linha por aluno é o desenho. Registrar histórico
significaria outra tabela.

**M-014** tem um detalhe extra: `saveCourse` lê o título com
`(formData.get("title") as string).trim()`, sem proteção contra ausência. Hoje o
campo é obrigatório no navegador, então na prática não acontece, mas uma
requisição fora do formulário derruba a action.

**M-015** é o achado mais sério desta onda até agora, porque falha em silêncio e
o sintoma aparece longe da causa: o administrador vê a pergunta salva, e o aluno
descobre que não consegue passar. A interface migrada já diz em palavras que
alternativa em branco é descartada mesmo quando marcada como correta, mas dizer
não impede.

**M-016** vale junto com M-002 e M-004, que são a mesma ausência de confirmação
em outras telas. Se um dia forem tratados, vale tratar os três de uma vez.

**M-014** vale também para `quizActions.ts`: as seis actions do quiz descartam o
resultado do Supabase do mesmo jeito que `saveCourse`.

**M-017 e M-018** são o par mais sério do produto até agora e devem ser tratados
juntos: um destrói dado de aluno sem avisar, o outro deixa resíduo no histórico
quando isso acontece.

**M-019** ficou deliberadamente fora do D6: ordenação não pertence à família de
formulários e nenhum arquivo dela foi tocado.

**M-020** soma-se a M-014: a ausência de retorno e a ausência de verificação do
resultado do banco aparecem nas mesmas telas, por motivos diferentes.

O required assimétrico de aula, obrigatório na criação e opcional na edição,
é o mesmo defeito de M-001 em lives. Não abri item novo: quando M-001 for
tratado, vale conferir `/admin/cursos` junto.

**M-021 e M-022** são o mesmo assunto visto dos dois lados: uma tabela esconde
registros e a outra carrega todos. As duas precisam da mesma decisão de produto,
que é onde entra busca, filtro e paginação de servidor. O lote T1 não podia
criar nenhum dos três, porque acrescentar função não era o escopo.

**M-022 vale também para `/admin/suporte`**, medido no lote T2: a consulta de
chamados não tem limite e ainda carrega o perfil de todos os autores em toda
visita. As contagens por situação dependem de ter a lista inteira em memória,
então limitar a consulta exige decidir antes como contar.

**M-021 vale também para `/admin/comentarios`**, medido no lote T3: a fila de
moderação para em 300 comentários, sem paginação e sem busca. As contagens por
situação são calculadas sobre esses 300, então elas próprias ficam truncadas
quando a fila passa disso.

**M-016 vale também para `/admin/comentarios`**: excluir comentário não pede
confirmação, e ali o dado apagado é conteúdo de aluno.

**M-023** foi encontrado ao migrar, não corrigido. A mensagem de vazio antiga
imprimia a palavra `undefined` nesse caso, porque montava o texto a partir de
uma opção que não existe. A reescrita do texto fez esse efeito colateral
desaparecer, mas o comportamento do filtro continua o mesmo: lista vazia, URL
inválida preservada.

