import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, ChevronDown, ChevronRight,
  User as UserIcon, PanelLeftClose, PanelLeft, LogOut, Menu,
  Volume2, VolumeX,
} from 'lucide-react';
import {
  HiOutlineSquares2X2, HiOutlineBuildingOffice2, HiOutlineUsers,
  HiOutlineAcademicCap, HiOutlineUserGroup,
  HiOutlineChartBar, HiOutlineCog,
  HiOutlineUserCircle, HiOutlineChatBubbleLeftRight, HiOutlineWallet,
  HiOutlineReceiptPercent, HiOutlineBookOpen, HiOutlineArrowTrendingUp,
  HiOutlineCreditCard, HiOutlineGift, HiOutlineCalendarDays,
  HiOutlinePresentationChartLine, HiOutlineCurrencyDollar,
} from 'react-icons/hi2';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth.jsx';
import Avatar from './Avatar.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { disconnectSocket, getSocket } from '../socket.js';
import { useMentorGroups, useSuperBranches, useChatContacts } from '../queries.js';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  playNotificationSound, unlockSound, isSoundEnabled, setSoundEnabled,
} from '../lib/notificationSound.js';

/* ──────────────────── HOOKS ──────────────────── */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/* ──────────────────── NAV CONFIG ──────────────────── */
/**
 * Меню CEO: тринадцать пунктов свёрнуты в семь.
 *
 * Две проблемы были одновременно. Первая — длина: одиннадцать ссылок подряд,
 * где ежедневный дашборд стоял наравне с аудитом, который открывают раз в
 * месяц. Вторая, хуже, — семь пунктов носили бейдж «soon», хотя страницы за
 * ними давно написаны и зовут настоящий API (Студенты, Группы, Посещаемость,
 * Статистика, Объявления, Напоминания, Аудит — у каждой есть useQuery к своему
 * эндпоинту). Партнёр читал «этого ещё нет» о работающем разделе. Бейджи убраны
 * вместе с флагом, а не перекрашены.
 *
 * Структура повторяет панель ментора: главная сущность — филиал — разворачивается
 * прямо в меню, а редкие разделы собраны в группы, чтобы не занимать строку
 * каждый. Ничего не спрятано глубже двух клика.
 */
const superNav = [
  { to: '/',           label: 'Дашборд',    labelKey: 'nav.dashboard', Icon: HiOutlineSquares2X2, end: true },
  { to: '/people',     label: 'Люди и клиенты', labelKey: 'nav.people', Icon: HiOutlineUserGroup },
  // WBA: bitta filial — 'Filiallar' bo'limi olib tashlandi
  { to: '/admins',     label: 'Сотрудники', labelKey: 'nav.admins', Icon: HiOutlineUsers },
  // Финансы владельца центра — вся организация (доход/расход/зарплаты/отчёты)
  { to: '/finance',    label: 'Финансы',    labelKey: 'nav.finance', Icon: HiOutlineCurrencyDollar },
  { to: '/org-expenses', label: 'Расходы', labelKey: 'nav.expenses', Icon: HiOutlineReceiptPercent },
  {
    type: 'group',
    key: 'analytics',
    label: 'Аналитика',
    labelKey: 'nav.analytics',
    Icon: HiOutlineChartBar,
    items: [
      // «Отчёты» слиты в «Статистику» 2026-07-28 — были одной и той же выборкой
      { to: '/stats',   label: 'Статистика', labelKey: 'nav.stats' },
      // общие срезы по всей организации; разбор по одному филиалу — внутри него
      { to: '/students',   label: 'Все ученики', labelKey: 'nav.allStudents' },
      { to: '/groups',     label: 'Все группы',  labelKey: 'nav.allGroups' },
      { to: '/attendance', label: 'Посещаемость', labelKey: 'nav.attendance' },
    ],
  },
  {
    type: 'group',
    key: 'more',
    label: 'Ещё',
    labelKey: 'nav.more',
    Icon: HiOutlineCog,
    items: [
      // Дисциплина живёт здесь, а не строкой верхнего уровня: взыскания
      // выписывают редко, а место она занимала наравне с ежедневной работой
      { to: '/discipline',    label: 'Дисциплина',  labelKey: 'nav.discipline' },
      { to: '/announcements', label: 'Объявления',  labelKey: 'nav.announcements' },
      { to: '/reminders',     label: 'Напоминания', labelKey: 'nav.reminders' },
      { to: '/audit',         label: 'Аудит',       labelKey: 'nav.audit' },
      { to: '/features',      label: 'Фичи', labelKey: 'nav.features' },
      { to: '/billing',       label: 'Оплата', labelKey: 'nav.billing' },
      { to: '/methodics',     label: 'Методики', labelKey: 'nav.methodics' },
      { to: '/shop-catalog',  label: 'Магазин', labelKey: 'nav.shopCatalog' },
      { to: '/settings',      label: 'Настройки',   labelKey: 'nav.settings' },
    ],
  },
];

