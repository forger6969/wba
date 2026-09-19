import { useMethodistAnalytics } from '../../queries.js';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { BookOpen, FileQuestion, TrendingDown, AlertTriangle, BarChart3, RefreshCw, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

const scoreColor = (avg) => {
  if (avg >= 70) return '#059669';
  if (avg >= 50) return '#D97706';
  return '#DC2626';
};

const scoreLabel = (avg, t) => {
  if (avg >= 70) return t('methodist.analytics.score_good');
  if (avg >= 50) return t('methodist.analytics.score_avg');
  return t('methodist.analytics.score_hard');
};

function ScoreBadge({ score, size = 'md' }) {
  const num = Number(score);
  const color = scoreColor(num);
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[13px] px-3 py-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tabular-nums ${sizeClass}`}
      style={{ background: `${color}12`, color }}
    >
      {num.toFixed(1)}%
    </span>
  );
}

function DonutChart({ value, size = 96, t }) {
  const num = Math.max(0, Math.min(100, Number(value) || 0));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (num / 100) * c;
  const center = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      role="img"
      aria-label={t('methodist.analytics.donut_aria', { num })}
    >
      <defs>
        <linearGradient id="mt-donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <circle cx={center} cy={center} r={r} fill="none" stroke="var(--mt-surface-warm)" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="url(#mt-donut-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fontWeight="800"
        fontFamily="Manrope, system-ui, sans-serif"
        style={{ fill: 'var(--mt-text)' }}
      >
        {num}%
      </text>
    </svg>
  );
}

function DifficultyBar({ name, avgScore, count, index, t }) {
  const color = scoreColor(avgScore);
  return (
    <div className={`mt-animate-in mt-stagger-${Math.min(index + 1, 6)}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--mt-text)]">{name}</span>
          <span className="text-[10px] text-[var(--mt-text-muted)]">({t('methodist.common.tests_count', { count })})</span>
        </div>
        <ScoreBadge score={avgScore} />
      </div>
      <div className="relative h-3 bg-[var(--mt-surface-warm)] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${Math.max(5, avgScore)}%`, background: `linear-gradient(90deg, ${color}90, ${color})` }}
        />
        <div className="absolute inset-0 flex">
          <div className="w-[50%] border-r border-white/30" />
          <div className="w-[20%] border-r border-white/30" />
        </div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[var(--mt-text-muted)]">{scoreLabel(avgScore, t)}</span>
        <span className="text-[10px] text-[var(--mt-text-muted)] tabular-nums">{avgScore}%</span>
      </div>
    </div>
  );
}

function WorstTestCard({ test, index, t }) {
  return (
    <div className={`mt-notebook-item mt-animate-in mt-stagger-${Math.min(index + 1, 6)}`}>
      <span
        className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-[11px] font-bold"
        style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#DC2626' }}
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--mt-text)] truncate">{test.title}</div>
        <div className="text-[11px] text-[var(--mt-text-muted)]">{test.group_name} · {t('methodist.common.attempts_count', { count: test.attempts })}</div>
      </div>
      <ScoreBadge score={test.avg_score} size="sm" />
    </div>
  );
}

