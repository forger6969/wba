import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Check, X, Minus, Plus, Users, Coins, CheckCircle, XCircle, Cloud, CloudOff, Loader2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useMentorGroupStudents, useMentorAttendance, useMentorCoinBudget } from '../../../queries.js';
import { useAuth } from '../../../auth.jsx';
import { api } from '../../../api.js';
import { useAttendanceLive, markAttendanceSocket } from '../../../socket.js';
import { USING_MOCKS } from '../../../api.js';
import { Avatar, EmptyState } from '../_ui.jsx';

/**
 * Журнал одной группы: дни занятий по горизонтали, ученики по вертикали.
 *
 * Кнопки «Сохранить» нет — отметка уходит на сервер сама, пачкой, через
 * короткую паузу после последнего клика. Ментор отмечает журнал во время
 * урока, и заставлять его помнить про сохранение — верный способ потерять
 * данные: ушёл со страницы, не нажав, и работы как не бывало.
 *
 * Клетка переключается keldi ⇄ kelmadi. Вернуть её в «не отмечено» нельзя:
 * бэкенд принимает только present/absent/late/excused и не умеет удалять
 * запись (DELETE-эндпоинта нет). Раньше третий клик очищал клетку локально —
 * выглядело как снятие отметки, но на сервер это не уезжало и после
 * перезагрузки отметка возвращалась.
 */

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

/** Пауза после последнего клика, по истечении которой уходит пачка. */
const AUTOSAVE_DELAY = 700;

// Роли, чья отметка = «исправление администратора»: клетка держит цвет статуса,
// но получает пометку. Ментор видит её так же, как админ.
const ADMIN_MARK_ROLES = new Set(['admin', 'ceo', 'main_admin']);

const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const pad = (n) => String(n).padStart(2, '0');

/**
 * Оставить во вводе только целое число, возможно со знаком минус.
 *
 * Минус обязателен: этим же полем коины СНИМАЮТ, «-5» списывает пятёрку.
 * Поэтому нельзя просто вырезать всё, кроме цифр. Минус допускается один и
 * только первым символом — «5-3» и «--5» не числа.
 *
 * Возвращаем строку, а не число: пустое поле и промежуточное «-» должны
 * существовать, пока человек печатает, иначе ввод «-5» невозможен физически.
 */
function sanitizeCoinInput(raw) {
  const negative = String(raw).trimStart().startsWith('-');
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return negative ? '-' : '';
  return (negative ? '-' : '') + digits.slice(0, 4);   // 4 разряда — предел разумного
}

/** «Emirxan Ergashev» → «Emirxan.E»: в колонку шириной 68px имя целиком не лезет. */
function shortName(full) {
  if (!full) return '';
  const [first, last] = full.split(' ');
  return last ? `${first}.${last[0]}` : first;
}

/* Полоса месяцев: полгода назад и три вперёд от текущего. Прошлые нужны для
   правок задним числом, будущие — чтобы заранее открыть журнал. */
