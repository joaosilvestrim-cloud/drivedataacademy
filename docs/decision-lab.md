# Decision Lab — missão Aurora Market

Ferramenta independente de simulação de negócios, integrada ao menu do aluno e ao hub de Ferramentas. Não utiliza o motor, as tabelas, os scores ou as conquistas do Knowledge Universe. Não faz chamadas a APIs de IA.

## Rotas e acesso

- `/decision-lab`: conta autenticada da Academy. Qualquer aluno autenticado pode jogar esta primeira versão.
- `/decision-lab/demo`: demonstração pública da mesma missão, com partidas locais separadas.
- O middleware renova a sessão da rota privada; o login preserva o destino `/decision-lab`.

A página herda o layout raiz, sem montar o assistente de IA do portal.

## O que o aluno faz

Assume uma loja fictícia com um produto, 500 unidades em estoque e uma reserva de caixa. Investiga dois meses de histórico e tenta atingir três metas em 30 dias: resultado acumulado, preservação do caixa e satisfação de pelo menos 70/100.

São seis ciclos de cinco dias. Cada plano define preço, gasto em divulgação, quantidade a comprar, entrega normal/expressa e equipes extras. Os controles das quatro áreas compõem um único plano, confirmado antes de aplicar. Depois da simulação, o aluno vê consequências explicadas, revisita o histórico e compara estratégias.

### Níveis

| Nível | Caixa inicial | Meta de resultado |
| --- | ---: | ---: |
| Explorador | R$ 36.000 | R$ 16.000 |
| Gestor | R$ 26.000 | R$ 22.000 |
| Estrategista | R$ 19.000 | R$ 26.000 |

Cada nível usa os mesmos eventos e mecanismos; muda a margem disponível para experimentar e a meta final. A missão termina no dia 30 ou quando o caixa não cobre o custo fixo mínimo do próximo ciclo.

## Regras do cenário

- **Procura:** `arredondar(5 × 85 × fator do evento × (55/preço)^1,6 × (1 + 0,14 × ln(1 + divulgação/300)) × (0,65 + satisfação/200))`.
- **Capacidade por ciclo:** 400 vendas na estrutura base, mais 100 por equipe extra.
- **Vendas:** menor valor entre procura, capacidade e estoque disponível.
- **Custos operacionais por ciclo:** R$ 3.250 fixos, mais divulgação e R$ 750 por equipe extra.
- **Entrega normal:** paga agora, disponível no começo do próximo ciclo. Uma compra normal no último ciclo fica em trânsito ao encerrar a missão.
- **Entrega expressa:** disponível no mesmo ciclo, com acréscimo de 15% ao custo de compra.
- **Produtos vendidos:** custo médio ponderado do estoque disponível; arredondamento monetário em centavos.
- **Resultado:** receita menos custo dos produtos vendidos e custos operacionais.
- **Caixa:** caixa anterior menos compras e custos operacionais, mais receita recebida à vista.
- **Satisfação:** atendimento de pelo menos 95% da procura acrescenta 4 pontos; abaixo disso, a redução é proporcional à procura não atendida. Preço acima de R$ 70 reduz mais 2 pontos. Indicador limitado a 0–100.

Eventos definidos em `lib/decision-lab/engine.ts`: concorrência em promoção, aumento de procura, mudança no custo dos fornecedores e fechamento do mês. As mesmas decisões geram os mesmos resultados. Não há sorte, previsão de mercado real ou avaliação por IA.

O pagamento antecipado precisa caber no caixa antes de vender. O estoque comprado é um ativo, não uma despesa imediata. O teste contábil verifica, a cada ciclo, a identidade `caixa + estoque + estoque em trânsito = ativos iniciais + resultado acumulado`.

Esta missão simplifica impostos, crédito, devoluções e múltiplos produtos. Esses fatores não estão implementados e são explicitados em “Como jogar”.

## Salvamento e arquivos

As partidas ficam no `localStorage`, com chave por usuário autenticado e chave distinta para a demonstração. Até cinco estratégias são mantidas. A criação da sexta avisa que a mais antiga será removida e oferece a exportação existente. Limpar os dados do navegador remove as partidas locais.

- Exportar/importar JSON permite transportar até cinco estratégias entre dispositivos.
- A importação tem limite de 200 KB e valida versão, identificadores, nomes, datas, nível e até seis decisões por estratégia.
- Resultados importados nunca são aceitos como fonte: o motor recalcula a partida inteira a partir das decisões.
- A importação pede confirmação antes de substituir partidas e permite exportar um backup.
- Falhas no armazenamento são informadas; uma gravação não é apresentada como bem-sucedida quando o navegador a rejeita.
- O relatório pode ser baixado em texto, com decisões, consequências, resultado e metas.

O salvamento é local, sem sincronização no Supabase. Não há ranking competitivo ou nota acadêmica: o cliente executa a simulação e não é fonte de evidência para outras ferramentas. Para adicionar classificação oficial ou sincronização, será necessário persistir comandos e reprocessar resultados no servidor com autenticação.

## Experiência visual

Quatro prédios selecionáveis em Three.js/React Three Fiber representam Vendas, Estoque, Financeiro e Operações. A cena usa geometria local, sem imagens ou modelos externos. Veículos circulam, o estoque visual reflete a quantidade disponível, e a área selecionada recebe destaque.

Botões de área oferecem os mesmos controles por teclado. Há zoom, órbita, centralização e redução de movimento. A animação para quando a aba fica oculta. A câmera ajusta o enquadramento em telas pequenas. Se a cena falhar, as decisões permanecem acessíveis pelos botões.

## Validação

```sh
npm run test:decision-lab
npm run build
npm run start
```

Treze testes cobrem contabilidade, entregas, caixa, procura, capacidade, satisfação, determinismo, fim da missão, critérios atingíveis nos três níveis, arquivos inválidos e ausência de dependências do Knowledge Universe/IA. Incluem cem sequências de decisões geradas de forma reproduzível.

O fluxo foi exercitado no navegador local: seleção de áreas, alteração de planos, seis ciclos completos, relatório final e comparação, retomada após recarregar, consulta histórica e criação de uma segunda estratégia. O layout foi conferido em desktop e largura de celular, sem rolagem horizontal da página. Não houve teste em aparelho físico nem deploy de produção nesta entrega.