const adminNav = [
  { to: '/',          label: 'Дашборд',     labelKey: 'nav.dashboard', Icon: HiOutlineSquares2X2, end: true },
  { to: '/students',  label: 'Студенты',    labelKey: 'nav.students', Icon: HiOutlineAcademicCap },
  { to: '/groups',    label: 'Группы',      labelKey: 'nav.groups', Icon: HiOutlineUsers },
  { to: '/mentors',   label: 'Менторы',     labelKey: 'nav.mentors', Icon: HiOutlineUserCircle },
  { to: '/chat',      label: 'Чат',         labelKey: 'nav.chat', Icon: HiOutlineChatBubbleLeftRight },
  { to: '/shop',      label: 'Магазин',     labelKey: 'nav.shopCatalog', Icon: HiOutlineGift },
  { to: '/schedule',  label: 'Расписание',  labelKey: 'nav.schedule', Icon: HiOutlineCalendarDays },
  { to: '/payments',  label: 'Платежи',     labelKey: 'nav.payments', Icon: HiOutlineWallet },
  { to: '/expenses',  label: 'Расходы',     labelKey: 'nav.expenses', Icon: HiOutlineReceiptPercent },
  { to: '/reports',   label: 'Отчёты',      labelKey: 'nav.reports', Icon: HiOutlineChartBar },
  { to: '/announcements', label: 'Anonslar', labelKey: 'nav.announcements', Icon: HiOutlinePresentationChartLine },
  // admin: Settings сознательно не добавлен — page/admin/Settings.jsx удалён (Abduloh),
  // пункта в adminNav быть не должно, иначе мёртвая ссылка.
];

/**
 * Меню Branch Manager — 07.08.2026 роль поднята с read-only до полных прав
 * admin в своём филиале (решение Karis): те же Студенты/Группы/Менторы/
 * Платежи, что у admin (те же страницы, req.scope уже ограничивает своим
 * филиалом), плюс собственный обзорный блок (Filial/Daromad/Hisobotlar).
 */
const branchManagerNav = [
  { to: '/announcements', label: 'Anonslar', labelKey: 'nav.announcements', Icon: HiOutlinePresentationChartLine },
  { to: '/',          label: 'Boshqaruv',  labelKey: 'nav.dashboard', Icon: HiOutlineSquares2X2, end: true },
  { to: '/people',    label: 'Mijozlar bazasi', labelKey: 'nav.clientBase', Icon: HiOutlineUserGroup },
  { to: '/students',  label: 'Studentlar', labelKey: 'nav.students', Icon: HiOutlineAcademicCap },
  { to: '/groups',    label: 'Guruhlar',   labelKey: 'nav.groups', Icon: HiOutlineUsers },
  { to: '/mentors',   label: 'Mentorlar',  labelKey: 'nav.mentors', Icon: HiOutlineUserCircle },
  { to: '/shop',      label: 'Do\'kon',    labelKey: 'nav.shopCatalog', Icon: HiOutlineGift },
  { to: '/schedule',  label: 'Jadval',     labelKey: 'nav.schedule', Icon: HiOutlineCalendarDays },
  { to: '/branch',    label: 'Filial',     labelKey: 'nav.branch', Icon: HiOutlineBuildingOffice2 },
  { to: '/payments',  label: 'To\'lovlar', labelKey: 'nav.payments', Icon: HiOutlineCreditCard },
  { to: '/income',    label: 'Daromad',    labelKey: 'nav.income', Icon: HiOutlineWallet },
  { to: '/expenses',  label: 'Xarajatlar', labelKey: 'nav.expenses', Icon: HiOutlineReceiptPercent },
  { to: '/reports',   label: 'Hisobotlar', labelKey: 'nav.reports', Icon: HiOutlineChartBar },
];

const employeeNav = [
  { to: '/chat', label: 'Chat', labelKey: 'nav.chat', Icon: HiOutlineChatBubbleLeftRight },
];

/**
 * Меню ментора намеренно короткое.
 *
 * Было пять пунктов — Группы, Davomat, Тесты, Коины, Чат — и каждый из трёх
 * средних начинался с одного и того же вопроса «а с какой группой работаем?».
 * Ментор выбирал группу заново в каждом разделе. Теперь группа выбирается один
 * раз здесь, а журнал/тесты/коины — вкладки внутри неё.
 *
 * Чат остаётся снаружи: переписка идёт с родителями, а не с группой.
 */
const mentorNav = [
  { to: '/',     label: 'Дашборд',  labelKey: 'nav.dashboard', Icon: HiOutlineSquares2X2, end: true },
  { to: '/people', label: 'Мои ученики', labelKey: 'nav.myStudents', Icon: HiOutlineUserGroup },
  { type: 'mentor-groups' },
  { to: '/chat', label: 'Чат', labelKey: 'nav.chat', Icon: HiOutlineChatBubbleLeftRight },
];

const methodistNav = [
  { to: '/',                   label: 'Дашборд',      labelKey: 'nav.dashboard', Icon: HiOutlineSquares2X2, end: true },
  { to: '/people',             label: 'База участников', labelKey: 'nav.participantBase', Icon: HiOutlineUserGroup },
  { to: '/methodist/types',    label: 'Типы обучения', labelKey: 'nav.methodistTypes', Icon: HiOutlineBookOpen },
  { to: '/methodist/analytics',label: 'Аналитика',    labelKey: 'nav.analytics', Icon: HiOutlineArrowTrendingUp },
];

