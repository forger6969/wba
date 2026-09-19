/**
 * Про-рейт-кредит за досрочное отключение платной фичи посреди оплаченного
 * месяца. Период = текущий календарный месяц (биллинг у нас помесячный).
 * `enabledAt` может быть из прошлого месяца (фичу не трогали давно) —
 * тогда точка отсчёта — 1 число текущего месяца, а не enabledAt, потому что
 * прошлые месяцы уже были отдельно оплачены и не пересчитываются.
 *
 * Пример из спеки: месяц 30 дней, включена с 1-го, отключена после 15 дней
 * использования → 15 дней осталось → 50% кредита. Проверено юнит-тестом.
 */
export function computeProrationCredit({ price, enabledAt, now = new Date() }) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const enabledDate = enabledAt ? new Date(enabledAt) : monthStart;
  const effectiveStart = enabledDate > monthStart ? enabledDate : monthStart;

  const startDay = effectiveStart.getUTCDate();
  const today = now.getUTCDate();
  const daysUsed = Math.max(1, Math.min(totalDays, today - startDay + 1));
  const daysRemaining = Math.max(0, totalDays - daysUsed);
  const creditPercent = Math.round((daysRemaining / totalDays) * 100);
  const amount = Math.round((price * daysRemaining) / totalDays);

  return { totalDays, daysUsed, daysRemaining, creditPercent, amount };
}
