-- Assinatura do mentor convidado no certificado.
--
-- Hoje todo certificado sai com os dois sócios, e só. Quando a live é de um
-- convidado, quem ensinou não assina o papel que atesta o aprendizado, o que
-- é estranho para o aluno e desagradável para o convidado.
--
-- Campo NOVO em vez de reaproveitar certificate_signature_*.
--
-- Aquele trio já existe e já está preenchido em todas as lives, mas com
-- Tamires ou Reed: virou "qual sócio responde por esta live". Reaproveitar
-- faria o sócio aparecer duas vezes no mesmo certificado, uma pela
-- configuração da escola e outra pela live. Campo com nome próprio custa três
-- colunas e evita esse encontro.

alter table public.live_events add column if not exists mentor_nome           text;
alter table public.live_events add column if not exists mentor_cargo          text;
alter table public.live_events add column if not exists mentor_assinatura_url text;

comment on column public.live_events.mentor_nome is
  'Mentor convidado desta live. Preenchido, ele vira a terceira assinatura do certificado.';

-- A cópia para o certificado é o que congela a história: se o mentor trocar
-- de cargo ou a live for editada depois, o papel já emitido continua dizendo
-- o que dizia no dia. Mesma razão de certificates guardar o título do curso
-- em vez de apontar para ele.
alter table public.certificates add column if not exists mentor_nome           text;
alter table public.certificates add column if not exists mentor_cargo          text;
alter table public.certificates add column if not exists mentor_assinatura_url text;

-- Os convidados que a própria descrição da live já nomeia. A arte da
-- assinatura sobe depois, pelo admin: sem ela o certificado mostra o nome e o
-- cargo sobre a linha, que já é melhor do que não citar quem ensinou.
update public.live_events
   set mentor_nome = 'Tadeu Kwiatkowski Ribeiro',
       mentor_cargo = 'Líder de Dados e Analytics'
 where title like 'Dados e Neg%cio%' and mentor_nome is null;

update public.live_events
   set mentor_nome = 'André Mendes',
       mentor_cargo = 'Sócio e Diretor Comercial da OBIFY'
 where title like 'Protheus%' and mentor_nome is null;

update public.live_events
   set mentor_nome = 'Bruno Caldas',
       mentor_cargo = 'Professor da DriveData Academy'
 where title like 'Metodologia de Implementa%' and mentor_nome is null;
