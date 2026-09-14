-- Materiais prontos: arquivos de Power BI, templates e planilhas que o aluno
-- assinante baixa na área dele.
--
-- É diferente de public.materials, que é isca de marketing com arquivo público
-- e formulário de lead. Aqui o arquivo fica num bucket PRIVADO e só sai por
-- link assinado de curta duração, gerado depois de conferir a assinatura.

create table if not exists public.ready_materials (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  title        text not null,
  description  text,
  category     text not null default 'powerbi',  -- powerbi | template | planilha | outro
  file_path    text,      -- caminho no bucket privado "materiais-prontos"
  file_name    text,      -- nome original, usado como nome do download
  file_size    bigint,
  external_url text,      -- alternativa ao arquivo: link de Drive, GitHub etc.
  cover_url    text,
  published    boolean not null default false,
  position     int not null default 0
);
create index if not exists ready_materials_pub_idx on public.ready_materials (published, position);
alter table public.ready_materials enable row level security;
-- Sem policy de propósito: só o servidor, com a chave de serviço, lê e grava.

create table if not exists public.ready_material_downloads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  material_id uuid not null references public.ready_materials(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade
);
create index if not exists ready_material_downloads_mat_idx on public.ready_material_downloads (material_id);
alter table public.ready_material_downloads enable row level security;
