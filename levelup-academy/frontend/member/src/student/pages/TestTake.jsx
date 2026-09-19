import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Timer, ArrowLeft, ArrowRight, Maximize, ShieldAlert, Check, ListChecks, AlertTriangle,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { Skeleton, Button, CountUp, Ring, C, alpha } from '../components/ui.jsx';
import { fmtDuration } from '../format.js';
import { fmt, useI18n } from '../../i18n/index.jsx';
import { useProctor } from '../proctor.js';

/**
 * Прохождение теста (2026-08-30, Abduloh — переработка):
 *   intro → taking (по одному вопросу) → done.
 *
 * · Вопросы показываются по одному, со слайд-переходом; полоса прогресса и
 *   лента-точки дают увидеть, что осталось.
 * · Прокторинг (useProctor): fullscreen, слежение за фокусом, 3 предупреждения →
 *   авто-сдача. Журнал нарушений уходит с ответом.
 * · Таймер — от сервера (endsAt), восстанавливается из started_at при F5.
 */
/* За сколько секунд до серверного дедлайна отправлять ответы сами —
   запас на сеть, иначе submit прилетает уже после времени и получает 409. */
const SUBMIT_LEAD = 2;

export default function TestTake() {
  const { testId } = useParams();
  const toast = useToast();
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const tt = t.testTake;

  const [test, setTest] = useState(null);
  const [row, setRow] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | intro | taking | done
  const [endsAt, setEndsAt] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [dir, setDir] = useState(1);
  const [score, setScore] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [warn, setWarn] = useState(null); // { title, body } | null
  const [autoStopped, setAutoStopped] = useState(false);
  const submittedRef = useRef(false);

  const total = test?.questions?.length ?? 0;
  const answered = answers.filter((a) => a >= 0).length;
  const taking = phase === 'taking';

  useEffect(() => {
    Promise.all([api.tests(), api.test(testId).catch((err) => ({ error: err }))])
      .then(([list, one]) => {
        const listRow = list.data.find((x) => x.id === testId) ?? null;
        setRow(listRow);

        if (listRow?.finished_at) {
          setScore(listRow.score);
          setPhase('done');
          return;
        }
        if (one.error) {
          setError(one.error.message);
          setPhase('intro');
          return;
        }
        setTest(one.data);
        setAnswers(new Array(one.data.questions.length).fill(-1));

        if (listRow?.started_at) {
          const deadline = new Date(listRow.started_at).getTime() + one.data.duration_min * 60_000;
          const capped = one.data.ends_at
            ? Math.min(deadline, new Date(one.data.ends_at).getTime())
            : deadline;
          setEndsAt(capped);
          setPhase('taking');
        } else {
          setPhase('intro');
        }
      })
      .catch((err) => {
        setError(err.message);
        setPhase('intro');
      });
  }, [testId]);

  const proctor = useProctor({
    active: taking,
    maxViolations: 3,
    onWarn: (n, left) => {
      setWarn(
        left === 0
          ? { title: tt.proctorLastTitle, body: tt.proctorLastBody }
          : { title: tt.proctorWarnTitle, body: fmt(tt.proctorWarnBody, { n: left }) },
      );
    },
    onLimit: () => {
      setAutoStopped(true);
      submit(true);
    },
  });

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setBusy(true);
      try {
        const d = await api.submitTest(testId, answers, proctor.violationsRef.current);
        setScore(d.data.score);
        setPhase('done');
        if (!auto) {
          toast(
            d.data.score >= 50 ? tt.testPassed : tt.testFailed,
            d.data.score >= 50 ? 'success' : 'error',
          );
        }
      } catch (err) {
        if (err.status === 409) {
          setError(err.message === 'Time is up' ? tt.timeUp : err.message);
          setPhase('done');
          setScore(null);
        } else {
          submittedRef.current = false;
          setAutoStopped(false);
          toast(err.message, 'error');
        }
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testId, answers, toast],
  );

  // тик таймера + автосабмит ДО серверного дедлайна
  useEffect(() => {
    if (phase !== 'taking' || !endsAt) return undefined;
    const tick = () => {
      const left = Math.floor((endsAt - Date.now()) / 1000);
      setRemaining(Math.max(0, left));
      // Сдаём за SUBMIT_LEAD секунд до конца, а не ровно в 0: сервер
      // (tests.service.js submitAttempt) отвечает 409 'Time is up', если запрос
      // пришёл ПОЗЖЕ started_at + duration_min. Отправка ровно в 0 доходила уже
      // после дедлайна — попытка так и оставалась незавершённой, а ответы ученика
      // терялись вместе с баллом.
      if (left <= SUBMIT_LEAD) submit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, submit]);

  const start = async () => {
    setBusy(true);
    try {
      const d = await api.startTest(testId);
      setEndsAt(new Date(d.data.endsAt).getTime());
      setCursor(0);
      setPhase('taking');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const pick = (qi, oi) =>
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  const go = (next) => {
    setDir(next > cursor ? 1 : -1);
    setCursor(Math.max(0, Math.min(total - 1, next)));
  };

  if (phase === 'loading') return <Skeleton h={90} count={3} />;

  /* ── Результат ── */
  if (phase === 'done') {
    const passed = score !== null && score >= 50;
    return (
      <div className="k-card k-pop-in max-w-md mx-auto mt-8 sm:mt-12 p-8 text-center">
        {score !== null ? (
          <>
            <div className="flex justify-center mb-[18px]">
              <ResultRing score={score} passed={passed} reduce={reduce} />
            </div>
            <h2 className="k-display text-[22px] mb-2" style={{ color: C.text }}>
              {passed ? tt.testPassed : tt.testFailed}
            </h2>
            <p className="text-sm font-semibold mb-6" style={{ color: C.muted }}>
              {autoStopped
                ? tt.autoSubmittedBody
                : passed
                  ? row?.coin_reward > 0
                    ? fmt(tt.coinsEarned, { n: row.coin_reward })
                    : tt.greatJob
                  : tt.retakeClosed}
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <span
                className="w-16 h-16 rounded-2xl grid place-items-center"
                style={{ background: C.dangerSoft, color: C.danger }}
              >
                <AlertTriangle size={28} strokeWidth={2.4} />
              </span>
            </div>
            <h2 className="k-display text-[21px] mb-2" style={{ color: C.text }}>{tt.attemptDone}</h2>
            <p className="text-sm font-semibold mb-6" style={{ color: C.muted }}>{error}</p>
          </>
        )}
        <Link
          to="/tests"
          className="k-press inline-flex w-full items-center justify-center gap-2 font-bold px-7 py-3.5 text-[15.5px] rounded-xl"
          style={{ background: C.violet, color: '#fff', boxShadow: `0 6px 16px ${alpha(C.violet, 22)}` }}
        >
          <ArrowLeft size={16} /> {tt.toList}
        </Link>
      </div>
    );
  }

  /* ── Интро (правила + старт) ── */
  if (phase === 'intro') {
    return (
      <div className="k-card k-pop-in max-w-lg mx-auto mt-8 sm:mt-12 p-6 sm:p-7">
        <div className="k-eyebrow" style={{ color: C.violet }}>{tt.eyebrow}</div>
        <h2 className="k-display text-[23px] mt-1.5 mb-1" style={{ color: C.text }}>
          {test?.title ?? tt.title}
        </h2>

        {error ? (
          <div
            className="rounded-2xl text-sm font-semibold px-4 py-3 mt-4 mb-5"
            style={{ background: C.dangerSoft, color: C.danger }}
          >
            {error}
          </div>
        ) : (
          <>
            <p className="text-[13.5px] font-semibold mt-1 mb-5" style={{ color: C.muted }}>
              {fmt(tt.questions, { n: test.questions.length, minutes: test.duration_min })}
              {test.coin_reward > 0 && ` · ${fmt(tt.reward, { n: test.coin_reward })}`}
            </p>

            <div
              className="rounded-2xl p-4 mb-5"
              style={{ background: alpha(C.violet, 8), border: `1px solid ${alpha(C.violet, 20)}` }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldAlert size={16} strokeWidth={2.6} color={C.violet} />
                <span className="text-[12px] font-extrabold uppercase tracking-[0.06em]" style={{ color: C.violet }}>
                  {tt.rulesTitle}
                </span>
              </div>
              <ul className="space-y-2">
                {[tt.rule1, tt.rule2, fmt(tt.rule3, { n: 3 })].map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] font-semibold" style={{ color: C.text }}>
                    <span
                      className="mt-[3px] shrink-0 w-4 h-4 rounded-full grid place-items-center"
                      style={{ background: alpha(C.violet, 16) }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.violet }} />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="flex gap-2.5">
          <Link
            to="/tests"
            className="k-press-sm inline-flex items-center px-5 py-2.5 rounded-xl text-[14.5px] font-extrabold"
            style={{ color: C.muted }}
          >
            {tt.back}
          </Link>
          {!error && (
            <Button className="flex-1" size="lg" onClick={start} disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-sm" /> : <>{tt.start} <ArrowRight size={16} strokeWidth={2.6} /></>}
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ── Прохождение: один вопрос за раз ── */
  const low = remaining !== null && remaining < 60;
  const q = test.questions[cursor];
  const isLast = cursor === total - 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* HUD: таймер + счётчик вопроса + прогресс */}
      <div
        className="sticky top-3 z-20 mb-4 rounded-2xl px-4 sm:px-5 py-3"
        style={{ background: C.ink, color: '#fff', boxShadow: 'var(--k-e2)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Timer size={17} className="shrink-0" style={{ color: low ? C.coral : 'rgba(255,255,255,0.7)' }} />
            <span
              className={`k-num text-[19px] ${low && !reduce ? 'k-pulse' : ''}`}
              style={{ color: low ? C.coral : '#fff' }}
            >
              {remaining !== null ? fmtDuration(remaining) : '—'}
            </span>
          </div>
          <span className="text-[12.5px] font-extrabold tabular-nums" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {fmt(tt.question, { n: cursor + 1, total })}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: C.lime }}
            initial={false}
            animate={{ width: `${total ? (answered / total) * 100 : 0}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
        {/* лента-точки по вопросам */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {test.questions.map((_, i) => {
            const cur = i === cursor;
            const has = answers[i] >= 0;
            return (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={fmt(tt.question, { n: i + 1, total })}
                className="h-2 rounded-full transition-all"
                style={{
                  width: cur ? 22 : 10,
                  background: cur ? '#fff' : has ? C.lime : 'rgba(255,255,255,0.24)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Карточка вопроса */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={cursor}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="k-card p-5 sm:p-6"
          >
            <p className="font-extrabold text-[16.5px] leading-snug mb-4" style={{ color: C.text }}>
              {q.q}
            </p>
            <div className="space-y-2.5">
              {q.options.map((opt, oi) => {
                const on = answers[cursor] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => pick(cursor, oi)}
                    className="k-press w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-[14.5px] transition-colors"
                    style={
                      on
                        ? {
                            background: C.honeySoft,
                            color: C.honeyDk,
                            fontWeight: 800,
                            boxShadow: `inset 0 0 0 1.5px ${alpha(C.honey, 45)}`,
                          }
                        : { background: C.bg, color: C.text, fontWeight: 600, border: `1px solid ${C.line}` }
                    }
                  >
                    <span
                      className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-[12px] font-extrabold"
                      style={
                        on
                          ? { background: C.honey, color: '#fff' }
                          : { background: C.card, color: C.muted, border: `1px solid ${C.line}` }
                      }
                    >
                      {on ? <Check size={14} strokeWidth={3} /> : String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Навигация */}
      <div className="mt-4 flex items-center gap-2.5">
        <button
          onClick={() => go(cursor - 1)}
          disabled={cursor === 0}
          className="k-press-sm inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-extrabold disabled:opacity-35"
          style={{ background: C.card, color: C.text, border: `1px solid ${C.line}` }}
        >
          <ArrowLeft size={15} strokeWidth={2.6} /> {tt.prev}
        </button>
        <div className="flex-1" />
        {isLast ? (
          <Button hue="lime" size="lg" onClick={() => setShowReview(true)}>
            <ListChecks size={16} strokeWidth={2.6} /> {tt.review}
          </Button>
        ) : (
          <Button hue="violet" size="lg" onClick={() => go(cursor + 1)}>
            {tt.next} <ArrowRight size={16} strokeWidth={2.6} />
          </Button>
        )}
      </div>

      {/* Обзор перед сдачей */}
      {showReview && (
        <ReviewSheet
          tt={tt}
          total={total}
          answers={answers}
          onClose={() => setShowReview(false)}
          onJump={(i) => { setShowReview(false); go(i); }}
          onSubmit={() => { setShowReview(false); submit(false); }}
          busy={busy}
        />
      )}

      {/* Предупреждение о нарушении */}
      {warn && (
        <BlockNote
          icon={ShieldAlert}
          tone="warn"
          title={warn.title}
          body={warn.body}
          actionLabel={tt.understood}
          onAction={() => { setWarn(null); proctor.reenterFullscreen(); }}
        />
      )}

      {/* Требуется fullscreen */}
      {proctor.needFullscreen && !warn && (
        <BlockNote
          icon={Maximize}
          tone="info"
          title={tt.fsTitle}
          body={tt.fsBody}
          actionLabel={tt.fsButton}
          onAction={proctor.reenterFullscreen}
        />
      )}
    </div>
  );
}

/* ── Кольцо результата с докруткой ── */
function ResultRing({ score, passed, reduce }) {
  const [v, setV] = useState(reduce ? score : 0);
  useEffect(() => {
    if (reduce) return undefined;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 900);
      setV(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, reduce]);
  const color = passed ? C.lime : C.coral;
  return (
    <Ring percent={v} size={132} thickness={13} color={color}>
      <span className="k-num text-[30px]" style={{ color }}>{v}%</span>
    </Ring>
  );
}

/* ── Блокирующая заметка по центру экрана (portal, поверх fullscreen) ── */
function BlockNote({ icon: Icon, tone, title, body, actionLabel, onAction }) {
  const c = tone === 'warn' ? C.honey : tone === 'info' ? C.info : C.violet;
  const soft = tone === 'warn' ? C.honeySoft : tone === 'info' ? C.infoSoft : alpha(C.violet, 12);
  return createPortal(
    <div className="kid fixed inset-0 z-[90] grid place-items-center p-4" style={{ background: 'transparent' }}>
      <div className="absolute inset-0" style={{ background: C.scrim, backdropFilter: 'blur(4px)' }} />
      <div
        className="relative w-full max-w-sm p-6 text-center k-pop-in"
        style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 'var(--k-r-md)', boxShadow: 'var(--k-e3)' }}
      >
        <div className="flex justify-center mb-3">
          <span className="w-14 h-14 rounded-2xl grid place-items-center" style={{ background: soft, color: c }}>
            <Icon size={26} strokeWidth={2.4} />
          </span>
        </div>
        <h3 className="k-display text-[18px] mb-1.5" style={{ color: C.text }}>{title}</h3>
        <p className="text-[13.5px] font-semibold mb-5" style={{ color: C.muted }}>{body}</p>
        <Button hue={tone === 'warn' ? 'honey' : 'lime'} size="lg" className="w-full" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/* ── Обзор ответов перед финалом ── */
function ReviewSheet({ tt, total, answers, onClose, onJump, onSubmit, busy }) {
  const missing = [];
  for (let i = 0; i < total; i += 1) if (answers[i] < 0) missing.push(i);
  return createPortal(
    <div className="kid fixed inset-0 z-[85] grid place-items-center p-4" style={{ background: 'transparent' }}>
      <button className="absolute inset-0 cursor-default" style={{ background: C.scrim, backdropFilter: 'blur(3px)' }} onClick={onClose} aria-label="close" tabIndex={-1} />
      <div
        className="relative w-full max-w-md p-6 k-pop-in"
        style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 'var(--k-r-md)', boxShadow: 'var(--k-e3)' }}
      >
        <h3 className="k-display text-[19px] mb-1" style={{ color: C.text }}>{tt.reviewTitle}</h3>
        <p className="text-[13px] font-semibold mb-4" style={{ color: missing.length ? C.honeyDk : C.limeDk }}>
          {missing.length ? fmt(tt.unansweredWarn, { n: missing.length }) : tt.allAnswered}
        </p>
        <div className="grid grid-cols-6 gap-2 mb-5">
          {Array.from({ length: total }, (_, i) => {
            const has = answers[i] >= 0;
            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                className="k-press-sm h-9 rounded-lg k-num text-[13px] font-extrabold grid place-items-center"
                style={
                  has
                    ? { background: C.limeSoft, color: C.limeDk, border: `1px solid ${C.limeLine}` }
                    : { background: C.honeySoft, color: C.honeyDk, border: `1px solid ${alpha(C.honey, 35)}` }
                }
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="k-press-sm flex-1 py-3 rounded-xl text-[14px] font-extrabold"
            style={{ background: C.bg, color: C.text, border: `1px solid ${C.line}` }}
          >
            {tt.keepGoing}
          </button>
          <Button hue="lime" size="lg" className="flex-1" onClick={onSubmit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : <>{tt.submitNow} <Check size={16} strokeWidth={2.8} /></>}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
