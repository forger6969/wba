---
name: wba-tekshir
description: WBA loyihasida o'zgarishdan keyingi to'liq tekshiruv — testlar, typecheck, lint, bazaning mantiq/RLS testlari, yangi migratsiyani lokal Supabase'ga qo'llash va build. Kod yoki migratsiya o'zgargandan keyin, commit'dan oldin ishlating.
---

# WBA tekshiruvi — tartib bilan

Xotira kam kompyuter: har Node buyrug'iga `NODE_OPTIONS=--max-old-space-size=3072`.

```bash
cd wba-loyiha/wba
npm test                                              # parserlar, login, kiritish (node:test)
NODE_OPTIONS=--max-old-space-size=3072 npx tsc --noEmit
npx eslint src scripts
bash supabase/run-local-test.sh > "$TEMP/dbtest.log" 2>&1; echo $?   # 0 bo'lishi shart
grep -n ERROR "$TEMP/dbtest.log"                      # bo'sh bo'lishi kerak
```

Yangi `supabase/migrations/00NN_*.sql` qo'shilgan bo'lsa:

```bash
npx supabase@latest migration up                      # lokal Supabase'ga
```

Oxirida (sayt ko'rsatiladigan bo'lsa): `npm run ishga -- -Qurish`.

## Migratsiya qoidalari

- 0001 dan boshlab qo'llangan fayllar TAHRIRLANMAYDI — har o'zgarish yangi raqam.
- `alter type … add value` — ALOHIDA faylda (qiymat o'sha tranzaksiyada ishlatilmaydi).
- `language sql` funksiyada enum literali yaratilishda tekshiriladi — yangi qiymat avvalgi faylda bo'lsin.
- security definer funksiya huquqni O'ZI tekshiradi; server chaqiruvi uchun
  `auth.uid() is null` — o'tkaziladi (bot, cron, ko'chirish).
- Har yangi amal uchun `supabase/_test_logic.sql` ga test: ruxsat bor holat VA to'siq.
- Testda sozlashdan oldin `reset request.jwt.claim.sub;` — `reset role` uni tozalamaydi.

## Ko'chirish (Sheets → baza)

`npm run migrate:dry` — yozmaydi, Sheets'ning `To'lashi kerak / To'langan / Qarz`
bilan solishtiradi. Farq bo'lsa yozish boshlanmaydi. 2026-09-18 holati: 86 dan 83 mos;
3 farq Sheets'dagi xato (S076 bir guruhda ikki marta, S079 sanasi matn).
