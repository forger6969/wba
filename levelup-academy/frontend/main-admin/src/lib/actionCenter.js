import {
  ShieldAlert, Hourglass, CalendarClock, Snowflake, MoonStar, UserX, Inbox, Puzzle, AlertTriangle,
} from 'lucide-react';

/**
 * Метаданные по типам предупреждений Action Center (Karis 25.08.2026).
 * Единое место: и блок на дашборде, и отдельная страница /action-center
 * рисуют алерты одинаково — иконка/тон не должны разъезжаться между ними.
 * Незнакомый type (появится новый вид алерта на бэкенде раньше, чем здесь
 * добавят иконку) — не падаем, берём нейтральную заглушку.
 */
export const ALERT_TYPE_META = {
  partner_access_blocked: { Icon: ShieldAlert },
  partner_grace_period: { Icon: Hourglass },
  partner_access_expiring: { Icon: CalendarClock },
  partner_frozen: { Icon: Snowflake },
  partner_inactive: { Icon: MoonStar },
  partner_never_logged_in: { Icon: UserX },
  lead_unprocessed: { Icon: Inbox },
  feature_request_pending: { Icon: Puzzle },
};

export function alertIcon(type) {
  return ALERT_TYPE_META[type]?.Icon || AlertTriangle;
}

/** Цвет по серьёзности — тот же словарь, что и tone у StatusBadge/Kpi. */
export const SEVERITY_TONE = { critical: 'danger', warning: 'warning', info: 'neutral' };
export const SEVERITY_LABEL = { critical: 'Критично', warning: 'Внимание', info: 'Инфо' };
export const ALERT_TYPE_LABEL = {
  partner_access_blocked: 'Доступ заблокирован', partner_grace_period: 'Грейс-период',
  partner_access_expiring: 'Истекает доступ', partner_frozen: 'Заморожен',
  partner_inactive: 'Нет активности', partner_never_logged_in: 'Не входил',
  lead_unprocessed: 'Новый лид', feature_request_pending: 'Заявка на фичу',
};
