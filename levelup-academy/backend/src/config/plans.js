/**
 * Тарифные планы партнёров (CEO платит нам).
 *
 * ВАЖНО (2026-07-16, пересчёт по общему числу пользователей — 11.08.2026):
 * цена = фикс по бакету общего числа пользователей организации (ученики +
 * родители + сотрудники, см. TIERS ниже), филиалы включены безлимитом.
 * Раньше бакет считался только по ученикам — Karis попросил считать по всем
 * пользователям (пример: CEO с 31 учеником, но 50 пользователями всего,
 * должен тарифицироваться по 50, не по 31). Старая модель (за филиал +
 * за ученика) ОТМЕНЕНА ещё раньше. PLANS pro/max ниже — legacy, не влияют
 * на счёт (оставлены для совместимости).
 */
export const PLAN_IDS = ['pro', 'max'];

export const PLANS = {
  pro: { id: 'pro', label: 'Pro', maxBranches: 3, maxStudents: 300 },
  max: { id: 'max', label: 'Max', maxBranches: 10, maxStudents: 3000 },
};

/**
 * Модель тарификации: фикс по бакету общего числа пользователей (ученики +
 * родители + сотрудники), филиалы включены безлимитом (на цену НЕ влияют).
 * Прайс здесь = источник правды.
 * TODO v2: сделать тарифы редактируемыми Main Admin'ом через БД.
 */
export const TIERS = [
  { id: 'free', label: 'Free', minUsers: 0, maxUsers: 30, price: 0 },
  { id: 'start', label: 'Start', minUsers: 31, maxUsers: 100, price: 199000 },
  { id: 'standard', label: 'Standard', minUsers: 101, maxUsers: 300, price: 349000 },
  { id: 'pro', label: 'Pro', minUsers: 301, maxUsers: 600, price: 599000 },
  { id: 'business', label: 'Business', minUsers: 601, maxUsers: 1000, price: 799000 },
  { id: 'network', label: 'Network', minUsers: 1001, maxUsers: null, price: null }, // договорная
];

/** Тариф партнёра по общему числу пользователей (ученики+родители+сотрудники). */
export function tierForUsers(users = 0) {
  const u = Math.max(0, Number(users) || 0);
  return (
    TIERS.find((t) => u >= t.minUsers && (t.maxUsers == null || u <= t.maxUsers)) ??
    TIERS[TIERS.length - 1]
  );
}

/**
 * Счёт партнёра за месяц (сумы) = цена тарифа по общему числу пользователей.
 * Филиалы на цену не влияют. Network (1000+) — договорная → в авто-расчёте 0.
 */
export function computeBill({ users = 0 } = {}) {
  return tierForUsers(users).price ?? 0;
}

/** Лимиты плана (для будущей проверки при создании филиалов/студентов). */
export function planLimits(planId) {
  const p = PLANS[planId];
  return p ? { maxBranches: p.maxBranches, maxStudents: p.maxStudents } : null;
}
