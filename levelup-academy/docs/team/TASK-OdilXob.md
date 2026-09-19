# 🟡 Odil / Xob — Topshiriq: Expenses + Reports + Settings

> **Developer:** Odil / Xob (Admin frontend)
> **Branch:** `odil-xob` (yoki sizga berilgan branch)
> **Asos:** `Abduloh` branchidan oling
> **Vazifa:** Admin Expenses, Reports, Settings sahifalarini yakunlash

---

## 📋 Umumiy ko'rsatmalar

### Ishga tushirish
```bash
git checkout -b odil-xob Abduloh
cd frontend/staff
npm install
npm run dev
```

### Uslub (Styling)
- **style.md** ni o'qing — `frontend/staff/src/pages/admin/style.md`
- CSS variables: `var(--bg)`, `var(--surface)`, `var(--text)`, `var(--green)` va h.k.
- Barcha kartalar: `glass-strong rounded-[20px] p-5 card-hover-premium`
- Animatsiyalar: `animate-fade-in`, `animate-slide-up`, `stagger-*`
- **Tailwind v4** — utility-class lar orqali styling
- **lucide-react** — hozirgi loyihada ishlatilgan
- **recharts** — grafiklar uchun (allaqachon o'rnatilgan)

### API ulanish
- API chaqiruvlari `frontend/staff/src/api.js` orqali
- Query hooks: `frontend/staff/src/queries.js`
- `useAuth()` dan token olinadi
- Backend URL: `https://api.levelup-academy.uz`

### Git
- Commitlar **English** da yoziladi
- `feat:`, `fix:`, `refactor:`, `style:` prefixlari bilan
- PR `Abduloh` ga yuboriladi

---

## Qisqa izoh: Sahifalarning hozirgi holati

| Sahifa | Hajmi | Holati | Asosiy muammo |
|--------|-------|--------|---------------|
| **Expenses.jsx** | 1204 qator | ✅ To'liq, backend bilan ishlaydi | `handleExport` stale closure bug; PATCH endpoint yo'q |
| **Reports.jsx** | 257 qator | ⚠️ Tayyor, lekin DaisyUI + Russian | DaisyUI classlari, Russian UI, animatsiyalar yo'q |
| **Settings.jsx** | 954 qator | ✅ To'liq, premium komponentlar | Russian UI, `Users` import tekshirish |

---

## 📄 1. Admin Expenses (`Expenses.jsx`)

**Holati:** ✅ To'liq — backend bilan ishlaydi
- Stat cards (jami, bu oy, kutilmoqda, tasdiqlangan, o'rtacha)
- Filter toolbar (kategoriya, status, sana oralig'i, sort)
- Charts (kategoriyalar bo'yicha, oylik trend)
- View detail modal
- Add/Edit modal
- Delete confirmation
- PDF Export (jspdf + autotable)
- Desktop + mobile filter panellari

### 🔧 Nima qilish kerak:

**1. Fix: `handleExport` stale closure** (muhim)
- `handleExport` (qator 384) `useCallback` bilan, dependency array `[]`
- Ichida `filtered` va `filteredTotal` ishlatilgan — lekin ular dependency da emas
- Natija: export har doim birinchi renderdagi ma'lumotlarni eksport qiladi
- **Fix:** Dependency array ga `[filtered, filteredTotal]` qo'shish:
  ```jsx
  const handleExport = useCallback(async () => {
    // ... existing code ...
  }, [filtered, filteredTotal]);
  ```
  Yoki `filtered` o'rniga `expenses` dan foydalanish (hammasini eksport qilish uchun)

**2. Backend PATCH endpoint kutilmoqda**
- `openEditModal` (qator 329) — `TODO` komment bor
- Backendda `PATCH /admin/expenses/:id` yo'q, shuning uchun edit qilganda **yangi xarajat yaratiladi**
- Hozircha `TODO` ni qoldiring — Karis backendni qo'shganda ulash
- Kelajakda `handleSave` ni update/create farqlash uchun `editingId` state qo'shiladi

**3. `npm run build` tekshirish**
```bash
npm run build
```
- 0 errors bo'lishi kerak
- Agar xato bo'lsa, tuzating

---

## 📄 2. Admin Reports (`Reports.jsx`)

**Holati:** ⚠️ Tayyor, lekin konvertatsiya kerak
- KPI cards (obshaya viruchka, obshiy dolg, studentov, srednyaya viruchka)
- Bar chart (vıruchka po grupam)
- Pie chart (dolya vıruchki)
- Table (detali po grupam)
- Period filter (ot/do datumi)

### 🎯 Asosiy vazifa: DaisyUI → Custom Style

Reports.jsx **DaisyUI** klasslarini ishlatadi, ularni custom style ga o'tkazish kerak.

**Konkret o'zgartirishlar:**

**a) `PageHeader` ni olib tashlash** (qator 100-101, 117)
- `PageHeader` komponenti DaisyUI uslubida
- O'rniga `style.md` dagi header patternini ishlatish:
  ```jsx
  <div className="flex items-center gap-3 mb-1.5">
    <div className="w-1 h-7 rounded-full bg-[var(--green)]" />
    <h1 className="text-[28px] font-extrabold text-[var(--text)] tracking-[-0.035em] leading-none">Hisobotlar</h1>
  </div>
  <p className="text-[13px] text-[var(--text-secondary)] ml-4">Guruhlar bo'yicha daromad va qarzdorlik tahlili</p>
  ```

**b) `input input-bordered input-sm` → custom input** (qator 124, 135)
- DaisyUI input classlarini custom style ga o'tkazish:
  ```jsx
  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all border-[var(--border)] focus-within:border-[var(--green)] bg-[var(--surface)]">
    <Calendar size={14} className="text-[var(--text-muted)]" />
    <input
      type="date"
      value={from}
      onChange={(e) => setFrom(e.target.value)}
      className="bg-transparent outline-none text-[13px] text-[var(--text)] [color-scheme:light]"
    />
  </div>
  ```

**c) `alert alert-error` → custom error** (qator 110)
  ```jsx
  <div className="text-[12px] font-semibold rounded-[16px] px-5 py-4 flex items-center gap-3"
    style={{ background: 'rgba(232,84,62,0.10)', color: 'var(--danger)', border: '1px solid rgba(232,84,62,0.18)' }}>
    <AlertTriangle className="w-4 h-4" />
    Yuklashda xatolik: {error.message}
  </div>
  ```

**d) `table` → custom table** (qator 227-253)
- DaisyUI `table` classi o'rniga custom styles:
  ```jsx
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-muted)] bg-[var(--surface)] border-b border-[var(--border)]">
          <th className="px-5 py-4">Guruh</th>
          <th className="px-5 py-4 text-right">Studentlar</th>
          <th className="px-5 py-4 text-right">Daromad</th>
          <th className="px-5 py-4 text-right">Qarzdorlik</th>
        </tr>
      </thead>
      <tbody>
        ...
      </tbody>
    </table>
  </div>
  ```

