-- Biblioteca de ebooks da Academy.
--
-- Duas tabelas, e não uma, porque o mesmo ebook existe em mais de um idioma.
-- Com uma coluna por idioma (arquivo_pt, arquivo_en...) entraria migration
-- toda vez que uma língua nova aparecesse, e o dia em que um ebook sair só em
-- espanhol a tabela ficaria com duas colunas vazias.
--
-- Aqui o ebook é a obra e o arquivo é a edição. Quem não tem edição num
-- idioma simplesmente não tem linha, e a tela oferece as que existem.

create table if not exists public.ebooks (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  slug        text unique not null,
  title       text not null,
  subtitle    text,
  description text,
  autor       text,
  paginas     int,
  cover_url   text,
  published   boolean not null default false,
  position    int not null default 0
);

create table if not exists public.ebook_files (
  ebook_id   uuid not null references public.ebooks(id) on delete cascade,
  idioma     text not null check (idioma in ('pt', 'en', 'es')),
  -- Caminho no bucket privado "ebooks". O endereço do arquivo nunca vai para
  -- a tela: o download passa por uma rota que confere a assinatura e devolve
  -- um link assinado de vida curta.
  file_path  text not null,
  file_name  text,
  file_size  bigint,
  created_at timestamptz not null default now(),
  primary key (ebook_id, idioma)
);

create index if not exists ebooks_pub_idx on public.ebooks (published, position);

alter table public.ebooks enable row level security;
alter table public.ebook_files enable row level security;

-- Leitura para quem está logado. A conferência de assinatura é feita na rota
-- de download, que é onde o arquivo realmente sai.
drop policy if exists "ebooks read" on public.ebooks;
create policy "ebooks read" on public.ebooks
  for select to authenticated using (published);

drop policy if exists "ebook files read" on public.ebook_files;
create policy "ebook files read" on public.ebook_files
  for select to authenticated using (true);

-- Escrita só pelo service role, como nas outras tabelas de conteúdo.
