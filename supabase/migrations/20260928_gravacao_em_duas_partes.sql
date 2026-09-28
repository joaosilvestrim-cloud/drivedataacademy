-- Gravação de live em duas partes.
--
-- Existe porque a live às vezes é gravada em dois arquivos: a conexão cai no
-- meio, ou há intervalo e o mentor para a gravação. Até aqui só cabia um link,
-- e a segunda metade ficava de fora ou virava um segundo evento duplicado na
-- agenda.
--
-- Coluna separada, e não uma lista de links no mesmo campo, porque o campo é
-- lido por cinco telas que esperam um endereço único, e porque o admin precisa
-- pré-visualizar cada parte tocando: é vendo o vídeo rodar que a pessoa
-- descobre que colou o iframe errado.
alter table public.live_events
  add column if not exists recording_url_2 text;

comment on column public.live_events.recording_url_2 is
  'Segunda parte da gravação, quando a live foi gravada em dois arquivos. Opcional: com uma parte só, o aluno não vê rótulo de parte.';
