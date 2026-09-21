-- Quais idiomas de legenda cada vídeo tem de verdade.
--
-- A dica embaixo do player só aparece quando a aula tem legenda. Sem essa
-- coluna a alternativa seria mostrar em toda aula, e prometer legenda onde
-- não tem é pior do que não avisar nada.
--
-- Quem preenche é o scripts/legendas.py, logo depois de subir as faixas no
-- Panda. É a única fonte que sabe o que entrou.

alter table lessons     add column if not exists subtitle_langs text[];
alter table live_events add column if not exists subtitle_langs text[];

comment on column lessons.subtitle_langs is
  'Idiomas de legenda anexados ao vídeo no Panda, ex: {pt,en,es}. Preenchido por scripts/legendas.py --enviar.';
comment on column live_events.subtitle_langs is
  'Idem, para a gravação da live.';
