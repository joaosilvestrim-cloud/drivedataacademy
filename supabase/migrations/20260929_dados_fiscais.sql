-- Dados para a nota fiscal do aluno pagante.
--
-- A NFS-e é emitida pela Tamires no Conta Azul, e o cadastro do cliente lá
-- precisa de endereço completo e RG. O checkout só pede endereço como
-- opcional, e a maioria não preenche, então o aluno completa no perfil.
--
-- O CPF de quem pagou pelo Asaas continua morando no Asaas: a Academy não
-- guarda. A coluna cpf aqui só é usada por quem pagou por fora (Pix direto,
-- transferência), que não tem cadastro no Asaas.
--
-- ca_* registra a última sincronização com o Conta Azul, para o time ver o
-- que não chegou lá.
--
-- RLS ligada e sem política: tudo passa pelo servidor com a service role.

create table if not exists public.dados_fiscais (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cpf text,
  rg text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  atualizado_em timestamptz not null default now(),
  ca_pessoa_id text,
  ca_sincronizado_em timestamptz,
  ca_erro text
);

alter table public.dados_fiscais enable row level security;

notify pgrst, 'reload schema';
