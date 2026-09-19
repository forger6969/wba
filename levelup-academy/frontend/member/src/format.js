import { getLang, getDict } from './i18n/index.jsx';
import { fmt as fmtStr } from './i18n/index.jsx';

const LOCALES = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const localeOf = () => LOCALES[getLang()] || 'ru-RU';
const t = (key, params) => {
  const parts = key.split('.');
  let value = getDict();
  for (const part of parts) value = value?.[part];
  return typeof value === 'string' ? fmtStr(value, params) : key;
};

export const fmt = (n) => new Intl.NumberFormat(localeOf()).format(Number(n ?? 0));

export const money = (n, cur = 'UZS') => `${fmt(n)} ${cur}`;

export const dateShort = (iso) =>
  iso
    ? new Intl.DateTimeFormat(localeOf(), { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
    : '—';

export const datetimeShort = (iso) =>
  iso
    ? new Intl.DateTimeFormat(localeOf(), {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : '—';

export const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return t('common.minAgo', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('common.hrsAgo', { n: hrs });
  const days = Math.floor(hrs / 24);
  return t('common.daysAgo', { n: days });
};

/** Статусы посещаемости с подписями на текущем языке. */
export function attendanceStatus() {
  return {
    present: { label: t('status.present'), color: '#22c55e', bg: 'rgba(34,197,94,.12)' },
    absent: { label: t('status.absent'), color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
    late: { label: t('status.late'), color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    excused: { label: t('status.excused'), color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  };
}

// Совместимость: некоторые места зовут ATTENDANCE_STATUS[s] — теперь это функция.
export const ATTENDANCE_STATUS = attendanceStatus;

/**
 * Процент результата по оценке.
 * ДЗ: score — набранные баллы, maxScore — максимум (обычно 100).
 * Тест: backend хранит score КАК ПРОЦЕНТ (0–100), maxScore = число вопросов,
 * поэтому делить нельзя — иначе 80/10*100 = 800%.
 */
export function gradePercent(score, maxScore, type) {
  if (type === 'test') return Number(score ?? 0);
  return maxScore > 0 ? Math.round((Number(score ?? 0) / Number(maxScore)) * 100) : 0;
}
