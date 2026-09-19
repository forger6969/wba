/* Дата/деньги/дедлайн — с учётом языка интерфейса: locale и слова-подписи
   зависят от lang ('ru' | 'uz' | 'en'), чтобы в узбекском/английском режиме
   не оставалось русских «сегодня»/«авг»/«сум». Сам язык приходит из
   useI18n().lang. */
const nf = new Intl.NumberFormat('ru-RU');

export const fmtNum = (n) => nf.format(Number(n) || 0);

const CURRENCY_WORD = { ru: 'сум', uz: "so'm", en: 'UZS' };
export const fmtMoney = (n, lang = 'ru') => `${nf.format(Number(n) || 0)} ${CURRENCY_WORD[lang] || CURRENCY_WORD.ru}`;

/* Названия месяцев задаём сами, а не через Intl month:'short':
   в этом окружении ICU-данные для 'uz-UZ' отдают «M09» вместо «сен»
   (тот же баг ловили в Announcements 22.08.2026, но fmtDate/fmtDateTime
   его не чинили — из-за этого «muddati M09 1 19:18» в ДЗ, тестах, видео). */
const MONTHS_SHORT = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const monthsOf = (lang) => MONTHS_SHORT[lang] || MONTHS_SHORT.ru;
const pad2 = (n) => String(n).padStart(2, '0');

export function fmtDate(value, lang = 'ru') {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const m = monthsOf(lang);
  return lang === 'en'
    ? `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(value, lang = 'ru') {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const m = monthsOf(lang);
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return lang === 'en'
    ? `${m[d.getMonth()]} ${d.getDate()}, ${time}`
    : `${d.getDate()} ${m[d.getMonth()]}, ${time}`;
}

/** 125 сек → «2:05» */
export function fmtDuration(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Дедлайн относительно now: «через 3 дня» / «сегодня» / «просрочено». */
const DEADLINE_WORDS = {
  ru: { overdue: 'просрочено', today: 'сегодня', tomorrow: 'завтра', inDays: (n) => `через ${n} дн.` },
  uz: { overdue: 'muddati o‘tgan', today: 'bugun', tomorrow: 'ertaga', inDays: (n) => `${n} kundan keyin` },
  en: { overdue: 'overdue', today: 'today', tomorrow: 'tomorrow', inDays: (n) => `in ${n} days` },
};
export function deadlineLabel(deadline, lang = 'ru') {
  if (!deadline) return '';
  const words = DEADLINE_WORDS[lang] || DEADLINE_WORDS.ru;
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs < 0) return words.overdue;
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return words.today;
  if (days === 1) return words.tomorrow;
  return words.inDays(days);
}

/** 158000 → «154 КБ», 3400000 → «3.2 МБ» */
export function fmtFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const initials = (firstName = '', lastName = '') =>
  `${(firstName[0] || '').toUpperCase()}${(lastName[0] || '').toUpperCase()}` || '?';
