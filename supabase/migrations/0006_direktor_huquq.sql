-- ============================================================
--  World Bridge Academy
--  0006_direktor_huquq.sql · direktor, ikki bosqichli chegirma,
--  dam olish guruhlari
--
--  0001–0004 tahrirlanmaydi — ular ishlab ketgan bo'lishi mumkin.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rollar
--
-- Direktorning huquqi admin bilan bir xil (Jamshid qarori), ustiga
-- yagona narsa qo'shiladi: TASDIQ. Shuning uchun app_is_admin()
-- ikkalasini ham qamraydi va mavjud siyosatlarga tegilmaydi.
-- ------------------------------------------------------------

create or replace function app_is_direktor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_rol() = 'direktor', false)
$$;

comment on function app_is_direktor is
  'To''lovni tasdiqlash huquqi. Boshqa hech qayerda cheklov sifatida ishlatilmaydi.';

create or replace function app_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_rol() in ('admin', 'direktor'), false)
$$;

create or replace function app_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_rol() in ('admin', 'direktor', 'qabulxona'), false)
$$;

-- ------------------------------------------------------------
-- 2. Ustoz huquqi ROLGA emas, BIRIKTIRILISHGA bog'lanadi
--
-- Bitta odam bir vaqtda ikki rolda bo'ladi: Farrux — direktor VA
-- Math ustozi, Jamshid — admin VA Math ustozi (Z_Rollar.js).
-- profiles.rol esa bitta. Shuning uchun "ustozmi" degan savol
-- teachers.profile_id orqali beriladi: kim guruhga biriktirilgan
-- bo'lsa, o'sha ustoz.
-- ------------------------------------------------------------

drop policy if exists students_teacher_read on students;
create policy students_teacher_read on students for select to authenticated
  using (app_teacher_id() is not null and app_teaches_student(id));

drop policy if exists woblr_teacher_insert on woblr;
create policy woblr_teacher_insert on woblr for insert to authenticated
  with check (
    app_teacher_id() is not null
    and app_teaches_student(student_id)
    and bergan_profile = auth.uid()
  );