/**
 * Меню Finance Manager — вся организация насквозь: сводка, доходы, расходы,
 * фонд оплаты труда, отчёты. Сверху вниз: дашборд → приход → расход → ФОТ →
 * сводка. Статический демо-раздел (backend-роль ещё не заведена), как и
 * branch_manager.
 */
const financeManagerNav = [
  { to: '/',          label: 'Boshqaruv',   labelKey: 'nav.dashboard', Icon: HiOutlineSquares2X2, end: true },
  { to: '/people',    label: 'Mijozlar bazasi', labelKey: 'nav.clientBase', Icon: HiOutlineUserGroup },
  { to: '/finance',   label: 'Hisobot',     labelKey: 'nav.report', Icon: HiOutlinePresentationChartLine },
  { to: '/finance/income',    label: 'Daromad',   labelKey: 'nav.income', Icon: HiOutlineWallet },
  { to: '/finance/expenses',  label: 'Xarajatlar', labelKey: 'nav.expenses', Icon: HiOutlineReceiptPercent },
  { to: '/finance/salaries',  label: 'Oyliklar',   labelKey: 'nav.salaries', Icon: HiOutlineCurrencyDollar },
  { to: '/finance/reports',   label: 'Tahlil',     labelKey: 'nav.reports', Icon: HiOutlineChartBar },
  { to: '/finance/settings',  label: 'Sozlamalar', labelKey: 'nav.settings', Icon: HiOutlineCog },
];

// Пункты, скрываемые целиком, если Main Admin не включил фичу партнёру
// (Karis, 13.08.2026: не только спрятать в sidebar, но и route guard ниже
// не пускает по прямой ссылке — см. FeatureGuard).
const FEATURE_GATED_PATHS = { '/shop': 'shop', '/shop-catalog': 'shop' };

function filterNavByFeatures(nav, orgFeatures) {
  const allowed = (to) => {
    const key = FEATURE_GATED_PATHS[to];
    return !key || Boolean(orgFeatures?.[key]);
  };
  return nav
    .filter((item) => allowed(item.to))
    .map((item) => (item.items ? { ...item, items: item.items.filter((sub) => allowed(sub.to)) } : item));
}

const ROLE_NAV = {
  ceo: superNav,
  admin: adminNav,
  branch_manager: branchManagerNav,
  finance_manager: financeManagerNav,
  employee: employeeNav,
  mentor: mentorNav,
  methodist: methodistNav,
};

const ROLE_COLORS = {
  ceo: '#8b5cf6',
  admin: '#3b82f6',
  branch_manager: '#0ea5e9',
  finance_manager: '#0d9488',
  employee: '#64748b',
  mentor: '#3b82f6',
  methodist: '#f59e0b',
};

/* ──────────────────── MENTOR: раскрывающийся список групп ────────────────────
   Отдельный компонент, а не ветка внутри Sidebar: хук useMentorGroups не должен
   выполняться у админа и методиста — их эндпоинт ментора вернул бы 403. */
