-- Aula do tipo "materiais": os arquivos para download passam a pertencer a uma
-- aula, em vez de ficarem num menu separado. Reaproveita a tabela e o bucket
-- privado dos materiais prontos; só ganha o vínculo com a aula.
alter table public.ready_materials add column if not exists lesson_id uuid references public.lessons(id) on delete cascade;
create index if not exists ready_materials_lesson_idx on public.ready_materials (lesson_id, position);
