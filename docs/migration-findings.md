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

