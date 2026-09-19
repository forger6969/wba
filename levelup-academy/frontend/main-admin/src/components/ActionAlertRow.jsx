import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { alertIcon } from '../lib/actionCenter.js';

const ICON_TONE = { critical: 'bg-error/10 text-error', warning: 'bg-warning/10 text-warning', info: 'bg-info/10 text-info' };
const SEVERITY_TEXT = { critical: 'Срочно', warning: 'Проверить', info: 'Информация' };

/**
 * Одна строка Action Center — переиспользуется и в блоке на дашборде, и на
 * отдельной странице /action-center, чтобы вид алерта не расходился между
 * ними (Karis 25.08.2026).
 *
 * Вся карточка — ссылка на alert.href: это центр ДЕЙСТВИЙ, а не список
 * жалоб, клик обязан вести туда, где проблему можно решить.
 */
export default function ActionAlertRow({ alert }) {
  const Icon = alertIcon(alert.type);
  return (
    <Link
      to={alert.href || '#'}
      className="group flex min-h-[76px] items-center gap-3 border-base-200 px-4 py-3 transition-colors hover:bg-base-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary md:border-r"
    >
      <span className={`w-9 h-9 rounded-md grid place-items-center shrink-0 ${ICON_TONE[alert.severity] ?? ICON_TONE.info}`}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 text-[9px] font-extrabold uppercase tracking-wider ${alert.severity === 'critical' ? 'text-error' : alert.severity === 'warning' ? 'text-amber-700' : 'text-info'}`}>{SEVERITY_TEXT[alert.severity] || SEVERITY_TEXT.info}</span>
          <span className="truncate text-sm font-bold">{alert.title}</span>
        </div>
        <div className="text-xs text-base-content/50 truncate mt-0.5">{alert.description}</div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 text-[10px] font-bold text-base-content/55 shadow-sm group-hover:border-primary/50 group-hover:text-base-content sm:flex">Исправить <ChevronRight size={12} /></span>
    </Link>
  );
}
