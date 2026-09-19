# 🏆 LevelUp Academy — Admin Panel Taqdimoti

> **Loyiha:** LevelUp Academy uchun EduCRM tizimi — Admin Panel  
> **Texnologiyalar:** React 19, Vite 8, Tailwind CSS v4, Recharts, react-router-dom v7  
> **Holat:** Frontend demo (backend tayyor bo'lgach ulanadi)  
> **Jamoa:** 3 kishi (Abdulloh — Team Lead, Odil — Frontend Developer, Hamidulla — Frontend Developer)

---

## 📋 Mundarija

1. [Loyiha haqida umumiy ma'lumot](#-loyiha-haqida-umumiy-ma'lumot)
2. [Abdulloh — Team Lead](#-abdulloh--team-lead-branch-rery)
3. [Odiljon — Frontend Developer](#-odiljon-xob--frontend-developer-branch-xob)
4. [Hamidulla — Frontend Developer](#-hamidulla--frontend-developer-branch-hamidullar)
5. [Texnik qarorlar va arxitektura](#-texnik-qarorlar-va-arxitektura)
6. [Jamoa bo'lib ishlash jarayoni](#-jamoa-bo'lib-ishlash-jarayoni)

---

## 🏛 Loyiha haqida umumiy ma'lumot

### Nima bu loyiha?
LevelUp Academy — bu o'quv markazi uchun **EduCRM** tizimi. Admin panel orqali markaz rahbarlari:
- 📊 **Dashboard** — umumiy ko'rinish, statistika, diagrammalar
- 👨‍🎓 **Students** — o'quvchilarni boshqarish (qo'shish, tahrirlash, o'chirish)
- 📚 **Groups** — guruhlar bilan ishlash
- 💰 **Payments** — to'lovlarni qabul qilish va nazorat qilish
- 📉 **Expenses** — xarajatlarni hisobga olish
- 📈 **Reports** — analitika va hisobotlar
- 👨‍🏫 **Mentors** — o'qituvchilarni boshqarish
- 💬 **Chat** — o'quvchilar bilan muloqot

### Nega aynan shu texnologiyalar?
| Texnologiya | Sabab |
|------------|-------|
| **React 19** | SPA (Single Page Application) — sahifa qayta yuklanmaydi, tez va silliq UX |
| **Vite 8** | Webpack'dan 10x tezroq build, Hot Module Replacement |
| **Tailwind CSS v4** | Utility-first CSS — tez styling, CSS fayllari kam, responsive oson |
| **Recharts** | React-ga mos chart library, deklarativ API |
| **react-router-dom v7** | Client-side routing, Layout pattern bilan |

### Loyihaning tuzilishi:
```
admin_page/
├── src/
│   ├── components/          # 12 ta shared komponent
│   │   ├── Badge.jsx        # Status ko'rsatkichlari (10+ holat)
│   │   ├── Button.jsx       # Universal tugma (primary/ghost/danger, ripple)
│   │   ├── Header.jsx       # Yuqori panel (sana, search, user)
│   │   ├── Input.jsx        # Forma maydoni
│   │   ├── Layout.jsx       # Asosiy layout (Sidebar + Header + content)
│   │   ├── Modal.jsx        # Modal oyna (ESC da yopiladi)
│   │   ├── Sidebar.jsx      # Yon panel navigatsiyasi
│   │   ├── StatCard.jsx     # Statistika kartochkasi
│   │   ├── EmptyState.jsx   # Bo'sh ma'lumot holati
│   │   ├── ErrorState.jsx   # Xatolik holati
│   │   ├── Skeleton.jsx     # Yuklanayotgan animatsiyasi
│   │   └── Toast.jsx        # Bildirishnomalar
│   ├── pages/               # 11 ta sahifa
│   │   ├── Dashboard.jsx    # Bosh sahifa
│   │   ├── Students.jsx     # O'quvchilar
│   │   ├── Groups.jsx       # Guruhlar
│   │   ├── GroupDetail.jsx  # Guruh detali
│   │   ├── Payments.jsx     # To'lovlar
│   │   ├── Expenses.jsx     # Xarajatlar
│   │   ├── Reports.jsx      # Hisobotlar
│   │   ├── Mentors.jsx      # Mentorlar
│   │   ├── Chat.jsx         # Chat
│   │   └── NotFound.jsx     # 404
│   ├── context/             # React Context lari
│   │   ├── AuthContext.jsx  # Autentifikatsiya (demo)
│   │   └── ThemeContext.jsx # Dark/Light mode
│   ├── services/            # API xizmatlari
│   │   ├── api.js           # Axios/HTTP so'rovlar
│   │   └── adminService.js  # Admin API metodlari
│   └── index.css            # Global stillar, CSS variables, animatsiyalar
```

### Dizayn tizimi (Design System):

#### Rang tizimi:
```css
/* Light mode */                      /* Dark mode */
--bg: #F6FBEA;                        --bg: #0E120E;
--surface: #F1F7E4;                   --surface: #161C16;
--text: #1D2417;                      --text: #E8F0DE;
--text-secondary: #5E6E52;            --text-secondary: #8FA283;
--green: #C6FF34;                     --green: #C6FF34;  /* Bir xil */
--border: #D6E0C8;                    --border: rgba(220, 233, 204, 0.08);
```

#### Glass effekt:
```css
.glass-strong {
  background: var(--surface);
  backdrop-filter: blur(30px);
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px var(--shadow-lg);
}
```

#### Animatsiyalar:
```css
.page-enter       → Sahifa kirganda fade + slide
.animate-fade-in  → Elementlar sekin-asta ko'rinadi
.stagger-1/2/3/4  → Har bir element 0.1s kechikib keladi
.scale-in         → Kiritish animatsiyasi (0→1)
.slide-up         → Pastdan yuqoriga
```

#### Nega bunday dizayn?
1. **Oq-qora emas, tabiiy ranglar** — Ko'zni charchatmaydigan yashil/yog'och ranglari
2. **Glassmorphism** — Zamonaviy, yengil hissiyot beradi
3. **Micro-animatsiyalar** — Stagger effektlar professional ko'rinish beradi
4. **Dark/Light mode** — Foydalanuvchi tanlovi, ikkalasi ham to'liq qo'llab-quvvatlanadi

---

## 👑 Abdulloh — Team Lead (branch: `rey`)

> **Roli:** Loyiha arxitektori, dizayn tizimi yaratuvchisi, kod review qiluvchi, integratsiya  
> **Email:** yunusovabdullox36@gmail.com  
> **Asosiy vazifasi:** Barcha shared komponentlar, dizayn tizimi, Dashboard, Groups, Settings, dokumentatsiya

---

### 📌 1. Dizayn Tizimi va Asosiy Komponentlar

#### Nega aynan shunday ranglar tanlandi?
```
--green: #C6FF34  →  Bu oddiy yashil emas, balki lime-neon rang
```

**Sababi:** 
- O'quv markazi — bu yoshlar, energiya, o'sish ramzi
- `#C6FF34` — zamonaviy, trend rang (Apple, Figma, Notion kabi kompaniyalar ishlatadi)
- Dark mode da juda chiroyli yonadi, light mode da kontrast yaratadi
- Tabiiy yashil ohanglar (`--bg: #F6FBEA`) bilan uyg'un

#### Nega Glass effekt?
```css
/* Nega shaffof fon va blur? */
.glass {
  background: rgba(241, 247, 228, 0.6);
  backdrop-filter: blur(20px);
}
```
**Sababi:**
- Zamonaviy ko'rinadi (Apple'dan keyin hamma glassmorphism ga o'tdi)
- Orqa fonda animatsiyalar bo'lganda chiroyli effekt beradi
- "Yengil" hissiyot — admin panel og'ir emas, zamonaviy

#### Nega Tailwind utility-class lar?
```jsx
// An'anaviy CSS emas, balki:
<div className="flex items-center gap-2 px-4 py-3 rounded-[12px]" />
```
**Sababi:**
- CSS fayllarni kamaytiradi
- Har xil nom o'ylab topish shart emas
- O'zgarish kiritish tez (bir joyda o'zgartirish kifoya)
- Responziv dizayn oson (`sm:flex-row lg:w-[260px]`)

---

### 📌 2. Dashboard — Bosh Sahifa (300+ qator)

**Maqsad:** Markaz rahbariga bir qarashda umumiy holatni ko'rsatish.

#### Statistik kartochkalar (StatCard):
```jsx
<StatCard
  title="Jami daromad"
  value="28 500 000 so'm"
  delta={12.5}           // O'sish foizi
  deltaLabel="haftalik"  // O'sish davri
  icon={<HiOutlineArrowTrendingUp />}
  color="#2ECC71"        // Yashil = ijobiy
/>
```
**Nima qiladi:**
- `delta > 0` bo'lsa yashil strelka, `delta < 0` bo'lsa qizil
- Icon va rang kategoriyaga mos
- Gradient fon (ma'lum rangdan shaffofga)

**Nega StatCard alohida component?**
- Dashboard, Expenses, Reports da bir xil kartalar ishlatiladi
- O'zgartirish kerak bo'lsa bir joyda o'zgartiriladi
- DRY (Don't Repeat Yourself) prinsipi

#### Diagrammalar (Recharts):
```jsx
<BarChart data={chartData}>
  <Bar dataKey="daromad" fill="#2ECC71" radius={[4,4,0,0]} />
  <Bar dataKey="xarajat" fill="#E8543E" radius={[4,4,0,0]} />
</BarChart>
```
**Nega Recharts?**
- React-ga mos, deklarativ API
- Interaktiv (hover da tooltip chiqadi)
- Responziv (ResponsiveContainer)

**Tooltip custom qilingan:**
```jsx
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;  // Bo'sh xolatda hech narsa ko'rsatma
  return (
    <div className="glass-strong rounded-[12px] px-3 py-2 text-[11px]">
      <p className="font-bold">{label}</p>
      {/* Har bir ma'lumotni formatlab chiqarish */}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}
```

#### Quick Actions (Tezkor amallar):
```jsx
const QUICK_ACTIONS = [
  { label: 'Yangi talaba', icon: HiOutlineUserPlus, color: '#2ECC71', path: '/students' },
  { label: 'Guruh yaratish', icon: HiOutlinePlusCircle, color: '#3B82F6', path: '/groups' },
  { label: "To'lov qilish", icon: HiOutlineCurrencyDollar, color: '#F59E0B', path: '/payments' },
  { label: 'Xabar yozish', icon: HiOutlineChatBubbleLeftRight, color: '#E8543E', path: '/chat' },
];
```
**Nega 4 ta har xil rang?**
- Har bir amal o'ziga xos rangga ega — vizual farqlash oson
- Bir xil rang bo'lsa, foydalanuvchi chalkashadi

---

### 📌 3. Groups — Guruhlar (171+ qator)

**Maqsad:** O'quv guruhlarini ko'rish, qo'shish, tahrirlash.

#### Card ko'rinishi — nega jadval emas?
```jsx
{groups.map((group) => (
  <div className="glass-strong rounded-[20px] p-5 hover:scale-[1.02] transition-all">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-lg font-bold"
           style={{ background: group.color + '20', color: group.color }}>
        {group.name[0]}
      </div>
      <div>
        <h3 className="text-[14px] font-bold">{group.name}</h3>
        <p className="text-[11px] text-[var(--text-muted)]">{group.students} ta o'quvchi</p>
      </div>
    </div>
  </div>
))}
```
**Nega Card, jadval emas?**
- Guruhlar ko'p ma'lumotga ega emas (nomi, soni, status)
- Card ko'rinishida vizual farqlash oson
- Mobile da yaxshi ko'rinadi (stack bo'lib ketadi)
- Hover effekt (`scale: 1.02`) professional ko'rinadi

#### Search + Filter:
```jsx
const filtered = groups.filter((g) => {
  const matchSearch = !search || 
    g.name.toLowerCase().includes(search.toLowerCase());
  const matchStatus = statusFilter === 'All' || g.status === statusFilter;
  return matchSearch && matchStatus;
});
```
**Search qanday ishlaydi:**
- Har bir harf terilganda real-time filter (debounce yo'q, chunki mock data tez)
- `toLowerCase()` — katta-kichik harf farq qilmaydi
- `includes()` — qisman moslik (to'liq so'z shart emas)

**Status filter:**
```jsx
['All', 'Active', 'Frozen', 'Dropped'].map(status => (
  <button onClick={() => setStatusFilter(status)}
    style={{ background: statusFilter === status ? 'var(--green)' : 'var(--surface)' }}>
    {status} ({getCount(status)})
  </button>
))
```
- Tanlangan filter yashil rangda, qolganlari oddiy
- Yonida soni ko'rsatilgan (masalan: "Active (8)")

---

## 🟢 Odiljon (XOB) — Frontend Developer (branch: `xob`)

> **Roli:** Sahifa yaratuvchi, ma'lumotlar bilan ishlash, jadvallar va filterlar  
> **Email:** titanuzbgamer@gmail.com  
> **Asosiy vazifasi:** Students, Payments, Reports sahifalari, routing, loyiha asosini yaratish

---

### 📌 1. Students — O'quvchilar (405 qator)

**Maqsad:** O'quvchilarni to'liq boshqarish — ko'rish, qidirish, qo'shish, tahrirlash, o'chirish.

#### Backend model:
```javascript
// Real backend da shunday keladi:
student = {
  id, firstName, lastName, phone, status,
  loginCode, coinBalance, totalDebt,
  hasParent, groups: [{id, name}], createdAt
}
```

**Nega modelni commentda yozib qo'yganman?**
- Backend tayyor bo'lganda qaysi field'lar kelishini bilish uchun
- Mock data ni backend modelga moslab tuzish oson
- Kod o'qishni osonlashtiradi (boshqa developer tushunadi)

#### Jadval (Table):
```jsx
<table className="w-full text-left">
  <thead>
    <tr>
      <th>Talaba</th>  {/* Ism + Familya */}
      <th>Telefon</th>  {/* +998 XX XXX XX XX */}
      <th>Login kod</th> {/* AB12CD34 */}
      <th>Coin</th>     {/* Balans */}
      <th>Qarzi</th>    {/* Qancha qarzi bor */}
      <th>Status</th>   {/* Active / Frozen / Dropped */}
      <th></th>         {/* Action tugmalari */}
    </tr>
  </thead>
  <tbody>
    {paginated.map(student => (
      <tr key={student.id}>
        <td className="font-semibold">{student.firstName} {student.lastName}</td>
        <td>{student.phone}</td>
        <td>
          {/* Login kodni ko'rsatish/yashirish toggle */}
          <button onClick={() => toggleLoginCode(student.id)}>
            {showLoginCode[student.id] ? student.loginCode : '••••••••'}
          </button>
        </td>
        <td className="text-[#F59E0B]">{student.coinBalance}</td>
        <td className="text-[var(--danger)]">
          {student.totalDebt > 0 ? formatCurrency(student.totalDebt) : '-'}
        </td>
        <td><Badge status={student.status} /></td>
        <td>
          <button>✏️</button>  {/* Tahrirlash */}
          <button>🗑️</button>  {/* O'chirish */}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**Nega login kodni yashirish tugmasi?**
- Login kod — maxfiy ma'lumot
- Odam ko'rib qolmasligi uchun "ko'z" tugmasi orqali ochiladi
- UX pattern (parol ko'rsatish/yashirish)

**Nega Badge component?**
```jsx
<Badge status={student.status} />
// Output: "Active" (yashil) / "Frozen" (sariq) / "Dropped" (qizil)
```
- Statusga qarab avtomatik rang oladi
- Hamma joyda bir xil ko'rinadi (DRY)
- Yangi status qo'shilsa bir joyda o'zgartiriladi

#### Search (3 maydon bo'yicha):
```javascript
const filtered = students.filter((s) => {
  if (statusFilter !== 'All' && s.status !== statusFilter.toLowerCase()) return false;
  if (search) {
    const q = search.toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    // 3 xil maydondan qidiradi:
    if (!fullName.includes(q) &&        // 1. Ism-familya
        !s.phone.includes(q) &&          // 2. Telefon
        !s.loginCode.toLowerCase().includes(q)) return false;  // 3. Login kod
  }
  return true;
});
```
**Nega 3 xil maydon?**
- Foydalanuvchi talabani turli usulda qidirishi mumkin:
  - "Abdulloh" deb yozsa — ism orqali
  - "+99890" deb yozsa — telefon orqali
  - "AB12" deb yozsa — login kod orqali
- Hammasi bir inputda — qulay va tez

#### Pagination:
```javascript
const ITEMS_PER_PAGE = 10;
const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
```
**Nega 10 ta?**
- Bir ekranda 10 ta o'quvchi optimal ko'rinadi
- Juda ko'p bo'lsa skroll qilish noqulay
- Juda kam bo'lsa bo'sh joy ko'p

**Pagination qanday ishlaydi:**
```jsx
<div className="flex items-center justify-between mt-4">
  <span>Jami {filtered.length} ta talaba</span>
  <div className="flex gap-2">
    <button onClick={() => setPage(page - 1)} disabled={page === 1}>
      ← Oldingi
    </button>
    <span>{page} / {totalPages}</span>
    <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>
      Keyingi →
    </button>
  </div>
</div>
```
- **← Oldingi / Keyingi** — sodda va tushunarli
- **Disabled** — birinchi sahifada "Oldingi" bosilmaydi
- **Jami son** — foydalanuvchi qancha ma'lumot borligini biladi

#### CRUD (Qo'shish/Tahrirlash/O'chirish):

**Modal oyna:**
```jsx
<Modal open={modalOpen} title="Talaba qo'shish" onClose={() => setModalOpen(false)}>
  {/* Forma: Ism, Familya, Telefon, Guruh, Status */}
  <Input label="Ism" value={formData.firstName} onChange={...} />
  <Input label="Familya" value={formData.lastName} onChange={...} />
  <Input label="Telefon" value={formData.phone} onChange={...} />
  <select>Guruhni tanlash...</select>
  <select>Status...</select>
  
  <Button variant="primary" onClick={handleSave}>
    {editStudent ? 'Saqlash' : "Qo'shish"}
  </Button>
</Modal>
```

**Nega Modal?**
- Yangi sahifaga o'tish shart emas
- Tez va qulay
- Fonga xira (backdrop blur) — diqqat modalda

**Delete confirmation:**
```jsx
{deleteTarget && (
  <Modal title="Talabani o'chirish" onClose={() => setDeleteTarget(null)}>
    <p>{deleteTarget.firstName} {deleteTarget.lastName} ni o'chirmoqchimisiz?</p>
    <Button variant="danger" onClick={handleDelete}>Ha, o'chirish</Button>
    <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Bekor qilish</Button>
  </Modal>
)}
```
**Nega confirmation?**
- Tasodifan o'chirib qo'yishning oldini oladi
- Foydalanuvchi ikki marta o'ylaydi
- Professional tizimlarning standarti

---

### 📌 2. Payments — To'lovlar (417 qator)

**Maqsad:** To'lovlarni qabul qilish, ko'rish va nazorat qilish.

#### Backend model 2 ta jadval:
```javascript
// transactions — to'lov fakti
{ id, invoice_id, method: 'cash'|'card'|'transfer', 
  status: 'completed'|'refunded', amount, processed_by, created_at }

// invoices — qarz hujjati
{ id, student_id, group_id, type: 'full'|'split'|'installment',
  status: 'pending'|'paid'|'overdue', total_amount, paid_amount,
  due_date, period_month, comment }
```

#### Dual Panel Layout (Ikki panel):
```
┌─────────────────────┬──────────────────────┐
│   To'lovlar ro'yxati  │   To'lov tafsilotlari │
│                     │                      │
│  Abdulloh Karimov   │   Talaba: Abdulloh   │
│  1 200 000 so'm     │   Summa: 1 200 000   │
│  05.07.2026         │   Sana: 05.07.2026   │
│  Naqd · To'liq ✅   │   Usul: Naqd         │
│                     │   Status: To'langan   │
│  Odiljon Rahimov    │                      │
│  1 200 000 so'm     │                      │
└─────────────────────┴──────────────────────┘
```

**Nega dual panel?**
- Bir vaqtning o'zida ro'yxat va tafsilot ko'rinadi
- Mobile da modal ko'rinishida ochiladi (responsive)
- Detail sahifaga o'tish shart emas — tez va qulay

**Mobile responsive:**
```jsx
// Katta ekranda: yonma-yon
<div className="flex flex-col lg:flex-row gap-5">
  <div className="flex-1">{/* Ro'yxat */}</div>
  <div className="lg:w-[340px]">{/* Detail */}</div>
</div>

// Mobile da: to'liq ekran modal
{selectedPayment && (
  <div className="fixed inset-0 z-50 flex lg:static lg:z-auto">
    <div className="fixed inset-0 bg-black/40 lg:hidden" />
    <div className="relative z-10 w-full max-w-md mx-auto">
      {/* Detail kontenti */}
    </div>
  </div>
)}
```
**Qanday ishlaydi:**
- `lg:` — katta ekranda yonma-yon (desktop)
- Mobile da to'liq ekranni qoplaydigan modal
- Orqada xira fon (`bg-black/40`)

#### StudentAutocomplete — Talaba qidirish:
```jsx
function StudentAutocomplete({ students, selectedStudent, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Tashqariga bosilganda yopish
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter
  const filtered = query
    ? students.filter((s) => {
        const q = query.toLowerCase();
        return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.phone.includes(q);
      })
    : students;

  return (
    <div ref={ref}>
      {selectedStudent ? (
        // Tanlangan talaba ko'rinishi
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-[var(--green-bg)]">
            {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
          </div>
          <span>{selectedStudent.firstName} {selectedStudent.lastName}</span>
          <button onClick={onClear}><HiOutlineXMark /></button>
        </div>
      ) : (
        // Qidirish inputi
        <div className="relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
          <HiOutlineMagnifyingGlass />
        </div>
      )}
      
      {open && !selectedStudent && (
        <div className="absolute z-50">
          {filtered.map(s => (
            <button onClick={() => { onSelect(s); setOpen(false); }}>
              {s.firstName} {s.lastName} — {s.phone}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Nega bunday murakkab component?**
- 12 ta studentni scroll qilib qidirish noqulay
- Select dropdown emas, autocomplete — chunki studentlar ko'p bo'lishi mumkin (100+)
- Real-time qidirish — harf terish bilan filter
- "Tashqariga bosilganda yopish" patterni — UX standarti

**Nima muammolar bor edi?**
- Dropdown ro'yxat scroll qilinmasdi → `max-h-[240px] overflow-y-auto` qo'shildi
- Talaba tanlanganda query tozalanmasdi → `setQuery('')` qo'shildi
- Tashqariga bosilganda yopilmasdi → `useEffect` bilan document listener

#### Filter Tabs:
```jsx
const filters = ['All', 'Paid', 'Pending', 'Overdue'];
```
- **All** — barchasi
- **Paid** — to'langanlar (yashil Badge)
- **Pending** — kutilayotganlar (sariq Badge)
- **Overdue** — muddati o'tganlar (qizil Badge)

**Status filter qanday ishlaydi:**
```javascript
.filter(p => {
  if (filter !== 'All' && p.status !== filter.toLowerCase()) return false;
  if (search && !p.studentName.toLowerCase().includes(search.toLowerCase())) return false;
  return true;
})
```
- Search va filter birgalikda ishlaydi
- Ikkala shart ham tekshiriladi

---

### 📌 3. Reports — Hisobotlar (417 qator)

**Maqsad:** Markaz faoliyati haqida to'liq analitika.

#### Period Filter (4 xil davr):
```javascript
const PERIODS = ['This Week', 'This Month', 'This Quarter', 'This Year'];

const periodData = {
  'This Week': {
    revenue: [4200000, 5600000, 3800000, ...],    // 7 kun
    expenses: [1800000, 2100000, 1600000, ...],
    enrolled: [12, 18, 8, ...],
    dropped: [2, 3, 1, ...],
    labels: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  },
  'This Year': {
    revenue: [48500000, 52300000, ...],            // 12 oy
    labels: ['Yan', 'Fev', 'Mar', ...],
  },
};
```

**Nega hardcoded data?** — Backend tayyor bo'lganda API dan keladi.

#### 4 ta StatCard:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard title="Jami daromad" value="78 900 000 so'm" delta={12.5} color="#2ECC71" />
  <StatCard title="Jami xarajat" value="28 200 000 so'm" delta={3.2} color="#F59E0B" />
  <StatCard title="Sof foyda" value="50 700 000 so'm" delta={18.7} color="#2ECC71" />
  <StatCard title="Faol o'quvchilar" value="208" delta={8.4} color="#3B82F6" />
</div>
```

**Nega grid 4 column?**
- `grid-cols-1` — mobile da 1 ta
- `sm:grid-cols-2` — planshetda 2 ta
- `lg:grid-cols-4` — desktop da 4 ta

#### Diagrammalar (2 xil):

**1. BarChart — Daromad vs Xarajat:**
```jsx
<BarChart data={chartData}>
  <Bar dataKey="daromad" fill="#2ECC71" name="Daromad" />
  <Bar dataKey="xarajat" fill="#E8543E" name="Xarajat" />
</BarChart>
```
- Yashil: daromad
- Qizil: xarajat
- Xarita ustiga hover qilganda tooltip chiqadi

**2. AreaChart — O'quvchilar dinamikasi:**
```jsx
<AreaChart data={chartData}>
  <defs>
    <linearGradient id="enrolledGrad">
      <stop offset="5%" stopColor="#C6FF34" stopOpacity={0.3} />
      <stop offset="95%" stopColor="#C6FF34" stopOpacity={0} />
    </linearGradient>
  </defs>
  <Area dataKey="qabul" stroke="#C6FF34" fill="url(#enrolledGrad)" />
  <Area dataKey="chiqish" stroke="#E8543E" fill="url(#droppedGrad)" />
</AreaChart>
```

**Nega AreaChart?**
- O'quvchilar sonining o'zgarishini ko'rsatish uchun eng yaxshi vizual
- Gradient to'ldirish — qancha o'quvchi qo'shilganini vizual ko'rsatadi
- Ikki chiziqni solishtirish oson

**Qanday qilib o'quvchilar ko'payganini ko'rsataman?**
```javascript
// Ma'lumotlar shuni ko'rsatadiki:
// Yanvar: 128 ta → Dekabr: 215 ta (qabul)
// Yanvar: 15 ta → Dekabr: 7 ta (chiqish)
// → O'quvchilar soni ortib bormoqda, chiqishlar kamaymoqda
```

#### Group Performance Table — Guruhlar Reytingi:
```jsx
{groupPerformance.map((group, i) => {
  const gradeColor = group.avgGrade >= 90 ? '#2ECC71'   // Yashil — yaxshi
                    : group.avgGrade >= 80 ? '#F59E0B'   // Sariq — o'rtacha
                    : '#E8543E';                          // Qizil — past
  
  const progressColor = group.progress >= 80 ? '#2ECC71'
                       : group.progress >= 60 ? '#F59E0B'
                       : '#E8543E';
  
  return (
    <tr style={i % 2 === 1 ? { background: 'rgba(198,255,52,0.04)' } : {}}>
      <td>
        <span className="w-6 h-6 rounded-[8px]" 
              style={{ background: i < 3 ? '#C6FF34' : 'var(--green-bg)' }}>
          {i + 1}
        </span>
      </td>
      <td>{group.name}</td>
      <td style={{ color: gradeColor }}>{group.avgGrade}%</td>
      <td>{formatCurrency(group.revenue)}</td>
      <td>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
          <div style={{ width: `${group.progress}%`, background: progressColor }} />
        </div>
        <span style={{ color: progressColor }}>{group.progress}%</span>
      </td>
    </tr>
  );
})}
```

**Nega TOP-3 maxsus ko'rinadi?**
- 1-, 2-, 3-o'rinlar yashil rangda (`#C6FF34`)
- Qolganlari oddiy ko'rinishda
- Bu raqobat ruhini oshiradi

**Nega progress bar?**
- Son bilan birga vizual ko'rinish ham kerak
- 85% va 92% ni farqlash progress bar orqali oson
- Rang: yashil (80%+), sariq (60-80%), qizil (60% dan past)

---

## 🟡 Hamidulla — Frontend Developer (branch: `hamidullar`)

> **Roli:** UI murakkab sahifalar, chat tizimi, xarajatlar  
> **Asosiy vazifasi:** Chat (Telegram-style), Expenses, ErrorPage

---

### 📌 1. Chat — Xabar almashish (1175 qator)

**Maqsad:** O'quvchilar va mentorlar o'rtasida real-time xabar almashish.

#### Nega 1175 qator?
Bu loyihadagi **eng katta sahifa** (2-3 barobar katta). Sababi:
- Ikki panel: contacts (chap) + chat (o'ng)
- Xabarlarni yuborish, qabul qilish
- Reaksiyalar (❤️ 👍 😄)
- Online/offline holati
- Scroll management (auto scroll to bottom)
- Search (contact qidirish + xabar ichida qidirish)

#### Layout:
```
┌───────────────────────┬──────────────────────────────────────┐
│   Kontaktlar          │   Chat oynasi                        │
│                       │                                      │
│  🔍 Qidirish...       │   Abdulloh Karimov   🟢 Online       │
│                       │   ───────────────────────────────    │
│  🟢 Abdulloh K.       │   │ Salom!                  10:30 │  │
│  🟡 Odiljon R.        │   │                          │      │
│  🔴 Malika A.         │   │        Qanday yordam?    10:31 ││
│  🟢 Hamidulla S.      │   │                          │      │
│  🟡 Zarina N.         │   │   ❤️                      │      │
│                       │   ───────────────────────────────    │
│                       │   📝 Xabar yozish...  📎 ➡️         │
└───────────────────────┴──────────────────────────────────────┘
```

#### State management:
```javascript
const [messages, setMessages] = useState({
  's1': [
    { id: 1, from: 'them', text: 'Salom!', time: '10:30', reactions: [] },
    { id: 2, from: 'me', text: 'Assalomu alaykum', time: '10:31', reactions: ['❤️'] },
  ],
  's2': [...],
});
const [activeChat, setActiveChat] = useState('s1');
const [input, setInput] = useState('');
```

**Nega bunday state tuzilishi?**
- `messages` objekti — har bir kontaktning o'z xabarlari
- `activeChat` — hozir qaysi kontakt bilan gaplashilyapti
- `input` — yozilayotgan xabar

#### Xabar yuborish:
```javascript
const handleSend = () => {
  if (!input.trim()) return;  // Bo'sh xabar yuborilmaydi
  
  const newMsg = {
    id: Date.now(),           // Unique ID (vaqt bo'yicha)
    from: 'me',               // Men yubordim
    text: input.trim(),       // Xabar matni
    time: 'now',              // Hozirgi vaqt
    reactions: [],            // Reaksiyalar (bo'sh)
  };
  
  setMessages(prev => ({
    ...prev,
    [activeChat]: [...(prev[activeChat] || []), newMsg]
  }));
  
  setInput('');  // Inputni tozalash
};
```

**Nega `Date.now()` id sifatida?**
- Har doim unique (ikki xabar bir vaqtda yuborilmaydi)
- Arrayda oxirgi bo'ladi (o'sish tartibi)
- Database dan keladigan ID bilan almashtiriladi

#### Reaksiyalar:
```javascript
const handleReaction = (msgId, emoji) => {
  setMessages(prev => {
    const updated = { ...prev };
    updated[activeChat] = updated[activeChat].map(msg => {
      if (msg.id === msgId) {
        const has = msg.reactions.includes(emoji);
        return {
          ...msg,
          reactions: has 
            ? msg.reactions.filter(r => r !== emoji)  // Olib tashlash
            : [...msg.reactions, emoji]               // Qo'shish
        };
      }
      return msg;
    });
    return updated;
  });
};
```

**Nega toggle reaksiya?**
- Agar ❤️ bosilgan bo'lsa, yana bossa olib tashlanadi
- Bir nechta reaksiya bo'lishi mumkin (❤️ 👍)
- Telegram patterni

#### Auto scroll:
```javascript
useEffect(() => {
  // Yangi xabar kelganda pastga scroll
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages, activeChat]);
```

**Nega `useEffect` da?**
- `messages` o'zgarganda ishlaydi (yangi xabar kelganda)
- `activeChat` o'zgarganda ham (boshqa kontaktga o'tganda)
- `behavior: 'smooth'` — silliq scroll

#### Search (2 xil):
```javascript
// 1. Contact qidirish
const filteredContacts = contacts.filter(c => 
  c.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// 2. Xabar ichida qidirish
const filteredMsgs = activeMessages.filter(m =>
  m.text.toLowerCase().includes(chatSearchQuery.toLowerCase())
);
```

**Nega 2 xil search?**
- Contact qidirish — kim bilan gaplashishni topish uchun
- Xabar qidirish — eski xabarlarni topish uchun
- Bir-biriga aralashmaydi

---

### 📌 2. Expenses — Xarajatlar (218+ qator)

**Maqsad:** Markaz xarajatlarini hisobga olish va nazorat qilish.

#### Kategoriyalar:
```javascript
const CATEGORIES = ['All', 'Rent', 'Salary', 'Materials', 'Utility', 'Other'];
const CATEGORY_COLORS = {
  Rent: '#3B82F6',       // Ko'k — ijara
  Salary: '#2ECC71',     // Yashil — maosh
  Materials: '#F59E0B',  // Sariq — materiallar
  Utility: '#E8543E',    // Qizil — kommunal
  Other: '#8FA283',      // Kulrang — boshqa
};
```

**Nega har bir kategoriya o'z rangiga ega?**
- Vizual farqlash oson (rang orqali)
- Diagrammada ham ranglar mos keladi
- Memory: "Qizil — kommunal to'lovlar"

#### Stat cards:
```javascript
const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);
const thisMonth = filtered.filter((e) => e.date.startsWith('07.')).reduce(...);
const avgDaily = expenses.length > 0 ? Math.round(totalAmount / expenses.length) : 0;
```

- **Total Expenses** — umumiy xarajat
- **This Month** — shu oygi xarajat (iyul: `date.startsWith('07.')`)
- **Average/Day** — o'rtacha kunlik xarajat

#### Budget Forecast chart:
```jsx
<BarChart data={budgetData} layout="vertical">
  {/* Vertical bar — kategoriyalar chapda, summa o'ngda */}
  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
    {budgetData.map((entry, i) => (
      <rect key={i} fill={CATEGORY_COLORS[entry.name]} />
    ))}
  </Bar>
</BarChart>
```

**Nega vertical layout?**
- Kategoriya nomlari uzun bo'lishi mumkin
- Gorizontalda nomlar qisqarib ketadi
- Vertikalda har bir kategoriya to'liq ko'rinadi

---

### 📌 3. ErrorPage — Xatolik sahifasi (93 qator)

**Maqsad:** Sahifa topilmaganda (404) chiroyli xatolik ko'rsatish.

```jsx
export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-8xl font-extrabold text-[var(--green)]">404</h1>
      <p className="text-xl text-[var(--text-secondary)] mt-4">
        Sahifa topilmadi
      </p>
      <Button variant="primary" onClick={() => navigate('/')}>
        Bosh sahifaga qaytish
      </Button>
    </div>
  );
}
```

**Nega 404 uchun alohida sahifa?**
- router `*` path bilan ishlaydi (topilmagan barcha routelar)
- Foydalanuvchi adashganida yo'l ko'rsatadi
- Branding: LevelUp uslubida chiroyli xatolik

---

## ⚙ Texnik qarorlar va arxitektura

### 1. Nega Mock Data?

**Muammo:** Backend hali tayyor emas, lekin frontendni ko'rsatish kerak.

**Yechim:** Har bir sahifada MOCK_ ma'lumotlar bilan ishlaymiz.

```javascript
// Backend kelguncha shunday:
const [students, setStudents] = useState(MOCK_STUDENTS);

// Backend kelgach shunday bo'ladi:
// const { data: students } = useApi('/api/students');
```

**Nega API chaqiruvlari olib tashlandi?**
- Backend yo'q, so'rovlar xato beradi
- Foydalanuvchi xatoliklarni ko'rib qoladi
- Mock data bilan hamma narsa ishlaydi

**Backend kelganda nima qilamiz?**
```javascript
// 1. services/api.js da baseURL ni backend ga o'rnatamiz
// 2. Har bir sahifada useState(MOCK_) ni useApi() ga almashtiramiz
// 3. CRUD operatsiyalarida API chaqiruvlarini qo'shamiz
```

### 2. Nega CSS Variables (--custom-property)?

```css
/* index.css da bir marta yoziladi: */
--text: #1D2417;
--green: #C6FF34;

/* Hamma joyda ishlatiladi: */
style={{ color: 'var(--text)' }}
style={{ background: 'var(--green)' }}
```

**Afzalliklari:**
- **Bir joyda o'zgartirish** — rangni o'zgartirish kerak bo'lsa, faqat `index.css` da o'zgartiriladi
- **Light/Dark mode** — `:root` va `.dark` selectorlari bilan avtomatik
- **Komponentlararo bir xillik** — hamma joyda bir xil rang

**Dark/Light mode qanday ishlaydi:**
```jsx
// ThemeContext.jsx
const toggleTheme = () => {
  document.documentElement.classList.toggle('dark');
};

// index.css
:root {              /* Light mode */
  --bg: #F6FBEA;
  --text: #1D2417;
}
.dark {              /* Dark mode */
  --bg: #0E120E;
  --text: #E8F0DE;
}
```

### 3. Nega Layout pattern?

```jsx
// App.jsx
<Layout pageTitle={pageInfo.title} pageSubtitle={pageInfo.subtitle}>
  <Outlet />  {/* Bu yerda sahifa kontenti */}
</Layout>

// Layout.jsx
<div className="flex h-screen">
  <Sidebar />
  <div className="flex-1">
    <Header title={pageTitle} subtitle={pageSubtitle} />
    <main>{children}</main>
    <footer>© 2026 LevelUp Academy</footer>
  </div>
</div>
```

**Nega Layout?**
- **DRY** — Sidebar va Header har bir sahifada qayta yozilmaydi
- **Outlet** — react-router-dom v7 patterni, sahifa kontenti o'zgaradi
- **Responsive** — sidebar mobile da yashirinadi

### 4. Nega Shared Components?

**12 ta komponent bir necha joyda ishlatiladi:**

| Komponent | Ishlatilgan joylar | Nima qiladi |
|-----------|-------------------|-------------|
| Button | Hamma sahifalar | Tugma (primary, ghost, danger, size) |
| Modal | Students, Payments, Expenses | Modal oyna (backdrop, ESC close) |
| Badge | Students, Payments, Chat | Status ko'rsatkichi (rang + label) |
| Input | Students, Payments, Expenses | Forma maydoni (label, placeholder) |
| StatCard | Dashboard, Expenses, Reports | Statistik kartochka |
| EmptyState | Students, Payments, Expenses | "Ma'lumot topilmadi" holati |

**Nega alohida fayllar?**
- Bir komponentni o'zgartirish kerak bo'lsa, bir joyda o'zgartiriladi
- Test qilish oson
- Har bir komponent o'z vazifasiga ega (Single Responsibility)

### 5. Animatsiyalar va UX

```css
/* Sahifa kirganda */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Elementlar ketma-ket chiqishi */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.10s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.20s; }
```

**Nega micro-animatsiyalar?**
- Professional ko'rinish (zamonaviy web-app standardi)
- Foydalanuvchi diqqatini boshqarish (qaysi element muhim)
- "Yuklanayapti" hissiyotini kamaytiradi (ma'lumot kelyapti)

---

## 👥 Jamoa bo'lib ishlash jarayoni

### Git Branch Strategy:

```
main (production)
  └── rey (Abdulloh — asosiy development)
       ├── xob (Odil frontend)
       └── hamidullar (Hamidulla frontend)
```

### Ishlash tartibi:
1. **Odil** va **Hamidulla** o'z branchlarida ishlaydi
2. **Abdulloh** har bir PR ni review qiladi
3. Keyin `rey` ga merge qilinadi
4. Kod review dan o'tgan kod `rey` da umumiy ishlaydi

### Nima muammolar bo'ldi?

**Merge conflict — Students.jsx:**
```diff
<<<<<<< HEAD (rey)
<<<<<<< HEAD (rey)
  {students.map(s => <StudentCard student={s} />)}
=======
  <table>{/* Odil ning jadval ko'rinishi */}</table>
>>>>>>> xob
```
**Yechim:** Odil ning table versiyasi saqlandi, chunki backend modeliga mos.

**Search input yo'q edi — Expenses.jsx:**
```javascript
// State bor edi: const [search, setSearch] = useState('');
// Filter bor edi: const filtered = expenses.filter(e => e.description.includes(search))
// Lekin input YO'Q edi!
```
**Yechim:** Search input qo'shildi.

---

## 🎤 Yakuniy xulosa

### Biz nima o'rgandik?

**Abdulloh:**
- Qanday qilib kengaytiriladigan (scalable) dizayn tizimi yaratish
- CSS variables bilan theme management
- React component arxitekturasi va DRY prinsipi
- Git branch va merge strategy

**Odil:**
- Murakkab jadvallar va filterlar (Students, Payments)
- Dual panel layout va responsive design
- Recharts bilan diagrammalar (BarChart, AreaChart)
- Autocomplete pattern (StudentAutocomplete)

**Hamidulla:**
- Chat tizimi (Telegram-style UI)
- Complex state management (messages object, activeChat)
- Scroll management va real-time xabarlar
- Kategoriyalar bo'yicha filter va chartlar

### Keyingi qadamlar:
1. Backend tayyor bo'lgach, mock data ni API ga almashtirish
2. Real-time chat (WebSocket yoki Firebase)
3. Autentifikatsiya (login/logout)
4. Deploy qilish (Vercel frontend, Render backend)

---

> **Taqdimot tayyor:** 2026, Iyul  
> **Jamoa:** Abdulloh (Team Lead), Odil (Frontend), Hamidulla (Frontend)
