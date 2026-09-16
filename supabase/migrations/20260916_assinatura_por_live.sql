-- ============================================================
-- Assinatura do certificado por live
--
-- Cada aula tem quem assina. A configuração global segue valendo para os
-- certificados de curso e como reserva. O certificado guarda a assinatura do
-- momento da emissão: trocar o instrutor depois não reescreve o que já saiu.
-- ============================================================

alter table public.live_events add column if not exists certificate_signature_name text;
alter table public.live_events add column if not exists certificate_signature_role text;
alter table public.live_events add column if not exists certificate_signature_url  text;

alter table public.certificates add column if not exists signature_name text;
alter table public.certificates add column if not exists signature_role text;
alter table public.certificates add column if not exists signature_url  text;
