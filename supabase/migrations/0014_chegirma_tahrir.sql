-- ============================================================
--  World Bridge Academy
--  0014_chegirma_tahrir.sql · chegirmani istalgan vaqtda o'zgartirish
--
--  Chegirma ikki bosqichli (U_Qatnashuv.js, 0006):
--    1-bosqich — N oy yoki doimiy (necha oy bo'sh)
--    2-bosqich — 1-si tugagach, odatda kamroq, N oy yoki doimiy
--    ikkalasi ham yo'q — to'liq narx
--  1-bosqich doimiy bo'lsa 2-bosqichga hech qachon navbat kelmaydi.
--
--  Chegirma o'zgarganda HISOB-FAKTURALAR ham qayta hisoblanadi —
--  Sheets'dagi formula ham shunday qiladi (Qatnashuv qatorida narx va
--  chegirma har safar boshidan hisoblanadi). Aks holda eski oylar eski
--  chegirma bilan qolib, qarz Sheets'dagidan farq qilardi.
--
--  Narx o'zgarmaydi: har hisob-faktura o'z oyining narxini saqlaydi
--  (summa + chegirma), qayta hisoblashda faqat chegirma qismi yangilanadi.
-- ============================================================

create or replace function chegirma_ozgartir(p_enrollment uuid, p jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_c1   numeric := coalesce(nullif(p ->> 'chegirma_summa', '')::numeric, 0);
  v_c2   numeric := coalesce(nullif(p ->> 'chegirma2_summa', '')::numeric, 0);
  v_soni int;
begin
  if auth.uid() is not null and not app_is_staff() then
    raise exception 'Chegirmani o''zgartirish huquqingiz yo''q.';
  end if;
  if v_c1 < 0 or v_c2 < 0 then
    raise exception 'Chegirma manfiy bo''lmaydi.';
  end if;

  update enrollments set
    chegirma_summa  = v_c1,
    chegirma_oy     = case when v_c1 > 0 then nullif(p ->> 'chegirma_oy', '')::int else 0 end,
    chegirma2_summa = v_c2,
    chegirma2_oy    = case when v_c2 > 0 then nullif(p ->> 'chegirma2_oy', '')::int else 0 end,
    chegirma_sabab  = coalesce(nullif(p ->> 'chegirma_sabab', ''), chegirma_sabab)
  where id = p_enrollment;

  if not found then
    raise exception 'Yozilish topilmadi.';
  end if;

  -- Har oyning o'z narxi (summa + chegirma) saqlanadi, chegirma qayta qo'yiladi
  with e as (
    select * from enrollments where id = p_enrollment
  ),
  yangi as (
    select i.id,
           (i.summa + i.chegirma) as narx,
           least(
             chegirma_oyda(oy_raqami(e.boshlandi, i.davr),
                           e.chegirma_summa, e.chegirma_oy,
                           e.chegirma2_summa, e.chegirma2_oy),
             i.summa + i.chegirma
           ) as cheg
    from invoices i, e
    where i.enrollment_id = e.id and i.holat <> 'bekor'
  )
  update invoices i
     set chegirma = y.cheg,
         summa    = y.narx - y.cheg
    from yangi y
   where i.id = y.id
     and (i.chegirma is distinct from y.cheg);

  get diagnostics v_soni = row_count;
  return v_soni;
end;
$$;

comment on function chegirma_ozgartir is
  'Chegirma bosqichlarini o''zgartiradi va hamma oylarni qayta hisoblaydi (Sheets formulasi kabi). Qaytaradi: o''zgargan hisob-fakturalar soni.';