-- ------------------------------------------------------------
-- 3. Tasdiq — faqat direktor
--
-- RLS ustun darajasida cheklay olmaydi (siyosat butun qatorga
-- tegishli), shuning uchun taqiqni trigger qo'yadi. Admin to'lovni
-- kiritadi, bekor qiladi, izohini o'zgartiradi — lekin galochkaga
-- qo'li yetmaydi. Sheets'dagi himoya bilan bir xil (T_Tasdiq.js).
--
-- auth.uid() bo'sh bo'lsa (ko'chirish skripti, cron — service_role)
-- tekshiruv o'tkazib yuboriladi: u yerda odam emas, tizim yozadi.
-- ------------------------------------------------------------

create or replace function payments_tasdiq_himoya() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ozgardi boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    ozgardi := new.tasdiqlangan;
  else
    ozgardi := (new.tasdiqlangan  is distinct from old.tasdiqlangan)
            or (new.tasdiqladi    is distinct from old.tasdiqladi)
            or (new.tasdiqlangan_vaqt is distinct from old.tasdiqlangan_vaqt);
  end if;

  if ozgardi and not app_is_direktor() then
    raise exception 'To''lovni faqat direktor tasdiqlaydi — bu imzo o''rnida turadi.';
  end if;

  -- Kim va qachon tasdiqlagani o'z-o'zidan yoziladi
  if new.tasdiqlangan then
    new.tasdiqladi := coalesce(new.tasdiqladi, auth.uid());
    new.tasdiqlangan_vaqt := coalesce(new.tasdiqlangan_vaqt, now());
  else
    new.tasdiqladi := null;
    new.tasdiqlangan_vaqt := null;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_tasdiq on payments;
create trigger payments_tasdiq before insert or update on payments
  for each row execute function payments_tasdiq_himoya();

-- ------------------------------------------------------------
-- 4. To'lov usuli — ko'chirilgan yozuvda bo'lmasligi mumkin
--
-- Sheets'dagi 16 ta to'lovda "Usul" ustuni bo'sh. Taxmin qilib
-- "naqd" deb yozish — yolg'on ma'lumot. Yangi to'lovda esa usul
-- majburiy bo'lib qoladi.
-- ------------------------------------------------------------

alter table payments add column if not exists manba text not null default 'crm';
alter table payments drop constraint if exists payments_manba_check;
alter table payments add constraint payments_manba_check
  check (manba in ('crm', 'sheets', 'telegram'));

alter table payments alter column usul drop not null;
alter table payments drop constraint if exists payments_usul_kerak;
alter table payments add constraint payments_usul_kerak
  check (usul is not null or manba <> 'crm');

comment on column payments.manba is
  'crm — tizimda kiritilgan (usul majburiy), sheets — ko''chirilgan, telegram — botdan.';

-- ------------------------------------------------------------
-- 5. Chegirma: ikki bosqich va muddatsiz
--
-- Qatnashuvda ikkita bosqich bor va "necha oy" bo'sh bo'lsa bosqich
-- MUDDATSIZ (U_Qatnashuv.js:63-65). Shuning uchun:
--   chegirma_oy = 0     chegirma yo'q
--   chegirma_oy = N     N oy amal qiladi
--   chegirma_oy = null  muddatsiz
-- ------------------------------------------------------------

alter table enrollments alter column chegirma_oy drop not null;
alter table enrollments drop constraint if exists enrollments_chegirma_oy_check;
alter table enrollments add constraint enrollments_chegirma_oy_check
  check (chegirma_oy is null or chegirma_oy >= 0);

alter table enrollments add column if not exists chegirma2_summa numeric(12, 2) not null default 0;
alter table enrollments add column if not exists chegirma2_oy int;

alter table enrollments drop constraint if exists enrollments_chegirma2_check;
alter table enrollments add constraint enrollments_chegirma2_check
  check (chegirma2_summa >= 0 and (chegirma2_oy is null or chegirma2_oy >= 0));

comment on column enrollments.chegirma_oy is
  'Necha oy amal qiladi. 0 — chegirma yo''q, NULL — muddatsiz.';
comment on column enrollments.chegirma2_summa is
  'Ikkinchi bosqich: birinchisi tugagandan keyin boshlanadi (masalan 250 000 -> 50 000).';

-- Chegirma bosqichini oy raqami bo'yicha beradi.
-- Sheets bilan bir xil: 1-bosqich 1..d1 oylarida, 2-bosqich d1+1..d1+d2 da.
create or replace function chegirma_oyda(
  p_oy       int,
  p_summa1   numeric,
  p_oylar1   int,
  p_summa2   numeric,
  p_oylar2   int
) returns numeric
language sql immutable as $$
  with d as (
    select
      case when p_summa1 > 0 then coalesce(p_oylar1, 999999) else 0 end as d1,
      case when p_summa2 > 0 then coalesce(p_oylar2, 999999) else 0 end as d2
  )
  select case
           when p_summa1 > 0 and p_oy <= d.d1                            then p_summa1
           when p_summa2 > 0 and p_oy >  d.d1 and p_oy <= d.d1 + d.d2    then p_summa2
           else 0
         end
  from d
$$;

create or replace function create_monthly_invoices(
  p_davr text default to_char(current_date, 'YYYY-MM')
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with yangi as (
    insert into invoices (enrollment_id, davr, summa, chegirma)
    select
      e.id,
      p_davr,
      greatest(g.oylik_narx - least(chegirma.qiymat, g.oylik_narx), 0),
      least(chegirma.qiymat, g.oylik_narx)
    from enrollments e
    join groups g on g.id = e.group_id
    cross join lateral (
      select chegirma_oyda(
        oy_raqami(e.boshlandi, p_davr),
        e.chegirma_summa, e.chegirma_oy,
        e.chegirma2_summa, e.chegirma2_oy
      ) as qiymat
    ) chegirma
    where e.holat = 'faol'
      and g.holat = 'faol'
      and e.boshlandi <= davr_oxiri(p_davr)
      and (e.tugadi is null or e.tugadi >= davr_boshi(p_davr))
    on conflict (enrollment_id, davr) do nothing
    returning 1
  )
  select count(*) into v_count from yangi;

  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 6. Dars jadvali — dam olish guruhlari
--   toq       dushanba, chorshanba, juma   (1, 3, 5)
--   juft      seshanba, payshanba, shanba  (2, 4, 6)
--   dam_olish shanba, yakshanba            (6, 7)
--   har_kuni  dushanbadan shanbagacha      (1..6)
-- ------------------------------------------------------------

create or replace function generate_lessons(
  p_group text,
  p_from  date,
  p_to    date
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_kun   day_type;
  v_count int;
begin
  select kun_turi into v_kun from groups where id = p_group and holat = 'faol';
  if v_kun is null then
    return 0;
  end if;

  with kunlar as (
    select d::date as sana
    from generate_series(p_from, p_to, interval '1 day') d
    where case v_kun
            when 'toq'       then extract(isodow from d) in (1, 3, 5)
            when 'juft'      then extract(isodow from d) in (2, 4, 6)
            when 'dam_olish' then extract(isodow from d) in (6, 7)
            when 'har_kuni'  then extract(isodow from d) between 1 and 6
          end
  ), yangi as (
    insert into lessons (group_id, sana)
    select p_group, sana from kunlar
    on conflict (group_id, sana) do nothing
    returning 1
  )
  select count(*) into v_count from yangi;

  return v_count;
end;
$$;
