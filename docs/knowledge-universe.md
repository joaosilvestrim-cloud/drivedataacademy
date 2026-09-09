# Knowledge Universe 4D

## Estado da entrega

Integração acadêmica ativada no Supabase em 09/09/2026 após a execução da migração pelo responsável. Primeiro catálogo publicado com 3 macroáreas, 22 competências e 2 treinamentos associados. Foram importados 11 registros originais de 6 alunos; 3 possuem evidências que geram score. A repetição da importação não criou registros adicionais. A aplicação foi validada e está disponível localmente; não houve deploy da aplicação em produção nesta etapa.

- `/universo/demo`: demonstração pública com perfil fictício e período set/2025–set/2026.
- `/universo`: universo pessoal autenticado, alimentado pelo histórico real. Sem tabelas, apresenta estado de preparação; sem catálogo/evidências, apresenta estado vazio. Nunca substitui o histórico real por dados de demonstração.
- `/admin/universo`: catálogo, associações de cursos, regras, versões, registros práticos e acesso individual.
- Menu, Ferramentas e Perfil: entrada **Knowledge Universe 4D**. O preview do Perfil consulta a disponibilidade e o número real de competências desenvolvidas.

## Arquitetura implementada

1. **Banco:** catálogo em documentos JSONB versionados, atividades originais, snapshots e concessões individuais. A primeira versão agrupa taxonomia, rubricas, relações e associações em um documento validado para publicar uma configuração consistente de uma vez. A expansão corporativa poderá normalizar esse catálogo em tabelas específicas sem alterar o contrato do grafo.
2. **Ingestão:** triggers PostgreSQL registram evidências na mesma transação de progresso, avaliação e certificado. Repetições usam chaves idempotentes. Atividades práticas entram por Server Actions administrativas, com validação no servidor.
3. **Knowledge Engine:** funções determinísticas transformam atividades em evidências e calculam score, Freshness, prontidão e marcos. A projeção é calculada ao abrir o universo; um snapshot por aluno/versão/cursor registra o resultado. Freshness é recalculado na consulta. Ainda não há fila de processamento em segundo plano.
4. **Knowledge Graph:** o catálogo publicado define nós, hierarquia, posições, pesos de relações, requisitos e caminho; os scores determinam tamanho, brilho e estado.
5. **Experience Engine:** React Three Fiber/Three.js, com lista alternativa, painel de detalhes e timeline. O módulo não chama APIs de IA.

### Tabelas

| Tabela | Finalidade |
| --- | --- |
| `ku_catalog_draft` | Rascunho único com revisão para detectar edições simultâneas |
| `ku_catalog_versions` | Publicações imutáveis do catálogo e das regras |
| `ku_activity_events` | Evidências originais e eventos de correção, com data da atividade e data do registro |
| `ku_score_snapshots` | Projeções por aluno, versão e cursor de atividade |
| `ku_entitlements` | Liberação individual, permanente ou com validade |

RLS restringe atividades, snapshots e concessões ao próprio aluno. Escritas privilegiadas ficam no servidor. A migração também retira as permissões de escrita direta de alunos em progresso e de criação/alteração de matrículas; os fluxos existentes usam o cliente administrativo no servidor. Versões e atividades não podem ser sobrescritas pelo service role. Correções práticas geram um novo evento, mantendo o registro original auditável.

## Regra de pontuação

Para cada dimensão:

`pontos = peso × min(1, soma dos melhores créditos por grupo de equivalência / alvo da competência)`

Pesos iniciais, editáveis no painel e obrigatoriamente somando 100:

| Dimensão | Peso |
| --- | ---: |
| Aprendizagem | 25 |
| Avaliações | 35 |
| Exercícios | 15 |
| Desafios | 20 |
| Revisões | 5 |

- Curso associado: créditos distribuídos pela participação de cada competência. Os pesos de competências de um curso devem somar 100%.
- Progresso: proporção de aulas concluídas. Certificado e conclusão usam o mesmo grupo de aprendizagem, evitando crédito duplicado.
- Avaliação: créditos multiplicados pela nota normalizada. Tentativas equivalentes usam o melhor resultado.
- Prática: créditos multiplicados pela qualidade validada pelo administrador. Usar o mesmo grupo quando duas atividades medem a mesma evidência.
- Revisões: somente evidências qualificadas separadas por pelo menos sete dias.
- Acima de 79 pontos: exige avaliação avançada aprovada com nota mínima de 80% **e** desafio avançado qualificado com qualidade mínima de 80%.
- O valor exibido é truncado: 99,8 não vira 100. Cem indica conclusão da rubrica cadastrada, não garantia de conhecimento absoluto.
- Pré-requisitos indicam prontidão para aprender; não concedem automaticamente domínio ao nó de destino.

