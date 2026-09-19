# 🎨 UI/UX Style Guide — LevelUp Admin Panel

> **Maqsad:** Boshqa jamoa a'zolari ham Abdullohning stiliga mos qilib sahifalar yozishi uchun
> **Manba:** `UI-KIT.md` (Telegram orqali yuborilgan style guide)

---

## Цветовая система

### Основные цвета (CSS variables)

Светлая тема (`:root`):

| Переменная | Значение | Где используется |
|---|---|---|
| `--bg` | `#F6FBEA` | Фон страницы |
| `--surface` | `#ffffff` | Фон карточек |
| `--surface-hover` | `#F8FDF0` | Ховер карточек/строк |
| `--border` | `#E6EDD8` | Границы, разделители |
| `--text` | `#1D2417` | Основной текст |
| `--text-secondary` | `#5E6E52` | Вторичный текст |
| `--text-muted` | `#8FA283` | Muted текст, плейсхолдеры |
| `--green` | `#C6FF34` | Акцентный цвет (lime) |
| `--green-bg` | `rgba(198,255,52,0.12)` | Фон для активных элементов |
| `--success` | `#2ECC71` | Успех |
| `--warning` | `#F59E0B` | Предупреждение |
| `--danger` | `#E8543E` | Ошибка/просрочка |
| `--info` | `#3B82F6` | Инфо |
| `--shadow` | `rgba(29,36,23,0.08)` | Тень |
| `--shadow-lg` | `rgba(29,36,23,0.15)` | Большая тень |

Тёмная тема (`.dark`):

| Переменная | Значение |
|---|---|
| `--bg` | `#0A0E0A` |
| `--surface` | `#141914` |
| `--surface-hover` | `#1A211A` |
| `--border` | `rgba(220,233,204,0.10)` |
| `--text` | `#DCE9CC` |
| `--text-secondary` | `#8FA283` |
| `--text-muted` | `#5E6E52` |
| `--green` | `#C6FF34` (без изменений) |
| `--green-bg` | `rgba(198,255,52,0.10)` |
| `--shadow` | `rgba(0,0,0,0.25)` |
| `--shadow-lg` | `rgba(0,0,0,0.4)` |

### Прямые цвета (hex) — использовать ТОЛЬКО если нельзя через CSS-переменные

| Значение | Где |
|---|---|
| `#141B10` | Текст на зелёном фоне, активная навигация |
| `#2ECC71` | Статус "активно", зелёный тренд вверх |
| `#F59E0B` | Статус "ожидание", иконка солнца |
| `#E8543E` | Статус "просрочено", логаут ховер |
| `#3B82F6` | Инфо, иконки уроков/ДЗ |

### Цвета для фона статусов

| Фон | Для чего |
|---|---|
| `rgba(46,204,113,0.14)` | Оплачено, студент активен |
| `rgba(245,158,11,0.14)` | Ожидание, заморожено |
| `rgba(232,84,62,0.14)` | Просрочено |
| `rgba(198,255,52,0.2)` | Платежи, группы |
| `rgba(59,130,246,0.14)` | ДЗ, уроки |
| `rgba(232,84,62,0.12)` | Расходы |

---

## Glass-эффект

Два уровня:

