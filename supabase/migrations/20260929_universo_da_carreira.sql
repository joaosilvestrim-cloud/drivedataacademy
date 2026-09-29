-- Universo da carreira: o que o portfólio do aluno passa a contar além das
-- competências.
--
-- Cada objeto do Universo 4D público vira um tipo de fato da carreira:
--   planetas     projetos (detalhes novos em portfolio_projeto_detalhes)
--   luas         certificados (já existem)
--   nave         trajetória profissional (portfolio_experiencias)
--   nebulosas    setores de negócio (setor do projeto e da experiência)
--   cometas      conquistas (portfolio_conquistas)
--   sinais       recomendações de colegas (portfolio_recomendacoes)
--   estrela-guia objetivo profissional (portfolio_objetivos)
--
-- Tudo em tabelas NOVAS, de propósito. Nenhuma coluna de tabela existente
-- muda, então o portfólio, o site e o 4D continuam funcionando do mesmo jeito
-- antes e depois desta migration. Sem ela, as partes novas ficam escondidas.
--
-- RLS ligada e sem política: tudo passa pelo servidor com a service role, que
-- confere dono e acesso.

-- Planetas: o que o projeto conta além do texto.
create table if not exists public.portfolio_projeto_detalhes (
  project_id uuid primary key references public.portfolio_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- O que foi da pessoa e o que foi do time. Primeira pergunta de entrevista.
  papel text,
  time_tamanho int check (time_tamanho is null or time_tamanho between 1 and 500),
  duracao_meses int check (duracao_meses is null or duracao_meses between 1 and 240),
  -- O que aprendeu ou faria diferente. Sinal de maturidade.
  aprendizado text,
  setor text,
  atualizado_em timestamptz not null default now()
);

-- A nave: por onde a pessoa passou.
create table if not exists public.portfolio_experiencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cargo text not null,
  organizacao text,
  setor text,
  inicio date,
  -- Nulo quando é a posição atual.
  fim date,
  descricao text,
  criado_em timestamptz not null default now()
);
create index if not exists portfolio_experiencias_user on public.portfolio_experiencias (user_id);

-- Cometas: marcos da carreira, sempre com data e, de preferência, prova.
create table if not exists public.portfolio_conquistas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  data date,
  descricao text,
  link_prova text,
  criado_em timestamptz not null default now()
);
create index if not exists portfolio_conquistas_user on public.portfolio_conquistas (user_id);

-- Sinais de rádio: recomendação escrita por outra pessoa.
--
-- O aluno gera um convite, o colega escreve por um link, confirma o próprio
-- e-mail, e só então o aluno aprova. O texto nunca é do aluno: é por isso que
-- a recomendação vale alguma coisa. O e-mail do autor fica aqui e nunca vai
-- para a página pública.
create table if not exists public.portfolio_recomendacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.portfolio_projects (id) on delete set null,
  token text not null unique,
  codigo_email text,
  -- convite: link gerado, ninguém escreveu ainda
  -- aguardando_email: escrita, falta o autor confirmar o e-mail
  -- aguardando_aprovacao: autor confirmado, falta o aluno aprovar
  -- aprovada / recusada: decisão do aluno
  status text not null default 'convite' check (status in ('convite', 'aguardando_email', 'aguardando_aprovacao', 'aprovada', 'recusada')),
  autor_nome text,
  autor_cargo text,
  autor_email text,
  relacao text,
  texto text,
  criado_em timestamptz not null default now(),
  escrito_em timestamptz,
  confirmado_em timestamptz,
  aprovado_em timestamptz
);
create index if not exists portfolio_recomendacoes_user on public.portfolio_recomendacoes (user_id);

-- Estrela-guia: para onde a pessoa quer ir, e o que o cargo pede.
create table if not exists public.portfolio_objetivos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  titulo text not null,
  -- Competências do catálogo que o cargo pede, com o motivo. Lidas uma vez,
  -- quando o aluno define o objetivo.
  requeridas jsonb,
  atualizado_em timestamptz not null default now()
);

-- Freio da comparação com vaga na página pública, que chama IA a cada uso.
create table if not exists public.portfolio_consultas (
  id bigint generated always as identity primary key,
  slug text not null,
  origem text not null,
  criado_em timestamptz not null default now()
);
create index if not exists portfolio_consultas_recentes on public.portfolio_consultas (slug, origem, criado_em desc);

alter table public.portfolio_projeto_detalhes enable row level security;
alter table public.portfolio_experiencias enable row level security;
alter table public.portfolio_conquistas enable row level security;
alter table public.portfolio_recomendacoes enable row level security;
alter table public.portfolio_objetivos enable row level security;
alter table public.portfolio_consultas enable row level security;

notify pgrst, 'reload schema';
