import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertOctagon, ShieldCheck } from 'lucide-react';
import { useActionCenter } from '../queries.js';
import { ALERT_TYPE_LABEL, SEVERITY_LABEL } from '../lib/actionCenter.js';
import PageHeader from '../components/PageHeader.jsx';
import ActionAlertRow from '../components/ActionAlertRow.jsx';
import { Panel, EmptyState, RowSkeleton, FilterPills } from '../components/_ui.jsx';

/**
 * Полный список Action Center (Karis 25.08.2026) — то же, что превью на
 * дашборде (ActionCenterPanel.jsx), но без обрезки и с фильтром по
 * серьёзности/типу. Общий рендер строки — ActionAlertRow, чтобы вид алерта
 * не расходился между двумя местами.
 */

const SEVERITIES = [
  { key: 'all', label: 'Все' },
  { key: 'critical', label: 'Критично' },
  { key: 'warning', label: 'Внимание' },
];

export default function ActionCenter() {
  const [params, setParams] = useSearchParams();
  const severity = params.get('severity') || 'all';
  const type = params.get('type') || '';
  const { data, isLoading, error } = useActionCenter();

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const alerts = data?.alerts ?? [];
  const counts = data?.counts ?? { critical: 0, warning: 0, info: 0, total: 0 };
  const types = [...new Set(alerts.map((a) => a.type))];

  const shown = alerts.filter((a) => (severity === 'all' || a.severity === severity) && (!type || a.type === type));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={<span className="flex items-center gap-2"><AlertOctagon size={22} /> Задачи</span>}
          subtitle="Срочные вопросы по оплатам, доступам, заявкам и партнёрам. Нажмите на задачу, чтобы перейти к решению."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills options={SEVERITIES} value={severity} onChange={(v) => setParam('severity', v)} />
        {types.length > 0 && (
          <select
            className="select select-bordered select-sm rounded-md"
            value={type}
            onChange={(e) => setParam('type', e.target.value)}
          >
            <option value="">Все типы</option>
            {types.map((t) => <option key={t} value={t}>{ALERT_TYPE_LABEL[t] || t}</option>)}
          </select>
        )}
        {counts.total > 0 && (
          <span className="text-xs text-base-content/45 sm:ml-auto">
            всего {counts.total}
            {counts.critical > 0 && <> · <span className="text-error font-semibold">{counts.critical} {SEVERITY_LABEL.critical.toLowerCase()}</span></>}
          </span>
        )}
      </div>

      <Panel bodyClass="p-0">
        {isLoading ? (
          <div className="p-5"><RowSkeleton count={6} height="h-14" /></div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title="Не удалось загрузить центр проблем" hint={error.message} />
          </div>
        ) : shown.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={counts.total === 0 ? ShieldCheck : AlertOctagon}
              title={counts.total === 0 ? 'Всё в порядке' : 'Ничего не найдено'}
              hint={counts.total === 0
                ? 'Просрочек, зависших заявок и проблем с партнёрами сейчас нет'
                : 'Попробуйте сбросить фильтр'}
            />
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {shown.map((a) => (
              <ActionAlertRow key={`${a.type}-${a.entityId}`} alert={a} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
