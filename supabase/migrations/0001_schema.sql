-- ============================================================
--  World Bridge Academy — asosiy sxema
--  0001_schema.sql · tiplar, jadvallar, indekslar
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tiplar
-- ------------------------------------------------------------

create type user_role          as enum ('admin', 'qabulxona', 'ustoz', 'oquvchi');
create type account_status     as enum ('faol', 'bloklangan');
create type student_status     as enum ('faol', 'tanaffus', 'ketgan');
create type group_status       as enum ('faol', 'yopilgan');
create type day_type           as enum ('toq', 'juft', 'har_kuni');
create type enrollment_status  as enum ('faol', 'tanaffus', 'tugagan');
create type attendance_status  as enum ('keldi', 'kechikdi', 'sababli', 'kelmadi');
create type payment_method     as enum ('naqd', 'karta', 'click', 'payme');
create type invoice_status     as enum ('ochiq', 'yopilgan', 'bekor');
create type lead_status        as enum ('yangi', 'qongiroq', 'keldi', 'yozildi', 'rad');
create type lead_source        as enum ('sayt', 'telegram', 'instagram', 'tavsiya', 'boshqa');
create type woblr_reason       as enum ('faollik', 'uy_vazifasi', 'yordam', 'qoida', 'boshqa');
create type salary_type        as enum ('foiz', 'oquvchi_soni', 'fiks');

-- ------------------------------------------------------------
-- profiles — auth.users ustiga rol va ism qo'shadi
-- ------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  rol         user_role      not null default 'oquvchi',
  ism         text           not null,
  telefon     text unique,
  holat       account_status not null default 'faol',
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

comment on table profiles is 'Tizimga kira oladigan har bir odam. Rol shu yerda saqlanadi — RLS shuni o''qiydi.';

-- ------------------------------------------------------------
-- subjects / levels — 8 yo'nalish va ular ichidagi bosqichlar
-- ------------------------------------------------------------

create table subjects (
  id             text primary key,               -- 'ingliz-tili'
  nom            text not null,
  qisqa_tavsif   text,
  yosh_chegarasi text,                           -- '4–6 yosh', 'yosh chegarasi yo''q'
  tartib         int  not null default 0,
  saytda         boolean not null default true,  -- ommaviy saytda ko'rinsinmi
  holat          group_status not null default 'faol'
);

create table levels (
  id         bigserial primary key,
  subject_id text not null references subjects (id) on delete cascade,
  nom        text not null,                      -- 'Beginner', 'DTM'
  tartib     int  not null default 0,
  unique (subject_id, nom)
);

-- ------------------------------------------------------------
-- teachers
-- ------------------------------------------------------------