function AnalyticsView() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useMethodistAnalytics();

  const header = (
    <div className="mt-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-[var(--mt-accent-light)] grid place-items-center">
            <BarChart size={20} className="text-[var(--mt-accent)]" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.analytics.title')}</h1>
            <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.analytics.subtitle')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="mt-page-bg space-y-6 p-6">
      {header}
      <SkeletonTable rows={5} cols={4} />
    </div>
  );

  if (error) return (
    <div className="mt-page-bg space-y-6 p-6">
      {header}
      <div className="mt-card-flat p-6 mt-animate-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'rgba(220,38,38,0.08)' }}>
            <AlertTriangle size={22} className="text-[var(--mt-danger)]" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-[var(--mt-text)] mb-0.5">{t('methodist.common.loading_error')}</p>
            <p className="text-[12px] text-[var(--mt-text-muted)]">{error.message}</p>
          </div>
          <button
            className="mt-btn-ghost"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} /> {t('methodist.common.retry')}
          </button>
        </div>
      </div>
    </div>
  );

  const tests = data?.data?.tests || [];
  const homework = data?.data?.homework || [];

  const subjectStats = {};
  for (const item of tests) {
    const subj = item.subject || t('methodist.analytics.general_subject');
    if (!subjectStats[subj]) subjectStats[subj] = { tests: 0, avgScore: 0, count: 0 };
    subjectStats[subj].tests += 1;
    subjectStats[subj].avgScore += Number(item.avg_score || 0);
    subjectStats[subj].count += 1;
  }
  for (const h of homework) {
    const subj = h.subject || t('methodist.analytics.general_subject');
    if (!subjectStats[subj]) subjectStats[subj] = { tests: 0, avgScore: 0, count: 0 };
    subjectStats[subj].avgScore += Number(h.avg_score || 0);
    subjectStats[subj].count += 1;
  }
  const difficultSubjects = Object.entries(subjectStats)
    .map(([name, s]) => ({ name, ...s, avgScore: s.count > 0 ? Math.round(s.avgScore / s.count) : 0 }))
    .sort((a, b) => a.avgScore - b.avgScore);

  const worstTests = [...tests].sort((a, b) => Number(a.avg_score) - Number(b.avg_score)).slice(0, 5);
  const sortedTests = [...tests].sort((a, b) => Number(a.avg_score) - Number(b.avg_score));

  const totalAttempts = tests.reduce((s, item) => s + (Number(item.attempts) || 0), 0);
  const overallAvg = tests.length > 0
    ? Math.round(tests.reduce((s, item) => s + Number(item.avg_score || 0), 0) / tests.length)
    : 0;

  return (
    <div className="mt-page-bg space-y-6 p-6">
      {/* Header */}
      {header}

      {/* Summary KPIs — horizontal strip */}
      <div className="mt-stat-strip mt-animate-in mt-stagger-1">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--mt-text-muted)] mb-1">{t('methodist.analytics.total_tests')}</div>
            <div className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--mt-text)]">{tests.length}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--mt-text-muted)] mb-1">{t('methodist.analytics.total_attempts')}</div>
            <div className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--mt-text)]">{totalAttempts}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--mt-text-muted)] mb-1">{t('methodist.analytics.overall_avg')}</div>
            <div className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: scoreColor(overallAvg) }}>{overallAvg}%</div>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart value={overallAvg} t={t} />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--mt-text-muted)] mb-1">{t('methodist.analytics.performance')}</div>
              <div className="text-[13px] font-bold text-[var(--mt-text)]">{scoreLabel(overallAvg, t)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subject difficulty */}
        <div className="mt-card-flat mt-animate-in mt-stagger-2">
          <div className="mt-section-header">
            <TrendingDown size={18} className="text-[var(--mt-warning)]" />
            <div>
              <h2 className="text-[14px] font-bold text-[var(--mt-text)]">{t('methodist.analytics.subject_difficulty')}</h2>
              <p className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.analytics.by_avg_score')}</p>
            </div>
          </div>
          {difficultSubjects.length === 0 ? (
            <div className="mt-empty py-10">
              <div className="w-12 h-12 rounded-xl grid place-items-center mb-3" style={{ background: 'var(--mt-surface-warm)' }}>
                <BarChart3 size={20} className="text-[var(--mt-text-muted)]" />
              </div>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.common.no_data')}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {difficultSubjects.map((s, i) => (
                <DifficultyBar key={s.name} name={s.name} avgScore={s.avgScore} count={s.count} index={i} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* Worst tests */}
        <div className="mt-card-flat mt-animate-in mt-stagger-3">
          <div className="mt-section-header">
            <AlertTriangle size={18} className="text-[var(--mt-danger)]" />
            <div>
              <h2 className="text-[14px] font-bold text-[var(--mt-text)]">{t('methodist.analytics.low_tests')}</h2>
              <p className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.analytics.top5')}</p>
            </div>
          </div>
          {worstTests.length === 0 ? (
            <div className="mt-empty py-10">
              <div className="w-12 h-12 rounded-xl grid place-items-center mb-3" style={{ background: 'var(--mt-surface-warm)' }}>
                <AlertTriangle size={20} className="text-[var(--mt-text-muted)]" />
              </div>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.common.no_data')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {worstTests.map((item, i) => (
                <WorstTestCard key={item.test_id} test={item} index={i} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* All tests table */}
        <div className="mt-card-flat mt-animate-in mt-stagger-4 lg:col-span-2">
          <div className="mt-section-header">
            <FileQuestion size={18} className="text-[var(--mt-accent)]" />
            <div>
              <h2 className="text-[14px] font-bold text-[var(--mt-text)]">{t('methodist.analytics.all_tests')}</h2>
              <p className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.analytics.full_table')}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b-2 border-[var(--mt-border)]">
                  <th className="font-bold text-[10px] uppercase tracking-[0.08em] text-[var(--mt-text-muted)] bg-[var(--mt-surface)]">{t('methodist.analytics.col_title')}</th>
                  <th className="font-bold text-[10px] uppercase tracking-[0.08em] text-[var(--mt-text-muted)] bg-[var(--mt-surface)]">{t('methodist.analytics.col_group')}</th>
                  <th className="font-bold text-[10px] uppercase tracking-[0.08em] text-[var(--mt-text-muted)] bg-[var(--mt-surface)]">{t('methodist.analytics.col_branch')}</th>
                  <th className="font-bold text-[10px] uppercase tracking-[0.08em] text-[var(--mt-text-muted)] text-right bg-[var(--mt-surface)]">{t('methodist.analytics.col_attempts')}</th>
                  <th className="font-bold text-[10px] uppercase tracking-[0.08em] text-[var(--mt-text-muted)] text-right bg-[var(--mt-surface)]">{t('methodist.analytics.col_avg')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <div className="mt-empty">
                        <div className="w-12 h-12 rounded-xl grid place-items-center mb-3" style={{ background: 'var(--mt-surface-warm)' }}>
                          <FileQuestion size={20} className="text-[var(--mt-text-muted)]" />
                        </div>
                        <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.common.no_data')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedTests.map((item) => (
                    <tr key={item.test_id} className="border-b border-[var(--mt-border)] hover:bg-[var(--mt-surface)] transition-colors">
                      <td className="text-[13px] font-semibold text-[var(--mt-text)]">{item.title}</td>
                      <td className="text-[12px] text-[var(--mt-text-muted)]">{item.group_name || '—'}</td>
                      <td className="text-[12px] text-[var(--mt-text-muted)]">{item.branch_name}</td>
                      <td className="text-right tabular-nums text-[12px] text-[var(--mt-text-muted)]">{item.attempts}</td>
                      <td className="text-right">
                        <ScoreBadge score={item.avg_score} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MethodistAnalytics() {
  return (
    <AnalyticsView />
  );
}
