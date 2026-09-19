import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarCheck, FileText, ClipboardCheck, Coins, LayoutGrid,
  Check, X, Clock, AlertTriangle, UserX,
  ArrowUpRight, ArrowDownRight, ThumbsUp, AlertCircle,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { useTranslation } from 'react-i18next';
import { useMentorStudentStats } from '../../queries.js';
import Avatar from '../../components/Avatar.jsx';
import { EmptyState } from './_ui.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/**
 * Карточка ученика: один блок статистики с четырьмя разделами.
 *
 * Разделы — кнопки, а не всё сразу на одном экране: у ментора четыре разных
 * вопроса («как в целом», «как ходит», «как пишет тесты», «как с домашкой»),
 * и каждый требует своего набора цифр. Показывать все четыре одновременно —
 * значит заставлять искать нужное среди ненужного.
 *
 * Разбор по темам строится на названиях работ: связи домашки с темами
 * методиста в схеме нет (у homework только title и group_id), поэтому «тема» —
 * это конкретное задание или тест.
 */

/* Цвета серий — из валидированной категориальной палитры, проверены скриптом
   на белой подложке: полоса светлоты, порог цветности, разделение при
   дальтонизме и контраст ≥3:1 проходят все четыре.
   Порядок не косметика: зелёный рядом с оранжевым провалил протанопию
   (ΔE 3.2), между ними обязан стоять другой тон. */
const SERIES = {
  attendance: '#008300',
  homework: '#2a78d6',
  grade: '#4a3aa7',
  tests: '#eb6834',
};

/* Статусная палитра — фиксированная, не смешивается с сериями. Жёлтый на белом
   даёт меньше 3:1, поэтому всегда идёт с числом или подписью рядом, а не несёт
   смысл в одиночку. */
const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
};

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const monthShort = (t) => t('mentor.sd.months').split(',');

const hwState = (t) => ({
  graded:    { label: t('mentor.sd.hw.graded'), cls: 'bg-success/10 text-success border-success/25', Icon: Check },
  submitted: { label: t('mentor.sd.hw.submitted'), cls: 'bg-info/10 text-info border-info/25', Icon: ClipboardCheck },
  late:      { label: t('mentor.sd.hw.late'), cls: 'bg-warning/10 text-warning border-warning/25', Icon: Clock },
  missed:    { label: t('mentor.sd.hw.missed'), cls: 'bg-error/10 text-error border-error/25', Icon: X },
  pending:   { label: t('mentor.sd.hw.pending'), cls: 'bg-base-200 text-base-content/50 border-base-300', Icon: Clock },
});

const attState = (t) => ({
  present: { label: t('mentor.sd.att.present'), cls: 'bg-success/15 text-success' },
  late:    { label: t('mentor.sd.att.late'), cls: 'bg-warning/15 text-warning' },
  absent:  { label: t('mentor.sd.att.absent'), cls: 'bg-error/15 text-error' },
  excused: { label: t('mentor.sd.att.excused'), cls: 'bg-info/15 text-info' },
});

const fmtDate = (iso, lang) =>
  iso ? new Date(iso).toLocaleDateString(LOCALE_OF[lang] || 'ru-RU', { day: '2-digit', month: 'short' }) : '—';

/** Порог, по которому процент превращается в оценку состояния. */
const bandOf = (v) => (v === null ? 'none' : v >= 80 ? 'good' : v >= 60 ? 'warning' : 'critical');
const bandColor = (v) => (v === null || v === undefined ? '#c3c2b7' : STATUS[bandOf(v)]);

/* ── Кольцевой индикатор ──────────────────────────────────────────────────
   Это метр (доля от предела), а не круговая диаграмма из двух долек.
   Незаполненная дуга — прозрачный шаг того же цвета, а не серый: состояние
   тогда читается по всему кольцу, а не только по закрашенной части. */
