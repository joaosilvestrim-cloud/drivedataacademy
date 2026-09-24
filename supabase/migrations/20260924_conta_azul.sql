-- Venda da Academy no Conta Azul.
--
-- O objetivo: quando o Asaas confirma o pagamento de um aluno, nasce a venda
-- correspondente no Conta Azul, com cliente, serviço, categoria e centro de
-- custo preenchidos. A receita passa a estar registrada sozinha, e sobra para
-- uma pessoa só o clique de emitir a NFS-e.
--
-- Por que o clique sobra: a API da Conta Azul ainda não emite nota de
-- serviço. Ela tem GET /v1/notas-fiscais-servico para consultar e
-- POST /v1/vendas para criar a venda, e a própria documentação marca a
-- emissão como "em breve". A emissão automática que existe no produto deles
-- só dispara em pagamento feito pelas Cobranças Conta Azul, e o nosso entra
-- pelo Asaas, que é externo. Então o elo final é humano por limitação do
-- fornecedor, não por preguiça de automatizar.

-- ---------------------------------------------------------------- rastro
-- Sem isto não há como ser idempotente, e idempotência aqui não é luxo: a
-- API da Conta Azul não tem endpoint para apagar venda. Uma venda criada
-- duas vezes vira receita dobrada que alguém apaga na mão.
alter table public.orders add column if not exists ca_venda_id        text;
alter table public.orders add column if not exists ca_venda_numero    integer;
alter table public.orders add column if not exists ca_sincronizado_em timestamptz;
alter table public.orders add column if not exists ca_erro            text;

comment on column public.orders.ca_venda_id is
  'Id da venda criada no Conta Azul. Preenchido = já foi, não repetir.';
comment on column public.orders.ca_erro is
  'Última falha ao tentar criar a venda. Serve para o painel mostrar o que ficou para trás.';

create index if not exists orders_ca_pendentes_idx
  on public.orders (created_at)
  where status = 'paid' and ca_venda_id is null;

-- ------------------------------------------------------------------ token
-- Conexão OAuth própria da Academy, separada da que o DriveAzul usa.
--
-- São duas autorizações independentes de propósito. O refresh token da Conta
-- Azul ROTACIONA: cada renovação invalida o anterior. Duas aplicações
-- dividindo a mesma autorização se derrubariam em revezamento, e o sintoma
-- seria "às vezes o financeiro para", que é o pior tipo de bug.
--
-- Linha única forçada pelo check: não existe cenário de duas conexões aqui, e
-- deixar a porta aberta para uma segunda só criaria a pergunta "qual das duas
-- vale" no dia em que alguém clicasse em conectar duas vezes.
--
-- Os tokens entram cifrados em AES-256-GCM. A chave mora em CA_TOKEN_KEY, no
-- ambiente, nunca no banco: quem vazar um dump não leva a conexão junto.
create table if not exists public.integracao_conta_azul (
  id                smallint primary key default 1 check (id = 1),
  access_token_enc  text,
  refresh_token_enc text,
  expira_em         timestamptz,
  empresa           text,
  conectado_em      timestamptz,
  ultimo_erro       text,
  atualizado        timestamptz not null default now()
);

alter table public.integracao_conta_azul enable row level security;

-- ------------------------------------------------------------- configuração
-- Tabela própria, e não site_settings, de propósito.
--
-- site_settings tem policy de leitura para anon: o que entra lá é público.
-- Serve para URL de vídeo promocional, não para identificador interno do
-- ERP. Nenhum destes ids é credencial, e sozinhos não abrem nada sem o token
-- OAuth, mas publicar o mapa de contas da empresa não tem por que, e o dia
-- que alguém guardar um segredo em site_settings por hábito, o estrago já
-- estará feito.
--
-- Aqui não existe policy nenhuma com RLS ligado: só o service_role entra,
-- que é o webhook rodando no servidor.
create table if not exists public.integracao_config (
  chave      text primary key,
  valor      text,
  atualizado timestamptz not null default now()
);

alter table public.integracao_config enable row level security;

-- Os ids saem do cadastro real da Conta Azul da DriveData, lidos pela API.
-- Ficam em banco, e não em variável de ambiente, porque quem vai querer
-- trocar isso um dia é o financeiro, não quem faz deploy.
--
-- ca_ativo nasce 'false' de propósito. Enquanto estiver assim, o webhook do
-- Asaas segue como sempre foi e nada é enviado ao Conta Azul. Ligar é uma
-- decisão, não um efeito colateral de rodar a migration.
insert into public.integracao_config (chave, valor) values
  ('ca_ativo',              'false'),
  -- Receitas de Serviços (DRE: RECEITA_VENDA_PRODUTOS_SERVICOS)
  ('ca_categoria_id',       '65fc12a8-85eb-4c8c-bae7-db62390077c7'),
  -- 12 - Treinamentos e Capacitação
  ('ca_centro_custo_id',    'fc992dee-790f-11f0-aae2-432043e5218a'),
  -- "Instrução, treinamento, orientação pedagógica e educacional..."
  -- É a descrição do item 8.02 da lista de serviços, que é o código de ensino.
  ('ca_servico_id',         '7432e7c9-c24f-41cf-87f5-7706626af492'),
  -- Em branco: sem conta financeira a parcela nasce sem conta vinculada, que
  -- é o que se quer enquanto o dinheiro ainda está no Asaas.
  ('ca_conta_financeira_id', '')
on conflict (chave) do nothing;
