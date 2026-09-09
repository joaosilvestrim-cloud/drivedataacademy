# Knowledge Universe 4D — protótipo funcional

Etapa 1 implementada. O módulo é demonstrativo e não lê nem grava scores acadêmicos reais.

- `/universo/demo`: demonstração pública com perfil fictício e período fixo set/2025–set/2026; independente de Supabase e IA.
- `/universo`: a mesma experiência, com autenticação do portal. O middleware renova a sessão nessa rota.
- Entradas adicionadas em Ferramentas, menu do aluno e preview no Perfil.
- O acesso aparece como **Knowledge Universe 4D** no menu, no Perfil e em Ferramentas.
- O fundo tem 900 estrelas em três camadas, com rotação lenta, deslocamento e brilho suave. A animação respeita a redução de movimento e pausa quando a aba fica oculta; as posições das competências permanecem independentes do fundo.

## Executar

```sh
npm install
npm run dev
npm run test:knowledge
npm run build
```

Preview local: `http://localhost:3008/universo/demo`.

## Componentes

- `lib/knowledge/types.ts`: contratos de catálogo, evidências e scores.
- `lib/knowledge/engine.ts`: funções puras de score, Freshness, prontidão e marcos.
- `lib/knowledge/demo.ts`: catálogo fictício declarativo, atividades datadas e exercício demonstrativo.
- `components/knowledge`: experiência, cena Three.js, estilos isolados e preview leve do perfil.
- `scripts/test-knowledge.cjs`: testes de regressão do motor com o compilador TypeScript já instalado.

O cenário é inteiramente calculado pelas evidências. Não existem scores finais pré-definidos. Pontos de aprendizagem são limitados a 25, avaliações equivalentes usam o melhor resultado, retenção exige espaçamento e nível avançado exige evidência avançada de avaliação e desafio. O protótipo simplifica os objetivos para grupos de equivalência por dimensão. O cadastro de objetivos e rubricas versionadas será parte da integração acadêmica.

A interface contém seleção, busca, filtros, zoom, órbita, pan, detalhes, lista acessível, timeline, replay, caminhos, condições de desbloqueio, marcos e exercício local. Acertar o exercício melhora DAX apenas em memória; recarregar ou reiniciar restaura os dados demonstrativos. A correção no cliente é intencional somente na demo e não pode ser reutilizada como autoridade para score real.

## Próxima etapa

Criar migrações, catálogo administrativo, mapas curso/competência, ingestão validada e atômica, histórico append-only, fila idempotente, RLS, concessões premium e importação do legado. A plataforma atual tem progresso mutável: não reconstruir datas desconhecidas como se fossem históricas.

O layout do Universo herda apenas o layout raiz, sem `AssistantButton` nem `lib/ai.ts`. A competência “IA” é um item do catálogo. O restante da plataforma mantém suas integrações existentes.

Antes do piloto com alunos, medir FPS em dispositivos reais e verificar interações com mouse, touch e teclado. A alternativa de lista preserva os detalhes quando WebGL não está disponível. Não houve publicação em produção nesta etapa.
