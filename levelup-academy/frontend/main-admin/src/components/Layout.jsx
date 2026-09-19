import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Building2, Settings, LogOut, Menu, ChevronDown, Search, Puzzle, ScrollText, AlertOctagon, LineChart, ShieldAlert, HeartPulse, Bug, Layers, Receipt, Gauge, Activity, History,
  PanelLeftClose, PanelLeftOpen, X, Command,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useDashboard, useLeads, useFeatureRequests, useActionCenter } from '../queries.js';
import { DashboardLiveProvider } from '../socket.js';

/**
 * Меню намеренно короткое — как у ментора.
 *
 * Было восемь пунктов: Дашборд, Заявки, Партнёры, Анонсы, Штрафы, Тарифы,
 * Доход, Настройки. Половина из них — редкие справочные экраны, которые
 * открывают раз в неделю, но каждый занимал строку наравне с ежедневной
 * работой. У ментора ту же задачу решили так: главная сущность разворачивается
 * прямо в меню, а всё, что «про неё», — вкладки внутри. Главная сущность здесь
 * партнёр.
 *
 * Куда делись остальные:
 *   Штрафы  — удалены, дисциплина сотрудников это зона CEO;
 *   Тарифы  — открываются из Настроек, там же они и показаны;
 *   Доход   — открывается с дашборда, это его же цифра в развёрнутом виде;
 *   Анонсы  — из Настроек, создаются редко.
 */
const nav = [
  // Центр проблем — первым пунктом: то, что требует действия прямо сейчас,
  // важнее обзорного дашборда (Karis 25.08.2026).
  { type: 'section', label: 'Рабочее пространство' },
  { to: '/action-center', label: 'Задачи', Icon: AlertOctagon, badge: 'actionCenter' },
  { to: '/', label: 'Дашборд', Icon: LayoutDashboard, end: true },
  { type: 'partners' },
  { to: '/leads', label: 'Заявки', Icon: Inbox, badge: 'leads' },
  // Счета — рядом с Заявками и Партнёрами: это про деньги, которые уже
  // должны прийти, а не про настройку платформы (Karis 26.08.2026).
  { to: '/invoices', label: 'Счета и долги', Icon: Receipt },
  { to: '/partner-health', label: 'Health Score', Icon: Gauge },
  { to: '/product-activity', label: 'Активность в продукте', Icon: Activity },
  { to: '/partner-changes', label: 'Что изменилось', Icon: History },
  { type: 'section', label: 'Управление' },
  { to: '/features', label: 'Фичи', Icon: Puzzle, badge: 'featureRequests' },
  // Журнал — в меню, а не в Настройках: это то, куда смотрят, когда надо
  // выяснить 'кто это сделал', а не разовая настройка (Karis 25.08.2026).
  // Аналитика сайта — рядом с Заявками по смыслу: это воронка ДО заявки,
  // откуда люди приходят и где отваливаются (Karis 25.08.2026).
  { to: '/site-analytics', label: 'Аналитика сайта', Icon: LineChart },
  // Модерация чата — рядом с Журналом по смыслу: тоже 'что происходит,
  // на что стоит посмотреть' (Karis 26.08.2026).
  { to: '/chat-moderation', label: 'Модерация чата', Icon: ShieldAlert },
  { to: '/audit', label: 'История изменений', Icon: ScrollText },
  { to: '/system-health', label: 'Здоровье системы', Icon: HeartPulse },
  { to: '/error-log', label: 'Журнал ошибок', Icon: Bug },
  { to: '/queue-health', label: 'Очереди', Icon: Layers },
  { to: '/settings', label: 'Настройки', Icon: Settings },
];

const itemBase =
  'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70';
const itemIdle =
  'text-neutral-content/58 hover:bg-white/[0.07] hover:text-white hover:translate-x-0.5';
const itemActive = "bg-primary text-primary-content shadow-[0_6px_20px_rgba(198,255,52,0.12)] before:absolute before:-left-1 before:top-3 before:bottom-3 before:w-0.5 before:rounded-full before:bg-primary";

/**
 * Список партнёров прямо в меню.
 *
 * Отдельный компонент, а не ветка внутри сайдбара: список фильтруется и
 * сворачивается, и держать это состояние рядом с навигацией всей панели
 * незачем. Данные берём из уже загруженного дашборда — отдельный запрос за
 * тем же самым списком делать не за чем.
 */
