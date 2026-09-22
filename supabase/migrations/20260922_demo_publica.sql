-- Demonstração do DriveCanvas liberada pela própria pessoa, na live.
--
-- Hoje a demonstração só nasce pela mão do time, um e-mail por vez no admin.
-- Isso não serve para uma transmissão com várias pessoas entrando ao mesmo
-- tempo: ninguém vai digitar cinquenta e-mails ao vivo.
--
-- Aqui a pessoa lê o QR code na tela, preenche nome, e-mail e telefone,
-- confirma a palavra-chave que o apresentador falou, e sai com o acesso na
-- hora. O cadastro fica guardado como lead.

-- ---------------------------------------------------------------- a campanha
-- Uma linha por evento que oferece a demonstração. A palavra-chave é o que
-- impede o link de virar cadastro livre depois que a live acabar: sem ela, o
-- endereço vaza num grupo e a demonstração deixa de ser um convite.
create table if not exists public.demo_invites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  -- Dita na transmissão. Nulo = qualquer um entra, para o caso de um link
  -- mandado direto a um prospect.
  palavra text,
  dias int not null default 7,
  ativo boolean not null default true,
  -- Teto de cadastros. Protege contra o link vazar e virar fábrica de contas.
  limite int,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- o lead
-- Quem se cadastrou. Existe separado de demo_access porque são perguntas
-- diferentes: demo_access responde "esta pessoa pode usar a ferramenta agora",
-- e some quando vence. Este aqui é o lead, e fica.
create table if not exists public.demo_signups (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.demo_invites(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  consent boolean not null default false,
  -- Onde a pessoa estava quando leu o QR. Serve para separar o lead da live
  -- do lead que veio de um link mandado no particular.
  origem text,
  created_at timestamptz not null default now()
);

-- Uma pessoa por campanha: se ela ler o QR duas vezes, atualiza em vez de
-- duplicar o lead.
create unique index if not exists demo_signups_invite_email_idx
  on public.demo_signups (invite_id, lower(email));
create index if not exists demo_signups_recentes_idx
  on public.demo_signups (created_at desc);

-- Só o servidor lê e grava, com a service role. A página pública passa por
-- uma action, nunca falando com o banco direto do navegador.
alter table public.demo_invites enable row level security;
alter table public.demo_signups enable row level security;

comment on table public.demo_invites is
  'Campanhas de demonstracao do DriveCanvas. A palavra e dita na live e trava o cadastro aberto.';
comment on table public.demo_signups is
  'Leads que pediram a demonstracao pelo QR code. Fica depois que o acesso vence.';
