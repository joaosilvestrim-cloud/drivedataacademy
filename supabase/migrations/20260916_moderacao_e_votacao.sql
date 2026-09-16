-- ============================================================
-- 1) Moderação de imagem na comunidade
--
-- Toda imagem postada entra como pendente e só aparece depois que o time
-- aprova. A regra fica no banco, não no aplicativo: a mensagem é inserida
-- direto pelo navegador do aluno, então um gatilho é o único lugar em que a
-- moderação não pode ser burlada.
-- ============================================================

alter table public.channel_messages add column if not exists image_status text not null default 'aprovada';

create or replace function public.forcar_moderacao_imagem() returns trigger
language plpgsql as $$
begin
  if new.image_url is not null and (tg_op = 'INSERT' or new.image_url is distinct from old.image_url) then
    new.image_status := 'pendente';
  end if;
  return new;
end $$;

drop trigger if exists moderar_imagem on public.channel_messages;
create trigger moderar_imagem before insert or update on public.channel_messages
  for each row execute function public.forcar_moderacao_imagem();

create index if not exists channel_messages_imagem_pendente_idx
  on public.channel_messages (created_at desc) where image_url is not null and image_status = 'pendente';

-- ============================================================
-- 2) Votação pública
--
-- Enquete aberta para escolher temas e datas das próximas lives. O link é
-- público, o voto é por e-mail (um por enquete) e a administração fica no
-- admin. Escrita e leitura só pelo servidor, com service role.
-- ============================================================

create table if not exists public.polls (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  slug             text unique not null,
  title            text not null,
  description      text,
  max_choices      int not null default 1,          -- quantas opções cada pessoa escolhe
  published        boolean not null default false,
  closes_at        timestamptz,                     -- nulo = sem prazo
  allow_suggestion boolean not null default true,   -- campo livre de sugestão
  show_results     boolean not null default true    -- mostra a apuração depois de votar
);

create table if not exists public.poll_options (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls(id) on delete cascade,
  label       text not null,
  description text,
  position    int not null default 0
);
create index if not exists poll_options_poll_idx on public.poll_options (poll_id, position);

create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  poll_id    uuid not null references public.polls(id) on delete cascade,
  email      text not null,
  name       text,
  options    uuid[] not null default '{}',
  suggestion text,
  unique (poll_id, email)
);
create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id, created_at desc);

alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;
