import { Link } from 'react-router-dom';
import { ShieldCheck, AlertOctagon, ArrowRight } from 'lucide-react';
import { useActionCenter } from '../queries.js';
import { RowSkeleton } from './_ui.jsx';
import ActionAlertRow from './ActionAlertRow.jsx';

const PREVIEW_LIMIT = 4;

/**
 * Блок «Что требует внимания» вверху дашборда (Karis 25.08.2026) — первое,
 * что должен увидеть владелец платформы, ещё до KPI-плиток: просрочки,
 * зависшие заявки, партнёры на грани отвала. Полный список — на /action-center.
 *
 * Загружается независимо от useDashboard(): свой запрос, свой скелетон, не
 * блокирует и не ждёт остальной дашборд.
 */
export default function ActionCenterPanel() {
  const { data, isLoading, error } = useActionCenter();

  if (isLoading) {
    return (
      <div className="card bg-base-100 border border-base-200/60 shadow-sm">
        <div className="p-4"><RowSkeleton count={3} height="h-12" /></div>
      </div>
    );
  }

  // Тихий сбой не должен перекрывать весь дашборд — это дополнительная
  // панель, а не критичный для входа запрос.
  if (error) return null;

  const alerts = data?.alerts ?? [];
  const counts = data?.counts ?? { critical: 0, warning: 0, total: 0 };

  if (counts.total === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/[0.06] px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-success/10 text-success"><ShieldCheck size={16} /></span>
        <div><div className="text-sm font-bold">Срочных задач нет</div><div className="text-xs text-base-content/50">Все оплаты, заявки и партнёры в порядке</div></div>
      </div>
    );
  }

  const shown = alerts.slice(0, PREVIEW_LIMIT);

  return (
    <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)]">
      <header className="flex flex-col gap-3 border-b border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-error/10 text-error"><AlertOctagon size={17} /></span>
          <div>
            <h2 className="text-sm font-bold text-base-content/85">Что нужно сделать</h2>
            <p className="text-[11px] text-base-content/45">Нажмите на задачу — откроется место, где её можно решить</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {counts.critical > 0 && <span className="rounded-md bg-error/10 px-2 py-1 text-[11px] font-bold text-error">Срочно: {counts.critical}</span>}
          {counts.warning > 0 && <span className="rounded-md bg-warning/10 px-2 py-1 text-[11px] font-bold text-amber-700">На проверку: {counts.warning}</span>}
          <Link to="/action-center" className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-base-content/50 hover:bg-base-200 hover:text-base-content">
            Все задачи <ArrowRight size={12} />
          </Link>
        </div>
      </header>
      <div className="grid divide-y divide-base-200 md:grid-cols-2 md:divide-y-0">
        {shown.map((a) => (
          <ActionAlertRow key={`${a.type}-${a.entityId}`} alert={a} />
        ))}
      </div>
    </section>
  );
}
