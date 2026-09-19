-- ============================================================
--  World Bridge Academy
--  0021_telegram.sql · @WBAlcBot sayt bazasiga ulanadi
--
--  Qaror (20.09): bot Apps Script'dan sayt loyihasiga ko'chdi va
--  Sheets'dan emas, shu bazadan o'qiydi. Admin e'lonlari (to'lov
--  eslatmasi, oylik test, majlis) bot orqali o'quvchi, ota-ona, ustoz
--  va xodimga yetadi.
--
--  1. telegram_ulanish — qaysi Telegram chat kimga tegishli.
--     Bitta chat bir necha qatorda bo'lishi mumkin: ota-onaning ikki
--     farzandi, ham ustoz ham xodim bo'lgan odam.
--       oquvchi, ota_ona → student_id · ustoz → teacher_id · xodim → profile_id
--
--  2. Ulanish ikki yo'l bilan:
--     · telefon — Telegram "kontakt yuborish" tugmasi. Bot kontakt
--       yuboruvchining O'ZINIKI ekanini tekshiradi (contact.user_id).
--       telegram_ula_telefon() bazadagi telefonlar bilan oxirgi 9
--       raqam bo'yicha moslaydi.
--     · saytdagi tugma — telegram_token_ol() 15 daqiqalik bir martalik
--       token beradi, bot /start <token> bilan telegram_ula_token() ni
--       chaqiradi.
--     Ikkala ulash funksiyasi ham FAQAT service_role uchun (bot
--     serveri): telefon bo'yicha o'quvchi ismini qaytaradi.
--
--  3. elonlar / elon_yetkazish — admin yuborgan xabar va kimga
--     yetgani. Yuborishni sayt (admin nomidan, RLS bilan) qiladi.
--     elon_oluvchilar() — auditoriya: kimga mo'ljallangan va kim botga
--     ulangan (ulanmaganlar ham qaytadi — admin ko'rsin).
-- ============================================================


-- ------------------------------------------------------------
-- Yordamchi: telefonning oxirgi 9 raqami ("+998-90-123-45-67" → 901234567)
-- ------------------------------------------------------------

create or replace function tel9(p text) returns text
language sql immutable as $$
  select case
    when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9
      then right(regexp_replace(p, '\D', '', 'g'), 9)
  end
$$;


-- ------------------------------------------------------------
-- 1. Ulanishlar
-- ------------------------------------------------------------

create table telegram_ulanish (
  id          bigserial primary key,
  chat_id     bigint not null,
  kim         text not null check (kim in ('oquvchi', 'ota_ona', 'ustoz', 'xodim')),
  student_id  text references students (id) on delete cascade,
  teacher_id  text references teachers (id) on delete cascade,
  profile_id  uuid references profiles (id) on delete cascade,
  telefon     text,
  tg_ism      text,
  holat       text not null default 'faol' check (holat in ('faol', 'bloklagan')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (
    (kim in ('oquvchi', 'ota_ona') and student_id is not null)
    or (kim = 'ustoz' and teacher_id is not null)
    or (kim = 'xodim' and profile_id is not null)
  )
);

create unique index telegram_ulanish_yagona on telegram_ulanish
  (chat_id, kim, coalesce(student_id, ''), coalesce(teacher_id, ''), coalesce(profile_id::text, ''));
create index telegram_ulanish_student_idx on telegram_ulanish (student_id);
create index telegram_ulanish_chat_idx    on telegram_ulanish (chat_id);

comment on table telegram_ulanish is 'Telegram chat ↔ o''quvchi / ota-ona / ustoz / xodim. Yozadi faqat bot (service_role).';

alter table telegram_ulanish enable row level security;

create policy telegram_ulanish_staff_read on telegram_ulanish for select to authenticated
  using (app_is_staff());

create policy telegram_ulanish_own_read on telegram_ulanish for select to authenticated
  using (
    profile_id = auth.uid()
    or (kim = 'oquvchi' and student_id = app_student_id())
    or (kim = 'ota_ona' and student_id = app_farzand_id())   -- ota-ona hisobi (0019)
    or (teacher_id is not null and teacher_id = app_teacher_id())
  );


-- ------------------------------------------------------------
-- 2a. Saytdagi tugma: bir martalik token
-- ------------------------------------------------------------

create table telegram_token (
  token       text primary key,
  profile_id  uuid not null references profiles (id) on delete cascade,
  amal_qiladi timestamptz not null default now() + interval '15 minutes',
  ishlatildi  timestamptz
);

alter table telegram_token enable row level security;   -- siyosat yo'q: faqat funksiyalar orqali

create or replace function telegram_token_ol() returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'Avval tizimga kiring.';
  end if;
  delete from telegram_token where profile_id = auth.uid() or amal_qiladi < now();
  insert into telegram_token (token, profile_id) values (v_token, auth.uid());
  return v_token;
end;
$$;

revoke execute on function telegram_token_ol() from public, anon;
grant  execute on function telegram_token_ol() to authenticated, service_role;


-- Ulanish qatorini yozadi (ikkala yo'l uchun umumiy)
create or replace function telegram_ula_qator(
  p_chat bigint, p_kim text, p_student text, p_teacher text, p_profile uuid,
  p_tel text, p_tg_ism text
) returns void
language sql volatile security definer set search_path = public as $$
  insert into telegram_ulanish (chat_id, kim, student_id, teacher_id, profile_id, telefon, tg_ism)
  values (p_chat, p_kim, p_student, p_teacher, p_profile, p_tel, p_tg_ism)
  on conflict (chat_id, kim, coalesce(student_id, ''), coalesce(teacher_id, ''), coalesce(profile_id::text, ''))
  do update set holat = 'faol', tg_ism = excluded.tg_ism,
                telefon = coalesce(excluded.telefon, telegram_ulanish.telefon), updated_at = now()
$$;

revoke execute on function telegram_ula_qator(bigint, text, text, text, uuid, text, text) from public, anon, authenticated;
grant  execute on function telegram_ula_qator(bigint, text, text, text, uuid, text, text) to service_role;


-- /start <token>: tokenning egasini roliga qarab ulaydi
create or replace function telegram_ula_token(p_token text, p_chat bigint, p_tg_ism text)
returns table (kim text, ism text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_profil uuid;
  v_rol    user_role;
begin
  update telegram_token set ishlatildi = now()
   where token = p_token and ishlatildi is null and amal_qiladi > now()
  returning profile_id into v_profil;
  if v_profil is null then
    return;   -- eskirgan yoki ishlatilgan — bot o'zi tushuntiradi
  end if;

  select rol into v_rol from profiles where id = v_profil;

  if v_rol = 'oquvchi' then
    perform telegram_ula_qator(p_chat, 'oquvchi', s.id, null, null, null, p_tg_ism)
      from students s where s.profile_id = v_profil;
  elsif v_rol = 'ota_ona' then
    perform telegram_ula_qator(p_chat, 'ota_ona', p.oquvchi_id, null, null, null, p_tg_ism)
      from profiles p where p.id = v_profil and p.oquvchi_id is not null;
  end if;

  -- Ustoz yozuvi bo'lsa — ustoz sifatida (xodim ham bo'lishi mumkin)
  perform telegram_ula_qator(p_chat, 'ustoz', null, t.id, null, null, p_tg_ism)
    from teachers t where t.profile_id = v_profil;

  if v_rol in ('admin', 'direktor', 'qabulxona') then
    perform telegram_ula_qator(p_chat, 'xodim', null, null, v_profil, null, p_tg_ism);
  end if;

  return query
    select u.kim, coalesce(s.fish, t.ism, p.ism)
    from telegram_ulanish u
    left join students s on s.id = u.student_id
    left join teachers t on t.id = u.teacher_id
    left join profiles p on p.id = u.profile_id
    where u.chat_id = p_chat and u.holat = 'faol';
end;
$$;

revoke execute on function telegram_ula_token(text, bigint, text) from public, anon, authenticated;
grant  execute on function telegram_ula_token(text, bigint, text) to service_role;


-- ------------------------------------------------------------
-- 2b. Telefon bilan ulash
-- ------------------------------------------------------------

create or replace function telegram_ula_telefon(p_tel text, p_chat bigint, p_tg_ism text)
returns table (kim text, ism text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_t9 text := tel9(p_tel);
begin
  if v_t9 is null then
    return;
  end if;

  perform telegram_ula_qator(p_chat, 'oquvchi', s.id, null, null, p_tel, p_tg_ism)
    from students s where s.holat <> 'ketgan' and tel9(s.shaxsiy_tel) = v_t9;

  perform telegram_ula_qator(p_chat, 'ota_ona', s.id, null, null, p_tel, p_tg_ism)
    from students s
    where s.holat <> 'ketgan'
      and (tel9(s.ota_tel) = v_t9 or tel9(s.ona_tel) = v_t9)
      and tel9(s.shaxsiy_tel) is distinct from v_t9;   -- o'quvchining o'z raqami — ota-ona emas

  perform telegram_ula_qator(p_chat, 'ustoz', null, t.id, null, p_tel, p_tg_ism)
    from teachers t where t.holat = 'faol' and tel9(t.telefon) = v_t9;

  perform telegram_ula_qator(p_chat, 'xodim', null, null, p.id, p_tel, p_tg_ism)
    from profiles p
    where p.holat = 'faol' and p.rol in ('admin', 'direktor', 'qabulxona') and tel9(p.telefon) = v_t9;

  return query
    select u.kim, coalesce(s.fish, t.ism, p.ism)
    from telegram_ulanish u
    left join students s on s.id = u.student_id
    left join teachers t on t.id = u.teacher_id
    left join profiles p on p.id = u.profile_id
    where u.chat_id = p_chat and u.holat = 'faol';
end;
$$;

revoke execute on function telegram_ula_telefon(text, bigint, text) from public, anon, authenticated;
grant  execute on function telegram_ula_telefon(text, bigint, text) to service_role;


-- ------------------------------------------------------------
-- 3. E'lonlar
-- ------------------------------------------------------------

create table elonlar (
  id           bigserial primary key,
  turi         text not null default 'umumiy' check (turi in ('umumiy', 'tolov', 'test', 'majlis')),
  matn         text not null check (length(matn) between 1 and 3500),
  kimga        text[] not null check (kimga <@ array['oquvchi', 'ota_ona', 'ustoz', 'xodim'] and cardinality(kimga) > 0),
  filtr        jsonb not null default '{}'::jsonb,
  yaratdi      uuid references profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  yuborildi_at timestamptz,
  jami         int not null default 0,
  yetkazildi   int not null default 0,
  xato         int not null default 0
);

comment on column elonlar.filtr is '{} — hammasi · {"guruh":"G05"} · {"fan":"ingliz-tili"} · {"qarzdor":true}';

create table elon_yetkazish (
  id          bigserial primary key,
  elon_id     bigint not null references elonlar (id) on delete cascade,
  chat_id     bigint not null,
  kim         text not null,
  student_id  text references students (id) on delete set null,
  holat       text not null default 'navbatda' check (holat in ('navbatda', 'yetkazildi', 'xato', 'bloklagan')),
  xato_matn   text,
  yuborildi_at timestamptz
);

create unique index elon_yetkazish_yagona on elon_yetkazish (elon_id, chat_id, coalesce(student_id, ''));

alter table elonlar        enable row level security;
alter table elon_yetkazish enable row level security;

-- 0003 dagi default privileges faqat jadvallarni qamraydi, sequence'larni emas
grant usage, select on sequence elonlar_id_seq, elon_yetkazish_id_seq, telegram_ulanish_id_seq
  to authenticated, service_role;

-- Yuborish — admin (direktor ham, 0006) ishi; xodim tarixni ko'radi
create policy elonlar_staff_read   on elonlar for select to authenticated using (app_is_staff());
create policy elonlar_admin_write  on elonlar for all    to authenticated using (app_is_admin()) with check (app_is_admin());
create policy elon_yetkazish_staff_read  on elon_yetkazish for select to authenticated using (app_is_staff());
create policy elon_yetkazish_admin_write on elon_yetkazish for all    to authenticated using (app_is_admin()) with check (app_is_admin());

-- Bloklangan chatni belgilash (yuborishda 403 kelsa) — admin nomidan
create or replace function telegram_bloklagan(p_chat bigint) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is not null and not app_is_admin() then
    raise exception 'Bu amal uchun huquqingiz yo''q.';
  end if;
  update telegram_ulanish set holat = 'bloklagan', updated_at = now() where chat_id = p_chat;
end;
$$;

revoke execute on function telegram_bloklagan(bigint) from public, anon;
grant  execute on function telegram_bloklagan(bigint) to authenticated, service_role;


-- Auditoriya: kimga mo'ljallangan (ulanmaganlar ham — chat_id bo'sh)
create or replace function elon_oluvchilar(p_kimga text[], p_filtr jsonb default '{}'::jsonb)
returns table (kim text, nishon text, ism text, chat_id bigint, student_id text, qarz numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_guruh  text := nullif(p_filtr ->> 'guruh', '');
  v_fan    text := nullif(p_filtr ->> 'fan', '');
  v_qarzdor boolean := coalesce((p_filtr ->> 'qarzdor')::boolean, false);
begin
  if auth.uid() is not null and not app_is_admin() then
    raise exception 'Bu amal uchun huquqingiz yo''q.';
  end if;

  return query
  with oquvchilar as (
    select s.id, s.fish, coalesce(b.qarz, 0) as qarz
    from students s
    left join v_student_balance b on b.student_id = s.id
    where s.holat = 'faol'
      and (v_guruh is null or exists (
        select 1 from enrollments e where e.student_id = s.id and e.group_id = v_guruh and e.holat = 'faol'))
      and (v_fan is null or exists (
        select 1 from enrollments e join groups g on g.id = e.group_id
        where e.student_id = s.id and g.subject_id = v_fan and e.holat = 'faol'))
      and (not v_qarzdor or coalesce(b.qarz, 0) > 0)
  ),
  ustozlar as (
    select t.id, t.ism
    from teachers t
    where t.holat = 'faol'
      and (v_guruh is null or exists (select 1 from groups g where g.id = v_guruh and g.teacher_id = t.id))
      and (v_fan is null or exists (select 1 from groups g where g.subject_id = v_fan and g.teacher_id = t.id and g.holat = 'faol'))
  )
  -- o'quvchi va ota-ona: har ulangan chat alohida qator, ulanmagan — bitta qator (chat_id bo'sh)
  select k.kim, o.id, o.fish, u.chat_id, o.id, o.qarz
  from oquvchilar o
  cross join (select unnest(array['oquvchi', 'ota_ona']) as kim) k
  left join telegram_ulanish u on u.student_id = o.id and u.kim = k.kim and u.holat = 'faol'
  where k.kim = any (p_kimga)
  union all
  select 'ustoz', t.id, t.ism, u.chat_id, null, null
  from ustozlar t
  left join telegram_ulanish u on u.teacher_id = t.id and u.kim = 'ustoz' and u.holat = 'faol'
  where 'ustoz' = any (p_kimga) and not v_qarzdor
  union all
  select 'xodim', p.id::text, p.ism, u.chat_id, null, null
  from profiles p
  left join telegram_ulanish u on u.profile_id = p.id and u.kim = 'xodim' and u.holat = 'faol'
  where 'xodim' = any (p_kimga) and not v_qarzdor and v_guruh is null and v_fan is null
    and p.holat = 'faol' and p.rol in ('admin', 'direktor', 'qabulxona');
end;
$$;

revoke execute on function elon_oluvchilar(text[], jsonb) from public, anon;
grant  execute on function elon_oluvchilar(text[], jsonb) to authenticated, service_role;
