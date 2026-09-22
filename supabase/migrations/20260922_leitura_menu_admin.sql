-- Até quando cada admin já viu cada tela do painel.
--
-- Os badges do menu hoje contam só o que está parado esperando alguém agir:
-- chamado aberto, desafio para corrigir, pagamento sem acesso. Isso funciona
-- para fila, mas não para movimentação: comentário de aula, voto em enquete e
-- candidatura não ficam "pendentes", eles simplesmente acontecem, e o time só
-- descobre entrando na tela por acaso.
--
-- Com uma marca de leitura por pessoa e por tela, o badge passa a dizer
-- "chegou coisa nova desde a última vez que você olhou", e some sozinho quando
-- a pessoa olha. Por pessoa, e não global, porque duas pessoas do time não
-- leem as mesmas telas nos mesmos dias.

create table if not exists public.admin_menu_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- O href do item do menu, que é a chave que o AdminShell já usa nos badges.
  href text not null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, href)
);

-- Só o servidor lê e grava, com a service role. Não existe caso de o
-- navegador precisar falar com esta tabela direto.
alter table public.admin_menu_reads enable row level security;

comment on table public.admin_menu_reads is
  'Quando cada admin abriu cada tela do painel. Alimenta os badges de "tem coisa nova".';
