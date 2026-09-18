-- Até onde cada pessoa já leu cada canal da comunidade.
--
-- Uma linha por pessoa e canal, atualizada quando ela abre o canal ou recebe
-- mensagem nova com ele aberto. Mensagem de outra pessoa depois de
-- last_read_at conta como "ainda não vista".

create table if not exists public.channel_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references public.forum_channels(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

-- Só o servidor da Academy lê e grava, com a service role.
alter table public.channel_reads enable row level security;
