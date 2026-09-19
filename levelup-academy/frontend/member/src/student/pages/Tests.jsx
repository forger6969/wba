import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Coins, ChevronRight } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { PageHeader, Skeleton, EmptyState, ErrorState, Pill, IconTile, C } from '../components/ui.jsx';
import { fmtDateTime } from '../format.js';
import { fmt, useI18n } from '../../i18n/index.jsx';

/** Статус теста для студента по данным списка. Подписи — из словаря. */
export function testStatus(test, t, lang = 'ru') {
  const now = Date.now();
  if (test.finished_at) return { key: 'done', label: fmt(t.tests.done, { score: test.score }), hue: test.score >= 50 ? 'teal' : 'coral' };
  if (test.started_at) return { key: 'inProgress', label: t.tests.inProgress, hue: 'lime' };
  if (test.starts_at && now < new Date(test.starts_at).getTime())
    return { key: 'scheduled', label: fmt(t.tests.opensAt, { date: fmtDateTime(test.starts_at, lang) }), hue: 'muted' };
  if (test.ends_at && now > new Date(test.ends_at).getTime())
    return { key: 'closed', label: t.tests.closed, hue: 'muted' };
  return { key: 'open', label: t.tests.available, hue: 'lime' };
}

export default function Tests() {
  const navigate = useNavigate();
  const toast = useToast();
  const { lang, t } = useI18n();
  const [tests, setTests] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api
      .tests()
      .then((d) => setTests(d.data))
      .catch((err) => { setError(err); toast(err.message, 'error'); });
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader title={t.tests.title} subtitle={t.tests.subtitle} icon={ClipboardCheck} hue="violet" />

      {error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !tests ? (
        <Skeleton h={72} count={4} />
      ) : tests.length === 0 ? (
        <div className="k-card">
          <EmptyState icon={ClipboardCheck} title={t.tests.empty} text={t.tests.emptyText} />
        </div>
      ) : (
        <div className="k-card divide-y" style={{ borderColor: C.limeLine }}>
          {tests.map((test, i) => {
            const st = testStatus(test, t, lang);
            const clickable = st.key === 'open' || st.key === 'inProgress' || st.key === 'done';
            return (
              <div
                key={test.id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => navigate(`/tests/${test.id}`) : undefined}
                onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/tests/${test.id}`) : undefined}
                className={`k-pop-in flex items-center gap-3 px-4 py-3.5 flex-wrap sm:flex-nowrap transition-colors ${clickable ? 'k-press k-row-hover cursor-pointer' : ''}`}
                style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}
              >
                <IconTile icon={ClipboardCheck} hue="blue" size={42} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-extrabold truncate" style={{ color: C.text }}>{test.title}</div>
                  <div className="text-[13px] font-bold mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: C.muted }}>
                    <span>{fmt(t.tests.meta, { questions: test.questions.length, minutes: test.duration_min })}</span>
                    {test.coin_reward > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: C.limeDk }}>
                        · <Coins size={12} /> {fmt(t.tests.reward, { n: test.coin_reward })}
                      </span>
                    )}
                  </div>
                </div>
                <Pill hue={st.hue}>{st.label}</Pill>
                {clickable && <ChevronRight size={16} className="shrink-0" style={{ color: C.muted }} />}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
