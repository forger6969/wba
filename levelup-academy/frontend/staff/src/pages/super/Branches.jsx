import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Building2, AlertTriangle } from 'lucide-react';
import { fmt, money } from '../../format.js';
import { useSuperBranches } from '../../queries.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { phoneDisplay } from '../../components/PhoneInput.jsx';
import BranchFormModal from './BranchFormModal.jsx';
import { Card, SearchInput, EmptyState } from './_ui.jsx';

/**
 * Список филиалов — витрина, а не пульт управления.
 *
 * Раньше на каждой карточке висели «изменить» и «в архив»: карточка вела
 * внутрь филиала, но два её угла вели куда-то ещё, и промахнуться было легко.
 * Управление одним филиалом переехало внутрь этого филиала — под шестерёнку
 * «Настройки». Здесь остались только сам список и создание нового.
 */

export default function SuperBranches() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useSuperBranches();
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    document.title = t('super.branches.docTitle');
  }, [t]);

  const branches = data?.branches || [];
  const rows = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(q.toLowerCase()) ||
      (b.address || '').toLowerCase().includes(q.toLowerCase()),
  );

  /* Лидеры по деньгам. Считаем по всем филиалам, а не по отфильтрованным:
     ответ на вопрос «какой филиал больше зарабатывает» не должен меняться
     от того, что набрано в поиске. Архивные не участвуют — они не работают. */
  const active = branches.filter((b) => !b.isArchived);
  const topEarner = active.length
    ? active.reduce((a, b) => ((b.revenue || 0) > (a.revenue || 0) ? b : a))
    : null;
  const topSpender = active.length
    ? active.reduce((a, b) => ((b.expenses || 0) > (a.expenses || 0) ? b : a))
    : null;

  return (
    <div className="space-y-5">
      <PageHeader title={t('super.branches.title')} subtitle={t('super.branches.subtitle')}>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> {t('super.branches.newBranch')}
        </button>
      </PageHeader>

      {error && error.status !== 401 ? (
        <Card className="max-w-lg mx-auto mt-6">
          <EmptyState
            icon={AlertTriangle}
            title={t('super.branches.loadErrorTitle')}
            hint={error.message || t('super.branches.loadErrorHint')}
            action={
              <button className="btn btn-primary btn-sm px-6" onClick={() => refetch()}>
                {t('super.branches.retry')}
              </button>
            }
          />
        </Card>
      ) : isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t('super.branches.searchPlaceholder')}
              className="max-w-xs"
            />
            {topEarner && (topEarner.revenue > 0 || (topSpender && topSpender.expenses > 0)) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                {topEarner.revenue > 0 && (
                  <span className="text-base-content/60">
                    {t('super.branches.topEarner')}{' '}
                    <Link to={`/branches/${topEarner.id}`} className="font-bold text-success hover:underline">
                      {topEarner.name}
                    </Link>{' '}
                    <span className="tabular-nums">{money(topEarner.revenue)}</span>
                  </span>
                )}
                {topSpender && topSpender.expenses > 0 && (
                  <span className="text-base-content/60">
                    {t('super.branches.topSpender')}{' '}
                    <Link to={`/branches/${topSpender.id}`} className="font-bold hover:underline">
                      {topSpender.name}
                    </Link>{' '}
                    <span className="tabular-nums">{money(topSpender.expenses)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState
                icon={Building2}
                title={t('super.branches.emptyTitle')}
                hint={q ? t('super.branches.emptySearchHint') : t('super.branches.emptyHint')}
                action={
                  !q && (
                    <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setCreateOpen(true)}>
                      <Plus size={16} /> {t('super.branches.createFirst')}
                    </button>
                  )
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Карточка целиком — ссылка внутрь филиала. Ни одной кнопки:
                  всё, что можно сделать с филиалом, делается внутри него. */}
              {rows.map((b) => (
                <Link
                  key={b.id}
                  to={`/branches/${b.id}`}
                  className={`card block border border-base-300 bg-base-100 shadow-sm hover:shadow-md hover:border-primary/40 transition-all ${b.isArchived ? 'opacity-60' : ''}`}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold truncate">{b.name}</span>
                      <span className="text-xs text-base-content/45 shrink-0">
                        {b.isArchived ? t('super.branches.archivedBadge') : b.isMain ? t('super.branches.mainBadge') : ''}
                      </span>
                    </div>

                    <div className="text-xs text-base-content/50 space-y-0.5">
                      <div className="truncate">{b.address || t('super.branches.addressNotSpecified')}</div>
                      <div>{b.phone ? phoneDisplay(b.phone) : t('super.branches.phoneNotSpecified')}</div>
                    </div>

                    <dl className="grid grid-cols-3 gap-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-base-content/45">{t('super.branches.colStudents')}</dt>
                        <dd className="font-semibold tabular-nums">{fmt(b.students)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/45">{t('super.branches.colGroups')}</dt>
                        <dd className="font-semibold tabular-nums">{fmt(b.groups)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/45">{t('super.branches.colStaff')}</dt>
                        <dd className="font-semibold tabular-nums">
                          {fmt((b.admins || 0) + (b.mentors || 0))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/45">{t('super.branches.colRevenue')}</dt>
                        <dd className="font-semibold tabular-nums">{money(b.revenue)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/45">{t('super.branches.colExpense')}</dt>
                        <dd className="font-semibold tabular-nums">{money(b.expenses)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/45">{t('super.branches.colDebt')}</dt>
                        <dd className={`font-semibold tabular-nums ${b.debt > 0 ? 'text-error' : ''}`}>
                          {money(b.debt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <BranchFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
