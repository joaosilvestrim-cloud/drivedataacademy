-- Raio-X do Dashboard: histórico de laudos do aluno.
--
-- O arquivo do aluno nunca chega aqui. A leitura do .pbix e do .pbit acontece
-- no navegador dele, e o que é gravado é só o resultado: nota, achados e um
-- resumo do tamanho do relatório. Nenhum dado de cliente sai da máquina dele.

create table if not exists public.raiox_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arquivo text not null,
  formato text not null check (formato in ('pbix', 'pbir', 'layout', 'pbit')),
  nota int not null check (nota between 0 and 100),
  parcial boolean not null default true,
  notas jsonb not null default '[]'::jsonb,
  achados jsonb not null default '[]'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists raiox_reports_user_idx on public.raiox_reports (user_id, created_at desc);

-- Só o service role escreve e lê: as telas passam pelo servidor da Academy.
alter table public.raiox_reports enable row level security;

drop policy if exists "raiox dono le" on public.raiox_reports;
create policy "raiox dono le" on public.raiox_reports
  for select using (auth.uid() = user_id);