create table teachers (
  id             text primary key,               -- 'U01'
  profile_id     uuid unique references profiles (id) on delete set null,
  ism            text not null,
  telefon        text,
  telegram_id    bigint,
  -- maosh qoidasi hali kelishilmagan: null = aniqlanmagan, hisob chiqarilmaydi
  maosh_turi     salary_type,
  maosh_qiymati  numeric(12, 2),
  holat          account_status not null default 'faol',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column teachers.maosh_turi is 'NULL — qoida hali belgilanmagan. Bunda maosh hisoblanmaydi va UI "aniqlanmagan" deb ko''rsatadi.';

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------

create table students (
  id             text primary key,               -- 'S001'
  profile_id     uuid unique references profiles (id) on delete set null,
  fish           text not null,
  tugilgan_sana  date,
  ota_tel        text,
  ona_tel        text,
  shaxsiy_tel    text,
  qoshilgan_sana date not null default current_date,
  holat          student_status not null default 'faol',
  izoh           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index students_holat_idx on students (holat);
create index students_fish_idx  on students using gin (to_tsvector('simple', fish));

-- ------------------------------------------------------------
-- groups — narx GURUHGA yoziladi (o'quvchiga emas)
-- ------------------------------------------------------------

create table groups (
  id           text primary key,                 -- 'N01'
  nom          text not null,                    -- 'Beginner'
  subject_id   text references subjects (id),
  level_id     bigint references levels (id),
  teacher_id   text references teachers (id) on delete set null,
  boshlanish   time not null,
  tugash       time not null,
  kun_turi     day_type not null default 'toq',
  oylik_narx   numeric(12, 2) not null check (oylik_narx >= 0),
  sigim        int not null default 12 check (sigim between 1 and 12),
  holat        group_status not null default 'faol',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index groups_teacher_idx on groups (teacher_id);
create index groups_holat_idx   on groups (holat);

comment on column groups.sigim is 'Markaz qoidasi: standart guruh 12 kishidan oshmaydi.';

-- ------------------------------------------------------------
-- enrollments — o'quvchi ↔ guruh. Dublikat ism muammosini yechadi.
-- ------------------------------------------------------------

create table enrollments (
  id              uuid primary key default gen_random_uuid(),
  student_id      text not null references students (id) on delete cascade,
  group_id        text not null references groups (id)   on delete restrict,
  boshlandi       date not null default current_date,
  tugadi          date,
  chegirma_summa  numeric(12, 2) not null default 0 check (chegirma_summa >= 0),
  chegirma_oy     int not null default 0 check (chegirma_oy >= 0),
  chegirma_sabab  text,
  holat           enrollment_status not null default 'faol',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (tugadi is null or tugadi >= boshlandi)
);

create unique index enrollments_active_uniq
  on enrollments (student_id, group_id)
  where holat <> 'tugagan';

create index enrollments_student_idx on enrollments (student_id);
create index enrollments_group_idx   on enrollments (group_id);

comment on column enrollments.chegirma_summa is 'Oyiga beriladigan chegirma. Tanishuv oyi uchun 100 000 (650 000 → 550 000).';
comment on column enrollments.chegirma_oy is 'Chegirma necha oyga amal qiladi. 0 = chegirma yo''q.';

-- ------------------------------------------------------------
-- lessons / attendance
-- ------------------------------------------------------------

create table lessons (
  id         uuid primary key default gen_random_uuid(),
  group_id   text not null references groups (id) on delete cascade,
  sana       date not null,
  mavzu      text,
  otkazildi  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, sana)
);

create index lessons_sana_idx on lessons (sana desc);

create table attendance (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references lessons (id)   on delete cascade,
  student_id text not null references students (id)  on delete cascade,
  holat      attendance_status not null,
  belgiladi  uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create index attendance_student_idx on attendance (student_id);

-- ------------------------------------------------------------
-- WOBLR — ustoz har darsda beradigan rag'bat bali
-- ------------------------------------------------------------

create table woblr (
  id             bigserial primary key,
  student_id     text not null references students (id) on delete cascade,
  lesson_id      uuid references lessons (id)  on delete set null,
  teacher_id     text references teachers (id) on delete set null,
  bergan_profile uuid references profiles (id) on delete set null,
  ball           int not null check (ball between -10 and 10 and ball <> 0),
  sabab          woblr_reason not null default 'faollik',
  izoh           text,
  created_at     timestamptz not null default now()
);

create index woblr_student_idx on woblr (student_id);
create index woblr_lesson_idx  on woblr (lesson_id);
create index woblr_sana_idx    on woblr (created_at desc);

comment on table woblr is 'Har bir yozuv — bitta amal. Balans jamlanma emas, shu jadvaldan hisoblanadi.';

create table woblr_rewards (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null,
  tavsif       text,
  narx_ball    int  not null check (narx_ball > 0),
  qolgan_soni  int  not null default 0 check (qolgan_soni >= 0),
  holat        group_status not null default 'faol',
  created_at   timestamptz not null default now()
);

create table woblr_redemptions (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null references students (id) on delete cascade,
  reward_id   uuid not null references woblr_rewards (id) on delete restrict,
  ball        int  not null check (ball > 0),
  berdi       uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index woblr_redemptions_student_idx on woblr_redemptions (student_id);

-- ------------------------------------------------------------
-- invoices — har oy avtomatik yaratiladi
-- ------------------------------------------------------------

create table invoices (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments (id) on delete cascade,
  davr          text not null check (davr ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  summa         numeric(12, 2) not null check (summa >= 0),
  chegirma      numeric(12, 2) not null default 0 check (chegirma >= 0),
  holat         invoice_status not null default 'ochiq',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, davr)
);

create index invoices_davr_idx on invoices (davr);

comment on column invoices.summa is 'Guruh narxidan chegirma ayirilgan, to''lanishi kerak bo''lgan summa.';

-- ------------------------------------------------------------
-- payments — usul va sana majburiy, o'chirilmaydi (bekor qilinadi)
-- ------------------------------------------------------------

create table payments (
  id                bigserial primary key,
  student_id        text not null references students (id) on delete restrict,
  enrollment_id     uuid references enrollments (id) on delete set null,
  sana              date not null default current_date,
  davr              text not null check (davr ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  summa             numeric(12, 2) not null check (summa > 0),
  usul              payment_method not null,
  tasdiqlangan      boolean not null default false,
  tasdiqladi        uuid references profiles (id) on delete set null,
  tasdiqlangan_vaqt timestamptz,
  qabul_qildi       uuid references profiles (id) on delete set null,
  bekor             boolean not null default false,
  bekor_sabab       text,
  izoh              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index payments_student_idx on payments (student_id);
create index payments_davr_idx    on payments (davr);
create index payments_sana_idx    on payments (sana desc);

comment on table payments is 'Hech qachon DELETE qilinmaydi. Xato to''lov bekor=true bilan yopiladi va audit_log''ga tushadi.';

-- ------------------------------------------------------------
-- leads — saytdagi ariza formasidan keladi
-- ------------------------------------------------------------

create table leads (
  id         uuid primary key default gen_random_uuid(),
  ism        text not null,
  telefon    text not null,
  subject_id text references subjects (id) on delete set null,
  manba      lead_source not null default 'sayt',
  holat      lead_status not null default 'yangi',
  izoh       text,
  student_id text references students (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_holat_idx on leads (holat, created_at desc);

-- ------------------------------------------------------------
-- audit_log — o'chirilmaydi
-- ------------------------------------------------------------

create table audit_log (
  id         bigserial primary key,
  profile_id uuid references profiles (id) on delete set null,
  amal       text not null,               -- INSERT | UPDATE | DELETE
  jadval     text not null,
  obyekt_id  text,
  eski       jsonb,
  yangi      jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_jadval_idx on audit_log (jadval, created_at desc);

-- ------------------------------------------------------------
-- settings
-- ------------------------------------------------------------

create table settings (
  kalit       text primary key,
  qiymat      jsonb not null,
  tavsif      text,
  ozgartirdi  uuid references profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at — barcha jadvallar uchun
-- ------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'teachers', 'students', 'groups', 'enrollments',
    'attendance', 'invoices', 'payments', 'leads', 'settings'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
