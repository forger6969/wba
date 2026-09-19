import { BookOpen, Layers, FileQuestion, TrendingUp, ArrowRight, Sparkles, PenTool, BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrainingTypes, useMethodistAnalytics } from '../../queries.js';
import { SkeletonKpis } from '../../components/Skeleton.jsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

const KPIS = [
  { key: 'types', Icon: BookOpen, labelKey: 'kpi.types', color: '#dc2626' },
  { key: 'topics', Icon: Layers, labelKey: 'kpi.topics', color: '#2563EB' },
  { key: 'tests', Icon: FileQuestion, labelKey: 'kpi.tests', color: '#D97706' },
  { key: 'hw', Icon: TrendingUp, labelKey: 'kpi.hw', color: '#059669' },
];

function KpiStrip({ Icon, label, value, color }) {
  return (
    <div className="mt-card-flat mt-animate-in flex items-center gap-4 p-5">
      <div
        className="w-12 h-12 rounded-2xl grid place-items-center shrink-0 transition-transform duration-300 hover:scale-110"
        style={{ background: `${color}12`, color }}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--mt-text-muted)] mb-1">
          {label}
        </div>
        <div className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--mt-text)] tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

function ContentLink({ to, icon, label, count, color, t }) {
  return (
    <Link
      to={to}
      className="mt-notebook-item group"
    >
      <span
        className="w-10 h-10 rounded-xl grid place-items-center text-lg shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}12` }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--mt-text)] group-hover:text-[var(--mt-accent)] transition-colors truncate">
          {label}
        </div>
        <div className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.dashboard.topics_count', { count })}</div>
      </div>
      <ArrowRight size={15} className="text-[var(--mt-text-muted)] group-hover:text-[var(--mt-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

function DashboardView() {
  const { t } = useTranslation();
  const { data: types, isLoading: typesLoading, error: typesError } = useTrainingTypes();
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useMethodistAnalytics();

  const ttList = types?.data || [];
  const tests = analytics?.data?.tests || [];
  const hw = analytics?.data?.homework || [];

  const totalTests = tests.length;
  const totalHw = hw.length;
  const totalTopics = ttList.reduce((s, t) => s + (t.topics_count || 0), 0);
  const avgScore = tests.length > 0
    ? Math.round(tests.reduce((s, t) => s + Number(t.avg_score || 0), 0) / tests.length)
    : 0;

  const kpis = KPIS.map((k) => ({ ...k, label: t(k.labelKey) }));

  const header = (
    <div className="mt-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--mt-accent-light)] grid place-items-center">
            <PenTool size={20} className="text-[var(--mt-accent)]" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.app.name')}</h1>
            <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.dashboard.subtitle')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );

  const loadingHeader = (
    <div className="mt-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PenTool size={24} className="text-[var(--mt-accent)]" />
          <h1 className="text-[22px] font-extrabold text-[var(--mt-text)]">{t('methodist.app.name')}</h1>
        </div>
        <LanguageSwitcher />
      </div>
      <p className="text-[13px] text-[var(--mt-text-muted)] ml-[36px]">{t('methodist.dashboard.subtitle')}</p>
    </div>
  );

  if (typesLoading || analyticsLoading) {
    return (
      <div className="mt-page-bg space-y-6 p-6">
        {loadingHeader}
        <SkeletonKpis count={4} />
      </div>
    );
  }

  if (typesError || analyticsError) {
    return (
      <div className="mt-page-bg space-y-6 p-6">
        {loadingHeader}
        <div className="mt-card-flat p-6 mt-animate-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'rgba(220,38,38,0.08)' }}>
              <AlertTriangle size={22} className="text-[var(--mt-danger)]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-[var(--mt-text)] mb-0.5">{t('methodist.common.loading_error')}</p>
              <p className="text-[12px] text-[var(--mt-text-muted)]">{(typesError || analyticsError)?.message || t('methodist.common.loading_failed')}</p>
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
  }

  const values = { types: ttList.length, topics: totalTopics, tests: totalTests, hw: totalHw };

  return (
    <div className="mt-page-bg space-y-6 p-6">
      {header}

      {/* KPI Horizontal strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ key, ...kpi }) => (
          <KpiStrip key={key} {...kpi} value={values[key]} />
        ))}
      </div>

      {/* Average Score — lime gradient banner */}
      {tests.length > 0 && (
        <div
          className="mt-animate-in mt-stagger-5 rounded-[16px] p-5 border border-[var(--mt-border)]"
          style={{ background: 'linear-gradient(135deg, #F6FBEA 0%, #EFF8DD 40%, #F6FBEA 100%)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--mt-accent-light)] grid place-items-center shrink-0">
              <Sparkles size={24} className="text-[var(--mt-accent)]" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--mt-text-muted)] mb-1">
                {t('methodist.dashboard.avg_score')}
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[32px] font-extrabold leading-none tracking-tight text-[var(--mt-text)] tabular-nums">
                  {avgScore}%
                </span>
                <span className={`text-[12px] font-semibold mb-1 ${avgScore >= 70 ? 'text-[var(--mt-success)]' : avgScore >= 50 ? 'text-[var(--mt-warning)]' : 'text-[var(--mt-danger)]'}`}>
                  {avgScore >= 70 ? t('methodist.dashboard.great') : avgScore >= 50 ? t('methodist.dashboard.good') : t('methodist.dashboard.need_work')}
                </span>
              </div>
              <div className="mt-2.5 mt-progress">
                <div
                  className="mt-progress-fill"
                  style={{ width: `${Math.max(4, avgScore)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training Types Quick Access — notebook list */}
      <div className="mt-card-flat mt-animate-in mt-stagger-6">
        <div className="mt-section-header">
          <BarChart3 size={18} className="text-[var(--mt-accent)]" />
          <h2 className="text-[15px] font-bold text-[var(--mt-text)] flex-1">{t('methodist.dashboard.types_section')}</h2>
          <Link
            to="/methodist/types"
            className="text-[12px] font-semibold text-[var(--mt-accent)] hover:text-[#2f6129] transition-colors flex items-center gap-1"
          >
            {t('methodist.dashboard.all_types')} <ArrowRight size={14} />
          </Link>
        </div>
        {ttList.length === 0 ? (
          <div className="mt-empty">
            <div className="w-16 h-16 rounded-2xl bg-[var(--mt-accent-light)] grid place-items-center mb-4">
              <BookOpen size={28} className="text-[var(--mt-accent)]" />
            </div>
            <p className="text-[15px] font-bold text-[var(--mt-text)] mb-1">{t('methodist.dashboard.no_types')}</p>
            <p className="text-[13px] text-[var(--mt-text-muted)] mb-5">{t('methodist.dashboard.no_types_hint')}</p>
            <Link
              to="/methodist/types"
              className="mt-btn-primary"
            >
              <BookOpen size={16} /> {t('methodist.dashboard.create_type')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {ttList.slice(0, 5).map((tt, i) => (
              <ContentLink
                key={tt.id}
                to={`/methodist/types/${tt.id}/topics`}
                icon={tt.icon || '📚'}
                label={tt.name}
                count={tt.topics_count || 0}
                color={kpis[i % kpis.length].color}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MethodistDashboard() {
  return (
    <DashboardView />
  );
}
