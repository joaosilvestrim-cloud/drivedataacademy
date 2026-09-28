-- Site de portfólio do aluno, publicado em /portfolio/<slug>.
--
-- O aluno gera um prompt na Academy, leva para a IA que preferir (Codex,
-- Claude, ChatGPT), recebe um site inteiro em HTML e cola de volta aqui. O
-- link público vai para o LinkedIn dele.
--
-- Um site por aluno, e por isso a chave é o próprio user_id: republicar
-- substitui, não acumula versão.
--
-- O HTML é de terceiro e roda no nosso domínio, então nunca é servido
-- direto. A página pública o coloca num iframe com sandbox e sem
-- allow-same-origin, o que o isola da sessão de quem visita. Ver
-- lib/portfolio-site.ts.
create table if not exists public.portfolio_sites (
  user_id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique,
  html text not null,
  publicado boolean not null default false,
  -- Tirado do ar pelo time. Separado de "publicado" para o aluno não
  -- conseguir republicar sozinho um site que o time bloqueou.
  bloqueado boolean not null default false,
  motivo_bloqueio text,
  -- Mostra o Universo 4D do aluno na página pública. Ligado por padrão,
  -- porque o universo só mostra o que ele conquistou; o aluno pode desligar.
  mostrar_universo boolean not null default true,
  visitas int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.portfolio_sites is
  'Site de portfólio do aluno, gerado por IA externa e publicado em /portfolio/<slug>. Servido sempre em iframe isolado.';

alter table public.portfolio_sites enable row level security;

-- Sem política: tudo passa pelo servidor com a service role, que confere
-- dono e acesso. O cliente nunca lê nem escreve esta tabela direto.

notify pgrst, 'reload schema';
