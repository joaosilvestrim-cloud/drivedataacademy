/* Corpora da Caixa-Preta.

   Três textos curtos e de assuntos bem diferentes. A comparação entre eles é a
   aula: o mesmo começo de frase gera continuações completamente diferentes
   conforme o corpus, e um corpus que nunca falou de um assunto responde
   qualquer coisa sobre ele, com a mesma confiança.

   São curtos de propósito. Corpus grande deixa a geração mais convincente e
   esconde o mecanismo, que é justamente o que a ferramenta quer mostrar. */

export type Corpus = { id: string; nome: string; assunto: string; texto: string };

const POWERBI = `
No Power BI, o modelo começa pela tabela de calendário. Sem uma tabela de calendário marcada como tabela de datas, a inteligência de tempo do DAX não funciona direito.
A tabela de fatos guarda os eventos do negócio, como vendas, pedidos e movimentações. As tabelas de dimensão guardam o contexto, como cliente, produto e data.
O relacionamento entre a dimensão e o fato deve ser de um para muitos, com o filtro em um sentido só. Relacionamento bidirecional abre caminho ambíguo e derruba a performance.
A medida calcula no contexto do visual. A coluna calculada ocupa memória no modelo e é calculada na atualização.
Use DIVIDE em vez da barra, porque a divisão por zero devolve vazio em vez de erro.
Evite FILTER sobre a tabela inteira dentro de CALCULATE, porque a varredura linha a linha custa caro em tabela grande.
A medida de receita soma a quantidade vezes o valor unitário dos itens do pedido pago.
O acumulado do ano usa TOTALYTD sobre a coluna de data do calendário.
A comparação com o ano anterior usa SAMEPERIODLASTYEAR, que respeita o filtro do visual, seja dia, mês ou trimestre.
Uma página com muitos visuais demora a abrir, porque cada visual é uma consulta ao modelo.
O título automático do visual descreve o cálculo, e não a pergunta que o visual responde.
`;

const CONTRATO = `
As partes acima qualificadas resolvem celebrar o presente instrumento particular de prestação de serviços, que se regerá pelas cláusulas seguintes.
A contratada obriga-se a prestar os serviços descritos no anexo, observando os prazos e os padrões técnicos acordados entre as partes.
O presente contrato vigorará pelo prazo de doze meses, contados da data de assinatura, renovando-se automaticamente por iguais períodos, salvo manifestação em contrário.
A remuneração será paga mensalmente, até o quinto dia útil do mês subsequente ao da prestação dos serviços, mediante apresentação da nota fiscal.
O atraso no pagamento sujeitará a contratante a multa de dois por cento sobre o valor devido, acrescida de juros de mora de um por cento ao mês.
As partes obrigam-se a manter sigilo sobre toda informação confidencial a que tiverem acesso em razão deste contrato, ainda que após o seu término.
A rescisão poderá ser promovida por qualquer das partes, mediante aviso prévio de trinta dias, sem prejuízo das obrigações já assumidas.
Fica eleito o foro da comarca da sede da contratante para dirimir as controvérsias oriundas do presente instrumento, com renúncia a qualquer outro.
`;

const RECEITAS = `
Para o bolo de fubá, misture os ovos, o açúcar e o óleo até ficar homogêneo. Depois acrescente o fubá, a farinha e o leite.
Adicione o fermento por último e misture devagar, apenas o suficiente para incorporar.
Leve ao forno preaquecido a cento e oitenta graus por aproximadamente quarenta minutos, até que o palito saia limpo.
Para o arroz soltinho, refogue o alho no óleo até dourar, junte o arroz e mexa por um minuto antes de colocar a água fervente.
Tempere com sal, abaixe o fogo e deixe cozinhar com a panela tampada até a água secar.
Para o molho de tomate, refogue a cebola e o alho, acrescente o tomate picado e deixe apurar em fogo baixo por trinta minutos.
Finalize com sal, açúcar para corrigir a acidez e folhas de manjericão fresco.
O segredo do feijão é deixar de molho na véspera e cozinhar em fogo baixo, com a panela bem tampada.
`;

export const CORPORA: Corpus[] = [
  { id: "powerbi", nome: "Power BI e DAX", assunto: "modelagem e medidas", texto: POWERBI.trim() },
  { id: "contrato", nome: "Contrato jurídico", assunto: "cláusulas e prazos", texto: CONTRATO.trim() },
  { id: "receitas", nome: "Receitas de cozinha", assunto: "modo de preparo", texto: RECEITAS.trim() },
];

/* Começos de frase que mostram o ponto. O último é o mais importante: um
   assunto que nenhum corpus domina, para o aluno ver o modelo respondendo
   assim mesmo, com a mesma cara de certeza. */
export const COMECOS = [
  "A tabela de calendário",
  "O relacionamento entre",
  "As partes obrigam-se a",
  "Misture os ovos",
  "O CPF do cliente é",
];
