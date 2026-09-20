-- Tradução do conteúdo que mora no banco: curso, módulo, aula, live, material.
--
-- Por que uma tabela só, e não uma coluna title_en em cada tabela: o texto
-- traduzido não é atributo do curso, é uma versão dele. Coluna por idioma
-- obriga a mexer no schema toda vez que entra uma língua, e deixa cada tabela
-- com metade das colunas vazias. Aqui, quem não tem tradução simplesmente não
-- tem linha, e a tela cai no português.
--
-- A chave é (tabela, registro, campo, idioma). "tabela" e "campo" são texto e
-- não enum de propósito: quando um módulo novo precisar traduzir um campo
-- novo, basta gravar, sem migration.

create table if not exists public.content_translations (
  tabela     text not null,
  registro   uuid not null,
  campo      text not null,
  idioma     text not null check (idioma in ('en', 'es')),
  texto      text not null,
  -- de onde veio: 'ia' quando o gerador escreveu, 'humano' quando alguém
  -- revisou. Serve para a tela mostrar o que ainda não passou por gente.
  origem     text not null default 'ia' check (origem in ('ia', 'humano')),
  updated_at timestamptz not null default now(),
  primary key (tabela, registro, campo, idioma)
);

create index if not exists content_translations_registro_idx
  on public.content_translations (tabela, registro);

alter table public.content_translations enable row level security;

-- Leitura para quem está logado: é o texto da tela do aluno.
drop policy if exists "traducoes read" on public.content_translations;
create policy "traducoes read" on public.content_translations
  for select to authenticated using (true);

-- Escrita só pelo service role (o admin passa por ele), então não há policy
-- de insert/update aqui de propósito.
