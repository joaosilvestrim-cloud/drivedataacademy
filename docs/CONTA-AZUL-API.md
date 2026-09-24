# API da Conta Azul: o que é verdade e o que a documentação erra

Tudo aqui foi descoberto batendo na API de produção em 24/09/2026, porque a
documentação oficial está errada em pontos que quebram a integração. Se algum
dia o comportamento mudar, o jeito de conferir é o mesmo: mandar corpo
incompleto e ler o erro de validação.

## Armadilhas

**O endpoint de venda é `/v1/venda`, no singular.** A documentação manda usar
`POST /v1/vendas`. Essa rota devolve 404, tanto em GET quanto em POST.

**Não existe `GET /v1/venda`.** Só dá para criar, não para listar. Isso importa
porque o campo `numero` é obrigatório e quem fornece é quem chama: sem
listagem, não há como descobrir onde a numeração está. A Academy mantém o
próprio contador em `integracao_config.ca_proximo_numero`, e o valor inicial
saiu do painel, onde a tela de nova venda já mostra o próximo número.

**`opcao_condicao_pagamento` quer texto, não código.** Os valores aceitos são
a string `"À vista"`, com acento, ou o padrão de parcelas (`1x`, `12x`), ou de
dias (`30`, `30,60`, `15,30,45`). Mandar `A_VISTA` dá 400.

**A resposta de lista muda de formato por endpoint.** `/v1/pessoas` devolve
`{totalItems, items}` em camelCase e `/v1/categorias` devolve
`{itens_totais, itens}` em português. Ler a chave errada não dá erro: dá lista
vazia, que parece "não achei". É por isso que existe `caLista` em
`lib/conta-azul.ts`.

**`tamanho_pagina` só aceita valores de uma lista, e a lista muda.** Em
`/v1/pessoas` são 10, 20, 50, 100, 200, 500 ou 1000. Em
`/v1/notas-fiscais-servico` são só 10, 20, 50 ou 100. Valor fora da lista dá
400.

**`/v1/notas-fiscais-servico` exige janela de no máximo 15 dias** entre
`data_competencia_de` e `data_competencia_ate`.

**A Conta Azul NÃO valida dígito verificador de CPF.** Um CPF inventado é
aceito e vira cadastro. Quem chama precisa validar antes, porque o estrago
chega na nota fiscal.

**Não existe DELETE de pessoa.** `DELETE /v1/pessoas/{id}` devolve 405. O
único desfazer é `PATCH /v1/pessoas/{id}` com `{"ativo": false}`, que desativa
mas não apaga.

**Não existe endpoint para apagar venda.** É por isso que `caPost` não repete
em erro: um POST que deu timeout depois de ter entrado do outro lado viraria
receita dobrada no DRE, sem como desfazer pela API.

## Emissão de nota

A API **não emite** NFS-e. Só consulta, em `GET /v1/notas-fiscais-servico`. A
documentação deles marca a emissão como "em breve".

A emissão automática que existe no produto só dispara quando o pagamento entra
pelas Cobranças Conta Azul. O nosso entra pelo Asaas, que é externo, então não
dispara. O clique de emitir é humano por limitação do fornecedor.

## Criar pessoa

```
POST /v1/pessoas
{
  "tipo_pessoa": "Física",                      // ou "Jurídica", "Estrangeira"
  "nome":        "Maria Oliveira Santos",
  "documento":   "12345678901",                 // só dígitos
  "perfis":      [{ "tipo_perfil": "Cliente" }], // ARRAY de objeto, não de string
  "email":       "maria@exemplo.com",
  "telefone":    "11999999999"
}
```

O `perfis` foi o campo mais difícil: erra como string, erra como objeto, e a
mensagem de erro muda de `models.PersonProfilesCreate` para
`[]models.PersonProfilesCreate` conforme o palpite, que é a dica de que é
array.

Para não duplicar cliente, procure antes com `busca` recebendo o documento:
`GET /v1/pessoas?busca=12345678901`. O `busca` funciona por documento e por
nome, mas **não** por e-mail.

## Criar venda

```
POST /v1/venda
{
  "id_cliente":      "<uuid da pessoa>",
  "numero":          323,
  "situacao":        "APROVADO",                 // ou "EM_ANDAMENTO"
  "data_venda":      "2026-09-24",
  "id_categoria":    "<uuid>",                   // opcional
  "id_centro_custo": "<uuid>",                   // opcional
  "itens": [
    { "id": "<uuid do serviço>", "quantidade": 1, "valor": 80.91 }
  ],
  "condicao_pagamento": {
    "opcao_condicao_pagamento": "À vista",
    "parcelas": [ { "data_vencimento": "2026-09-24", "valor": 80.91 } ]
  }
}
```

A ordem de validação é campo a campo, um erro por vez, o que permite mapear o
contrato inteiro sem criar nada: basta manter um `id_cliente` que não existe.
Todo o resto é validado antes de a API reclamar do cliente.

## Ids em uso na DriveData

| Config | Valor | O que é |
| --- | --- | --- |
| `ca_categoria_id` | `ef8d3c66-…0876f25` | Receitas de Vendas |
| `ca_centro_custo_id` | `fc992dee-…aac4b96` | 12 · Treinamentos e Capacitação |
| `ca_servico_id` | `7432e7c9-…706626af492` | Instrução, treinamento, orientação pedagógica (item 8.02) |