**e) Russian → Uzbek UI** — barcha matnlarni o'zbek tiliga o'tkazish:

| Russian | Uzbek |
|---------|-------|
| Общая выручка | Jami daromad |
| Общий долг | Jami qarzdorlik |
| Студентов | Studentlar |
| Средняя выручка | O'rtacha daromad |
| Выручка по группам | Guruhlar bo'yicha daromad |
| Доля выручки | Daromad ulushi |
| Детали по группам | Guruh tafsilotlari |
| Период | Davr |
| От | Dan |
| До | Gacha |
| Сбросить | Tozalash |
| Нет данных для графика | Grafik uchun ma'lumot yo'q |
| Нет данных | Ma'lumot yo'q |
| Ошибка загрузки | Yuklashda xatolik |
| Выручка | Daromad |
| Долг | Qarzdorlik |
| Группа | Guruh |

**f) Animatsiyalar qo'shish:**
- KPI cards: `animate-fade-in stagger-1` dan `stagger-4` gacha
- Chart container: `animate-fade-in stagger-3`, `stagger-4`
- Table: `animate-fade-in stagger-5`
- Sahifa wrapper: `page-enter` yoki `space-y-6 page-enter pb-8`

**g) Skeleton loading** (qator 97-104)
- Hozir `RowSkeleton` ishlatilgan — bu yetarli
- Agar xohlasangiz, `SkeletonKpis` qo'shish mumkin:
  ```jsx
  import { SkeletonKpis } from '../../components/Skeleton.jsx';
  ```

**h) KPI card styling — CSS variables** (qator 19-41)
- `KpiCard` komponenti hozir to'g'ri ishlaydi (`glass-strong`, `card-hover-premium`)
- Faqat `animate-fade-in` va `stagger-*` qo'shilgan — tekshirish kerak

**i) Empty state ni to'ldirish** — barData va pieData bo'sh bo'lganda hozirgi ko'rinish yetarli, lekin sahifaning empty state i uchun alohida komponent qo'shish mumkin

---

## 📄 3. Admin Settings (`Settings.jsx`)

**Holati:** ✅ To'liq — premium komponentlar bilan
- 6 ta tab: General, Appearance, Notifications, Security, Finance, Localization
- SettingCard, Field, Toggle, PremiumInput, PremiumSelect, OptionGroup
- Dirty state detection + Fixed save bar
- Password change
- API: `useAdminSettings`, `api.adminUpdateSettings`