**`.glass`** — мягкое стекло (для сайдбара, поиска):
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid var(--glass-border);
}
```

**`.glass-strong`** — плотное стекло (для карточек, хедера):
```css
.glass-strong {
  background: var(--surface);
  backdrop-filter: blur(30px) saturate(1.6);
  border: 1px solid var(--border);
  box-shadow: 0 4px 24px var(--shadow);
}
```

---

## Типографика

- **Шрифт:** Inter, system-ui, -apple-system, sans-serif
- **Размеры (всё через `text-[Npx]`):**

| Размер | Где |
|---|---|
| `text-[7px]` | Бейдж уведомлений |
| `text-[8px]` | Подпись "Админ панель" в сайдбаре |
| `text-[9px]` | Категории, секция "Навигация", kbd |
| `text-[10px]` | Бейджи, хедеры таблиц, табы фильтров, время, статус |
| `text-[11px]` | Дельта тренда, статус, метрики |
| `text-[12px]` | Основной текст, список активностей |
| `text-[13px]` | Имена студентов, текст карточек |
| `text-[14px]` | Заголовки секций, хедеры таблиц, пункты навигации |
| `text-[15px]` | Заголовок в хедере, названия на оси графика |
| `text-[16px]` | Название бренда в сайдбаре, модалка |
| `text-[18px]` | Платежные статы |
| `text-[26px]` | KPI-значения (выручка, расходы и т.д.) |

- **Жирность:** `font-bold` (заголовки), `font-semibold` (навигация, имена), `font-extrabold` (KPI, бренд)
- **Регистр:** `uppercase tracking-[0.06em]` — хедеры таблиц, лейблы
- **Трекинг:** `-0.02em` (KPI), `-0.03em` (бренд)

---

## Скругления (border-radius)

| Значение | Где |
|---|---|
| `rounded-[20px]` | Карточки (StatCard, GlassCard), модалка, поиск |
| `rounded-[16px]` | NotifDropdown, TiltCard, GroupCard, StudentCard |
| `rounded-[14px]` | Внутренние секции модалки |
| `rounded-[12px]` | Иконка бренда, поиск, кнопки, тултип графика |
| `rounded-[10px]` | Нав-айтемы, строки саммари, активности, кнопки хедера, аватар |
| `rounded-[8px]` | Табы фильтров, переключатели метрик |
| `rounded-[6px]` | Скелетон |
| `rounded-full` | Бейджи, статус-доты, тоггл темы, прогресс-бар |
| `rounded-none` | Хедер |

---

## Тени

| Тень | Где |
|---|---|
| `0 4px 24px var(--shadow)` | Карточки (glass-strong) |
| `0 16px 48px var(--shadow-lg)` | NotifDropdown |
| `0 4px 16px var(--green-glow)` | Кнопка primary |
| `0 12px 40px var(--shadow-lg), 0 0 0 1px var(--green) inset` | Ховер карточки (card-hover-premium) |

---

## Анимации

### Вход страниц и элементов

| Класс | Эффект | Длительность | Timing |
|---|---|---|---|
| `.page-enter` | translateY(20) + scale(0.98) → норма | 0.45s | cubic-bezier(0.16, 1, 0.3, 1) |
| `.scale-in` | scale(0.92) + opacity 0 → 1 | 0.3s | cubic-bezier(0.34, 1.56, 0.64, 1) |
| `.slide-up` | translateY(30) + opacity 0 → 1 | 0.4s | cubic-bezier(0.16, 1, 0.3, 1) |
| `.slide-right` | translateX(-20) + opacity 0 → 1 | 0.35s | ease-out |
| `.fade-in` | opacity 0 → 1 | 0.3s | ease-out |

### Задержки для stagger-анимации (использовать с `.slide-up`)

`.stagger-1` → 0.03s, `.stagger-2` → 0.06s, … `.stagger-12` → 0.36s

### Остальные анимации

| Класс | Описание |
|---|---|
| `.shimmer` | Бегущий градиент для загрузки |
| `.skeleton-pulse` | Скелетон с шиммером |
| `.float` | Плавное покачивание (6s) |
| `.glow-ring` | Пульсирующее зелёное свечение вокруг иконки |
| `.pulse-dot` | Пульсирующая точка статуса |

---

## Ховеры — полный список

### 1. Карточки (все glass-strong)
```jsx
className="glass-strong rounded-[20px] card-hover-premium p-5"
```
На ховере: `translateY(-4px) scale(1.01)` + зелёный border inset.

### 2. Строки таблицы / списка
```jsx
className="hover:bg-[var(--surface-hover)] transition-colors"
```
Применяется на: `<tr>`, `<div>` элементы списка, строки активностей.

### 3. Кнопки (Button компонент)
- **primary**: `hover:brightness-110` + `shadow-[0_4px_16px_var(--green-glow)]`
- **ghost**: `hover:bg-[var(--surface-hover)]`
- **ghostGreen**: `hover:bg-[var(--green-bg)] hover:text-[var(--green)]`
- **danger**: `hover:brightness-110`

### 4. Input / Select (все формы)
```jsx
className="hover:border-[var(--green)] focus:border-[var(--green)] transition-colors"
```
Применяется на: все `<input>`, `<select>`, `<textarea>` — поиск, формы, селекты.

### 5. Навигация (сайдбар)
```jsx
className="hover:bg-[var(--sidebar-hover)]"
```
Активный пункт: `bg-[rgba(198,255,52,0.12)]` + иконка зелёная.

### 6. Табы фильтров
```jsx
className="hover:text-[var(--text)]"
```
Активный таб: `bg-[var(--green)] text-[#141B10]`.

### 7. Иконка StatCard
```css
.group .group-hover\:text-\[var\(--green\)\] {
  color: var(--green) !important;
}
```
Родительский div должен иметь класс `group`.

### 8. Быстрые действия (quick action buttons)
```jsx
className="hover:translate-y-[-4px] hover:shadow-[0_12px_40px_var(--shadow-lg),0_0_0_1px_var(--green)_inset] active:scale-[0.98]"
```

### 9. Элементы расписания
```jsx
className="hover:translate-y-[-2px] hover:shadow-[0_4px_12px_var(--shadow)] hover:bg-[var(--surface-hover)]"
```

---

## Отступы

**Основные паддинги:**
- Карточки: `p-5`
- Секции: `p-5` / `p-6`
- Хедер: `px-4 lg:px-6`
- Строки таблиц: `px-3`
- Нав-айтемы: `px-3.5 py-3.5`

**Гапы:**
- Сетка карточек: `gap-4`
- Хедер: `gap-3`
- Элементы внутри карточки: `gap-2` / `gap-3`

---

## Z-index слои

| Значение | Элемент |
|---|---|
| `z-[9999]` | NotifDropdown, Toast, Theme overlay |
| `z-[70]` | Поиск (SearchModal) |
| `z-[65]` | Модалка |
| `z-50` | Сайдбар |
| `z-40` | Оверлей сайдбара (мобилка) |

---

## Адаптив

- **Сайдбар:** `w-[240px] lg:w-[260px]`, на мобилке `fixed` с оверлеем
- **Контент:** на мобилке сайдбар скрыт, показывается по кнопке бургер
- **Хедер:** `px-4 lg:px-6`
- **Сетки:** 4 колонки `lg:grid-cols-4`, на меньших экранах сворачиваются
- **Поиск:** на мобилке inline кнопка, открывает модалку с поиском
- **Бейдж уведомлений:** скрыт на мобилке (`hidden md:flex`)

---

## Тёмная тема

- Включается через класс `.dark` на `<html>`
- `ThemeProvider` читает `localStorage('theme')`, дефолт — `prefers-color-scheme`
- Все цвета переключаются через CSS-переменные (меняется только `:root`/`.dark`)
- **Transition:** clip-path animation from bottom-left corner (0.7s reveal + 0.45s hide)

---

## Используемые библиотеки

- **React 19 + Vite 8** — фреймворк
- **Tailwind CSS v4** — стилизация (только через `className`, без конфига)
- **react-icons/hi2** — HeroIcons v2
- **Recharts** — графики (Area, Bar)

---

## Основные паттерны (JSX примеры)

```jsx
// 1. Любая карточка
<div className="glass-strong rounded-[20px] card-hover-premium p-5">
  ...
</div>

// 2. Активный элемент (таб, нав)
<button style={{
  background: isActive ? 'var(--green)' : 'var(--surface)',
  color: isActive ? '#141B10' : 'var(--text-secondary)',
  border: `1px solid ${isActive ? 'var(--green)' : 'var(--border)'}`,
}}>
  {label}
</button>

// 3. Строка с ховером
<tr className="border-t border-[var(--border)] text-[13px] transition-colors hover:bg-[var(--surface-hover)]">

// 4. Input/Select с ховером
<input className="... hover:border-[var(--green)] focus:border-[var(--green)] transition-colors" />

// 5. Числа/деньги — всегда с tabular-nums
<span className="tabular-nums">128,500,000 so'm</span>

// 6. Статус бейдж
<Badge status="active" />     // 🟢 Активен
<Badge status="paid" />       // 🟢 Оплачено
<Badge status="pending" />    // 🟡 Ожидание
<Badge status="overdue" />    // 🔴 Просрочено
<Badge status="frozen" />     // 🟡 Заморожен
<Badge status="archived" />   // 🟡 Архив
<Badge status="full" />       // 🔴 Полная
<Badge status="starting" />   // 🟡 Скоро

// 7. Анимации
<div className="animate-fade-in stagger-1">...</div>
<div className="animate-slide-up stagger-2">...</div>
<div className="animate-scale-in">...</div>
<div className="animate-slide-right">...</div>

// 8. StatCard
<StatCard title="..." value="..." delta={12.5} icon={...} color="#10B981" />

// 9. Пустое состояние
<EmptyState title="..." description="..." action={{ label: '...', onClick: ... }} />

// 10. Тоггл (switch)
<button className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${enabled ? 'bg-[#10B981]' : 'bg-[var(--border)]'}`}>
  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: enabled ? '22px' : '2px' }} />
</button>
```

---

## Abdullohning sahifalari

| Sahifa | Holati | Fayl |
|--------|--------|------|
| **Dashboard** | ✅ To'liq | `src/pages/Dashboard.jsx` |
| **Groups** | ✅ To'liq | `src/pages/Groups.jsx` |
| **GroupDetail** | ✅ To'liq | `src/pages/GroupDetail.jsx` |
| **NotFound** | ✅ To'liq | `src/pages/NotFound.jsx` |

**Boshqalar uchun namunalar:**
- Dashboard → eng yaxshi namuna (StatCard, chart, animation, hover patternlari)
- Groups → card grid + filter tabs + modal uchun namuna
