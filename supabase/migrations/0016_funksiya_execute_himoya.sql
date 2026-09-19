-- ============================================================
--  World Bridge Academy
--  0016_funksiya_execute_himoya.sql · funksiyalarni anon chaqira olmasin
--
--  TESHIK EDI:
--    Postgres yangi funksiyaga EXECUTE huquqini o'z-o'zidan PUBLIC ga
--    beradi. 0003 esa faqat `grant execute ... to authenticated` yozgan,
--    lekin PUBLIC/anon dan OLIB QO'YMAGAN. anon kaliti brauzerda ochiq
--    turadi, ya'ni istagan odam JWT'siz, to'g'ridan-to'g'ri PostgREST
--    orqali definer funksiyalarni chaqira olardi:
--
--      POST /rest/v1/rpc/davomat_saqla
--      POST /rest/v1/rpc/oquvchi_qosh
--      POST /rest/v1/rpc/chegirma_ozgartir   ...
--
--    Bu funksiyalarning huquq tekshiruvi "auth.uid() bo'sh bo'lsa — bu
--    tizim (service_role), o'tkazib yuboramiz" qoidasiga tayanadi. anon
--    da ham auth.uid() bo'sh, demak tekshiruv CHETLAB O'TILARDI: begona
--    odam davomat yozishi, o'quvchi qo'shishi, chegirma o'zgartirishi
--    mumkin edi — hammasi RLS'ni aylanib o'tib.
--
--  ENDI:
--    Barcha funksiyalardan EXECUTE public va anon dan olib tashlanadi.
--    Faqat `authenticated` (kirgan foydalanuvchi) va `service_role`
--    (server, cron, skript) chaqira oladi. Kirgan foydalanuvchida
--    auth.uid() bor, ya'ni har funksiyaning o'z rol tekshiruvi ishlaydi.
--
--    Trigger funksiyalari (handle_new_user, *_himoya, audit_trigger…)
--    bundan zarar ko'rmaydi: ular EXECUTE grant orqali emas, trigger
--    sifatida, definer huquqi bilan ishlaydi.
--
--    subjects/levels ni anon o'qishi buzilmaydi — u yerdagi RLS
--    `using (true)`, funksiya chaqirmaydi.
-- ============================================================

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Ishonch uchun aniq qayta beramiz (0003 dagi bilan bir xil)
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- Bundan keyin qo'shiladigan funksiyalar ham shu qoidada tug'ilsin
alter default privileges in schema public
  revoke execute on functions from public;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
