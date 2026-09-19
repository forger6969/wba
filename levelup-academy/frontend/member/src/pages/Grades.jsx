import { useState } from 'react';
import { useGradesPage } from '../queries.js';
import { useChild } from '../child-context.jsx';
import { dateShort, gradePercent } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, ProgressBar } from '../components/ui.jsx';
import Icon from '../components/Icons.jsx';
import GradeDetail from '../components/GradeDetail.jsx';
import { useI18n, fmt as fmtStr } from '../i18n/index.jsx';

const TABS = [
  { key: 'homework', icon: 'document-text' },
  { key: 'tests', icon: 'academic' },
];
const PAGE_SIZE = 15;

export default function Grades() {
  const { t } = useI18n();
  const { selectedChild } = useChild();
  const [tab, setTab] = useState('homework');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  // FE-PARENT-PAGINATION: overview.grades.{homework,tests} ограничены последними 5 —
  // список ниже идёт отдельным постраничным запросом. Счётчики на вкладках — по 1
  // записи каждого типа (нужен только total из ответа, не сами данные).
  const { data, isLoading, error, refetch } = useGradesPage(selectedChild?.id, tab, page, PAGE_SIZE);
  const { data: hwCountData } = useGradesPage(selectedChild?.id, 'homework', 1, 1);
  const { data: testsCountData } = useGradesPage(selectedChild?.id, 'tests', 1, 1);

  const onTabChange = (next) => {
    setTab(next);
    setPage(1);
  };

  if (!selectedChild) return <EmptyState icon="user-circle" title={t.dash.noChildTitle} />;

  if (isLoading) {
    return (
      <>
        <PageHeader title={t.gr.title} />
        <SkeletonTable rows={5} cols={4} />
      </>
    );
  }

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const p = data?.data;
  if (!p) return null;

  const list = p.items || [];
  const pageCount = p.pageCount || 1;
  const hwCount = hwCountData?.data?.total ?? 0;
  const testsCount = testsCountData?.data?.total ?? 0;

  const avg =
    list.length > 0
      ? Math.round(list.reduce((s, g) => s + gradePercent(g.score, g.maxScore, tab), 0) / list.length)
      : 0;

  const best = list.length > 0
    ? Math.max(...list.map((g) => gradePercent(g.score, g.maxScore, tab)))
    : 0;

  return (
    <>
      <PageHeader
        title={t.gr.title}
        subtitle={`${selectedChild.firstName} ${selectedChild.lastName}`}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-base-100 p-1 rounded-xl w-fit shadow-sm">
        {TABS.map((tabItem) => {
          const count = tabItem.key === 'homework' ? hwCount : testsCount;
          return (
            <button
              key={tabItem.key}
              onClick={() => onTabChange(tabItem.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === tabItem.key
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/50 hover:bg-base-200'
              }`}
            >
              <Icon name={tabItem.icon} className="w-4 h-4" />
              {t.gr.tab[tabItem.key === 'homework' ? 'hw' : 'tests']}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === tabItem.key ? 'bg-primary-content/20' : 'bg-base-200'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card bg-base-100 p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center mx-auto mb-2">
            <Icon name="document-text" className="w-5 h-5 text-base-content/40" />
          </div>
          <p className="text-2xl font-extrabold">{p.total}</p>
          <p className="text-[11px] opacity-40 mt-1">{t.gr.total}</p>
        </div>
        <div className="card bg-base-100 p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
            style={{ background: avg >= 80 ? 'rgba(34,197,94,.1)' : avg >= 60 ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)' }}
          >
            <Icon
              name="chart-bar"
              className="w-5 h-5"
              style={{ color: avg >= 80 ? '#22c55e' : avg >= 60 ? '#f59e0b' : '#ef4444' }}
            />
          </div>
          <p
            className="text-2xl font-extrabold"
            style={{ color: avg >= 80 ? '#22c55e' : avg >= 60 ? '#f59e0b' : '#ef4444' }}
          >
            {avg}%
          </p>
          <p className="text-[11px] opacity-40 mt-1">{t.gr.avg}</p>
        </div>
        <div className="card bg-base-100 p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Icon name="trophy" className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-primary">{best}%</p>
          <p className="text-[11px] opacity-40 mt-1">{t.gr.best}</p>
        </div>
      </div>

      {/* Grade List */}
      <div className="card bg-base-100">
        <div className="card-body">
          {list.length === 0 ? (
            <EmptyState
              icon="document-text"
              title={t.gr.emptyTitle}
              message={tab === 'homework' ? t.gr.emptyHw : t.gr.emptyTests}
            />
          ) : (
            <div className="space-y-2 mt-2">
              {list.map((g, i) => {
                const pct = gradePercent(g.score, g.maxScore, tab);
                const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
                const itemId = g.id || `${tab}-${i}`;
                return (
                  <button
                    key={itemId}
                    onClick={() => setDetail({ type: tab === 'homework' ? 'hw' : 'test', id: g.id, item: g })}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-base-200/30 hover:bg-base-200/60 hover:-translate-y-0.5 transition-all duration-200 group text-left cursor-pointer"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${color}15`, color }}
                    >
                      {pct}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{g.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <ProgressBar value={pct} color={color} height={4} />
                        <span className="text-[11px] font-mono opacity-50">
                          {tab === 'tests' ? `${pct}%` : `${g.score}/${g.maxScore}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] opacity-30 whitespace-nowrap">{dateShort(g.gradedAt || g.finishedAt)}</span>
                      <Icon name="chevron-right" className="w-4 h-4 opacity-20 group-hover:opacity-50 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* FE-PARENT-PAGINATION */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-1 py-3 mt-2 border-t border-base-200">
              <span className="text-xs text-base-content/50">{fmtStr(t.common.page, { page, total: pageCount })}</span>
              <div className="join">
                <button className="join-item btn btn-xs" disabled={page <= 1} onClick={() => setPage((pg) => pg - 1)}>«</button>
                <button className="join-item btn btn-xs" disabled={page >= pageCount} onClick={() => setPage((pg) => pg + 1)}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {detail && (
        <GradeDetail
          type={detail.type}
          id={detail.id}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
