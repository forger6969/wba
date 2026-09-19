import { useMemo, useState, useEffect, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, UserX, Coins, ArrowRight, BookOpen,
  MessageSquare, UserRound, BarChart3,
} from 'lucide-react';

import { useMentorGroups } from '../../queries.js';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import Avatar from '../../components/Avatar.jsx';
import { SearchInput, EmptyState } from './_ui.jsx';
import { useTranslation } from 'react-i18next';

/**
 * Все ученики ментора — по всем его группам сразу.
 *
 * Отдельного эндпоинта «все ученики ментора» у бэкенда нет, есть только
 * ростер по группе. Поэтому тянем ростеры параллельно через useQueries и
 * склеиваем на клиенте: для 3–6 групп это дешевле, чем заводить ради
 * списка новый API.
 */

function statusMap(t) {
  return {
    active: { label: t('mentor.students.statusActive'), cls: 'badge-success' },
    frozen: { label: t('mentor.students.statusFrozen'), cls: 'badge-warning' },
    dropped: { label: t('mentor.students.statusDropped'), cls: 'badge-ghost' },
  };
}

/**
 * Контекстное меню строки — правая кнопка мыши или двойной клик.
 *
 * Открывается там, где нажали, и само отодвигается от краёв: меню, вылезшее
 * за нижний край списка из 46 человек, пришлось бы догонять прокруткой.
 */