function Ring({ value, label, sub, size = 108 }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const shown = value ?? 0;
  const color = bandColor(value);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeOpacity="0.15" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
            style={{ transition: 'stroke-dashoffset .6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          {/* Пропорциональные цифры: tabular-nums на таком кегле делает число рыхлым */}
          <span className="text-[22px] font-extrabold leading-none">
            {value ?? '—'}
            {value !== null && value !== undefined && (
              <span className="text-xs font-bold text-base-content/40">%</span>
            )}
          </span>
        </div>
      </div>
      <div className="text-sm font-semibold mt-2.5">{label}</div>
      <div className="text-[11px] text-base-content/45">{sub}</div>
    </div>
  );
}

/* ── График динамики ──────────────────────────────────────────────────────
   Заливка только когда серия одна. Три полупрозрачные заливки на общем полотне
   накладываются друг на друга и дают мутное серое пятно, в котором не разобрать
   ни одной из них, — проверено на живой странице. Для нескольких серий остаются
   чистые линии. */
function TrendArea({ points, series, height = 240, noDataLabel }) {
  const single = series.length === 1;

  const data = {
    labels: points.map((p) => p.label),
    datasets: series.map((s) => ({
      label: s.label,
      data: points.map((p) => p[s.key] ?? null),
      borderColor: s.color,
      borderWidth: 2,
      tension: 0.4,
      spanGaps: false,      // месяц без данных рвёт линию, а не роняет её в ноль
      fill: single,
      backgroundColor: (ctx) => {
        if (!single) return 'transparent';
        const { chart } = ctx;
        if (!chart.chartArea) return 'transparent';
        const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
        g.addColorStop(0, `${s.color}38`);
        g.addColorStop(1, `${s.color}00`);
        return g;
      },
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: s.color,
      pointBorderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      // Одна ось: все серии в процентах. Вторая шкала была бы подлогом.
      y: {
        min: 0, max: 100,
        ticks: { stepSize: 25, color: '#7d8c73', font: { size: 11 }, callback: (v) => `${v}%` },
        grid: { color: 'rgba(29,36,23,0.06)' },
        border: { display: false },
      },
      x: {
        offset: true,   // поля по краям: иначе крайняя точка садится на рамку
        ticks: { color: '#7d8c73', font: { size: 11 } },
        grid: { display: false },
        border: { color: '#dce5d4' },
      },
    },
    plugins: {
      legend: series.length > 1 ? {
        position: 'top', align: 'end',
        labels: {
          usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16,
          color: '#5c6b53', font: { size: 12 },   // подписи текстовым цветом, не цветом серии
        },
      } : { display: false },     // одна серия — её называет заголовок раздела
      tooltip: {
        backgroundColor: '#ffffff', padding: 10, cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y === null ? noDataLabel : `${ctx.parsed.y}%`}`,
        },
      },
    },
  };

  return <div style={{ height }}><Line data={data} options={options} /></div>;
}

/** Строка «работа — результат» с полосой: длину сравнивать легче, чем числа. */
function TopicRow({ title, meta, percent }) {
  const color = bandColor(percent);
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{title}</div>
        {meta && <div className="text-[11px] text-base-content/45 truncate">{meta}</div>}
      </div>
      <div className="w-20 h-1.5 rounded-full bg-base-200 overflow-hidden shrink-0 hidden sm:block">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-11 text-right shrink-0" style={{ color }}>
        {percent}%
      </span>
    </li>
  );
}

/** Изменение к прошлому месяцу с данными. Направление важнее величины. */
function Delta({ points, field }) {
  const { t } = useTranslation();
  const known = points.map((p) => p[field]).filter((v) => v !== null && v !== undefined);
  if (known.length < 2) return null;
  const diff = known[known.length - 1] - known[known.length - 2];
  if (diff === 0) return <span className="text-[11px] text-base-content/40">{t('mentor.sd.noChange')}</span>;
  const up = diff > 0;
  return (
    <span className={`text-[11px] font-bold flex items-center gap-0.5 ${up ? 'text-success' : 'text-error'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? '+' : ''}{diff}%
      <span className="font-medium text-base-content/40 ml-0.5">{t('mentor.sd.vsPrevMonth')}</span>
    </span>
  );
}

export default function MentorStudentDetail() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const HW_STATE = hwState(t);
  const ATT_STATE = attState(t);
  const MONTH_SHORT = monthShort(t);
  const { id } = useParams();
  const { data, isLoading, error } = useMentorStudentStats(id);
  const stats = data?.data ?? null;

  const [tab, setTab] = useState('umumiy');
  const [hwFilter, setHwFilter] = useState('missed');

  /* Разбор по работам: всё оценённое — домашки и тесты — приводим к процентам
     и сортируем. Сильные и слабые стороны — один список с двух концов,
     поэтому считаем его один раз. */
  const topics = useMemo(() => {
    if (!stats) return [];
    const fromHw = stats.homework.items
      .filter((h) => h.score !== null)
      .map((h) => ({
        id: `hw-${h.id}`,
        title: h.title,
        kind: t('mentor.sd.homeworkKind'),
        percent: Math.round((h.score / (h.maxScore || 100)) * 100),
      }));
    const fromTests = stats.tests.items
      .filter((tst) => tst.percent !== null)
      .map((tst) => ({ id: `t-${tst.id}`, title: tst.title, kind: t('mentor.sd.testKind'), percent: tst.percent }));
    return [...fromHw, ...fromTests].sort((a, b) => b.percent - a.percent);
  }, [stats, t]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-[520px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card bg-base-100">
        <EmptyState
          icon={UserX}
          title={t('mentor.sd.studentNotFoundTitle')}
          hint={t('mentor.sd.studentNotFoundHint')}
          action={<Link to="/students" className="btn btn-sm btn-primary">{t('mentor.sd.toStudentsList')}</Link>}
        />
      </div>
    );
  }

  const { student, groups, attendance, recentAttendance, homework, tests, coins, trend } = stats;
  const fullName = `${student.firstName} ${student.lastName}`.trim();

  const points = (trend ?? []).map((t) => {
    const [, m] = t.month.split('-');
    return {
      label: MONTH_SHORT[Number(m) - 1] ?? t.month,
      attendanceRate: t.attendanceRate,
      homeworkRate: t.homeworkRate,
      homeworkAvg: t.homeworkAvg,
      testAvg: t.testAvg,
    };
  });

  const strong = topics.slice(0, 4);
  const weak = [...topics].reverse().slice(0, 4).filter((t) => t.percent < 80);

  const hwFiltered = hwFilter === 'all'
    ? homework.items
    : homework.items.filter((h) => (hwFilter === 'missed' ? h.state === 'missed' : h.state !== 'missed'));

  const TABS = [
    { key: 'umumiy', label: t('mentor.sd.tabOverall'), Icon: LayoutGrid },
    { key: 'davomat', label: t('mentor.sd.tabAttendance'), Icon: CalendarCheck },
    { key: 'testlar', label: t('mentor.sd.tabTests'), Icon: ClipboardCheck },
    { key: 'vazifa', label: t('mentor.sd.tabHomework'), Icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <Link to="/students" className="btn btn-ghost btn-sm gap-1.5 -ml-2">
        <ArrowLeft size={15} /> {t('mentor.sd.allStudents')}
      </Link>

      {/* ═════ Шапка ученика ═════ */}
      <section className="card bg-base-100 p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar name={fullName} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold truncate">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {student.status !== 'active' && (
                <span className="badge badge-warning badge-sm">{t('mentor.sd.frozen')}</span>
              )}
              {groups.map((g) => (
                <Link
                  key={g.id}
                  to={`/groups/${g.id}`}
                  className="text-[11px] font-medium px-2 py-1 rounded-md bg-base-200 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {g.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2.5 text-xs text-base-content/50 flex-wrap">
              {student.loginCode && <span>ID: {student.loginCode}</span>}
              {student.phone && <span>{student.phone}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-base-content/45 font-semibold">
              {t('mentor.sd.coins')}
            </div>
            <div className="text-2xl font-extrabold text-warning flex items-center gap-1.5 justify-end">
              <Coins size={18} /> {coins.balance}
            </div>
          </div>
        </div>
      </section>

      {/* ═════ Единый блок статистики ═════ */}
      <section className="card bg-base-100 overflow-hidden">
        <header className="px-4 sm:px-5 pt-4 border-b border-base-200">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h2 className="font-bold">{t('mentor.sd.stats')}</h2>
            {homework.missed > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-error">
                <AlertTriangle size={14} /> {t('mentor.sd.missedTasks', { count: homework.missed })}
              </span>
            )}
          </div>

          {/* Разделы. Подчёркивание активного, а не заливка: вкладки живут в
              шапке белой карточки, и заливка спорила бы с её фоном. */}
          <nav role="tablist" className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-base-content/50 hover:text-base-content'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ─────────── Umumiy ─────────── */}
        {tab === 'umumiy' && (
          <div className="p-4 sm:p-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Ring
                value={attendance.rate}
                label={t('mentor.sd.attendanceRing')}
                sub={t('mentor.sd.lessonsCount', { n: attendance.present + attendance.late, total: attendance.total })}
              />
              <Ring
                value={homework.completionRate}
                label={t('mentor.sd.homeworkRing')}
                sub={t('mentor.sd.submittedCount', { n: homework.done, total: homework.total })}
              />
              <Ring
                value={tests.avgPercent}
                label={t('mentor.sd.testsRing')}
                sub={t('mentor.sd.takenCount', { n: tests.taken, total: tests.total })}
              />
            </div>

            <div>
              <h3 className="text-sm font-bold mb-1">{t('mentor.sd.last6Months')}</h3>
              <TrendArea
                points={points}
                noDataLabel={t('mentor.sd.noDataTooltip')}
                series={[
                  { key: 'attendanceRate', label: t('mentor.sd.attendanceRing'), color: SERIES.attendance },
                  { key: 'homeworkAvg', label: t('mentor.sd.avgGrade'), color: SERIES.grade },
                  { key: 'testAvg', label: t('mentor.sd.testsRing'), color: SERIES.tests },
                ]}
              />
              <p className="text-[11px] text-base-content/40 mt-2">
                {t('mentor.sd.gapNote')}
              </p>
            </div>

            {/* Сильные и слабые работы — ради этого карточку и открывают */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-base-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-success/5 border-b border-base-200">
                  <ThumbsUp size={14} className="text-success" />
                  <span className="text-sm font-bold">{t('mentor.sd.wellLearned')}</span>
                </div>
                {strong.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-base-content/45 text-center">
                    {t('mentor.sd.noGradedWorks')}
                  </p>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {strong.map((tp) => (
                      <TopicRow key={tp.id} title={tp.title} meta={tp.kind} percent={tp.percent} />
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-base-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-error/5 border-b border-base-200">
                  <AlertCircle size={14} className="text-error" />
                  <span className="text-sm font-bold">{t('mentor.sd.hasDifficulties')}</span>
                </div>
                {weak.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-base-content/45 text-center">
                    {t('mentor.sd.noWeakTopics')}
                  </p>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {weak.map((tp) => (
                      <TopicRow key={tp.id} title={tp.title} meta={tp.kind} percent={tp.percent} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────── Davomat ─────────── */}
        {tab === 'davomat' && (
          <div className="p-4 sm:p-5 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center">
              <Ring
                value={attendance.rate}
                label={t('mentor.sd.attendanceRing')}
                sub={t('mentor.sd.totalLessons', { n: attendance.total })}
                size={124}
              />
              <div>
                <div className="flex h-3 rounded-full overflow-hidden bg-base-200">
                  {[
                    { v: attendance.present, c: STATUS.good },
                    { v: attendance.late, c: STATUS.warning },
                    { v: attendance.absent, c: STATUS.critical },
                    { v: attendance.excused, c: SERIES.homework },
                  ].filter((s) => s.v > 0).map((s, i) => (
                    <div key={i} style={{ width: `${(s.v / attendance.total) * 100}%`, background: s.c }} />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: t('mentor.sd.att.present'), value: attendance.present, c: STATUS.good },
                    { label: t('mentor.sd.att.late'), value: attendance.late, c: STATUS.warning },
                    { label: t('mentor.sd.att.absent'), value: attendance.absent, c: STATUS.critical },
                    { label: t('mentor.sd.att.excused'), value: attendance.excused, c: SERIES.homework },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.c }} />
                      <div>
                        <div className="text-lg font-extrabold leading-none">{s.value}</div>
                        <div className="text-[11px] text-base-content/45">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold">{t('mentor.sd.byMonth')}</h3>
                <Delta points={points} field="attendanceRate" />
              </div>
              <TrendArea
                points={points}
                noDataLabel={t('mentor.sd.noDataTooltip')}
                series={[{ key: 'attendanceRate', label: t('mentor.sd.attendanceRing'), color: SERIES.attendance }]}
                height={200}
              />
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2">{t('mentor.sd.recentLessons')}</h3>
              {recentAttendance.length === 0 ? (
                <EmptyState icon={CalendarCheck} title={t('mentor.sd.attendanceNotMarked')} />
              ) : (
                <ul className="divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                  {recentAttendance.slice(0, 8).map((a, i) => {
                    const st = ATT_STATE[a.status] ?? ATT_STATE.present;
                    return (
                      <li key={`${a.date}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-sm">{fmtDate(a.date, lang)}</span>
                        <span className="text-[11px] text-base-content/45 truncate flex-1">{a.groupName}</span>
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${st.cls}`}>
                          {st.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ─────────── Testlar ─────────── */}
        {tab === 'testlar' && (
          <div className="p-4 sm:p-5 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center">
              <Ring
                value={tests.avgPercent}
                label={t('mentor.sd.avgScore')}
                sub={t('mentor.sd.takenCount', { n: tests.taken, total: tests.total })}
                size={124}
              />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold">{t('mentor.sd.byMonth')}</h3>
                  <Delta points={points} field="testAvg" />
                </div>
                <TrendArea
                  points={points}
                  noDataLabel={t('mentor.sd.noDataTooltip')}
                  series={[{ key: 'testAvg', label: t('mentor.sd.testsRing'), color: SERIES.tests }]}
                  height={180}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2">{t('mentor.sd.allTests')}</h3>
              {tests.items.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title={t('mentor.sd.noTests')} />
              ) : (
                <ul className="divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                  {tests.items.map((tst) => (
                    <li key={tst.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{tst.title}</div>
                        <div className="text-[11px] text-base-content/45">
                          {tst.groupName}{tst.finishedAt ? ` · ${fmtDate(tst.finishedAt, lang)}` : ''}
                        </div>
                      </div>
                      {tst.finishedAt ? (
                        <>
                          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-base-200 overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${tst.percent}%`, background: bandColor(tst.percent) }}
                            />
                          </div>
                          <span className="text-sm font-bold w-20 text-right shrink-0">
                            {tst.score}/{tst.maxScore}
                            <span className="ml-1.5 text-[11px]" style={{ color: bandColor(tst.percent) }}>
                              {tst.percent}%
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-md border border-base-300 text-base-content/45 shrink-0">
                          {t('mentor.sd.notTaken')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ─────────── Uyga vazifa ─────────── */}
        {tab === 'vazifa' && (
          <div className="p-4 sm:p-5 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center">
              <Ring
                value={homework.completionRate}
                label={t('mentor.sd.hw.submitted')}
                sub={`${homework.done} / ${homework.total}`}
                size={124}
              />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold">{t('mentor.sd.avgGradeByMonth')}</h3>
                  <Delta points={points} field="homeworkAvg" />
                </div>
                <TrendArea
                  points={points}
                  noDataLabel={t('mentor.sd.noDataTooltip')}
                  series={[{ key: 'homeworkAvg', label: t('mentor.sd.avgGrade'), color: SERIES.grade }]}
                  height={180}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <h3 className="text-sm font-bold">{t('mentor.sd.tasks')}</h3>
                <div role="tablist" className="flex gap-1 bg-base-200/70 p-0.5 rounded-lg">
                  {[
                    { key: 'missed', label: t('mentor.sd.notSubmittedCount', { count: homework.missed }) },
                    { key: 'done', label: t('mentor.sd.submittedCountFilter', { count: homework.done }) },
                    { key: 'all', label: t('mentor.sd.all') },
                  ].map((tabDef) => (
                    <button
                      key={tabDef.key}
                      role="tab"
                      aria-selected={hwFilter === tabDef.key}
                      onClick={() => setHwFilter(tabDef.key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        hwFilter === tabDef.key
                          ? 'bg-base-100 text-base-content shadow-sm'
                          : 'text-base-content/50 hover:text-base-content'
                      }`}
                    >
                      {tabDef.label}
                    </button>
                  ))}
                </div>
              </div>

              {hwFiltered.length === 0 ? (
                <EmptyState
                  icon={hwFilter === 'missed' ? Check : FileText}
                  title={hwFilter === 'missed' ? t('mentor.sd.allTasksDone') : t('mentor.sd.noTasks')}
                />
              ) : (
                <ul className="divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                  {hwFiltered.map((h) => {
                    const st = HW_STATE[h.state] ?? HW_STATE.pending;
                    const percent = h.score !== null ? Math.round((h.score / (h.maxScore || 100)) * 100) : null;
                    return (
                      <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 border ${st.cls}`}>
                          <st.Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{h.title}</div>
                          <div className="text-[11px] text-base-content/45 truncate">
                            {h.groupName} · {t('mentor.sd.until')} {fmtDate(h.deadline, lang)}
                          </div>
                        </div>
                        {percent !== null ? (
                          <span className="text-sm font-bold text-right shrink-0">
                            {h.score}<span className="text-base-content/40">/{h.maxScore}</span>
                            <span className="ml-1.5 text-[11px]" style={{ color: bandColor(percent) }}>
                              {percent}%
                            </span>
                          </span>
                        ) : (
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-md border shrink-0 ${st.cls}`}>
                            {st.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
