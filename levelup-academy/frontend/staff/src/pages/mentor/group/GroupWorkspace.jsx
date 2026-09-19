import { lazy, Suspense } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  CalendarDays, FileText, Coins, Users, Clock, BookOpen, ArrowLeft, BarChart3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useMentorGroups, useMentorGroupStudents } from '../../../queries.js';
import { EmptyState } from '../_ui.jsx';

const AttendanceTab = lazy(() => import('./AttendanceTab.jsx'));
const TestsTab = lazy(() => import('./TestsTab.jsx'));
const StatsTab = lazy(() => import('./StatsTab.jsx'));

/**
 * Рабочее место ментора — ОДНА группа целиком.
 *
 * Раньше журнал, тесты и коины были тремя пунктами меню, и в каждом заново
 * выбиралась группа: ментор трижды говорил системе, с кем работает. Теперь
 * группа выбирается один раз (в сайдбаре), а внутри — вкладки.
 *
 * Активная вкладка живёт в query-параметре, а не в state: ссылку на «тесты
 * такой-то группы» можно кинуть в чат, и обновление страницы не сбрасывает
 * пользователя на журнал.
 */

/* Вкладки «Koinlar» больше нет: начисление переехало прямо в строку журнала —
   там же, где ментор отмечает присутствие, и видно «сегодня» и «всего».
   Отдельный экран ради того же действия заставлял переключаться туда-сюда
   во время урока. История операций по ученику осталась в его карточке. */
const TAB_DEFS = [
  { key: 'davomat', labelKey: 'mentor.tab.attendance', Icon: CalendarDays, Component: AttendanceTab },
  { key: 'testlar', labelKey: 'mentor.tab.tests', Icon: FileText, Component: TestsTab },
  // Сравнение учеников между собой: кто тянет, кто отстаёт
  { key: 'statistika', labelKey: 'mentor.tab.stats', Icon: BarChart3, Component: StatsTab },
];

function getLessonTime(g) {
  if (!g) return null;
  if (g.lesson_time) return g.lesson_time;
  return g.schedule?.[0]?.start || null;
}

function Meta({ Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
        {label}
      </div>
      <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5 truncate">
        <Icon size={14} className="text-primary shrink-0" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

export default function GroupWorkspace() {
  const { t } = useTranslation();
  const TABS = TAB_DEFS.map((tab) => ({ ...tab, label: t(tab.labelKey) }));
  const { id: groupId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: groupsData, isLoading } = useMentorGroups();
  const groups = groupsData?.data || [];
  const group = groups.find((g) => String(g.id) === String(groupId));

  // Ростер нужен и для счётчика учеников, и для суммы коинов в шапке. Запрос
  // тот же, что во вкладках — react-query отдаст его из кэша, не дублируя.
  const { data: rosterData } = useMentorGroupStudents(groupId);
  const students = rosterData?.data || [];
  const totalCoins = students.reduce(
    (sum, s) => sum + (s.coinBalance ?? s.coin_balance ?? 0),
    0,
  );

  const requestedTab = searchParams.get('tab');
  const activeKey = TABS.some((t) => t.key === requestedTab) ? requestedTab : TABS[0].key;
  const ActiveTab = TABS.find((t) => t.key === activeKey).Component;

  const selectTab = (key) => {
    // replace: переключение вкладок не должно засорять историю — «назад»
    // обязано уводить со страницы группы, а не отматывать вкладки по одной.
    setSearchParams({ tab: key }, { replace: true });
  };

  if (!isLoading && !group) {
    return (
      <div className="card bg-base-100">
        <EmptyState
          icon={BookOpen}
          title={t('mentor.groupNotFoundTitle')}
          hint={t('mentor.groupNotFoundHint')}
          action={<Link to="/" className="btn btn-sm btn-primary">{t('mentor.toHome')}</Link>}
        />
      </div>
    );
  }

  return (
    // Маршрут помечен в Layout как full-page: контейнер уже отдаёт всю область
    // под шапкой без отступов и ограничения по ширине. Раньше страница
    // добивалась этого отрицательными маргинами, но снять `max-w-7xl` они не
    // могли — журнал упирался в 1280px и не занимал экран.
    <div className="flex-1 min-h-0 flex flex-col bg-base-100">
      {/* ── Шапка группы ── */}
      <header className="shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b border-base-200">
        <div className="flex items-start gap-3 flex-wrap">
          <Link
            to="/"
            className="btn btn-ghost btn-sm btn-circle lg:hidden shrink-0"
            aria-label={t('mentor.back')}
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight truncate">
              {group?.name || <span className="skeleton inline-block h-7 w-40 align-middle" />}
            </h1>
            {group?.is_archived && (
              <span className="badge badge-ghost badge-sm mt-1">{t('mentor.archived')}</span>
            )}
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <Meta Icon={BookOpen} label={t('mentor.direction')} value={group?.subject || t('mentor.subject')} />
            <Meta Icon={Clock} label={t('mentor.lessonTime')} value={getLessonTime(group) || '—'} />
            <Meta Icon={Users} label={t('mentor.students')} value={students.length || 0} />
            <Meta Icon={Coins} label={t('mentor.totalCoins')} value={totalCoins} />
          </div>
        </div>

        {/* ── Вкладки ── */}
          <nav className="flex gap-1 mt-4 -mb-3" aria-label={t('mentor.groupSections')}>
          {TABS.map(({ key, label, Icon }) => {
            const active = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => selectTab(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                  active
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-base-content/50 hover:text-base-content hover:bg-base-200/60'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Содержимое вкладки ── */}
      <Suspense
        fallback={
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
          </div>
        }
      >
        {/* key: смена группы или вкладки полностью пересоздаёт содержимое —
            иначе несохранённые отметки журнала перетекли бы в другую группу. */}
        {/* group нужен журналу: из его расписания берутся дни занятий —
            колонками идут только они, а не все числа месяца. */}
        <ActiveTab key={`${groupId}-${activeKey}`} groupId={groupId} group={group} />
      </Suspense>
    </div>
  );
}
