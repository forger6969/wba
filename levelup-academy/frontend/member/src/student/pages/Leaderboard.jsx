import { useEffect, useState, useCallback } from 'react';
import {
  Trophy, Star, Target, Crown, ClipboardCheck, Clock, Zap, TrendingUp, Lightbulb, Rocket,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../../auth.jsx';
import { useToast } from '../components/toast.jsx';
import {
  PageHeader, EmptyState, ErrorState, Tabs, Avatar, CountUp, C, alpha, shade, LevelBar, levelFromCoins,
} from '../components/ui.jsx';
import { fmt, useI18n } from '../../i18n/index.jsx';

/* ── Деор-баннер с кубком. ═══ РАСИМ ЎРНИ / IMAGE SLOT ═══════════════════
   Ўз расмингни қўймоқчи бўлсанг: <TrophyArt/> ўрнига
     <img src="/rating.png" alt="" className="absolute right-0 top-0 h-full w-auto object-contain" />
   қўй. Расмни frontend/member/public/ папкасига ташла. ═══════════════════ */
function TrophyArt() {
  return (
    <svg viewBox="0 0 140 140" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="70" cy="70" r="55" fill="#B9832E" opacity="0.07" />
      <rect x="48" y="99" width="44" height="10" rx="4" fill="#D9A574" opacity="0.9" />
      <rect x="55" y="109" width="30" height="14" rx="4" fill="#C98A5B" opacity="0.85" />
      <rect x="65" y="83" width="10" height="18" rx="4" fill="#F0CE7A" />
      <path d="M50 32h40v26a20 20 0 0 1-40 0V32Z" fill="#FFD98A" stroke="#E8B84F" strokeWidth="3" />
      <path d="M50 38h-7a11 11 0 0 0 0 22h7" stroke="#F0CE7A" strokeWidth="7" strokeLinecap="round" />
      <path d="M90 38h7a11 11 0 0 1 0 22h-7" stroke="#F0CE7A" strokeWidth="7" strokeLinecap="round" />
      <path d="M70 44l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#B9832E" opacity="0.9" />
    </svg>
  );
}

/* ═══ Классический лидерборд (данные — реальный бэкенд /student/leaderboard) ═══
   Подиум топ-3 (1 — зелёный + корона, 2 — яркий жёлтый, 3 — синий) + аккуратный
   список остальных с бейджем места. «Ты» подсвечивается на любом месте, и если
   ты вне топа — отдельной строкой внизу, чтобы ребёнок всегда видел своё место. */
const PODIUM_ORDER = [2, 1, 3]; // экранный порядок: 2-е слева, 1-е по центру

function PodiumCard({ row, rank, meId }) {
  const { t } = useI18n();
  const color = rank === 1 ? C.lime : rank === 2 ? C.gold : C.blue;
  const coinColor = rank === 1 ? C.limeDk : rank === 2 ? C.goldDk : C.blue;
  const first = rank === 1;
  const isMe = row?.studentId === meId;

  if (!row) {
    /* Место пустует (мало учеников) — пунктирная заглушка, чтобы подиум
       не «схлопывался» на одной карточке. */
    return (
      <div
        className="rounded-2xl border border-dashed flex flex-col items-center justify-center gap-1"
        style={{ borderColor: C.line, height: first ? 158 : 132, opacity: 0.5 }}
      >
        <span className="k-num font-extrabold text-[15px]" style={{ color: C.muted }}>{rank}</span>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl flex flex-col items-center px-1.5"
      style={{
        paddingTop: first ? 24 : 18,
        paddingBottom: isMe ? 20 : 12,
        background: `linear-gradient(180deg, ${alpha(color, 14)} 0%, ${alpha(color, 5)} 100%)`,
        border: `1.5px solid ${alpha(color, 33)}`,
        boxShadow: first ? `0 4px 14px ${alpha(color, 20)}` : `0 1px 3px ${alpha(color, 13)}`,
      }}
    >
      {/* Бейдж места — корона у 1-го, число у остальных */}
      <span
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full grid place-items-center text-white z-10"
        style={{ width: 27, height: 27, background: color, boxShadow: `0 1px 5px ${alpha(color, 40)}` }}
      >
        {first ? <Crown size={14} strokeWidth={2.6} /> : <span className="k-num text-[13px] font-extrabold">{rank}</span>}
      </span>
      {/* Подсветка «Ты» */}
      {isMe && (
        <span
          className="absolute -bottom-2 z-10 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white"
          style={{ background: C.lime, boxShadow: `0 1px 4px ${alpha(C.lime, 33)}` }}
        >
          {t.leaderboard.you}
        </span>
      )}
      {/* Аватар с кольцом цвета места */}
      <span
        className="rounded-full grid place-items-center shrink-0"
        style={{
          width: first ? 76 : 60,
          height: first ? 76 : 60,
          padding: 3,
          background: C.card,
          border: `2.5px solid ${color}`,
          boxShadow: isMe ? `0 0 0 3px ${alpha(C.lime, 25)}` : undefined,
        }}
      >
        <Avatar name={`${row.firstName ?? ''} ${row.lastName ?? ''}`} size={first ? 64 : 48} />
      </span>
      <span
        className="mt-2 font-extrabold leading-tight text-center truncate max-w-full"
        style={{ fontSize: first ? 15.5 : 13.5, color: C.text }}
      >
        {row.firstName}
      </span>
      <span className="k-num font-extrabold flex items-center gap-1 mt-0.5" style={{ fontSize: first ? 14.5 : 12.5, color: coinColor }}>
        {Number(row.coins) || 0}
        <Star size={first ? 13 : 11} strokeWidth={2.6} fill={color} color={color} />
      </span>
    </div>
  );
}

/* Строка места 4+ — и для «остальных», и для строки «ты вне топа».
   Одна форма, подсветка «ты» внутри. Звезда монет всегда заполненная
   (монеты — суть строки), а не пустой контур. */
function RatingRow({ r, meId }) {
  const { t } = useI18n();
  const isMe = r?.studentId === meId;
  const name = `${r?.firstName ?? ''} ${r?.lastName ?? ''}`.trim();
  return (
    <div
      className="flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors"
      style={isMe
        ? { background: C.limeSoft, border: `1px solid ${C.limeLine}` }
        : { background: C.bg, border: '1px solid transparent' }}
      onMouseEnter={(e) => { if (!isMe) { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.line; } }}
      onMouseLeave={(e) => { if (!isMe) { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = 'transparent'; } }}
    >
      <span
        className="k-num shrink-0 w-9 h-9 rounded-xl grid place-items-center font-extrabold text-[13px]"
        style={
          isMe
            ? { background: C.lime, color: '#fff' }
            : { background: C.card, color: C.muted, border: `1px solid ${C.line}` }
        }
      >
        {r.rank ?? '—'}
      </span>
      <Avatar name={name} size={38} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-extrabold truncate leading-tight" style={{ color: C.text }}>
          {r.firstName} {r.lastName}
          {isMe && <span className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded align-middle" style={{ background: C.lime, color: '#fff' }}>{t.leaderboard.you}</span>}
        </div>
        <div className="text-[12px] font-semibold mt-0.5" style={{ color: C.muted }}>
          {fmt(t.leaderboard.levelTitle, { level: levelFromCoins(r.coins).level })}
        </div>
      </div>
      <span className="k-num shrink-0 font-extrabold flex items-center gap-1 text-[14px]" style={{ color: isMe ? C.limeDk : C.text }}>
        {Number(r.coins) || 0}
        <Star size={12} strokeWidth={2.6} fill={C.honey} color={C.honey} />
      </span>
    </div>
  );
}

function RatingList({ top, meId, myRow }) {
  const { t } = useI18n();
  const rest = top.filter((r) => r.rank > 3);
  const inTop = top.some((r) => r.studentId === myRow?.studentId);
  /* Строка «ты» нужна, если тебя нет в топ-20 ответа: ребёнок должен видеть
     своё место всегда. rank может быть null (ещё нет монет за период) — тогда
     показываем «—». */
  const showMe = !!myRow && !!myRow.studentId && !inTop;

  return (
    <div className="k-card p-4 sm:p-5 mb-4" style={{ borderColor: C.limeLine }}>
      {/* Заголовок секции */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: alpha(C.amber, 12), color: C.amber }}>
          <Trophy size={18} strokeWidth={2.4} />
        </span>
        <h2 className="text-[16.5px] font-extrabold" style={{ color: C.text }}>{t.leaderboard.topTitle}</h2>
      </div>

      {/* Подиум: 2-е · 1-е · 3-е */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
        {PODIUM_ORDER.map((rank) => (
          <PodiumCard key={rank} row={top.find((r) => r.rank === rank)} rank={rank} meId={meId} />
        ))}
      </div>

      {/* Остальные места — аккуратные строки с бейджем места */}
      {rest.length > 0 && (
        <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${C.line}` }}>
          {rest.map((r) => (
            <RatingRow key={r.studentId ?? r.rank} r={r} meId={meId} />
          ))}
        </div>
      )}

      {/* Ты вне топа — отдельной строкой */}
      {showMe && (
        <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px dashed ${C.limeLine}` }}>
          <RatingRow r={myRow} meId={meId} />
        </div>
      )}
    </div>
  );
}

/* ═══ Статистика «сильные / слабые стороны» — столбчатая диаграмма ═══
   4 показателя из данных, которые уже есть у ученика (без нового бэкенда):
     · Успеваемость    — средний балл за проверенные ДЗ
     · Сдача вовремя   — сколько заданий сдано не поздно
     · Активность      — монеты за период относительно самого активного
     · Скорость роста  — темп этой недели против месяца: кто растёт быстрее
                         всех (можно стоять ниже, но обогнать лидера)
   Крупные иконки, крупные цифры, высокие столбики. */
function StatsCard({ homework, myCoins, topCoins, growth, overtakeName }) {
  const { t } = useI18n();
  const graded = (homework ?? []).filter((h) => h.submission_status === 'graded' && h.score != null && h.max_score > 0);
  const hwScore = graded.length
    ? Math.round((graded.reduce((s, h) => s + (h.score / h.max_score) * 100, 0) / graded.length) * 10) / 10
    : null;

  const submitted = (homework ?? []).filter((h) => ['submitted', 'late', 'graded'].includes(h.submission_status));
  const onTimeCount = submitted.filter((h) => h.submission_status !== 'late').length;
  const onTime = submitted.length ? Math.round((onTimeCount / submitted.length) * 1000) / 10 : null;

  const maxCoins = Math.max(1, Number(topCoins) || 1);
  const activity = Math.min(100, Math.round(((Number(myCoins) || 0) / maxCoins) * 100));

  const colorFor = (v) => (v == null ? C.line : v >= 70 ? C.lime : v < 50 ? C.amber : C.blue);

  const cols = [
    { key: 'hw', icon: ClipboardCheck, hue: C.violet, label: t.leaderboard.statHw, value: hwScore },
    { key: 'ontime', icon: Clock, hue: C.teal, label: t.leaderboard.statOnTime, value: onTime },
    { key: 'activity', icon: Zap, hue: C.amber, label: t.leaderboard.statActivity, value: activity },
    { key: 'growth', icon: Rocket, hue: C.blue, label: t.leaderboard.statGrowth, value: growth },
  ];
  const withData = cols.filter((b) => b.value != null);
  const strong = withData.length ? withData.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const weak = withData.length > 1 ? withData.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  return (
    <div className="k-card p-5 sm:p-7 mt-5" style={{ borderColor: C.limeLine }}>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ background: alpha(C.violet, 12) }}>
          <TrendingUp size={24} strokeWidth={2.4} color={C.violet} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[19px] font-extrabold leading-tight" style={{ color: C.text }}>{t.leaderboard.statsTitle}</h2>
          <p className="text-[13.5px] font-semibold" style={{ color: C.muted }}>{t.leaderboard.statsSubtitle}</p>
        </div>
      </div>

      {/* Столбчатая диаграмма — во всю ширину. Все части колонки (иконка,
          цифра, зона столбика, подпись) имеют ФИКСИРОВАННУЮ высоту, поэтому
          4 колонки всегда одной высоты и стоят ровно в ряд: подписи разной
          длины (1–3 строки на телефоне) больше не сдвигают соседние колонки. */}
      <div className="flex items-end justify-around gap-3 sm:gap-6 pt-6 pb-2">
        {cols.map((b, idx) => {
          const c = colorFor(b.value);
          const h = b.value == null ? 10 : Math.max(10, Math.round((b.value / 100) * 250));
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center gap-3 min-w-0">
              {/* Иконка и цифра меньше на телефоне: в 4 колонках при 360px
                  на колонку приходится ~70px, а 74px-иконка вылезала за край. */}
              <span className="w-14 h-14 sm:w-[74px] sm:h-[74px] rounded-2xl grid place-items-center shrink-0" style={{ background: alpha(b.hue, 12) }}>
                <b.icon size={38} strokeWidth={2.2} color={b.hue} className="w-7 h-7 sm:w-[38px] sm:h-[38px]" />
              </span>
              <span className="k-num font-extrabold leading-none text-[25px] sm:text-[34px]" style={{ color: b.value == null ? C.muted : c }}>
                {b.value == null ? '—' : `${b.value}%`}
              </span>
              {/* Зона столбика: на телефоне ниже (200px), чтобы диаграмма не
                  растягивалась на весь экран; столбик ограничен max-h. */}
              <div className="w-full max-w-[110px] flex items-end justify-center h-[200px] sm:h-[280px]">
                <div
                  className="w-full rounded-t-xl rounded-b-md k-chart-grow max-h-[180px] sm:max-h-[250px]"
                  style={{
                    height: h,
                    background: b.value == null ? C.line : `linear-gradient(180deg, ${c}, ${alpha(c, 72)})`,
                    animationDelay: `${idx * 90}ms`,
                  }}
                />
              </div>
              {/* Подпись — фиксированная высота (2–3 строки на телефоне,
                  1 строка на десктопе): колонки остаются равными при любом
                  языке и ширине экрана. */}
              <span
                className="w-full h-12 sm:h-10 flex items-center justify-center text-[12.5px] sm:text-[15px] font-bold text-center leading-tight"
                style={{ color: C.text }}
              >
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {withData.length >= 2 && strong && weak && strong.key !== weak.key ? (
        <div className="flex flex-col gap-2 mt-5 pt-3.5" style={{ borderTop: `1px solid ${C.line}` }}>
          {overtakeName && (
            <span className="flex items-center gap-2 text-[14.5px] font-extrabold" style={{ color: C.limeDk }}>
              <Rocket size={18} strokeWidth={2.6} /> {fmt(t.leaderboard.statsOvertake, { name: overtakeName })}
            </span>
          )}
          <span className="flex items-center gap-2 text-[14.5px] font-extrabold" style={{ color: C.limeDk }}>
            <TrendingUp size={18} strokeWidth={2.6} /> {fmt(t.leaderboard.statsStrong, { name: strong.label })}
          </span>
          <span className="flex items-center gap-2 text-[14.5px] font-extrabold" style={{ color: C.amber }}>
            <Lightbulb size={18} strokeWidth={2.6} /> {fmt(t.leaderboard.statsGrow, { name: weak.label })}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-5 pt-3.5 text-[13.5px] font-semibold" style={{ borderTop: `1px solid ${C.line}`, color: C.muted }}>
          <Lightbulb size={17} strokeWidth={2.2} /> {t.leaderboard.statsNoData}
        </div>
      )}
    </div>
  );
}

/* Раньше тут стоял общий <Skeleton h={64} count={5}/> — он всегда рисует
   grid-cols-3 (рассчитан на ряд одинаковых плиток), а реальный контент этой
   страницы — карточка уровня, подиум 3×разной высоты и вертикальный список —
   ничего общего с сеткой не имел (тот же класс бага, что был у /study,
   найден и исправлен 21.08.2026). Свой skeleton, повторяющий форму разделов. */
function LeaderboardSkeleton() {
  return (
    <>
      <div className="k-card p-4 sm:p-5 mb-4" style={{ borderColor: C.limeLine }}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="animate-pulse shrink-0 w-16 h-16 rounded-2xl" style={{ background: C.line }} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="animate-pulse h-3 w-24 rounded-full" style={{ background: C.line }} />
            <div className="animate-pulse h-5 w-36 rounded-full" style={{ background: C.line }} />
            <div className="animate-pulse h-2.5 w-full rounded-full" style={{ background: C.line }} />
          </div>
        </div>
      </div>

      <div className="k-card p-4 sm:p-5 mb-4" style={{ borderColor: C.limeLine }}>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-4">
          {[132, 158, 108].map((h, i) => (
            <div key={i} className="animate-pulse rounded-2xl" style={{ height: h, background: C.line }} />
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse h-12 rounded-xl" style={{ background: C.line }} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [pair, setPair] = useState(null); // доска «другого» периода — для скорости роста
  const [error, setError] = useState(null);
  const [homework, setHomework] = useState(null);

  const load = useCallback(() => {
    setData(null);
    setError(null);
    api
      .leaderboard(period)
      .then((d) => setData(d.data))
      .catch((err) => { setError(err); toast(err.message, 'error'); });
  }, [period, toast]);

  useEffect(() => { load(); }, [load]);

  /* Тихая загрузка второй доски (week ⇄ month) — из неё считаем темп роста. */
  useEffect(() => {
    let cancelled = false;
    const other = period === 'week' ? 'month' : 'week';
    api
      .leaderboard(other)
      .then((d) => { if (!cancelled) setPair(d.data); })
      .catch(() => { if (!cancelled) setPair(null); });
    return () => { cancelled = true; };
  }, [period]);

  /* Для статистики — домашки ученика (score/max_score + submission_status). */
  useEffect(() => {
    let cancelled = false;
    api
      .homework()
      .then((d) => { if (!cancelled) setHomework(d.data); })
      .catch(() => { if (!cancelled) setHomework([]); });
    return () => { cancelled = true; };
  }, []);

  const top = data?.top ?? [];
  const myRow =
    top.find((r) => r.studentId === user?.id) ||
    (data?.me && user ? { ...data.me, firstName: user.firstName, lastName: user.lastName, studentId: user.id } : null);
  const { level, progress, toNext } = levelFromCoins(myRow?.coins ?? 0);
  const ahead = myRow?.rank && myRow.rank > 1 ? top.find((r) => r.rank === myRow.rank - 1) : null;
  const aheadGap = ahead && myRow ? Math.max(0, Number(ahead.coins) - Number(myRow.coins)) : 0;
  const isLeader = !!myRow && myRow.rank === 1;

  /* ═══ Скорость роста (без нового бэкенда) ═══
     Темп = монеты недели / монеты месяца. Кто ближе к 1 — тот растёт быстрее
     всех прямо сейчас (можно стоять ниже, но обогнать лидера). */
  const weekB = period === 'week' ? data : pair;
  const monthB = period === 'month' ? data : pair;
  const coinsOf = (board, sid) => {
    if (!board) return null;
    const row = board.top?.find((r) => r.studentId === sid);
    if (row) return Number(row.coins) || 0;
    return board.me && sid === user?.id ? Number(board.me.coins) || 0 : null;
  };
  let growth = null;
  let overtakeName = null;
  if (weekB && monthB) {
    const myWeek = coinsOf(weekB, user?.id);
    const myMonth = coinsOf(monthB, user?.id);
    if (myWeek != null && myMonth != null && myMonth > 0) {
      const myPace = myWeek / myMonth;
      const paces = [myPace];
      (weekB.top ?? []).forEach((r) => {
        const mc = coinsOf(monthB, r.studentId);
        if (mc != null && mc > 0) paces.push((Number(r.coins) || 0) / mc);
      });
      const maxPace = Math.max(...paces);
      growth = maxPace > 0 ? Math.min(100, Math.round((myPace / maxPace) * 100)) : null;
      /* Подсказка: расту быстрее лидера — догоню именно его; иначе — того, кто выше. */
      const target = top.find((r) => r.rank === 1) || ahead;
      if (target) {
        const tc = coinsOf(monthB, target.studentId);
        const tw = Number(target.coins) || 0;
        if (tc != null && tc > 0 && tw / tc < myPace - 0.02) overtakeName = target.firstName;
      }
    }
  }

  return (
    <>
      <PageHeader
        title={t.leaderboard.title}
        subtitle={t.leaderboard.subtitle}
        icon={Trophy}
        hue="amber"
        actions={
          <Tabs
            value={period}
            onChange={setPeriod}
            items={[{ value: 'week', label: t.leaderboard.week }, { value: 'month', label: t.leaderboard.month }]}
          />
        }
      />

      {/* Баннер */}
      <div
        className="relative overflow-hidden mb-4 rounded-2xl"
        style={{ background: `linear-gradient(120deg, ${C.honeySoft} 0%, ${alpha(C.honey, 16)} 100%)`, border: `1px solid ${C.line}` }}
      >
        <div className="absolute -right-5 -top-8 w-40 h-40 sm:w-48 sm:h-48 pointer-events-none select-none" aria-hidden="true">
          <TrophyArt />
        </div>
        <div className="relative z-10 px-4 sm:px-5 py-4 pr-28 sm:pr-32">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.1em]" style={{ color: C.honeyDk }}>
            {t.leaderboard.bannerTag}
          </div>
          <div className="text-[16px] sm:text-[17px] font-extrabold leading-snug mt-1" style={{ color: C.text }}>
            {t.leaderboard.bannerText}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !data ? (
        <LeaderboardSkeleton />
      ) : top.length === 0 ? (
        <div className="k-card">
          <EmptyState
            icon={Trophy}
            hue="amber"
            title={t.leaderboard.empty}
            text={t.leaderboard.emptyText}
          />
        </div>
      ) : (
        <>
          {/* Мой уровень + кого догнать */}
          <div className="k-card p-4 sm:p-5 mb-4" style={{ borderColor: C.limeLine }}>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
              <span
                className="shrink-0 w-16 h-16 rounded-2xl grid place-items-center k-num text-[24px] text-white"
                style={{ background: `linear-gradient(135deg, ${C.lime}, ${shade(C.lime, 24)})`, boxShadow: `0 4px 14px ${alpha(C.lime, 33)}` }}
              >
                {level}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.muted }}>
                  {t.leaderboard.myLevel}
                </div>
                <div className="text-[20px] font-extrabold leading-tight" style={{ color: C.text }}>
                  {fmt(t.leaderboard.levelTitle, { level })}
                </div>
                <div className="mt-2">
                  <LevelBar level={level} progress={progress} hue="lime" size="md" />
                </div>
                <div className="text-[12.5px] font-bold mt-1" style={{ color: C.limeDk }}>
                  {fmt(t.leaderboard.coinsToNext, { n: toNext })}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="k-num text-[22px] font-extrabold flex items-center justify-end gap-1.5" style={{ color: C.text }}>
                  <CountUp value={Number(myRow?.coins) || 0} />
                  <Star size={14} strokeWidth={2.4} fill={C.honey} color={C.honey} />
                </div>
                <div className="text-[11px] font-semibold" style={{ color: C.muted }}>{t.leaderboard.myCoins}</div>
              </div>
            </div>

            {ahead ? (
              <div
                className="mt-3.5 flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                style={{ background: C.honeySoft, border: `1px solid ${alpha(C.honey, 30)}` }}
              >
                <Target size={18} strokeWidth={2.4} color={C.honey} className="shrink-0" />
                <Avatar name={`${ahead.firstName ?? ''} ${ahead.lastName ?? ''}`} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-[0.06em]" style={{ color: C.honeyDk }}>
                    {t.leaderboard.catchUp}
                  </div>
                  <div className="text-[13.5px] font-extrabold truncate" style={{ color: C.text }}>
                    {ahead.firstName} {ahead.lastName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="k-num text-[14px] font-extrabold flex items-center gap-1 justify-end" style={{ color: C.honeyDk }}>
                    {aheadGap.toLocaleString('ru-RU')}
                    <Star size={11} strokeWidth={2.4} fill={C.honey} color={C.honey} />
                  </div>
                  <div className="text-[11px] font-semibold" style={{ color: C.muted }}>{t.leaderboard.coinsNeeded}</div>
                </div>
              </div>
            ) : isLeader ? (
              <div
                className="mt-3.5 flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                style={{ background: C.limeSoft, border: `1px solid ${C.limeLine}` }}
              >
                <Crown size={18} strokeWidth={2.4} color={C.limeDk} className="shrink-0" />
                <div className="text-[13.5px] font-extrabold" style={{ color: C.limeDk }}>
                  {t.leaderboard.youAreLeader}
                </div>
              </div>
            ) : null}
          </div>

          {/* Классический лидерборд: подиум топ-3 + список остальных */}
          <RatingList top={top} meId={user?.id} myRow={myRow} />

          {/* Статистика: столбчатая диаграмма */}
          <StatsCard
            homework={homework}
            myCoins={myRow?.coins}
            topCoins={Math.max(...top.map((r) => Number(r.coins) || 0), 1)}
            growth={growth}
            overtakeName={overtakeName}
          />
        </>
      )}
    </>
  );
}
