/**
 * Ключи периодов для лидербордов (Redis ZSET). Один ключ на календарный
 * период — старые периоды самоочищаются по TTL, «сброс» рейтинга бесплатный.
 */

/** ISO-8601 неделя: '2026-W27' (неделя начинается с понедельника). */
export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // четверг текущей недели определяет ISO-год и номер недели
  const dayNum = (d.getUTCDay() + 6) % 7; // Пн=0 ... Вс=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Календарный месяц: '2026-07'. Как и isoWeekKey, берёт ЛОКАЛЬНЫЕ компоненты
 * даты (TZ сервера = TZ продукта): иначе в окне 00:00–05:00 по Ташкенту
 * недельный и месячный ключи лидерборда указывали бы на разные периоды.
 */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
