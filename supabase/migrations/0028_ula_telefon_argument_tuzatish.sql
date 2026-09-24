-- ============================================================
--  World Bridge Academy (forger fork)
--  0028_ula_telefon_argument_tuzatish.sql · 0025 dagi haqiqiy sabab
--
--  0027 overload muammosini yechdi, lekin asosiy xato boshqa joyda
--  edi: telegram_ula_telefon() ni 0025 da qayta yozganda, 4 ta
--  (oquvchi/ota_ona/ustoz/xodim) chaqiruvga bitta ORTIQCHA `null`
--  kirib qolgan — argumentlar bittaga siljib, p_tel va p_tg_ism
--  noto'g'ri pozitsiyaga tushgan. Faqat 'lid' qatori to'g'ri edi.
--
--  Asl (jamshideng/wba, 0021) bilan solishtirib tuzatildi.
-- ============================================================

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
      and tel9(s.shaxsiy_tel) is distinct from v_t9;

  perform telegram_ula_qator(p_chat, 'ustoz', null, t.id, null, p_tel, p_tg_ism)
    from teachers t where t.holat = 'faol' and tel9(t.telefon) = v_t9;

  perform telegram_ula_qator(p_chat, 'xodim', null, null, p.id, p_tel, p_tg_ism)
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