function MentorGroupsNav({ collapsed, onExpandSidebar }) {
  const { data } = useMentorGroups();
  const location = useLocation();
  const { t } = useTranslation();
  const groups = data?.data || [];

  const insideGroup = location.pathname.startsWith('/groups');
  // Раскрыт по умолчанию: список групп — основная навигация ментора, прятать
  // её за лишним кликом незачем. Свернуть можно вручную.
  const [open, setOpen] = useState(true);

  const toggle = () => {
    // В свёрнутом сайдбаре списку негде показаться — сначала разворачиваем его.
    if (collapsed) { onExpandSidebar(); setOpen(true); return; }
    setOpen((v) => !v);
  };

  return (
    <div>
      <button
        onClick={toggle}
        title={collapsed ? t('nav.groups') : undefined}
        aria-expanded={collapsed ? false : open}
        className={`group w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-sm ${
          collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
        }`}
        style={{
          color: insideGroup ? '#dc2626' : 'rgba(232, 239, 226, 0.55)',
          background: insideGroup ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
        }}
      >
        <HiOutlineUserGroup size={18} strokeWidth={insideGroup ? 2.2 : 1.8} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left font-medium">{t('nav.groups')}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(220, 38, 38,0.12)', color: 'rgba(220, 38, 38,0.75)' }}
            >
              {groups.length}
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 transition-transform duration-200"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
          </>
        )}
      </button>

      {!collapsed && open && (
        <ul className="mt-1 space-y-0.5 pl-3 border-l ml-4" style={{ borderColor: 'rgba(220, 38, 38,0.15)' }}>
          {groups.length === 0 ? (
            <li className="px-3 py-2 text-[11px]" style={{ color: 'rgba(232,239,226,0.3)' }}>
              {t('nav.noGroups')}
            </li>
          ) : (
            groups.map((g) => {
              const active = location.pathname === `/groups/${g.id}`;
              return (
                <li key={g.id}>
                  <NavLink
                    to={`/groups/${g.id}`}
                    className="block rounded-lg px-3 py-2 text-[13px] transition-colors truncate"
                    style={{
                      color: active ? '#dc2626' : 'rgba(232, 239, 226, 0.5)',
                      background: active ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                      fontWeight: active ? 600 : 400,
                    }}
                    title={g.name}
                  >
                    {g.name}
                  </NavLink>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────── CEO: список филиалов ────────────────────
   То же решение, что у ментора с группами: филиал — главная сущность
   CEO, и выбирать его логично один раз в меню, а не заходить сначала
   в список, потом в карточку. Хук вызывается только под этой ролью —
   у остальных /super/branches вернул бы 403. */
function SuperBranchesNav({ collapsed, onExpandSidebar }) {
  const { data } = useSuperBranches();
  const location = useLocation();
  const { t } = useTranslation();
  const branches = data?.branches ?? [];

  const inside = location.pathname.startsWith('/branches');
  const [open, setOpen] = useState(true);

  const toggle = () => {
    if (collapsed) { onExpandSidebar(); setOpen(true); return; }
    setOpen((v) => !v);
  };

  return (
    <div>
      <button
        onClick={toggle}
        title={collapsed ? t('nav.branches') : undefined}
        aria-expanded={collapsed ? false : open}
        className={`group w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-sm ${
          collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
        }`}
        style={{
          color: inside ? '#dc2626' : 'rgba(232, 239, 226, 0.55)',
          background: inside ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
        }}
      >
        <HiOutlineBuildingOffice2 size={18} strokeWidth={inside ? 2.2 : 1.8} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left font-medium">{t('nav.branches')}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(220, 38, 38,0.12)', color: 'rgba(220, 38, 38,0.75)' }}
            >
              {branches.length}
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 transition-transform duration-200"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
          </>
        )}
      </button>

      {!collapsed && open && (
        <ul className="mt-1 space-y-0.5 pl-3 border-l ml-4" style={{ borderColor: 'rgba(220, 38, 38,0.15)' }}>
          <li>
            <NavLink
              to="/branches"
              end
              className="block rounded-lg px-3 py-2 text-[12px] transition-colors"
              style={({ isActive }) => ({
                color: isActive ? '#dc2626' : 'rgba(232, 239, 226, 0.4)',
                background: isActive ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {t('nav.allBranches')}
            </NavLink>
          </li>
          {branches.map((b) => {
            const active = location.pathname === `/branches/${b.id}`;
            return (
              <li key={b.id}>
                <NavLink
                  to={`/branches/${b.id}`}
                  title={b.name}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors"
                  style={{
                    color: active ? '#dc2626' : 'rgba(232, 239, 226, 0.5)',
                    background: active ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span className="truncate">{b.name}</span>
                  {b.isMain && (
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                      style={{ background: 'rgba(220, 38, 38,0.12)', color: 'rgba(220, 38, 38,0.7)' }}
                    >
                      {t('nav.main')}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
          {branches.length === 0 && (
            <li className="px-3 py-2 text-[11px]" style={{ color: 'rgba(232,239,226,0.3)' }}>
              {t('nav.noBranches')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────── Сворачиваемая группа пунктов ────────────────────
   Нужна, чтобы редкие разделы (отчёты, аудит, рассылки) не занимали по строке
   в меню каждый. Раскрыта, если пользователь уже внутри одного из её пунктов —
   иначе после перехода группа схлопывалась бы и прятала текущую страницу. */
function NavGroup({ label, labelKey, Icon, items, collapsed, onExpandSidebar }) {
  const location = useLocation();
  const { t } = useTranslation();
  const inside = items.some((i) => location.pathname === i.to);
  const [open, setOpen] = useState(inside);

  const toggle = () => {
    if (collapsed) { onExpandSidebar(); setOpen(true); return; }
    setOpen((v) => !v);
  };

  return (
    <div>
      <button
        onClick={toggle}
        title={collapsed ? t(labelKey ?? label) : undefined}
        aria-expanded={collapsed ? false : open}
        className={`group w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-sm ${
          collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
        }`}
        style={{
          color: inside ? '#dc2626' : 'rgba(232, 239, 226, 0.55)',
          background: inside ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
        }}
      >
        <Icon size={18} strokeWidth={inside ? 2.2 : 1.8} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left font-medium">{t(labelKey ?? label)}</span>
            <ChevronDown
              size={14}
              className="shrink-0 transition-transform duration-200"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            />
          </>
        )}
      </button>

      {!collapsed && open && (
        <ul className="mt-1 space-y-0.5 pl-3 border-l ml-4" style={{ borderColor: 'rgba(220, 38, 38,0.15)' }}>
          {items.map((i) => (
            <li key={i.to}>
              <NavLink
                to={i.to}
                end
                className="block rounded-lg px-3 py-2 text-[13px] transition-colors truncate"
                style={({ isActive }) => ({
                  color: isActive ? '#dc2626' : 'rgba(232, 239, 226, 0.5)',
                  background: isActive ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {t(i.labelKey ?? i.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────── SIDEBAR ──────────────────── */
function Sidebar({
  role,
  collapsed,          // визуальное состояние: свёрнут ли сейчас
  pinned,             // закреплён ли открытым (осознанный выбор пользователя)
  onToggle,
  onExpandSidebar = () => {},
  hoverProps = {},    // обработчики наведения — только у десктопного экземпляра
  overlaying = false, // раскрыт наведением поверх контента
}) {
  const { user } = useAuth();
  const nav = filterNavByFeatures(ROLE_NAV[role] || [], user?.orgFeatures);
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside
      className="fixed top-0 left-0 h-full z-40 flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
      {...hoverProps}
      style={{
        width: collapsed ? 72 : 256,
        background: 'linear-gradient(180deg, #0f1a0a 0%, #16210f 40%, #1a2912 100%)',
        borderRight: '1px solid rgba(220, 38, 38, 0.15)',
        // Когда панель выехала поверх страницы, тень должна быть заметнее:
        // иначе не читается, что это слой над контентом, а не раздвинувшая его колонка.
        boxShadow: overlaying
          ? '8px 0 32px rgba(0, 0, 0, 0.45)'
          : '4px 0 24px rgba(0, 0, 0, 0.3)',
        borderRadius: '0 0 16px 0',
      }}
    >
      {/* Логотип.
          Раньше здесь был самодельный градиентный квадрат с буквой «L» и текст
          «LevelUP / Academy», набранный вручную — фирменный знак (незамкнутое
          кольцо-прогресс) в панели не появлялся вообще, хотя лежит готовым в
          public/ и уже используется на логине и сплэше.
          Развёрнутый сайдбар — выворотка целиком (тот же файл, что на тёмной
          панели логина), свёрнутый — только лаймовый знак. */}
      <Link
        to="/"
        className="flex items-center gap-3 px-4 h-16 shrink-0 transition-opacity hover:opacity-85"
        style={{ borderBottom: '1px solid rgba(220, 38, 38, 0.15)' }}
        aria-label="World Bridge Academy — bosh sahifa"
      >
        {collapsed ? (
          <img src="/wba-logo-white.png" alt="" className="w-9 h-9 shrink-0 object-contain" />
        ) : (
          <img
            src="/wba-logo-white.png"
            alt="World Bridge Academy"
            className="h-10 w-auto animate-fade-in object-contain"
          />
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {nav.map((item, i) => {
          if (item.type === 'mentor-groups') {
            return (
              <MentorGroupsNav
                key="mentor-groups"
                collapsed={collapsed}
                onExpandSidebar={onExpandSidebar}
              />
            );
          }
          if (item.type === 'super-branches') {
            return (
              <SuperBranchesNav
                key="super-branches"
                collapsed={collapsed}
                onExpandSidebar={onExpandSidebar}
              />
            );
          }
          if (item.type === 'group') {
            return (
              <NavGroup
                key={item.key}
                label={item.label}
                labelKey={item.labelKey}
                Icon={item.Icon}
                items={item.items}
                collapsed={collapsed}
                onExpandSidebar={onExpandSidebar}
              />
            );
          }
          const { to, label, labelKey, Icon, end, soon } = item;
          const isActive = location.pathname === to || (end && location.pathname === to) || (!end && location.pathname.startsWith(to) && to !== '/');
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? t(labelKey ?? label) : undefined}
              className={`group flex items-center gap-3 rounded-xl transition-all duration-200 ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } text-sm relative overflow-hidden`}
              style={{
                color: isActive ? '#dc2626' : 'rgba(232, 239, 226, 0.55)',
                background: isActive ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                animationDelay: `${i * 40}ms`,
              }}
            >
              {/* Active indicator — green left bar */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: '#dc2626', boxShadow: '0 0 8px rgba(220, 38, 38, 0.4)' }}
                />
              )}

              {/* Icon */}
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="shrink-0 transition-all duration-200"
                style={{
                  color: isActive ? '#dc2626' : soon ? 'rgba(232,239,226,0.25)' : undefined,
                }}
              />

              {/* Label */}
              {!collapsed && (
                <span className="flex-1 font-medium transition-colors" style={{
                  color: isActive ? '#dc2626' : soon ? 'rgba(232,239,226,0.3)' : undefined,
                }}>
                  {t(labelKey ?? label)}
                </span>
              )}

              {/* Soon badge */}
              {!collapsed && soon && (
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                >
                  soon
                </span>
              )}

              {/* Hover glow — subtle green */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ background: 'rgba(220, 38, 38, 0.05)' }}
              />
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle.
          Кнопка теперь управляет не «свёрнут/развёрнут», а «закреплён ли
          открытым». Панель и так раскрывается на наведении — кнопка нужна,
          чтобы зафиксировать её и не гонять мышь к краю каждый раз. */}
      <div className="px-3 pb-3 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all duration-200"
          style={{
            color: 'rgba(232,239,226,0.35)',
            background: 'rgba(220, 38, 38,0.06)',
          }}
          title={pinned ? t('nav.collapsePanel') : t('nav.pinPanel')}
          aria-pressed={pinned}
        >
          {pinned ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          {!collapsed && (
            <span className="font-medium">
              {pinned ? t('nav.collapse') : t('nav.pin')}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

/* ──────────────────── УВЕДОМЛЕНИЯ ────────────────────
   Колокольчик раньше был картинкой: жёстко нарисованная «3» и клик, который
   ничего не открывал.

   Отдельного API уведомлений в бэкенде нет — есть только очередь рассылки
   (telegram/email), читать из неё нечего. Поэтому панель показывает то, что
   действительно существует и требует реакции: непрочитанные сообщения от
   родителей. Цифра на значке — их настоящее количество, а не константа.
   Появится таблица notifications — сюда добавится второй источник. */

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

/** «14:30» сегодня, «Kecha» вчера, дальше — дата. Как в списке чата. */
function formatWhen(iso, lang, yesterdayLabel) {
  if (!iso) return '';
  const locale = LOCALE_OF[lang] || 'ru-RU';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return yesterdayLabel;
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

function Notifications() {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const ref = useRef(null);

  // Чат есть только у ментора, админа и сотрудника; у остальных ролей эндпоинт ответит 403.
  const hasChat = ['mentor', 'admin', 'employee'].includes(user?.role);
  const { data } = useChatContacts({ enabled: hasChat });
  const contacts = data?.data ?? [];

  /* Счётчик обязан оживать сам. Без этой подписки колокольчик показывал
     непрочитанные только на момент загрузки страницы: родитель писал, а
     ментор ничего не видел до F5 — «уведомлений нет» при том, что сообщение
     уже лежало в базе. Комнату слушать не нужно, сервер шлёт адресно в
     `user:<id>`; достаточно перечитать контакты, там же считается unread. */
  useEffect(() => {
    if (!hasChat || !token) return undefined;
    const socket = getSocket(token);
    const onMessage = (message) => {
      qc.invalidateQueries({ queryKey: ['chat-contacts'] });
      // Своё же сообщение возвращается эхом в другие вкладки — пищать на него
      // значит звенеть каждый раз, когда ментор пишет сам.
      if (message?.sender_id && message.sender_id !== user?.id) {
        playNotificationSound();
      }
    };
    socket.on('chat:dm:message', onMessage);
    return () => socket.off('chat:dm:message', onMessage);
  }, [hasChat, token, qc, user?.id]);

  const unread = contacts.filter((c) => (c.unread_count ?? 0) > 0);
  const total = unread.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const openChat = (contactId) => {
    setOpen(false);
    navigate(`/chat${contactId ? `?with=${contactId}` : ''}`);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Круглая ghost-кнопка вместо квадрата с рамкой: в ряду с аватаром
          пользователя рамка выглядела чужеродной деталью. */}
      <button
        onClick={() => {
          // Первый клик по колокольчику заодно разблокирует аудио: браузер
          // разрешает запустить звук только внутри жеста пользователя, и без
          // этого самый первый сигнал терялся бы молча.
          unlockSound();
          setOpen((v) => !v);
        }}
        aria-label={total > 0 ? `${t('notifications.title')}: ${total} ${t('notifications.new')}` : t('notifications.title')}
        aria-expanded={open}
        className={`relative w-10 h-10 rounded-full grid place-items-center transition-colors ${
          open
            ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[rgba(59,130,246,0.08)]'
        }`}
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums bg-error text-white ring-2 ring-base-100">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('notifications.title')}
          /* На телефоне панель шириной 320px, привязанная к правому краю
             кнопки, уезжала левым краем за экран (замер: left = -26px).
             Там она растягивается по ширине окна с отступами, на sm+ —
             обычный выпадающий список под колокольчиком. */
          className="popover-surface fixed sm:absolute left-3 right-3 top-[4.25rem] sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[360px] overflow-hidden animate-scale-in z-50"
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-[var(--border)]">
            <h2 className="text-[15px] font-bold text-[var(--text)]">{t('notifications.title')}</h2>
            <div className="flex items-center gap-1.5">
              {total > 0 && (
                <span className="text-[11px] font-bold text-[var(--primary)] bg-[rgba(59,130,246,0.1)] rounded-full px-2 py-0.5 tabular-nums">
                  {total} {t('notifications.new')}
                </span>
              )}
              <button
                onClick={() => {
                  const next = !soundOn;
                  setSoundEnabled(next);
                  setSoundOn(next);
                  if (next) { unlockSound(); playNotificationSound(); }
                }}
                aria-label={soundOn ? t('notifications.muteSound') : t('notifications.unmuteSound')}
                title={soundOn ? t('notifications.soundOn') : t('notifications.soundOff')}
                className={`w-7 h-7 rounded-lg grid place-items-center transition-colors ${
                  soundOn ? 'text-[var(--primary)] bg-[rgba(59,130,246,0.08)]' : 'text-[var(--text-muted)] hover:bg-[rgba(59,130,246,0.08)]'
                }`}
              >
                {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            </div>
          </header>

          <div className="max-h-[min(60vh,380px)] overflow-y-auto">
            {!hasChat || unread.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3 bg-[var(--surface-hover)] text-[var(--text-muted)]">
                  <Bell size={22} />
                </span>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {t('notifications.empty')}
                </p>
                <p className="text-xs mt-1 text-[var(--text-muted)] max-w-[220px] mx-auto">
                  {t('notifications.emptyDesc')}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {unread.map((c) => {
                  const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => openChat(c.id)}
                        className="group w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[rgba(59,130,246,0.08)] transition-colors"
                      >
                        <span className="relative shrink-0">
                          <Avatar name={name} size={40} />
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--green)] border-2 border-[var(--surface)]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-bold text-[var(--text)] truncate">{name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
                              {formatWhen(c.last_message_at, i18n.language, t('common.yesterday'))}
                            </span>
                          </span>
                          {c.child_names && (
                            <span className="block text-[11px] text-[var(--text-muted)] truncate">
                              {c.child_names}
                            </span>
                          )}
                          <span className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-xs text-[var(--text-secondary)] truncate">
                              {c.last_message || t('notifications.newMessage')}
                            </span>
                            <span className="badge badge-primary badge-sm shrink-0 tabular-nums">
                              {c.unread_count}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {unread.length > 0 && (
            <button
              onClick={() => openChat(null)}
              className="w-full px-4 py-3 text-sm font-semibold text-[var(--primary)] border-t border-[var(--border)] hover:bg-[rgba(59,130,246,0.08)] transition-colors flex items-center justify-center gap-1.5"
            >
              {t('notifications.allMessages')} <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────── HEADER ──────────────────── */
function Header({ sidebarWidth, onMobileToggle }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  // Профиль есть не у всех ролей: у branch_manager отдельной страницы пока нет,
  // и пункт «Профиль» в меню аккаунта был бы кнопкой, которая ведёт на «/».
  const hasProfilePage = ['admin', 'ceo', 'mentor', 'methodist'].includes(role);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onLogout = async () => {
    disconnectSocket();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 transition-all duration-300"
      style={{
        left: sidebarWidth,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Mobile hamburger */}
      <button onClick={onMobileToggle} className="btn btn-ghost btn-sm lg:hidden px-2" style={{ color: 'var(--text)' }}>
        <Menu size={20} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Поиск и счётчик «онлайн» отсюда убраны.
          Поиск ничего не искал: поле не было ни к чему подключено, только
          подсвечивалось при фокусе — то есть обещало функцию, которой нет.
          Счётчик онлайна показывал число, на которое ментор всё равно никак
          не реагирует. */}

      <Notifications />

      {/* Разделительная палка убрана: колокольчик и профиль теперь один ряд
          однотипных элементов, разделять их нечем и незачем. */}

      {/* User profile */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-expanded={showUserMenu}
          aria-label={t('common.accountMenu')}
          /* Было hover:scale — от наведения дёргался весь блок вместе с
             текстом. Подсветка фона спокойнее и не сдвигает соседей. */
          className={`flex items-center gap-2.5 p-1 sm:pr-3 rounded-full transition-colors ${
            showUserMenu ? 'bg-[var(--green-bg)]' : 'hover:bg-[var(--green-bg)]'
          }`}
        >
          <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={36} />
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-sm font-bold text-[var(--text)]">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)]">
              {t(`role.${role}`, role)}
            </span>
          </span>
          <ChevronDown
            size={14}
            className={`hidden sm:block text-[var(--text-muted)] transition-transform ${
              showUserMenu ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Меню аккаунта.
            Ховеры теперь классами Tailwind, а не onMouseEnter/onMouseLeave с
            ручной подменой style: JS-обработчики не знают про :focus-visible,
            поэтому при навигации с клавиатуры пункты никак не подсвечивались. */}
        {showUserMenu && (
          <div
            role="menu"
            className="popover-surface fixed sm:absolute left-3 right-3 top-[4.25rem] sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-64 overflow-hidden animate-scale-in z-50"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
              <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={44} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--text)] truncate">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{user?.email}</div>
                <span className="inline-block mt-1 text-[10px] font-bold text-[var(--primary)] bg-[rgba(59,130,246,0.1)] rounded-full px-2 py-0.5">
                  {t(`role.${role}`, role)}
                </span>
              </div>
            </div>

            <div className="p-1.5">
              <div className="px-1.5 pb-1.5">
                <LanguageSwitcher />
              </div>
              <div className="border-t border-[var(--border)] my-1.5" />
              {hasProfilePage && (
                <button
                  role="menuitem"
                  onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[rgba(59,130,246,0.08)] hover:text-[var(--text)] transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] grid place-items-center shrink-0">
                    <UserIcon size={14} />
                  </span>
                  {t('common.profile')}
                </button>
              )}
              <button
                role="menuitem"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-[var(--danger-light)] grid place-items-center shrink-0">
                  <LogOut size={14} />
                </span>
                {t('common.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ──────────────────── LAYOUT ──────────────────── */
export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lu-sidebar-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role;
  /* Страницы-«рабочие столы»: сами распоряжаются всей областью под шапкой и
     задают свой скролл.

     Карточка группы ментора (журнал) — из них: раньше она снимала отступы
     отрицательными маргинами, но `max-w-7xl mx-auto` контейнера оставался, и
     журнал упирался в 1280px по центру экрана. На широком мониторе со
     свёрнутым сайдбаром по бокам оставались пустые поля, а дни месяца при
     этом не помещались и уезжали в горизонтальную прокрутку.

     Проверяем ещё и роль: тот же путь `/groups/:id` у админа — обычная
     страница с отступами, ей полноэкранный режим не нужен. */
  const isMentorGroupPage = role === 'mentor' && /^\/groups\/[^/]+/.test(location.pathname);
  // Профиль ментора — тоже рабочий стол: карточка слева стоит на месте,
  // прокручивается только колонка с формой. Проверка роли обязательна —
  // у админа по тому же адресу обычная страница с общим скроллом.
  const isMentorProfile = role === 'mentor' && location.pathname === '/profile';
  const isFullPage = ['/chat'].some(r => location.pathname.startsWith(r))
    || isMentorGroupPage
    || isMentorProfile;

  /* ── Раскрытие по наведению ──────────────────────────────────────────────
     `collapsed` — закреплённое состояние, выбор пользователя, он же лежит в
     localStorage. Наведение его НЕ меняет: панель лишь временно выезжает.

     Ключевое решение — выезжает она ПОВЕРХ страницы, а не раздвигает её.
     Отступ контента считается от закреплённого состояния (`collapsed`), а не
     от того, что видно сейчас. Иначе каждое случайное движение мыши к левому
     краю сдвигало бы весь текст на 184px и обратно — читать во время этого
     невозможно.

     Только для мыши: на сенсорных экранах события наведения либо не приходят
     вовсе, либо «залипают» после тапа — панель осталась бы раскрытой навсегда. */
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [hoverOpen, setHoverOpen] = useState(false);
  const hoverTimer = useRef(null);

  const expandedByHover = canHover && collapsed && hoverOpen;
  const visuallyCollapsed = collapsed && !expandedByHover;

  const openOnHover = () => {
    if (!canHover || !collapsed) return;
    clearTimeout(hoverTimer.current);
    // Небольшая задержка: без неё панель распахивается от любого пересечения
    // курсором левого края — например, по пути к кнопке «назад» браузера.
    hoverTimer.current = setTimeout(() => setHoverOpen(true), 120);
  };

  const closeOnLeave = () => {
    clearTimeout(hoverTimer.current);
    setHoverOpen(false);
  };

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const sidebarWidth = isDesktop ? (collapsed ? 72 : 256) : 0;

  // Persist collapse
  useEffect(() => {
    localStorage.setItem('lu-sidebar-collapsed', collapsed);
  }, [collapsed]);

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar
          role={role}
          collapsed={visuallyCollapsed}
          pinned={!collapsed}
          overlaying={expandedByHover}
          onToggle={() => { setCollapsed(!collapsed); setHoverOpen(false); }}
          onExpandSidebar={() => setCollapsed(false)}
          hoverProps={{
            onMouseEnter: openOnHover,
            onMouseLeave: closeOnLeave,
            // Клавиатура наведения не знает: без этого пользователь, идущий по
            // меню табом, водил бы фокус по невидимым подписям свёрнутой панели.
            onFocusCapture: () => collapsed && setHoverOpen(true),
            onBlurCapture: (e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) closeOnLeave();
            },
          }}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full animate-slide-right">
            <Sidebar role={role} collapsed={false} pinned onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Header */}
      <Header sidebarWidth={sidebarWidth} onMobileToggle={() => setMobileOpen(!mobileOpen)} />

      {/* Main content */}
      {/* overflow-x-hidden — страховка для всех панелей: одна распёртая
          таблица или длинное слово раньше давали горизонтальную прокрутку
          всей страницы, а вместе с ней съезжал и низ экрана (в чате под край
          уходило поле ввода). Пусть переполнение решает тот блок, который
          его создал, — своим внутренним скроллом. */}
      <main
        className="transition-all duration-300 pt-16 min-h-screen overflow-x-hidden"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Полноэкранные страницы (мессенджер) считают высоту от вьюпорта.
            Было `h-[calc(100vh-64px)]` без overflow-hidden: высота совпадала с
            экраном ровно впритык, и стоило появиться горизонтальной полосе
            прокрутки (~17px) — нижний край, а с ним поле ввода, уезжал под
            границу окна. `dvh` вдобавок учитывает выезжающие панели браузера
            на мобильных, где `vh` заведомо больше видимой области. */}
        {/* max-w-7xl (1280px) убран: на широком мониторе, тем более со
            свёрнутым сайдбаром, он оставлял по бокам сотни пикселей пустоты,
            хотя таблицам и сеткам карточек эта ширина как раз нужна. Поля
            задаёт только padding. */}
        <div className={isFullPage ? 'flex-1 flex flex-col h-[calc(100dvh-4rem)] overflow-hidden' : 'p-4 sm:p-6 lg:p-8'}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
