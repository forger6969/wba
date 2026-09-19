import { useState } from 'react';
import { useParentOverview, useAttendancePage } from '../queries.js';
import { useChild } from '../child-context.jsx';
import { dateShort, ATTENDANCE_STATUS } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/ui.jsx';
import Icon from '../components/Icons.jsx';
import { useI18n, fmt as fmtStr } from '../i18n/index.jsx';

const PAGE_SIZE = 100;
const WEEKDAYS_LABEL = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};
const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

function calendarDays(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
}

const FILTER_KEYS = ['all', 'present', 'absent', 'late', 'excused'];

export default function Attendance() {
  const { t, lang } = useI18n();
  const { selectedChild } = useChild();
  const { data, isLoading, error, refetch } = useParentOverview(selectedChild?.id);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));

  // FE-PARENT-PAGINATION: overview.attendance.recent ограничен последними 5 —
  // полная история постранично идёт отдельным запросом
  const {
    data: pageData,
    isLoading: isPageLoading,
    error: pageError,
    refetch: refetchPage,
  } = useAttendancePage(selectedChild?.id, page, PAGE_SIZE);

  if (!selectedChild) return <EmptyState icon="user-circle" title={t.dash.noChildTitle} />;

  if (isLoading || isPageLoading) {
    return (
      <>
        <PageHeader title={t.att.title} />
        <SkeletonTable rows={6} cols={4} />
      </>
    );
  }

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (pageError) return <ErrorState message={pageError.message} onRetry={refetchPage} />;

  const d = data?.data;
  if (!d) return null;

  const records = pageData?.data?.items || [];
  const pageCount = pageData?.data?.pageCount || 1;
  const filtered = filter === 'all' ? records : records.filter((r) => r.status === filter);
  const monthlyRecords = records.filter((record) => String(record.lessonDate).slice(0, 7) === monthKey);
  const monthlySummary = monthlyRecords.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 });
  const recordsByDay = monthlyRecords.reduce((acc, record) => {
    const day = Number(String(record.lessonDate).slice(8, 10));
    (acc[day] ||= []).push(record);
    return acc;
  }, {});
  const [calendarYear, calendarMonth] = monthKey.split('-').map(Number);
  const monthLabel = new Intl.DateTimeFormat(LOCALE_OF[lang] || 'ru-RU', { month: 'long', year: 'numeric' })
    .format(new Date(calendarYear, calendarMonth - 1, 1));
  const todayKey = new Date().toISOString().slice(0, 10);

  const onFilterChange = (next) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={t.att.title}
        subtitle={`${selectedChild.firstName} ${selectedChild.lastName}`}
      />

      <section className="parent-calendar card bg-base-100 mb-6">
        <div className="parent-calendar-toolbar">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {['present', 'absent', 'late', 'excused'].map((status) => {
              const item = ATTENDANCE_STATUS[status];
              return <button key={status} onClick={() => onFilterChange(filter === status ? 'all' : status)} className={`parent-calendar-stat ${filter === status ? 'is-active' : ''}`}><i style={{ background: item.color }} /><strong>{monthlySummary[status]}</strong><span>{item.label}</span></button>;
            })}
          </div>
          <label className="parent-month-control">
            <Icon name="calendar" className="w-4 h-4" />
            <input type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} aria-label={t.att.selectMonth} />
          </label>
        </div>
        <div className="parent-calendar-body">
          <div className="parent-calendar-weekdays">{(WEEKDAYS_LABEL[lang] || WEEKDAYS_LABEL.ru).map((day) => <span key={day}>{day}</span>)}</div>
          <h2 className="parent-calendar-month">{monthLabel}</h2>
          <div className="parent-calendar-grid">
            {calendarDays(monthKey).map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
              const dayRecords = recordsByDay[day] || [];
              return (
                <div key={day} className={`parent-calendar-day ${dateKey === todayKey ? 'is-today' : ''}`}>
                  <span>{day}</span>
                  <div className="parent-calendar-dots">
                    {[...new Set(dayRecords.map((record) => record.status))].map((status) => <i key={status} title={ATTENDANCE_STATUS[status]?.label} style={{ background: ATTENDANCE_STATUS[status]?.color }} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="parent-history-filters">
        {FILTER_KEYS.map((key) => <button key={key} onClick={() => onFilterChange(key)} className={filter === key ? 'is-active' : ''}>{t.att.filter[key]}</button>)}
      </div>

      {/* History Table */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h3 className="card-title text-sm gap-2">
            <Icon name="clock" className="w-4 h-4 text-primary" />
            {t.att.history}
          </h3>
          {filtered.length === 0 ? (
            <EmptyState icon="calendar" title={t.att.emptyTitle} message={t.att.emptyMsg} />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto mt-3">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t.att.colDate}</th>
                      <th>{t.att.colGroup}</th>
                      <th>{t.att.colStatus}</th>
                      <th>{t.att.colComment}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const st = ATTENDANCE_STATUS[r.status];
                      return (
                        <tr key={i} className="hover:bg-base-200/50 transition-colors">
                          <td className="text-sm whitespace-nowrap font-medium">{dateShort(r.lessonDate)}</td>
                          <td className="text-sm">{r.groupName}</td>
                          <td>
                            <span
                              className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                              style={{ background: st?.bg, color: st?.color }}
                            >
                              {st?.label}
                            </span>
                          </td>
                          <td className="text-sm opacity-50 max-w-[200px] truncate">{r.comment || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2 mt-3">
                {filtered.map((r, i) => {
                  const st = ATTENDANCE_STATUS[r.status];
                  return (
                    <div key={i} className="p-3 rounded-xl bg-base-200/40 hover:bg-base-200/60 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{r.groupName}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: st?.bg, color: st?.color }}
                        >
                          {st?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-40">{dateShort(r.lessonDate)}</span>
                        {r.comment && (
                          <span className="text-xs opacity-40 truncate max-w-[150px]">{r.comment}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* FE-PARENT-PAGINATION */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-1 py-3 mt-2 border-t border-base-200">
              <span className="text-xs text-base-content/50">{fmtStr(t.common.page, { page, total: pageCount })}</span>
              <div className="join">
                <button className="join-item btn btn-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>«</button>
                <button className="join-item btn btn-xs" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
