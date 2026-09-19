/**
 * Тарифная модель платформы (с 2026-07-16, пересчёт на "все пользователи" 11.08.2026).
 *
 * Цена = фиксированная сумма за бакет общего числа пользователей организации
 * (ученики + родители + сотрудники); филиалы включены безлимитом. Раньше
 * бакет считался только по ученикам — Karis попросил считать по всем
 * пользователям (CEO с 31 учеником, но 50 пользователями всего, должен
 * тарифицироваться по 50, не по 31).
 *
 * Модуль появился потому, что правило выбора бакета уже было продублировано
 * в Billing.jsx, а Dashboard, OrgDetail и Settings всё ещё читали
 * `pricing.baseFirstBranch` / `pricing.perStudent` и рисовали пустые значения.
 * Пусть правило живёт в одном месте.
 *
 * Зеркало `tierForUsers()` из `backend/src/config/plans.js`. Дублирование
 * намеренное: калькулятор должен считать мгновенно, без запроса. Сами тарифы
 * при этом приходят с сервера — здесь только правило выбора.
 */
import { fmt } from '../format.js';

export function tierForUsers(tiers, users) {
  const list = Array.isArray(tiers) ? tiers : [];
  const u = Math.max(0, Number(users) || 0);
  return (
    list.find((t) => u >= t.minUsers && (t.maxUsers == null || u <= t.maxUsers)) ??
    list[list.length - 1] ??
    null
  );
}

export function tierRange(t) {
  if (!t) return '—';
  if (t.maxUsers == null) return `${fmt(t.minUsers)}+`;
  return `${fmt(t.minUsers)}–${fmt(t.maxUsers)}`;
}

/** `price: null` — договорная цена (верхний бакет), `0` — бесплатно. */
export function tierPriceLabel(t, cur) {
  if (!t) return '—';
  if (t.price == null) return 'договорная';
  if (t.price === 0) return 'бесплатно';
  return `${fmt(t.price)} ${cur}`;
}
