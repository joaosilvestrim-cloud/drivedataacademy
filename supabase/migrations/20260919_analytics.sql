-- Analytics de alunos: sessões na plataforma e retenção dos vídeos.

-- 1. Sessões. A tabela de uso passa a guardar também "o aluno esteve aqui",
--    uma linha a cada 30 minutos de atividade. É o que dá dias de acesso,
--    frequência e horário de uso.
alter table public.access_events drop constraint if exists access_events_tipo_check;
alter table public.access_events add constraint access_events_tipo_check check (tipo in ('ferramenta', 'curso', 'sessao'));

-- 2. Retenção de vídeo. Uma linha por aluno e aula, atualizada enquanto ele
--    assiste. "buckets" tem 20 posições ('0' ou '1'), cada uma é 5% do vídeo:
--    somando todos os alunos sai a curva de retenção da aula.
create table if not exists public.video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  duration_s int not null default 0,
  watched_s int not null default 0,
  max_pos_s int not null default 0,
  buckets text not null default '00000000000000000000',
  sessions int not null default 1,
  first_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists video_progress_aula_idx on public.video_progress (lesson_id);
create index if not exists video_progress_curso_idx on public.video_progress (course_id, updated_at desc);

-- Só o servidor da Academy lê e grava, com a service role.
alter table public.video_progress enable row level security;
