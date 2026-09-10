# DataFlow Lab — primeiro protótipo

Ferramenta independente de Knowledge Universe e Decision Lab. A rota `/dataflow-lab` exige login; `/dataflow-lab/demo` permite experimentar sem conta. Entrada em Ferramentas e no menu do aluno. Usa o logo original DriveData.

## Experiência

Cinco estações selecionáveis em Three.js: fontes, limpeza, filtro, junção e SQL. Orbit permite girar, aproximar e deslocar câmera; botão restaura a vista. Visão 2D e botões HTML oferecem navegação por teclado e alternativa a WebGL. Layout responsivo, preferência de movimento reduzido e pausa quando a aba fica oculta.

A timeline reproduz a sequência lógica de uma execução já concluída, com pausa, seleção e velocidade. Não mede tempo de processamento. Partículas são ilustrativas; tabelas e contagens vêm do motor. Cada etapa oferece saída, entrada quando aplicável, paginação e CSV. SQL apresenta barras quando há texto e números. A execução anterior fica disponível para comparar contagens, consulta e tabela final.

## Caso Aurora

24 pedidos, 7 registros de clientes, uma chave duplicada e quatro cancelamentos. A junção inicial gera 28 linhas. Limpar clientes por `cliente_id` e filtrar pedidos com `status = aprovado` produz 20 pedidos válidos sem multiplicação. SQL agrega faturamento por região. Dados fictícios, regras determinísticas.

## Motor e limites

- CSV UTF-8: vírgula ou ponto e vírgula, BOM, campos com aspas, aspas escapadas e quebras de linha. Cabeçalhos únicos sem distinguir maiúsculas, até 40 colunas / 80 caracteres. Até 1 MB e 5.000 registros por fonte.
- Inferência numérica por coluna inteira, decimal com ponto. Identificadores como `001` e números além da precisão segura permanecem texto. Campos vazios viram NULL.
- Limpeza mantém a primeira linha de cada chave não nula; chaves nulas ficam. Deve ser aplicada após avaliar conflitos nos dados reais.
- Filtro: igualdade textual exata. Junção LEFT com índice, chaves do mesmo tipo, NULL nunca corresponde a NULL, até 10.000 linhas. Colunas conflitantes recebem prefixo `cliente_`.
- SQL: SQLite via sql.js 1.13.0, WASM e JS servidos localmente em `/vendor/sqljs`, licença incluída. Documentação: https://sql.js.org/documentation/ e https://github.com/sql-js/sql.js/.
- Worker separado: banco temporário, parâmetros vinculados, identificadores escapados, `query_only`, consulta como subquery SELECT, retorno de até 1.000 linhas explicitamente sinalizado. Timeout de 8 segundos encerra o Worker. Não usa APIs de IA.
- Tabelas SQL: `pedidos` original, `clientes` após limpeza, `fluxo` após filtro/junção. Esquema não usa afinidade de coluna para preservar tipos originais.
- Arquivos não são enviados ao servidor. Dados e duas execuções ficam em memória nesta aba, sem salvamento automático. Exportação CSV protege contra fórmulas de planilha e exporta apenas a tabela exibida (SQL limitado a 1.000 linhas). SQL pode ser baixado separadamente.

## Validação

`npm run test:dataflow` cobre CSV, dados malformados, limites, contabilidade de linhas, preservação das entradas, tipos e NULL em junções, exportação e consultas reais SQLite no mesmo código do Worker. `npm run build` valida tipos, lint e páginas.

## Evolução posterior

O protótipo tem uma sequência fixa com estações configuráveis. Editor de topologia com arrastar/conectar, rastreamento individual de registros, histórico persistente de projetos, novos operadores e missões adicionais não fazem parte desta versão.