function PartnersNav({ onNavigate, collapsed }) {
  const { data } = useDashboard();
  const location = useLocation();
  const navigate = useNavigate();
  const partners = data?.partners ?? [];

  const inside = location.pathname.startsWith('/organizations');
  const [open, setOpen] = useState(inside);
  const [q, setQ] = useState('');

  // Поиск появляется только когда список перестаёт помещаться в голове.
  const searchable = partners.length > 8;
  const shown = q.trim()
    ? partners.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : partners;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => { navigate('/organizations'); onNavigate?.(); }}
        title="Партнёры"
        className={`${itemBase} justify-center ${inside ? itemActive : itemIdle}`}
      >
        <Building2 size={18} />
        {partners.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${itemBase} w-full ${inside ? itemActive : itemIdle}`}
      >
        <span className={`grid h-5 w-5 place-items-center transition-colors ${inside ? 'text-primary' : 'text-neutral-content/40 group-hover:text-neutral-content/75'}`}>
          <Building2 size={16} className="shrink-0" />
        </span>
        <span className="flex-1 text-left">Партнёры</span>
        <span className="text-[10px] font-bold min-w-5 h-5 px-1.5 rounded grid place-items-center bg-white/[0.07] text-neutral-content/55">
          {partners.length}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="main-sidebar-scroll mt-1 ml-2.5 max-h-56 overflow-y-auto pl-4 pr-1 border-l border-white/[0.08] space-y-0.5">
          {searchable && (
            <div className="relative mb-1.5">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-content/30 pointer-events-none"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск"
                aria-label="Поиск партнёра"
                // text-base до sm: iOS Safari зумит страницу на поле мельче 16px
                className="w-full rounded-md border border-white/[0.08] bg-black/10 pl-7 pr-2 py-2 text-base sm:text-xs
                           text-neutral-content placeholder:text-neutral-content/30 focus:border-primary/30
                           focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={() => { navigate('/organizations'); onNavigate?.(); }}
            className={`w-full text-left rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
              location.pathname === '/organizations'
                ? 'text-primary bg-primary/[0.08]'
                : 'text-neutral-content/45 hover:text-neutral-content hover:bg-white/[0.05]'
            }`}
          >
            Все партнёры
          </button>

          {shown.map((p) => {
            const active = location.pathname === `/organizations/${p.id}`;
            return (
              <button
                key={p.id}
                onClick={() => { navigate(`/organizations/${p.id}`); onNavigate?.(); }}
                title={p.name}
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors ${
                  active
                    ? 'bg-primary/[0.08] text-primary font-semibold'
                    : 'text-neutral-content/45 hover:bg-white/[0.05] hover:text-neutral-content'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    p.status === 'active' ? 'bg-success'
                      : p.status === 'frozen' ? 'bg-error' : 'bg-warning'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}

          {shown.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-neutral-content/30">
              {partners.length === 0 ? 'Партнёров пока нет' : 'Ничего не найдено'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ user, logout, onNavigate, collapsed, onToggleCollapse }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'M';
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: leads } = useLeads();
  const newLeads = (leads ?? []).filter((l) => l.status === 'new').length;
  const { data: pendingRequests } = useFeatureRequests('pending');
  const { data: actionCenter } = useActionCenter();
  const criticalCount = actionCenter?.counts?.critical ?? 0;
  const [menuQuery, setMenuQuery] = useState('');
  const menuSearchRef = useRef(null);
  const visibleNav = menuQuery.trim()
    ? nav.filter((item) => item.type === 'section' || item.type === 'partners' || item.label?.toLowerCase().includes(menuQuery.trim().toLowerCase()))
    : nav;
  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        menuSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return (
    <aside className={`relative ${collapsed ? 'w-[76px] px-2.5' : 'w-[272px] px-3.5'} h-dvh bg-sidebar text-neutral-content flex flex-col py-4 border-r border-white/[0.06] shadow-[12px_0_40px_rgba(29,36,23,0.08)] transition-[width,padding] duration-200`}>
      <div className={`flex items-center pb-4 ${collapsed ? 'justify-center' : 'px-2 gap-2'}`}>
        {collapsed ? (
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-[10px] font-black text-primary-content">LU</div>
        ) : (
          <div className="min-w-0">
            <img src="/logo-white.svg" alt="LevelUp Academy" className="h-6 w-auto max-w-[170px] object-contain object-left" />
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-content/35">Platforma boshqaruvi</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          className={`${collapsed ? 'absolute -right-3 top-6 z-10' : 'ml-auto'} hidden lg:grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-sidebar text-neutral-content/35 shadow-sm hover:bg-white/[0.06] hover:text-neutral-content`}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="mb-2 px-0.5">
          <label className="group relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-content/30 group-focus-within:text-primary" />
            <input ref={menuSearchRef} value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder="Bo‘limni tez topish" aria-label="Menyudan bo‘lim qidirish" className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/15 pl-9 pr-10 text-xs font-medium text-white placeholder:text-neutral-content/30 outline-none transition focus:border-primary/35 focus:bg-black/25" />
            <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-white/[0.09] px-1.5 py-0.5 text-[9px] text-neutral-content/30"><Command size={9} />K</span>
          </label>
        </div>
      )}

      <nav className="main-nav-scroll flex-1 min-h-0 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden pr-1">
        {visibleNav.map((item) => {
          if (item.type === 'section') {
            return collapsed
              ? <div key={item.label} className="mx-2 my-2 border-t border-white/[0.07]" />
              : <div key={item.label} className="px-3 pt-4 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-content/25">{item.label}</div>;
          }
          if (item.type === 'partners') {
            return <PartnersNav key="partners" onNavigate={onNavigate} collapsed={collapsed} />;
          }
          const { to, label, Icon, end, badge } = item;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `${itemBase} ${collapsed ? 'justify-center px-2' : ''} ${isActive ? itemActive : itemIdle}`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${collapsed ? '' : 'bg-white/[0.045] group-hover:bg-white/[0.08]'}`}><Icon size={17} className="shrink-0 opacity-80 group-hover:opacity-100" /></span>
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && badge === 'actionCenter' && criticalCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-error text-error-content">
                  {criticalCount}
                </span>
              )}
              {!collapsed && badge === 'leads' && newLeads > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-content">
                  {newLeads}
                </span>
              )}
              {!collapsed && badge === 'featureRequests' && (pendingRequests?.length ?? 0) > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-content">
                  {pendingRequests.length}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="relative mt-3 pt-3 border-t border-white/[0.08]">
        {collapsed && profileOpen && (
          <div className={`absolute bottom-[calc(100%+8px)] rounded-md border border-white/[0.12] bg-ink p-1.5 shadow-xl ${collapsed ? 'left-0 w-52' : 'inset-x-0'}`}>
            <NavLink
              to="/settings"
              onClick={() => { setProfileOpen(false); onNavigate?.(); }}
              className="flex items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium text-neutral-content/65 hover:bg-white/[0.06] hover:text-neutral-content"
            >
              <Settings size={15} /> Настройки профиля
            </NavLink>
            <div className="my-1 border-t border-white/[0.07]" />
            <button
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium text-neutral-content/55 hover:bg-error/10 hover:text-error"
              onClick={logout}
            >
              <LogOut size={15} /> Выйти
            </button>
          </div>
        )}

        {collapsed ? (
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
            title="Меню аккаунта"
            className="relative mx-auto grid h-10 w-10 place-items-center rounded-md border border-primary/20 bg-primary/[0.09] text-xs font-extrabold text-primary hover:bg-primary/[0.14]"
          >
            {initials}
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success" />
          </button>
        ) : (
          <div className="px-1">
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-content/30">Владелец аккаунта</span>
            </div>
            <div className="mt-2 text-[13px] font-bold leading-snug text-neutral-content">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="mt-0.5 text-[10px] text-neutral-content/35">Main Admin</div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <NavLink
                to="/settings"
                onClick={onNavigate}
                className="flex items-center justify-center gap-1.5 rounded-md border border-white/[0.09] px-2 py-2 text-[10px] font-semibold text-neutral-content/55 hover:bg-white/[0.06] hover:text-neutral-content"
              >
                <Settings size={13} /> Профиль
              </NavLink>
              <button
                type="button"
                onClick={logout}
                className="flex items-center justify-center gap-1.5 rounded-md border border-white/[0.09] px-2 py-2 text-[10px] font-semibold text-neutral-content/45 hover:border-error/25 hover:bg-error/10 hover:text-error"
              >
                <LogOut size={13} /> Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('main-sidebar-collapsed') === 'true');
  const toggleCollapse = () => {
    setCollapsed((value) => {
      localStorage.setItem('main-sidebar-collapsed', String(!value));
      return !value;
    });
  };
  // на телефоне переход по пункту меню должен закрывать сам drawer,
  // иначе выбранная страница остаётся за шторкой
  const closeDrawer = () => {
    const el = document.getElementById('nav-drawer');
    if (el) el.checked = false;
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-200">
      <input id="nav-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <label
          htmlFor="nav-drawer"
          aria-label="Navigatsiya menyusini ochish"
          className="btn btn-ghost btn-sm btn-circle lg:hidden fixed top-3 left-3 z-30 border border-base-300 bg-base-100 shadow-md"
        >
          <Menu size={20} />
        </label>

        <DashboardLiveProvider>
          <main className="w-full max-w-[1720px] mx-auto p-4 pt-16 sm:p-6 lg:p-7 lg:pt-7">
            <Outlet />
          </main>
        </DashboardLiveProvider>
      </div>

      <div className="drawer-side main-sidebar-drawer z-30">
        <label htmlFor="nav-drawer" className="drawer-overlay" />
        <label htmlFor="nav-drawer" aria-label="Navigatsiya menyusini yopish" className="fixed left-[226px] top-3 z-50 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur lg:hidden"><X size={18} /></label>
        <SidebarContent user={user} logout={logout} onNavigate={closeDrawer} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>
    </div>
  );
}