function buildMonthStrip(base) {
  const list = [];
  for (let offset = -6; offset <= 3; offset += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    list.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return list;
}

function Toast({ message, type = 'success', visible, onClose }) {
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;
  const ok = type === 'success';
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-slide-up"
    >
      <div
        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg border min-w-[240px] ${
          ok ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error'
        }`}
      >
        {ok ? <CheckCircle size={18} className="shrink-0" /> : <XCircle size={18} className="shrink-0" />}
        <span className="text-sm font-semibold">{message}</span>
      </div>
    </div>
  );
}

/* ── Состояние автосохранения ─────────────────────────────────────────────
   Ошибка — единственное состояние, требующее внимания, поэтому только она
   заметна и кликабельна. Остальные тихие: сохранение не событие, а фон. */
function SaveIndicator({ state, onRetry }) {
  const { t } = useTranslation();
  if (state === 'idle') return null;

  if (state === 'error') {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-semibold text-error hover:underline"
      >
        <CloudOff size={14} /> {t('mentor.att.notSaved')}
      </button>
    );
  }

  const view = {
    pending: { Icon: Loader2, text: t('mentor.att.saving'), spin: true },
    saving: { Icon: Loader2, text: t('mentor.att.saving'), spin: true },
    saved: { Icon: Cloud, text: t('mentor.att.saved'), spin: false },
  }[state];

  return (
    <span className="flex items-center gap-1.5 text-xs text-base-content/45">
      <view.Icon size={13} className={view.spin ? 'animate-spin' : ''} />
      {view.text}
    </span>
  );
}

export default function AttendanceTab({ groupId, group }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';

  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const now = useMemo(() => new Date(), []);
  /* Локальная дата, а не UTC. `toISOString()` переводит в UTC, и с полуночи до
     пяти утра по Ташкенту он отдавал вчерашнее число: журнал считал бы «сегодня»
     вчерашний день, подсвечивал не ту колонку и пускал в неё правку, которую
     сервер (он считает по Asia/Tashkent) тут же отклонял. */
  const today = now.toLocaleDateString('en-CA');   // en-CA = YYYY-MM-DD

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [attendanceMap, setAttendanceMap] = useState({});
  // Клетки, чью отметку поставил/исправил админ — показываем пометкой.
  const [correctedMap, setCorrectedMap] = useState({});
  const correctedRef = useRef({});
  const [coinDrafts, setCoinDrafts] = useState({});   // studentId -> строка из инпута
  const [coinBusyId, setCoinBusyId] = useState(null);

  // idle | pending | saving | saved | error — состояние автосохранения
  const [saveState, setSaveState] = useState('idle');
  const pendingRef = useRef(new Map());   // dateKey -> Map(studentId -> status)
  const flushTimer = useRef(null);
  // Синхронное зеркало attendanceMap — нужно обработчику клика, см. toggleDay.
  const mapRef = useRef({});

  const monthStrip = useMemo(() => buildMonthStrip(now), [now]);

  const { data: rosterData, isLoading: rosterLoading } = useMentorGroupStudents(groupId);
  // Зависимость — САМ rosterData (он стабилен из react-query). Литерал `?? []`
  // пересоздавался бы каждый рендер, и эффект с setAttendanceMap ниже уходил
  // в бесконечный цикл «Maximum update depth exceeded».
  const students = useMemo(
    () =>
      (rosterData?.data || []).map((s) => ({
        ...s,
        first_name: s.first_name ?? s.firstName,
        last_name: s.last_name ?? s.lastName,
        coin_balance: s.coin_balance ?? s.coinBalance ?? 0,
        coins_today: s.coins_today ?? s.coinsToday ?? 0,
      })),
    [rosterData],
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* Только дни, когда у группы есть занятие.
     Показывать все 31 число было и бессмысленно (в 22 из них урока нет), и
     вредно: колонки не помещались на экран и загоняли таблицу в
     горизонтальную прокрутку. У English B1, например, занятия по пн и ср —
     это 9 колонок вместо 31, и они спокойно влезают.
     Если расписания у группы нет, показываем месяц целиком — иначе журнал
     оказался бы пустым и отметить было бы нечего. */
  const lessonWeekdays = useMemo(() => {
    const days = (group?.schedule ?? [])
      .map((s) => WEEKDAY_INDEX[String(s.day).toLowerCase()])
      .filter((d) => d !== undefined);
    return days.length ? new Set(days) : null;
  }, [group]);

  const DAYS = useMemo(() => {
    const all = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    if (!lessonWeekdays) return all;
    return all.filter((d) => lessonWeekdays.has(new Date(year, month, d).getDay()));
  }, [daysInMonth, lessonWeekdays, year, month]);

  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
  const { data: attendanceData } = useMentorAttendance(groupId, { from, to });
  const attendance = useMemo(() => attendanceData?.data || [], [attendanceData]);

  const { data: budgetData } = useMentorCoinBudget(groupId);
  const budget = budgetData?.data ?? null;

  /* Кто отметил каждый день. Берём первую запись за дату: журнал заполняет
     один человек за урок, а если подменял другой — важен сам факт, что это
     не постоянный преподаватель, а не поимённый разбор по ученикам. */
  const markedByByDate = useMemo(() => {
    const map = {};
    attendance.forEach((r) => {
      const day = String(r.lesson_date ?? '').slice(0, 10);
      if (!day || map[day]) return;
      const name = `${r.marked_by_first_name ?? ''} ${r.marked_by_last_name ?? ''}`.trim();
      if (name) map[day] = name;
    });
    return map;
  }, [attendance]);

  const markedByFor = useCallback((dateKey) => markedByByDate[dateKey] ?? '', [markedByByDate]);

  /* Живые обновления: журнал этой группы отметили в другом месте — второй
     ментор, админ или тот же ментор со второго устройства.

     Событие уже несёт сохранённые записи, поэтому применяем их прямо в
     таблицу. Раньше здесь стоял invalidateQueries: событие приходило С
     ДАННЫМИ, а клиент всё равно шёл за теми же данными по HTTP — лишний круг
     и заметная пауза между «коллега отметил» и «я это увидел». */
  useAttendanceLive(token, groupId, useCallback((payload) => {
    const incoming = payload?.records ?? [];
    if (incoming.length === 0) return;

    const patch = {};
    incoming.forEach((r) => {
      const raw = r.lesson_date ?? r.date ?? payload.lessonDate;
      if (!raw) return;
      // lesson_date из Postgres приходит ISO-строкой с временем — берём дату
      const dayKey = String(raw).slice(0, 10);
      patch[`${r.student_id ?? r.studentId}_${dayKey}`] = r.status;
    });
    if (Object.keys(patch).length === 0) return;

    const next = { ...mapRef.current, ...patch };
    mapRef.current = next;
    setAttendanceMap(next);

    // Правку внёс админ → помечаем эти клетки как исправленные администратором.
    if (payload?.byAdmin) {
      const corr = { ...correctedRef.current };
      Object.keys(patch).forEach((k) => { corr[k] = true; });
      correctedRef.current = corr;
      setCorrectedMap(corr);
    }

    /* Ростер здесь НЕ перезапрашивается, и это важно.
       Раньше стоял invalidateQueries по ученикам группы — «вдруг коины
       изменились». Отметка посещаемости коины не трогает (их меняет отдельная
       кнопка со своей инвалидацией), зато новый ответ ростера менял ссылку на
       `students`, из-за чего эффект инициализации пересобирал карту из
       СТАРОГО кэша attendance и стирал только что применённый патч.
       Проверено на живом бэкенде: событие доходило, колбэк срабатывал, а
       клетка оставалась пустой. */
  }, []));

  useEffect(() => {
    setAttendanceMap({});
    setCorrectedMap({});
    correctedRef.current = {};
  }, [groupId, month, year]);

  useEffect(() => {
    const fullMap = {};
    students.forEach((s) => {
      DAYS.forEach((d) => {
        fullMap[`${s.id}_${year}-${pad(month + 1)}-${pad(d)}`] = null;
      });
    });
    const corr = {};
    attendance.forEach((a) => {
      const attDate = a.date ?? a.lesson_date; // бэкенд: lesson_date, моки: date
      if (!attDate) return;
      const key = `${a.student_id}_${attDate}`;
      if (fullMap[key] !== undefined) {
        fullMap[key] = a.status;
        if (ADMIN_MARK_ROLES.has(a.marked_by_role)) corr[key] = true;
      }
    });
    setAttendanceMap(fullMap);
    mapRef.current = fullMap;   // держим зеркало в согласии с данными сервера
    setCorrectedMap(corr);
    correctedRef.current = corr;
  }, [students, month, year, attendance, DAYS]);

  const dateKeyFor = (day) => `${year}-${pad(month + 1)}-${pad(day)}`;

  /* Отправка накопленного. Копим в ref, а не в state: между кликом и отправкой
     не должно быть лишних перерисовок, а пачка обязана пережить их все.
     Группируем по дате — контракт бэкенда принимает одну дату за запрос. */
  const flush = useCallback(async () => {
    const batch = pendingRef.current;
    if (batch.size === 0) return;
    pendingRef.current = new Map();

    setSaveState('saving');
    try {
      for (const [lessonDate, byStudent] of batch) {
        const records = [...byStudent].map(([studentId, status]) => ({ studentId, status }));

        /* Основной канал — сокет: соединение уже открыто, отметка уходит одним
           кадром, и тем же действием сервер рассылает её остальным.
           HTTP остаётся запасным путём. Ментор отмечает журнал во время урока —
           потерять отметку из-за оборванного вебсокета недопустимо, поэтому
           «полностью на сокете» здесь означает «сокет первым», а не «только
           сокет и будь что будет». */
        try {
          if (USING_MOCKS) throw new Error('mocks');   // в мок-режиме сокет-сервера нет
          await markAttendanceSocket(token, { groupId, lessonDate, records });
        } catch (socketErr) {
          await api.mentorMarkAttendance(token, groupId, { lessonDate, records });
        }
      }
      setSaveState('saved');
      // Через пару секунд гасим отметку — постоянная «Saqlandi» превращается
      // в фоновый шум и перестаёт значить что-либо.
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
    } catch (err) {
      // Возвращаем неотправленное в очередь: следующий клик или повтор
      // попробуют снова, отметки не пропадут молча.
      for (const [date, byStudent] of batch) {
        const existing = pendingRef.current.get(date) ?? new Map();
        byStudent.forEach((v, k) => existing.set(k, v));
        pendingRef.current.set(date, existing);
      }
      setSaveState('error');
      setToast({ message: err.message || t('mentor.att.saveFailed'), type: 'error' });
    }
  }, [token, groupId, qc, t]);

  const queueSave = useCallback((lessonDate, studentId, status) => {
    const byStudent = pendingRef.current.get(lessonDate) ?? new Map();
    byStudent.set(studentId, status);
    pendingRef.current.set(lessonDate, byStudent);

    setSaveState('pending');
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, AUTOSAVE_DELAY);
  }, [flush]);

  // Уход со страницы не должен съедать последние отметки: то, что ещё не
  // улетело, отправляем немедленно при размонтировании.
  useEffect(() => () => {
    clearTimeout(flushTimer.current);
    flush();
  }, [flush]);

  /* Клик по клетке: keldi ⇄ kelmadi. Третьего состояния нет — см. комментарий
     в шапке файла: снять отметку на бэкенде нечем.

     Текущий статус читаем из ref, а не из state: два быстрых клика подряд
     попадают в один цикл рендера, state внутри обработчика ещё старый, и
     второй клик вычислял тот же самый статус — клетка залипала на «keldi».
     Ref обновляем синхронно, поэтому каждый клик видит результат предыдущего. */
  const toggleDay = (studentId, day) => {
    const dateKey = dateKeyFor(day);
    // Дублирует серверное правило намеренно: сервер откажет в любом случае,
    // но без этой проверки клетка успевала бы перекраситься до отказа и
    // возвращалась обратно — мигание, которое выглядит как сбой.
    if (dateKey !== today) return;
    const key = `${studentId}_${dateKey}`;
    const next = mapRef.current[key] === 'present' ? 'absent' : 'present';
    mapRef.current = { ...mapRef.current, [key]: next };
    setAttendanceMap(mapRef.current);
    queueSave(dateKey, studentId, next);
  };

  const markAllPresentToday = () => {
    const dateKey = dateKeyFor(now.getDate());
    const next = { ...mapRef.current };
    students.forEach((s) => { next[`${s.id}_${dateKey}`] = 'present'; });
    mapRef.current = next;
    setAttendanceMap(next);
    students.forEach((s) => queueSave(dateKey, s.id, 'present'));
  };

  // Начисление прямо из строки журнала. Минус разрешён: «-5» спишет коины,
  // отдельная кнопка «отнять» тут только загромождала бы строку.
  const submitCoins = async (student) => {
    const raw = coinDrafts[student.id];
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount) || amount === 0 || coinBusyId) return;

    setCoinBusyId(student.id);
    try {
      /* groupId обязателен, когда ученик состоит в двух группах этого ментора:
         сервер иначе не знает, из какого месячного лимита списывать. */
      await api.mentorGrantCoins(token, {
        studentId: student.id, amount, reason: t('mentor.att.lessonReason'), groupId,
      });
      qc.invalidateQueries({ queryKey: ['mentor-group-students', groupId] });
      qc.invalidateQueries({ queryKey: ['mentor-coin-budget', groupId] });
      setCoinDrafts((prev) => ({ ...prev, [student.id]: '' }));
      setToast({ message: `${student.first_name}: ${amount > 0 ? '+' : ''}${amount} coin`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || t('mentor.coins.genericError'), type: 'error' });
    } finally {
      setCoinBusyId(null);
    }
  };

  /* Прошедшая дата, отмеченная как «был», — правка задним числом: она жёлтая,
     чтобы отличаться от отметки в день урока. Раньше здесь стояли классы
     `text-danger`/`bg-danger/15`, которых в конфиге Tailwind не существовало, —
     «kelmadi» рисовался вообще без красного. */
  const cellStyle = (status, editable) => {
    /* «Был» — обычное состояние, и его в журнале подавляющее большинство:
       рисуем тихо, светлой заливкой с насыщенной галочкой.
       «Не был» — исключение, ради которого журнал и открывают: заливаем
       красным целиком, крест белый. Так пропуски видно, не вчитываясь, а
       присутствие не мельтешит.

       Разделения «отмечено в срок / задним числом» здесь больше нет. Оно
       красило оранжевым КАЖДУЮ отметку прошедшего дня, то есть почти всю
       таблицу, и вместо исключения обозначало норму. Вдобавок дублировало
       дату из шапки колонки: что день прошёл, видно и без подсветки. */
    /* Ховер только у редактируемых клеток. Атрибут `disabled` блокирует клик,
       но CSS `:hover` продолжает срабатывать, и клетка прошлого дня отзывалась
       на курсор, обещая действие, которого не будет. */
    if (status === 'present') {
      return `bg-success/12 text-success border-success/35${editable ? ' hover:bg-success/20' : ''}`;
    }
    if (status === 'absent') {
      return `bg-error text-white border-error${editable ? ' hover:bg-error/90' : ''}`;
    }
    /* Неотмеченная клетка — почти невидимая рамка. Зелёный отсюда убран:
       он спорил с зелёным «был», и пустая клетка читалась как отметка. */
    return `border-base-200 text-base-content/15${
      editable ? ' hover:border-primary/50 hover:bg-primary/[0.05]' : ''
    }`;
  };

  const cellIcon = (status) => {
    // Толстая обводка: галочка и крест должны различаться формой на беглом
    // взгляде, не только цветом — при 8% мужчин с красно-зелёной слепотой
    // цвет один различать не может.
    if (status === 'present') return <Check size={16} strokeWidth={3} />;
    if (status === 'absent') return <X size={16} strokeWidth={3} />;
    return <Minus size={13} />;
  };

  const statusLabel = (status) => {
    if (status === 'present') return t('mentor.att.present');
    if (status === 'absent') return t('mentor.att.absent');
    return t('mentor.att.unmarked');
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* ── Полоса месяцев ── */}
      <div className="shrink-0 border-b border-base-200 px-3 py-2 overflow-x-auto">
        <div className="flex gap-1.5 w-max">
          {monthStrip.map(({ year: y, month: m }) => {
            const active = y === year && m === month;
            const isThis = y === now.getFullYear() && m === now.getMonth();
            return (
              <button
                key={`${y}-${m}`}
                onClick={() => { setYear(y); setMonth(m); }}
                aria-current={active ? 'true' : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary text-primary-content'
                    : isThis
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'text-base-content/55 hover:bg-base-200'
                }`}
              >
                {new Date(y, m, 1).toLocaleDateString(locale, { month: 'short' })}{' '}
                <span className={active ? 'opacity-70' : 'opacity-50'}>{String(y).slice(2)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Легенда + массовая отметка ── */}
      <div className="shrink-0 px-4 py-2 border-b border-base-200 flex items-center justify-between gap-3 flex-wrap">
        {/* Образцы легенды — точные копии клеток из таблицы, с теми же
            иконками и размером. Раньше это были три голых квадратика 12×12 в
            пастельных тонах: отличить их друг от друга было труднее, чем
            сами клетки, которые они объясняют. Иконка внутри снимает вопрос
            и для тех, кто путает красный с зелёным. */}
        <ul className="flex items-center gap-4 text-[11px] font-medium text-base-content/60 flex-wrap">
          <li className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg border grid place-items-center bg-success/12 text-success border-success/35">
              <Check size={13} strokeWidth={3} />
            </span>
            {t('mentor.att.present')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg border grid place-items-center bg-error text-white border-error">
              <X size={13} strokeWidth={3} />
            </span>
            {t('mentor.att.absent')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg border border-base-200 grid place-items-center text-base-content/15">
              <Minus size={13} />
            </span>
            {t('mentor.att.unmarked')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="relative w-6 h-6 rounded-lg border border-base-200 grid place-items-center ring-2 ring-indigo-500 ring-offset-1">
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-base-100" />
            </span>
            {t('mentor.att.correctedByAdmin')}
          </li>
        </ul>
        <div className="flex items-center gap-3">
          {/* Индикатор вместо кнопки: раз сохранение происходит само,
              единственное, что ментору нужно знать, — дошло ли оно. */}
          <SaveIndicator state={saveState} onRetry={flush} />
          {isCurrentMonth && students.length > 0 && DAYS.includes(now.getDate()) && (
            <button className="btn btn-ghost btn-sm gap-1.5 text-success" onClick={markAllPresentToday}>
              <Check size={14} /> {t('mentor.att.markAllPresentToday')}
            </button>
          )}
        </div>
      </div>

      {/* ── Сетка ── */}
      {/* Таблица ниже — `min-w-max`, а не `w-full`: колонки держат свою ширину,
          и журнал за месяц (12–14 дней) уезжает под горизонтальную прокрутку
          вместо того, чтобы ужимать дни до нечитаемых полосок. Имя ученика и
          коины закреплены по краям, поэтому при прокрутке видно, чью строку
          смотришь и сколько у него коинов. */}
      <div className="overflow-auto flex-1 min-h-0">
        {rosterLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
          </div>
        ) : students.length === 0 ? (
          <EmptyState icon={Users} title={t('mentor.att.emptyStudentsTitle')} />
        ) : (
          <table className="table min-w-max border-collapse">
            <thead>
              <tr>
                {/* Ширина задана жёстко, а не через min-width: в таблице
                    `w-full` свободное место доставалось именно этой колонке, и
                    между именами и первым днём зияла пустая полоса в пол-экрана.
                    Остаток теперь забирает колонка коинов (ниже, `w-full`). */}
                <th className="sticky left-0 top-0 z-20 bg-base-100 w-[160px] sm:w-[240px] min-w-[160px] sm:min-w-[240px] px-3 sm:px-4 py-3 text-left">
                   {t('mentor.att.studentCol')}
                </th>
                {DAYS.map((d) => {
                  const key = dateKeyFor(d);
                  const isPast = key < today;
                  const isToday = key === today;
                  const weekday = new Date(year, month, d).getDay();
                  const isWeekend = weekday === 0;
                  // Фон и цвет — инлайном, а не классами: в index.css есть
                  // `.table thead th { background; color }`, и по специфичности
                  // (0,2,1 против 0,1,0) оно перебивало любые bg-*/text-*
                  // утилиты — «сегодня» и воскресенья не подсвечивались вовсе.
                  return (
                    <th
                      key={d}
                      className="sticky top-0 z-10 w-[68px] min-w-[68px] px-1.5 py-2.5 text-center border-l border-base-200"
                      style={{
                        background: isToday
                          ? 'var(--green-bg)'
                          : isWeekend
                          ? '#eef3e7'
                          : 'var(--surface)',
                        color: isToday
                          ? 'var(--green)'
                          : isPast
                          ? 'var(--text-muted)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {/* Полная дата, а не одно число: журнал за месяц — это
                          12–14 колонок, и «3» посреди ленты не сказать от
                          какого месяца, когда листаешь соседние. */}
                      <div className="text-[11px] font-bold tabular-nums leading-tight">
                        {pad(d)}.{pad(month + 1)}
                      </div>
                      <div className="text-[8px] uppercase mt-0.5 opacity-70">
                        {new Date(year, month, d).toLocaleDateString(locale, { weekday: 'short' })}
                      </div>
                      {/* Кто вёл этот урок. У группы бывает подменный
                          преподаватель — по колонке видно, чья это отметка. */}
                      <div className="text-[8px] mt-0.5 truncate opacity-55" title={markedByFor(key)}>
                        {shortName(markedByFor(key))}
                      </div>
                    </th>
                  );
                })}
                {/* Липнет к правому краю только начиная с sm: на телефоне это
                    вторая неподвижная колонка, и дни оказывались зажаты между
                    ними в ноль. Там она просто уезжает в конец таблицы. */}
                {/* Фиксированная ширина, не `w-full`. Пока колонка добирала всё
                    свободное место, при 12–14 днях месяца именно она забирала
                    ширину, а дни сплющивались в нечитаемые полоски. Теперь
                    лишнюю ширину забирает лента дней, а не коины. */}
                <th className="sm:sticky sm:right-0 top-0 z-20 bg-base-100 w-[250px] min-w-[250px] px-4 py-3 border-l border-base-200">
                  {/* Подписи стоят ровно над своими числами в строках ниже:
                      «сегодня» и «всего» — разные величины, и без заголовков
                      два числа подряд читаются как одно составное. */}
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-11 text-center">{t('mentor.att.todayCol')}</span>
                    <span className="w-14 text-right">{t('mentor.att.totalCol')}</span>
                    {/* Остаток месячного лимита. Стоит именно здесь, над самой
                        кнопкой выдачи: ментор видит, сколько ему ещё можно
                        раздать, ровно в тот момент, когда собирается это
                        сделать, — а не после отказа сервера.

                        Без плашки: подложка в шапке спорила с числами коинов в
                        строках и притягивала взгляд сильнее, чем сами данные
                        журнала.

                        Цвет — брендовый зелёный, а не warning, которым по всему
                        проекту обозначен БАЛАНС УЧЕНИКА (Students, StudentDetail,
                        строки ниже). Это разные величины: там сколько у ребёнка,
                        здесь сколько ментору ещё можно раздать, и одинаковый
                        оранжевый их смешивал. Ноль — красным: выдавать нельзя. */}
                    <span className="w-[100px] flex justify-end">
                      {budget && (
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-extrabold tabular-nums ${
                            budget.remaining === 0 ? 'text-error' : 'text-primary'
                          }`}
                           title={t('mentor.att.budgetTooltip', {
                            allocated: budget.allocated, students: budget.students,
                            perStudent: budget.coinsPerStudent, spent: budget.spent,
                          })}
                        >
                          {/* Только остаток. Дробь «97/110» заставляла вычитать
                              в уме, чтобы ответить на единственный интересующий
                              вопрос — сколько ещё можно раздать. Из чего
                              сложился лимит, видно в подсказке. */}
                          <Coins size={14} />
                          {budget.remaining}
                        </span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr key={s.id} className="border-b border-base-200 last:border-0">
                  <td className="sticky left-0 z-10 bg-base-100 px-3 sm:px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-primary/40 tabular-nums w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {s.first_name} {s.last_name}
                        </div>
                        {s.status && s.status !== 'active' && (
                          <span className="text-[11px] text-error font-medium">
                            {s.status === 'frozen' ? t('status.frozen') : s.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {DAYS.map((d) => {
                    const dateKey = dateKeyFor(d);
                    const cellKey = `${s.id}_${dateKey}`;
                    const status = attendanceMap[cellKey];
                    const corrected = correctedMap[cellKey];
                    const isWeekend = new Date(year, month, d).getDay() === 0;
                    // Отмечать можно только сегодняшний урок — остальные дни
                    // показываем как есть, но трогать не даём.
                    const editable = dateKey === today;
                    return (
                      <td
                        key={d}
                        className={`px-1.5 py-2.5 text-center border-l border-base-200 ${
                          isWeekend ? 'bg-primary/[0.04]' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleDay(s.id, d)}
                          disabled={!editable}
                          aria-label={`${s.first_name} ${s.last_name}, ${t('mentor.att.dayNumber', { day: d })}: ${statusLabel(status)}${
                            corrected ? `, ${t('mentor.att.correctedByAdmin')}` : ''
                          }${editable ? '' : ` ${t('mentor.att.cannotEditSuffix')}`}`}
                          title={corrected ? t('mentor.att.correctedByAdmin') : editable ? undefined : t('mentor.att.editOnlyToday')}
                          className={`relative mx-auto w-8 h-8 grid place-items-center rounded-lg border transition-colors ${cellStyle(status, editable)} ${
                            editable ? 'cursor-pointer' : 'cursor-default'
                          } ${corrected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                        >
                          {cellIcon(status)}
                          {corrected && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-base-100" />
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* Коины прямо в строке: баланс + быстрое начисление */}
                  <td className="sm:sticky sm:right-0 z-10 bg-base-100 px-3 py-2.5 border-l border-base-200">
                    <div className="flex items-center justify-end gap-2">
                      {/* Сегодняшнее начисление показываем ТОЛЬКО когда оно
                          есть. Раньше здесь стоял ноль у каждого, и колонка
                          превращалась в столбик из двенадцати нулей — читать
                          в нём было нечего, а место он занимал наравне с
                          данными. Место держим пустым, чтобы строки не
                          разъезжались. */}
                      <span className="w-11 text-center">
                        {(s.coins_today ?? 0) !== 0 && (
                          <span
                            className={`text-[13px] font-bold tabular-nums ${
                              (s.coins_today ?? 0) > 0 ? 'text-primary' : 'text-error'
                            }`}
                            title={t('mentor.att.creditedToday')}
                          >
                            {(s.coins_today ?? 0) > 0 ? '+' : ''}{s.coins_today}
                          </span>
                        )}
                      </span>
                      {/* Баланс — справочная величина, а не то, ради чего сюда
                          пришли: приглушён, чтобы не спорить с полем ввода. */}
                      <span
                        className="w-14 flex items-center justify-end gap-1 text-[13px] font-semibold text-base-content/70 tabular-nums"
                        title={t('mentor.att.totalBalance')}
                      >
                        <Coins size={12} className="text-warning/60" />
                        {s.coin_balance ?? 0}
                      </span>
                      {/* type="text", а не "number", хотя вводятся цифры.
                          У number три беды именно в такой таблице: колесо мыши
                          над сфокусированным полем незаметно меняет число —
                          прокрутил журнал и начислил не то; браузер принимает
                          «e», «+» и точку, а лишние спиннеры отъедают ширину.
                          Цифры обеспечиваются фильтром ввода, а inputMode
                          поднимает на телефоне цифровую клавиатуру. */}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={coinDrafts[s.id] ?? ''}
                        onChange={(e) => setCoinDrafts(
                          (prev) => ({ ...prev, [s.id]: sanitizeCoinInput(e.target.value) }),
                        )}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitCoins(s); }}
                        placeholder="0"
                        aria-label={t('mentor.att.coinAmountFor', { name: s.first_name })}
                        className="input input-sm h-8 w-16 text-center tabular-nums border border-base-300 bg-base-100 text-base-content font-semibold placeholder:text-base-content/25 focus:border-primary focus:outline-none"
                      />
                      {/* Иконка вместо слова «Coin». Слово повторялось в
                          двенадцати строках подряд и читалось как обои: смысла
                          не добавляло, а ширину занимало. Действие названо в
                          aria-label и title — для скринридера и подсказки оно
                          не пропало.

                          Кнопка активна только при введённом числе, поэтому
                          выключенное состояние — норма, а не ошибка: держим его
                          тихим, но не серым. */}
                      <button
                        onClick={() => submitCoins(s)}
                        disabled={coinBusyId === s.id || !Number(coinDrafts[s.id])}
                        aria-label={t('mentor.att.grantCoinsAria', { name: s.first_name })}
                        title={t('mentor.att.grantCoinsTitle')}
                        className="w-8 h-8 shrink-0 grid place-items-center rounded-lg bg-primary text-primary-content transition-colors hover:bg-primary/90 disabled:bg-primary/[0.07] disabled:text-primary/30"
                      >
                        {coinBusyId === s.id
                          ? <span className="loading loading-spinner loading-xs" />
                          : <Plus size={16} strokeWidth={2.5} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Toast
        message={toast?.message}
        type={toast?.type || 'success'}
        visible={!!toast}
        onClose={closeToast}
      />
    </div>
  );
}