Freshness usa `100 × 2^(-dias desde a última evidência qualificada / meia-vida)`. A meia-vida é configurada por competência. O tempo reduz Freshness sem retirar o score conquistado. Correções de evidências ou novas rubricas podem alterar o score; essas alterações têm data efetiva.

## Histórico e quarta dimensão

O primeiro catálogo pode reconstruir avaliações e certificados antigos usando as datas existentes. Como o progresso anterior é mutável e não preserva todas as datas de conclusão, seu estado é importado como uma linha de base na data da importação. Não se inventam eventos passados.

Publicações posteriores passam a valer a partir da publicação. A mesma avaliação antiga, reimportada para uma nova associação, não muda uma visão anterior nem recebe uma data recente para inflar Freshness. O grupo de equivalência de uma associação já publicada deve ser preservado. A timeline seleciona a configuração vigente e filtra evidências por data efetiva.

Certificados revogados e evidências práticas corrigidas permanecem visíveis no período em que eram válidos. Os marcos já conquistados permanecem no histórico.

## Experiência

Órbita, zoom, arraste, seleção, pesquisa, filtro de macroárea, oportunidades, conexões destacadas, detalhes, cursos relacionados, timeline e reprodução automática. O fundo contém 900 estrelas em três camadas com rotação, deslocamento e brilho suave; respeita redução de movimento e pausa quando a aba fica oculta.

As abas mostram exploração, próximas conexões, caminho, práticas e marcos de 50/80/100. O exercício autocorrigido no navegador pertence somente à demonstração e não grava pontuação real. Na conta real, a aba de práticas exibe atividades validadas pela equipe.

O acesso está incluído na assinatura ativa existente ou pode ser concedido individualmente. Administradores também têm acesso. O término de uma liberação individual não encerra uma assinatura vigente.

## Ativar

1. Publicar ou executar esta versão da aplicação, que contém as validações de progresso e avaliação no servidor.
2. No SQL Editor do Supabase do projeto, executar o arquivo completo `supabase/migrations/20260909_knowledge_universe.sql`. A migração é transacional e pode ser repetida sem apagar os registros existentes.
3. Entrar como administrador em `/admin/universo`.
4. Cadastrar macroáreas e competências ou carregar a taxonomia inicial. Essa opção carrega somente a estrutura; não cria evidências fictícias para alunos.
5. Associar os cursos reais às competências, distribuir 100% dos pesos de cada curso e definir créditos, grupos de equivalência e rubricas.
6. Salvar o rascunho, validar a configuração e publicar. Ajustar as metas à quantidade e à qualidade das evidências que os cursos realmente oferecem.
7. Abrir `/universo` com uma conta elegível. O histórico dessa conta será importado idempotentemente. Validar com alunos piloto antes de ampliar a divulgação.

Não é necessário cadastrar chaves de IA. As variáveis Supabase existentes são usadas somente no servidor quando privilegiadas.

## Executar e verificar

```sh
npm install
npm run test:knowledge
npm run test:knowledge-db
npm run build
npm run start
```

Em Windows com certificados corporativos, a execução local pode precisar de `NODE_USE_SYSTEM_CA=1`. O teste de banco utiliza uma instância PGlite descartável e não modifica a base remota.

- `lib/knowledge/catalog.ts`: validação estrutural, ciclos, referências e orçamento dos pesos.
- `lib/knowledge/project.ts`: tradução e vigência das evidências.
- `lib/knowledge/engine.ts`: score, Freshness, prontidão e marcos.
- `lib/knowledge/server.ts`: acesso, importação, leitura e snapshot.
- `scripts/test-knowledge.cjs`: regressões do motor, projeção e validação de atividades.
- `scripts/test-knowledge-db.cjs`: migração, atomicidade, idempotência, RLS e permissões.

## Limites desta primeira integração

Ainda não foram implementados o universo corporativo, múltiplos caminhos independentes, o fluxo de entrega/correção de desafios pelo aluno nem marcos específicos de criação de clusters. As práticas reais são registradas e corrigidas administrativamente. O histórico é projetado na consulta, com limite de 50 mil registros por aluno; uma fila e projeções incrementais serão necessárias para volumes maiores. O seletor administrativo de práticas exibe até mil alunos.

Antes de ampliar o piloto, medir FPS e validar interação em dispositivos reais com mouse, touch e teclado. Não houve teste visual automatizado no navegador nesta etapa. A alternativa de lista mantém os detalhes acessíveis quando WebGL não está disponível.
