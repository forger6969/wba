# Каталоги — тексты листингов

Готовые тексты для регистрации LevelUp Academy в SaaS-каталогах и локальных
бизнес-справочниках (задача P2 в [GEO-OFFSITE.md](./GEO-OFFSITE.md)). По разделению
ролей: **я (`abdulazizCEO`) готовлю тексты**, **владелец создаёт аккаунты и подаёт
листинги** (авто-регистрация в чужих сервисах не делается).

После подачи — отметь статус в трекере в [GEO-OFFSITE.md](./GEO-OFFSITE.md#Трекер-подачи)
(площадка → статус → дата → ссылка).

Обновлено: 2026-07-25.

---

## Факты о продукте (единый источник для всех листингов)

Чтобы описания не расходились между площадками — все цифры и формулировки ниже
взяты из `src/i18n/ru.js` / `uz.js` (`ceo.*`) и `CEO-BACKLOG.md`, ничего не придумано.

| Поле | Значение |
|---|---|
| Название | LevelUp Academy |
| Уточнение (для disambiguation) | LevelUp Academy CRM — программное обеспечение, не школа |
| Сайт | https://levelup-academy.uz |
| Категория | Education CRM / Student Management Software / SaaS for education centers |
| Рынок | Учебные центры, языковые школы, курсы, репетиторы — Узбекистан (мультиязычно ru/uz) |
| Одна строка (RU) | CRM для учебного центра: учёт учеников, оплаты и долги, посещаемость, тесты, мотивация и Telegram-уведомления в одной системе |
| Одна строка (EN) | All-in-one CRM for education centers: student records, payments & debts, attendance, tests, gamification and Telegram notifications |
| Ключевые модули | Платежи и сплит-инвойсы, davomat (посещаемость), тесты с серверным таймером, домашние задания, коины/геймификация, realtime-чаты, видеоуроки, отчёты, Telegram-бот, мультифилиальность |
| Роли/кабинеты | CEO-роль (бывш. Super Admin), Admin, Ментор, Методист, Родитель, Ученик — 6 кабинетов, RBAC на сервере |
| Цена | До 30 активных аккаунтов — бесплатно; далее от 199 000 сум/мес. Считаются ученики, родители и сотрудники; филиалы безлимитно |
| Триал | Первая неделя бесплатно |
| Ниши посадочных страниц | `/landing/for-language-school`, `/landing/for-courses`, `/landing/crm-vs-excel` |
| Логотип | `frontend/landing-page/public/logo.png` (растровый, есть готовый) |
| Год основания | **2026** (от владельца, 03.08) |
| Размер команды | **6 человек** (от владельца, 03.08) |
| Основатель | **Azizbek Amangeldiev** (от владельца, 20.08) — `linkedin.com/in/azizbek-amangeldi` |
| Соцсети (`sameAs`) | Telegram `t.me/levelupacademycrm`, Instagram `instagram.com/levelup_academy_uz`, LinkedIn (личный профиль основателя) `linkedin.com/in/azizbek-amangeldi` |
| 🚫 Отсутствуют (не выдумывать) | Юр. адрес офиса и телефон компании — офиса нет (владелец, 03.08). Блокирует Yandex Бизнес и 2GIS |

---

## Глобальные SaaS-каталоги (описания на английском — аудитория площадок международная)

### Product Hunt
- **Tagline** (≤60 симв.): `All-in-one CRM for education centers`
- **Description** (~260 симв.):
  > LevelUp Academy is a multi-tenant CRM built for education centers, language schools, and tutoring businesses. Track students, payments, attendance, tests, and homework — with gamification and Telegram notifications built in. First week free.
- **Topics/tags:** Education, SaaS, CRM, EdTech, Small Business

### G2
- **Short description** (~150 симв.):
  > CRM platform for education centers to manage students, payments, attendance, tests, and homework — with built-in gamification and Telegram alerts.
- **Category:** Education CRM / Student Information System
- **Long description:** см. Product Hunt description + список модулей из таблицы выше.

### Capterra / GetApp (один листинг, схожий формат)
- **Product name:** LevelUp Academy
- **Category:** Education CRM Software
- **Short description:**
  > Multi-tenant CRM for education centers: student and payment tracking, attendance (davomat), timed tests, homework, gamification, real-time chat, and Telegram notifications.
- **Key features (bullet list):**
  - Split payments & invoicing with cloud receipts
  - Attendance tracking (davomat)
  - Server-timed tests and homework modules
  - Gamification: coins, shop, leaderboards
  - Real-time chat and presence
  - Telegram bot notifications
  - Multi-branch support with role-based access (CEO-role/Admin/Mentor/Methodist/Parent/Student)
- **Pricing model:** Freemium — free up to 30 active accounts, then tiered pricing from 199,000 UZS/month; students, parents and staff all count

### SaaSHub
- **One-liner:** `CRM for education centers — students, payments, attendance, tests, gamification`
- **Alternative to (categories to tag against):** Bitrix24, amoCRM, generic spreadsheet/Excel-based student tracking
- **Description:** см. Product Hunt description

### AlternativeTo
- **"Alternative to" list:** Excel/Google Sheets (manual student tracking), Bitrix24, amoCRM — for education-center use case specifically
- **Description:** см. Product Hunt description
- **Tags:** education, crm, saas, student-management

### Crunchbase
- ✅ **Блокер снят 03.08** — данные получены от владельца.
- **Founded:** 2026
- **Company size:** 1–10 employees (фактически 6)
- **Headquarters:** Uzbekistan
- **Categories:** Education CRM, SaaS, EdTech, Software
- **Website:** https://levelup-academy.uz
- **Social:** Telegram `t.me/levelupacademycrm`, Instagram `@levelup_academy_uz`
- **Description:** см. Product Hunt description выше.
- Готово к подаче владельцем — регистрация аккаунта на его стороне.

### Slashdot
- **Category:** Business / Education Software
- **Description:** см. Product Hunt description

---

## SaaSHub — хвосты (готово к вставке, 05.08)

Продукт **уже опубликован публично** — `saashub.com/levelup-academy` отдаёт страницу без
логина. Осталось три вещи, и все требуют входа в аккаунт SaaSHub.

> [!warning] Главное, что выяснилось 05.08
> Страница продукта отдаётся с `robots: noindex`, и на ней написано: «The primary details
> have not been verified within the last quarter, and they might be outdated». То есть
> ссылка сейчас **не работает как CEO-сигнал** — Google эту страницу в индекс не берёт.
> Это меняет приоритет: сначала верификация, потом всё остальное.

### 1. Верификация — делать первой

Два способа, оба на странице `saashub.com/verify/levelup-academy` (нужен логин):

1. **По email** — требуется активный адрес **на домене** `@levelup-academy.uz`. У нас он
   есть: `info@levelup-academy.uz`. Письмо со ссылкой придёт на `thermidorplus@gmail.com`
   (Cloudflare Email Routing), по ссылке — подтверждение. **Отправлять с этого адреса
   ничего не нужно** — только принять, а приём у нас работает.
2. **Кодом на сайте** — SaaSHub выдаёт код, его надо разместить на `levelup-academy.uz`.
   Если первый способ не сработает, пришли мне код — размещу в `index.html` и задеплою.

### 2. Features — вставить как есть

- Split payments: one invoice paid part in cash, part by card, with the receipt stored in the cloud
- Automatic debt tracking with a debtor list per branch
- Access to the student portal is blocked automatically while an invoice is overdue
- Attendance (davomat) with a per-group register and parent-visible history
- Tests with a server-side timer and auto-submit
- Homework with file attachments, deadlines and grading
- Video lessons scoped to the student's own group
- Gamification: coins, a rewards shop and weekly/monthly leaderboards
- Realtime chat plus a direct parent-to-administrator channel
- Telegram bot: absences, payments, grades and debts, no app to install
- Multi-branch by design — branches are isolated, the owner sees the whole network
- Seven roles with server-side RBAC: Main Admin, CEO-role, Admin, Mentor, Methodist, Student, Parent

### 3. Q&A — вставить как есть

- **Is there a free plan?** Yes — free for up to 30 active accounts, with no time limit.
  Paid plans start at 199,000 UZS/month for 31–100 active accounts.
- **Does the price depend on the number of branches?** No. Branches are unlimited on every
  plan; the price depends on the total number of active student, parent and staff accounts.
- **Is there a mobile app?** No. The system runs in the phone browser, and notifications
  are delivered through Telegram.
- **What happens when a student pays late?** The student's access is blocked automatically
  while the invoice is overdue and restored on the next request after payment — including
  a partial one.
- **How long does onboarding take?** Seven days, done by our team. If we miss that, the
  next month is free.
- **Which languages does it support?** The site and materials are in Russian, Uzbek and
  English.

---

## crmindex.ru и picktech.ru — тексты для подачи (05.08)

Обе площадки проверены: бесплатная подача есть (см. [GEO-OFFSITE.md](./GEO-OFFSITE.md)).
Аудитория российская, поэтому описания — на русском, и в них сразу указан регион, чтобы
карточка не выглядела как заявка на российский рынок.

- **Название:** LevelUp Academy — CRM для учебного центра
- **Сайт:** https://levelup-academy.uz
- **Категории:** CRM-системы · Образование / EdTech · Отраслевые решения
- **Краткое описание (до 150 знаков):**
  > CRM для учебных центров и языковых школ: ученики, оплаты и долги, посещаемость, тесты,
  > мотивация и Telegram-уведомления в одной системе.
- **Полное описание:**
  > LevelUp Academy — SaaS-платформа для управления учебным центром: приём оплат со
  > сплит-платежами (часть наличными, часть картой), автоматический учёт долгов,
  > посещаемость (davomat), тесты с серверным таймером, домашние задания, видеоуроки,
  > геймификация (коины, магазин наград, лидерборды), realtime-чаты и Telegram-бот для
  > родителей. Семь ролей с проверкой прав на сервере, мультифилиальность с первого дня.
  > Разработана в Узбекистане, интерфейс сайта на русском, узбекском и английском.
  > До 30 активных аккаунтов — бесплатно, далее от 199 000 сум в месяц, филиалы безлимитно.
- **Цена:** от 0 (до 30 активных аккаунтов); платные тарифы от 199 000 сум/мес
- ⚠️ **Валюта:** если в форме нет UZS — цену **не проставлять** (та же ошибка, что чуть не
  ушла на SaaSHub: 199 000 без валюты читается как доллары). Оставить ссылку на страницу
  тарифов.
- ⚠️ **crmindex:** после подачи — попросить их добавить продукт **во все подходящие
  рубрики**. Их собственный совет: трафик идёт на страницы рейтингов, а не на карточку.

---

## Локальные площадки (RU/UZ)

### Yandex Бизнес
- ⚠️ **Блокер (тот же, что в CEO-BACKLOG.md):** нужен физический адрес офиса и
  телефон компании — без них организацию не завести, регион «Узбекистан» тоже
  подтягивается через это. Как только адрес/телефон появятся — заполню карточку.
- **Название:** LevelUp Academy
- **Категория:** Программное обеспечение / CRM-системы / Образовательные технологии
- **Описание (RU):**
  > CRM для учебных центров: учёт учеников, оплаты и долги, посещаемость (davomat), тесты, домашние задания, геймификация и Telegram-уведомления — в одной системе. Первая неделя бесплатно.
- **Сайт:** https://levelup-academy.uz

### 2GIS
- ⚠️ Тот же блокер — нужен адрес филиала/офиса для карточки организации.
- **Название и описание** — как в Yandex Бизнес выше.

### Узбекские бизнес-справочники / IT-EdTech листинги (общий шаблон)
- **Название:** LevelUp Academy
- **Краткое описание (RU):**
  > Платформа для учебных центров, языковых школ и курсов: учёт учеников, оплаты, посещаемость, тесты, мотивация учеников и Telegram-бот.
- **Qisqacha tavsif (UZ):**
  > O'quv markazlari, til markazlari va kurslar uchun platforma: o'quvchilar hisobi, to'lovlar, davomat, testlar, o'quvchilar motivatsiyasi va Telegram bot.
- **Сайт:** https://levelup-academy.uz
- **Категория:** `Ta'lim markazi uchun dastur / CRM` (SaaS для образования)

---

## Что нужно от владельца, чтобы продолжить

1. ~~**Год основания + размер команды**~~ — ✅ получены 03.08 (2026, 6 человек). Crunchbase разблокирован.
2. 🚫 **Адрес офиса + телефон** — офиса нет (владелец, 03.08). Yandex Бизнес и 2GIS заблокированы до его появления; из активного списка убраны.
3. Сами регистрации на площадках (Product Hunt, G2, Capterra, GetApp, SaaSHub, AlternativeTo, Slashdot, Crunchbase) — тексты выше готовы к копированию, аккаунт/подача на стороне владельца.

---

## Связанное

- [GEO-OFFSITE.md](./GEO-OFFSITE.md) — общий план off-site GEO/AEO, трекер подачи
- [CEO-BACKLOG.md](./CEO-BACKLOG.md) — общий CEO-бэклог (тот же блокер адреса упомянут там же)

#ceo #geo #directories #backlinks
