/**
 * Единая точка правды: доступна ли организация целиком (все роли, все методы).
 * Используется и в auth.service.js (login-time), и в orgAccessGate.js
 * (request-time) — чтобы не дублировать логику в двух местах.
 *
 * Правила (подтверждены Karis'ом 11.08.2026):
 * - `status === 'frozen'` — ручной override Main Admin'а, блокирует всегда,
 *   независимо от access_until (кнопка "Заморозить" уже была в UI).
 * - `access_until IS NULL` — партнёр ни разу не оплачивался, доступа нет.
 * - Пока `now <= access_until` — доступ есть.
 * - Грейс-период: до 5 числа МЕСЯЦА, СЛЕДУЮЩЕГО СРАЗУ ЗА access_until,
 *   доступ ещё не блокируется (даём время оплатить). Это НЕ "1-5 число
 *   любого месяца" — если организация не платит несколько месяцев подряд,
 *   грейс не открывается заново каждый месяц, только один раз сразу после
 *   истечения последней оплаты.
 */
export function isOrgAccessBlocked(org, now = new Date()) {
  if (!org) return { blocked: true, reason: 'no_org' };
  if (org.status === 'frozen') return { blocked: true, reason: 'frozen' };
  if (!org.access_until) return { blocked: true, reason: 'no_payment' };

  const accessUntil = new Date(org.access_until);
  if (now <= accessUntil) return { blocked: false };

  const graceDeadline = new Date(
    Date.UTC(accessUntil.getUTCFullYear(), accessUntil.getUTCMonth() + 1, 5, 23, 59, 59),
  );
  if (now <= graceDeadline) return { blocked: false, reason: 'grace_period' };

  return { blocked: true, reason: 'payment_overdue' };
}

/** Первый период при онбординге в середине месяца — про-рейт за остаток месяца. */
export function computeFirstPeriodProration(basePrice, now = new Date()) {
  const totalDays = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const dayOfMonth = now.getUTCDate();
  const daysRemaining = totalDays - dayOfMonth + 1; // включая сегодняшний день
  const amount = Math.round((basePrice * daysRemaining) / totalDays);
  return { totalDays, daysRemaining, amount };
}