### 🔧 Nima qilish kerak:

**1. Russian → Uzbek UI** — Settings.jsx da barcha Russian matnlarni o'zbek tiliga o'tkazish:

**TABS** (qator 17-23):
| Russian | Uzbek |
|---------|-------|
| Общие | Umumiy |
| Внешний вид | Tashqi ko'rinish |
| Уведомления | Bildirishnomalar |
| Безопасность | Xavfsizlik |
| Финансы | Moliyaviy |
| Локализация | Localizatsiya |

**General tab:**
| Russian | Uzbek |
|---------|-------|
| Информация о филиале | Filial ma'lumoti |
| Основные данные вашего учебного центра | O'quv markazingiz asosiy ma'lumotlari |
| Название филиала | Filial nomi |
| Адрес | Manzil |
| Телефон | Telefon |
| Email | Email |
| Веб-сайт | Veb-sayt |
| URL сайта филиала (если есть) | Filial sayti URL (agar mavjud bo'lsa) |

**Appearance tab:**
| Russian | Uzbek |
|---------|-------|
| Отображение | Ko'rinish |
| Настройте видимость элементов | Elementlar ko'rinishini sozlash |
| Компактный режим | Yig'iq rejim |
| Уменьшить отступы для большего количества информации | Ma'lumot ko'proq joylashishi uchun oralqlarni kamaytirish |
| Показывать аватары | Avatarlarni ko'rsatish |
| Отображать фотографии студентов и сотрудников | Student va xodimlarning rasmlarini ko'rsatish |

**Notifications tab:**
| Russian | Uzbek |
|---------|-------|
| Каналы уведомлений | Bildirishnoma kanallari |
| Выберите, куда отправлять уведомления | Bildirishnomalarni qayerga yuborishni tanlang |
| Email-уведомления | Email bildirishnomalar |
| Отправлять уведомления на email | Emailga bildirishnomalar yuborish |
| Telegram-уведомления | Telegram bildirishnomalar |
| Через Telegram-бота | Telegram-bot orqali |
| SMS-уведомления | SMS bildirishnomalar |
| Только для критических событий | Faqat muhim hodisalar uchun |
| События | Hodisalar |
| Какие события отслеживать | Qaysi hodisalarni kuzatish |
| Просроченные платежи | Muddati o'tgan to'lovlar |
| Уведомлять о просроченных инвойсах | Muddati o'tgan invoyslar haqida bildirish |
| Новые студенты | Yangi studentlar |
| Уведомлять о регистрации новых студентов | Yangi studentlar ro'yxatdan o'tganda bildirish |
| Посещаемость | Davomat |
| Уведомлять о пропусках | Qoldirilgan darslar haqida bildirish |
| Ежедневный отчёт | Kunlik hisobot |
| Сводка за день в конце рабочего времени | Ish vaqti oxirida kunlik xulosa |

**Security tab:**
| Russian | Uzbek |
|---------|-------|
| Двухфакторная аутентификация | Ikki faktorli autentifikatsiya |
| Дополнительный уровень защиты аккаунта | Hisob qaydnomasi uchun qo'shimcha himoya |
| Включить 2FA | 2FA ni yoqish |
| При входе потребуется код из приложения-аутентификатора | Kirishda autentifikator ilovasidan kod talab qilinadi |
| 2FA активна | 2FA faol |
| Сессии | Sessiyalar |
| Управление активными сессиями | Faol sessiyalarni boshqarish |
| Тайм-аут сессии | Sessiya muddati |
| Через сколько минут бездействия произойдёт выход | Qancha daqiqa harakatsizlikdan keyin chiqish |
| Множественные сессии | Bir nechta sessiyalar |
| Разрешить вход с нескольких устройств одновременно | Bir vaqtda bir nechta qurilmadan kirishga ruxsat |
| Смена пароля | Parolni o'zgartirish |
| Обновите пароль для безопасности | Xavfsizlik uchun parolingizni yangilang |
| Текущий пароль | Hozirgi parol |
| Новый пароль | Yangi parol |
| Минимум 8 символов | Kamida 8 ta belgi |
| Подтвердите пароль | Parolni tasdiqlang |
| Пароль успешно изменён | Parol muvaffaqiyatli o'zgartirildi |
| Ошибка смены пароля | Parolni o'zgartirishda xatolik |
| Пароли не совпадают | Parollar mos kelmadi |
| Изменить пароль | Parolni o'zgartirish |

**Finance tab:**
| Russian | Uzbek |
|---------|-------|
| Валюта | Valyuta |
| Настройки валюты и формата сумм | Valyuta va summa formati sozlamalari |
| Символ валюты | Valyuta belgisi |
| Инвойсы | Invoyslar |
| Настройки автоматической генерации счетов | Avtomatik schot yaratish sozlamalari |
| Префикс инвойсов | Invoys prefiksi |
| Добавляется перед номером (например, INV-001) | Raqam oldiga qo'shiladi (masalan, INV-001) |
| Автогенерация инвойсов | Avtomatik invoys yaratish |
| Создавать инвойс автоматически при начале месяца | Oy boshida avtomatik invoys yaratish |
| Льготный период (дни) | Imtiyozli davr (kun) |
| Сколько дней давать на оплату после выставления счёта | Schot chiqarilgandan keyin necha kun to'lash muddati |
| Без льготного периода | Imtiyozli davrsiz |
| Узбекский сум | O'zbek so'mi |
| Доллар США | AQSH dollari |
| Российский рубль | Rossiya rubli |

**Localization tab:**
| Russian | Uzbek |
|---------|-------|
| Язык и формат | Til va format |
| Язык интерфейса и форматы отображения | Interfeys tili va ko'rinish formatlari |
| Язык интерфейса | Interfeys tili |
| Формат даты | Sana formati |
| Региональные настройки | Mintaqaviy sozlamalar |
| Часовой пояс и начало недели | Vaqt mintaqasi va hafta boshi |
| Часовой пояс | Vaqt mintaqasi |
| Первый день недели | Haftaning birinchi kuni |
| Понедельник | Dushanba |
| Воскресенье | Yakshanba |

**Header (qator 831-866):**
| Russian | Uzbek |
|---------|-------|
| Настройки | Sozlamalar |
| Управление параметрами филиала | Filial sozlamalarini boshqarish |
| Загрузка настроек... | Sozlamalar yuklanmoqda... |
| Сохранено | Saqlandi |
| Ошибка сохранения | Saqlashda xatolik |
| Есть несохранённые изменения | Saqlanmagan o'zgarishlar bor |
| Отменить | Bekor qilish |
| Сохранить | Saqlash |

**2. `Users` import tekshirish**
- `TabAppearance` (qator 313) — `Users` icon ishlatilgan
- Import: `Users` `lucide-react` dan import qilinganmi? (qator 9 da `{ Smile }` bilan birga emas)
- Agar missing bo'lsa, import array ga `Users` qo'shish

**3. `onChange` funksiyalarini tekshirish**
- `PremiumSelect` komponenti (qator 452, 613, 662, 743) — `onChange` event orqali ishlaydi
- Select value lar `Number` ga o'zgartirilganmi tekshirish (sessionTimeout, paymentGraceDays)

**4. `npm run build` tekshirish**
```bash
npm run build
```

---

## ✅ Bajarilgan mezonlari

| # | Tekshirish |
|---|-----------|
| 1 | `npm run build` — **0 errors** |
| 2 | **Expenses**: `handleExport` stale closure fix (dep array) |
| 3 | **Reports**: DaisyUI klasslari o'chirilgan, custom style |
| 4 | **Reports**: Barcha matnlar Uzbek |
| 5 | **Settings**: Barcha matnlar Uzbek |
| 6 | Barcha sahifalar `style.md` ga mos |
| 7 | CSS variables ishlatilgan (hardcoded hex emas) |
| 8 | Dark/light mode to'g'ri ishlaydi |
| 9 | Loading skeleton bor |
| 10 | Empty state bor |
| 11 | Animatsiyalar (`animate-fade-in`, `stagger-*`) |
| 12 | Commitlar English, prefix bilan |

---

## ⛔ MUHIM: Cheklovlar

1. **Backend fayllarga tegilmang!** (`backend/` papkasiga)
2. **Root fayllarga tegilmang!** (README.md, CLAUDE.md, package.json va h.k.)
3. **Boshqa developer sahifalariga tegilmang!** (Hamidulla ning Mentor, Chat, Payments)
4. **Expenses.jsx da `PATCH` endpoint yo'q** — edit flow duplicate yaratadi. Backend kelguncha `TODO` qoldiring
5. **`admin/routes.jsx`** va routing fayllariga o'zgartirish kiritish kerak bo'lsa — Karis/Team Lead ga habar bering

---

## 📞 Yordam

- **Abdulloh (Team Lead):** @Corvin_0 (Telegram) yoki code review uchun
- **Karis (Team Lead):** Backend muammolari uchun (@Azizbek2603)
- **Style guide:** `frontend/staff/src/pages/admin/style.md`
- **API docs:** `frontend/staff/src/api.js`
- **Queries:** `frontend/staff/src/queries.js`

## 🎯 Yakuniy eslatma

Eng muhimi — **build xatosiz o'tishi**. Har bir sahifani tugatgandan keyin:
```bash
npm run build
```
Agar xato bo'lsa, tuzating va keyin keyingi sahifaga o'ting.
