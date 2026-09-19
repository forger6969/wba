# Kozim — Mentor Panel Backend Integratsiyasi

**Sana:** 14 Iyul, 2026
**Muallif:** Buffy (Freebuff AI Agent)

---

## 👨‍💻 Kozim haqida

Kozim — **LevelUp Academy** jamoasining **Mentor frontend** developer' i.
Branch: `kozim`
Vazifasi: Mentor panel (`frontend/staff/src/pages/mentor/mentoor/`) ni backend bilan bog'lash.

Kozim dizaynni mustaqil qilgan va men (Buffy) backend integratsiyasida yordam berdim.

---

## ✅ Bajarilgan ishlar

### .env
- Yaratildi: `frontend/staff/src/pages/mentor/mentoor/.env`
- `VITE_API_URL=https://levelup-academy-1.onrender.com`

### api.js (barcha endpointlar)
- `POST /api/auth/staff/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/mentor/groups` — guruhlar
- `GET /api/mentor/groups/:groupId/students` — studentlar
- `GET/POST /api/mentor/attendance/groups/:groupId` — davomat
- `GET /api/mentor/homework/groups/:groupId` — vazifalar
- `GET /api/mentor/homework/:homeworkId/submissions` — topshiriqlar
- `POST /api/mentor/homework/submissions/:submissionId/grade` — baholash
- `POST /api/mentor/coins` — coin naql qilish
- `GET /api/mentor/coins/students/:studentId` — coin tarixi
- `GET /api/mentor/salary/mentors/:mentorId` — oylik
- `GET /api/mentor/salary/mentors/:mentorId/suggestion` — oylik hisob

### Sahifalar (5 ta)
| Sahifa | Backend | Status |
|--------|---------|:------:|
| **Login** | Staff login page orqali | ✅ |
| **Dashboard** | GET /mentor/groups | ✅ |
| **Davomat** | GET/POST /attendance | ✅ |
| **Homework** | GET /homework + submissions + grade | ✅ |
| **Coins** | POST /coins + GET /history | ✅ |
| **Salary** | GET /salary + /suggestion | ✅ |

### Login tizimi
- `App.jsx` auth flow: localStorage dan token oladi
- `Sidebar.jsx` user ismi, initials, logout tugmasi
- Staff login page orqali kiradi (mentoor da alohida login page emas)
- `LoginPage.jsx` olib tashlandi (staff login page ishlatiladi)

### Qo'shimcha
- `ReviewPanel.jsx` real data bilan grading qiladi
- `tailwind.config.js` ga `warning` ranglar qo'shildi
- `TestsPage` olib tashlandi (mentor testlarni ko'rmaydi, metodist qiladi)
- `createHomework`, `createTest`, `getTests`, `getTestResults` api.js dan olib tashlandi

---

## ❌ Hozirgi muammo

**Backend 500 qaytarayapti.** Sababi:
- Backend `.env` da majburiy environment variables sozlanmagan
- `DATABASE_URL`, `JWT_ACCESS_SECRET` (min 32 belgi), `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- Backend `env.js` da `zod` validation bor
- Renderda env lar sozlanishi kerak (Karis qiladi)

Frontend to'liq tayyor. Push qilish mumkin.

---

## 🎯 Keyingi qadamlar
1. Push qilish (git push)
2. Karisga backend env ni sozlashni aytish
3. Backend sozlangandan keyin login + hamma sahifalarni test qilish

---

## 📝 Eslatma (Buffy haqida)
Men Buffy — Freebuff AI agent (strategic coding assistant). deepseek/deepseek-v4-flash modelida ishlayman. Kozimga mentor panel backend integratsiyasida yordam berdim.