function RowMenu({ x, y, student, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - width - 8),
      y: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    // Прокрутка под открытым меню оставила бы его висеть над чужой строкой
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  const name = `${student.firstName} ${student.lastName}`.trim();

  const items = [
    {
      Icon: MessageSquare,
      label: t('mentor.students.msgStudent'),
      // Комната та же, что и с родителем: dm:<staffId>:<peerId>. Бэкенд теперь
      // пускает вторым участником и ученика (canStaffChatStudent).
      onClick: () => navigate(`/chat?peer=${student.id}`),
    },
    {
      Icon: UserRound,
      label: t('mentor.students.msgParent'),
      /* По идентификатору родителя, а не по имени ребёнка.
         Первая версия передавала имя и полагалась на поиск по child_names:
         тёзки открывали чужой диалог, а расхождение в записи имени не
         находило вообще ничего. */
      onClick: () => navigate(`/chat?peer=${student.parentId}`),
      // У ученика может не быть привязанного родителя — тогда писать некому,
      // и честнее показать это, чем открыть пустой чат.
      disabled: !student.parentId,
      hint: student.parentId ? null : t('mentor.students.noParent'),
    },
    {
      Icon: BarChart3,
      label: t('mentor.students.viewStats'),
      onClick: () => navigate(`/students/${student.id}`),
    },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      className="popover-surface fixed z-[100] w-60 overflow-hidden animate-scale-in"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="px-3 py-2.5 border-b border-base-200">
        <div className="text-sm font-bold truncate">{name}</div>
        <div className="text-[11px] text-base-content/45 truncate">
          {student.groups.map((g) => g.name).join(', ')}
        </div>
      </div>
      <div className="p-1.5">
        {items.map(({ Icon, label, onClick, disabled, hint }) => (
          <button
            key={label}
            role="menuitem"
            disabled={disabled}
            title={hint ?? undefined}
            onClick={() => { onClose(); onClick(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/75 hover:bg-base-200 hover:text-base-content transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <span className="w-7 h-7 rounded-lg bg-base-200 grid place-items-center shrink-0">
              <Icon size={14} />
            </span>
            <span className="text-left min-w-0">
              {label}
              {hint && <span className="block text-[10px] text-base-content/40">{hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MentorStudents() {
  const { t } = useTranslation();
  const STATUS = statusMap(t);
  const { token } = useAuth();
  const { data: groupsData, isLoading: groupsLoading } = useMentorGroups();
  const groups = useMemo(() => groupsData?.data ?? [], [groupsData]);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [menu, setMenu] = useState(null);   // { x, y, student }

  const rosters = useQueries({
    queries: groups.map((g) => ({
      queryKey: ['mentor-group-students', g.id],
      queryFn: () => api.mentorGroupStudents(token, g.id),
      enabled: !!token,
      staleTime: 60_000,
    })),
  });

  const loading = groupsLoading || rosters.some((r) => r.isLoading);

  /* Один ученик может числиться в нескольких группах — тогда это одна строка
     со списком групп, а не два одинаковых человека подряд. */
  const students = useMemo(() => {
    const byId = new Map();
    rosters.forEach((r, i) => {
      const group = groups[i];
      (r.data?.data ?? []).forEach((s) => {
        const existing = byId.get(s.id);
        if (existing) {
          existing.groups.push(group);
        } else {
          byId.set(s.id, { ...s, groups: [group] });
        }
      });
    });
    return [...byId.values()].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [rosters, groups]);

  const filtered = students.filter((s) => {
    if (groupFilter && !s.groups.some((g) => g.id === groupFilter)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
      || (s.phone ?? '').includes(q)
      || (s.student_code ?? '').toLowerCase().includes(q);
  });

  const totalCoins = students.reduce((sum, s) => sum + (s.coinBalance ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Сводка: сколько всего людей, сколько групп, сколько у них коинов */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card bg-base-100 p-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg grid place-items-center bg-primary/10 text-primary">
              <Users size={16} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
              {t('mentor.students.students')}
            </span>
          </div>
          <div className="text-3xl font-extrabold mt-3 leading-none tabular-nums">
            {students.length}
          </div>
        </div>
        <div className="card bg-base-100 p-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg grid place-items-center bg-primary/10 text-primary">
              <BookOpen size={16} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
              {t('mentor.students.groups')}
            </span>
          </div>
          <div className="text-3xl font-extrabold mt-3 leading-none tabular-nums">
            {groups.length}
          </div>
        </div>
        <div className="card bg-base-100 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg grid place-items-center bg-warning/10 text-warning">
              <Coins size={16} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
              {t('mentor.students.totalCoins')}
            </span>
          </div>
          <div className="text-3xl font-extrabold mt-3 leading-none tabular-nums">
            {totalCoins}
          </div>
        </div>
      </div>

      <section className="card bg-base-100">
        <header className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-base-200">
          <h1 className="font-bold">{t('mentor.students.allMyStudents')}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="select select-bordered select-sm rounded-lg"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">{t('mentor.students.allGroups')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('mentor.students.searchPlaceholder')}
              className="w-full sm:w-64"
            />
          </div>
        </header>

        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserX}
              title={
                students.length === 0
                  ? t('mentor.students.noStudentsTitle')
                  : t('mentor.students.nothingFoundTitle')
              }
              hint={
                students.length === 0
                  ? t('mentor.students.noStudentsHint')
                  : t('mentor.students.nothingFoundHint')
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('mentor.students.colStudent')}</th>
                    <th>{t('mentor.students.colGroup')}</th>
                    <th>{t('mentor.students.colPhone')}</th>
                    <th>{t('mentor.students.colStatus')}</th>
                    <th className="text-right">{t('mentor.students.colCoins')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const st = STATUS[s.status] || STATUS.active;
                    return (
                      <tr
                        key={s.id}
                        className="hover cursor-context-menu"
                        onContextMenu={(e) => {
                          e.preventDefault();   // вместо меню браузера — своё
                          setMenu({ x: e.clientX, y: e.clientY, student: s });
                        }}
                        onDoubleClick={(e) => setMenu({ x: e.clientX, y: e.clientY, student: s })}
                      >
                        <td>
                          {/* Ссылка на всю ячейку с именем: попасть в неё проще,
                              чем в подчёркнутый текст, а строка целиком
                              кликабельной быть не может — внутри свои ссылки
                              на группы. */}
                          <Link to={`/students/${s.id}`} className="flex items-center gap-3 group">
                            <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {s.firstName} {s.lastName}
                              </div>
                              {s.student_code && (
                                <div className="text-[11px] text-base-content/40">
                                  ID: {s.student_code}
                                </div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {s.groups.map((g) => (
                              <Link
                                key={g.id}
                                to={`/groups/${g.id}`}
                                className="text-[11px] font-medium px-2 py-1 rounded-md bg-base-200 hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                {g.name}
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="text-sm text-base-content/60 whitespace-nowrap">
                          {s.phone || '—'}
                        </td>
                        <td>
                          <span className={`badge badge-sm ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="text-sm font-bold text-right tabular-nums whitespace-nowrap">
                          {s.coinBalance ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && filtered.length !== students.length && (
          <footer className="px-4 py-2.5 border-t border-base-200 text-xs text-base-content/50">
            {t('mentor.students.shownCount', { shown: filtered.length, total: students.length })}
          </footer>
        )}
      </section>

      <Link to="/groups" className="btn btn-ghost btn-sm gap-1.5 text-primary">
        {t('mentor.students.viewByGroups')} <ArrowRight size={14} />
      </Link>

      {menu && (
        <RowMenu
          x={menu.x}
          y={menu.y}
          student={menu.student}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
