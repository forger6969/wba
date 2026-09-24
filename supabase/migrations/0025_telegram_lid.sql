-- ============================================================
--  World Bridge Academy (forger fork)
--  0025_telegram_lid.sql · lidlarni ham Telegram'ga ulash
--
--  Bot hozircha faqat students/teachers/profiles bo'yicha telefon
--  moslaydi (0021). Sinov darsiga yozilgan, lekin hali "O'quvchi"
--  bo'lmagan odam (leads) telefon yuborsa — hech narsa topilmaydi va
--  probniy eslatmasini yuborishga chat_id yo'q.
--
--  Bu fayl: telegram_ulanish ga 'lid' turini va lead_id ustunini
--  qo'shadi, telegram_ula_telefon() ni leads jadvalidan ham
--  qidiradigan qiladi (faqat hali yechilmagan — holat = 'yangi').
-- ============================================================

alter table telegram_ulanish
  add column if not exists lead_id uuid references leads (id) on delete cascade;

alter table telegram_ulanish drop constraint if exists telegram_ulanish_kim_check;
alter table telegram_ulanish add constraint telegram_ulanish_kim_check
  check (kim in ('oquvchi', 'ota_ona', 'ustoz', 'xodim', 'lid'));

alter table telegram_ulanish drop constraint if exists telegram_ulanish_check;
alter table telegram_ulanish add constraint telegram_ulanish_check check (
  (kim in ('oquvchi', 'ota_ona') and student_id is not null)
  or (kim = 'ustoz' and teacher_id is not null)
  or (kim = 'xodim' and profile_id is not null)
  or (kim = 'lid' and lead_id is not null)
);

drop index if exists telegram_ulanish_yagona;
create unique index telegram_ulanish_yagona on telegram_ulanish
  (chat_id, kim, coalesce(student_id, ''), coalesce(teacher_id, ''), coalesce(profile_id::text, ''), coalesce(lead_id::text, ''));

create index if not exists telegram_ulanish_lead_idx on telegram_ulanish (lead_id);


-- telegram_ula_qator — lid uchun ham
create or replace function telegram_ula_qator(
  p_chat bigint, p_kim text, p_student text, p_teacher text, p_profile uuid,
  p_tel text, p_tg_ism text, p_lead uuid default null
) returns void
language sql volatile security definer set search_path = public as $$
  insert into telegram_ulanish (chat_id, kim, student_id, teacher_id, profile_id, lead_id, telefon, tg_ism)
  values (p_chat, p_kim, p_student, p_teacher, p_profile, p_lead, p_tel, p_tg_ism)
  on conflict (chat_id, kim, coalesce(student_id, ''), coalesce(teacher_id, ''), coalesce(profile_id::text, ''), coalesce(lead_id::text, ''))
  do update set holat = 'faol', tg_ism = excluded.tg_ism,
                telefon = coalesce(excluded.telefon, telegram_ulanish.telefon), updated_at = now()
$$;

revoke execute on function telegram_ula_qator(bigint, text, text, text, uuid, text, text, uuid) from public, anon, authenticated;
grant  execute on function telegram_ula_qator(bigint, text, text, text, uuid, text, text, uuid) to service_role;


-- telegram_ula_telefon — endi leads'ni ham tekshiradi (faqat hali yangi)
create or replace function telegram_ula_telefon(p_tel text, p_chat bigint, p_tg_ism text)
returns table (kim text, ism text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_t9 text := tel9(p_tel);
begin
  if v_t9 is null then
    return;
  end if;

  perform telegram_ula_qator(p_chat, 'oquvchi', s.id, null, null, null, p_tel, p_tg_ism)
    from students s where s.holat <> 'ketgan' and tel9(s.shaxsiy_tel) = v_t9;

  perform telegram_ula_qator(p_chat, 'ota_ona', s.id, null, null, null, p_tel, p_tg_ism)
    from students s
    where s.holat <> 'ketgan'
      and (tel9(s.ota_tel) = v_t9 or tel9(s.ona_tel) = v_t9)
      and tel9(s.shaxsiy_tel) is distinct from v_t9;

  perform telegram_ula_qator(p_chat, 'ustoz', null, t.id, null, null, p_tel, p_tg_ism)
    from teachers t where t.holat = 'faol' and tel9(t.telefon) = v_t9;

  perform telegram_ula_qator(p_chat, 'xodim', null, null, p.id, null, p_tel, p_tg_ism)
    from profiles p
    where p.holat = 'faol' and p.rol in ('admin', 'direktor', 'qabulxona') and tel9(p.telefon) = v_t9;

  perform telegram_ula_qator(p_chat, 'lid', null, null, null, p_tel, p_tg_ism, l.id)
    from leads l where l.holat = 'yangi' and tel9(l.telefon) = v_t9;

  return query
    select u.kim, coalesce(s.fish, t.ism, p.ism, l.ism)
    from telegram_ulanish u
    left join students s on s.id = u.student_id
    left join teachers t on t.id = u.teacher_id
    left join profiles p on p.id = u.profile_id
    left join leads l on l.id = u.lead_id
    where u.chat_id = p_chat and u.holat = 'faol';
end;
$$;

revoke execute on function telegram_ula_telefon(text, bigint, text) from public, anon, authenticated;
grant  execute on function telegram_ula_telefon(text, bigint, text) to service_role;
