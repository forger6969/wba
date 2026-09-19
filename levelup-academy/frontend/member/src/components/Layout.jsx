import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useChild } from '../child-context.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icons.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Layout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { childList, selectedChild, selectChild } = useChild();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV = [
    { to: '/dashboard', label: t.nav.dashboard, short: t.nav.dashboardShort, icon: 'home', description: t.dash.subtitle },
    { to: '/attendance', label: t.nav.attendance, short: t.nav.attendanceShort, icon: 'calendar-check', description: t.att.title },
    { to: '/grades', label: t.nav.grades, short: t.nav.gradesShort, icon: 'academic', description: t.gr.title },
    { to: '/debt', label: t.nav.debt, short: t.nav.debtShort, icon: 'wallet', description: t.debt.title },
    { to: '/chat', label: t.nav.messages, short: t.nav.messagesShort, icon: 'chat', description: t.pchat.desc },
  ];

  const sidebar = (
    <div className="parent-sidebar-inner">
      <div className="parent-brand">
        <img src="/logo-white.svg" alt="LevelUp" className="h-7 w-auto" />
      </div>

      <nav className="parent-nav">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `parent-nav-link ${isActive ? 'is-active' : ''}`}>
            <span className="parent-nav-icon"><Icon name={item.icon} className="w-[18px] h-[18px]" /></span>
            <span className="text-sm font-medium min-w-0 truncate">{item.label}</span>
            <Icon name="chevron-right" className="parent-nav-arrow w-4 h-4 ml-auto" />
          </NavLink>
        ))}
      </nav>

      <div className="parent-sidebar-footer">
        <p className="parent-footer-caption">{t.nav.account}</p>
        <NavLink to="/notifications" onClick={() => setMobileOpen(false)} className={({ isActive }) => `parent-nav-link ${isActive ? 'is-active' : ''}`}>
          <span className="parent-nav-icon"><Icon name="bell" className="w-[18px] h-[18px]" /></span>
          <span className="text-sm font-medium">{t.nav.notifications}</span>
          <Icon name="chevron-right" className="parent-nav-arrow w-4 h-4 ml-auto" />
        </NavLink>
        <NavLink to="/profile" onClick={() => setMobileOpen(false)} className="parent-profile-link">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-slate-500">{t.nav.profileSettings}</p>
          </div>
          <Icon name="chevron-right" className="w-4 h-4 opacity-50" />
        </NavLink>
        <div className="px-1 pt-2">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );

  return (
    <div className="parent-shell">
      <aside className="parent-sidebar hidden lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50 w-full" aria-label={t.nav.closeMenu} onClick={() => setMobileOpen(false)} />
          <aside className="parent-sidebar absolute inset-y-0 left-0 w-[286px] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <section className="parent-workspace">
        <header className="parent-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <button className="parent-menu-button lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t.nav.openMenu}><Icon name="bars-3" className="w-5 h-5" /></button>
            <img src="/logo-white.svg" alt="LevelUp" className="h-6 w-auto lg:hidden" />
            <div className="parent-header-divider hidden lg:block" />
            {selectedChild && (
              <div className="parent-header-child">
                <Avatar name={`${selectedChild.firstName} ${selectedChild.lastName}`} size={32} />
                <div className="min-w-0 hidden sm:block">
                  <p className="text-[9px] uppercase tracking-[.12em] text-white/35 font-semibold">{t.nav.selectedStudent}</p>
                  <p className="text-xs font-semibold text-white/90 truncate">{selectedChild.firstName} {selectedChild.lastName}</p>
                </div>
                {childList.length > 1 && (
                  <select value={selectedChild.id} onChange={(e) => selectChild(e.target.value)} aria-label={t.nav.selectChild} className="parent-header-select hidden md:block">
                    {childList.map((child) => <option key={child.id} value={child.id}>{child.firstName}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
          <div className="parent-header-actions">
            <NavLink to="/notifications" className="parent-header-bell" aria-label={t.nav.notifications}>
              <Icon name="bell" className="w-[18px] h-[18px]" />
            </NavLink>
            <span className="parent-header-separator" />
            <NavLink to="/profile" className="parent-header-account" aria-label={t.nav.profile}>
              <Avatar name={`${user?.firstName} ${user?.lastName}`} size={32} />
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-semibold text-white/90 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-white/35">{t.prof.role}</p>
              </div>
              <Icon name="chevron-right" className="w-3.5 h-3.5 text-white/30 hidden sm:block" />
            </NavLink>
          </div>
        </header>

        <main className="parent-main"><Outlet /></main>

        <nav className="parent-mobile-nav lg:hidden">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `parent-mobile-link ${isActive ? 'is-active' : ''}`}>
              <Icon name={item.icon} className="w-5 h-5" /><span>{item.short}</span>
            </NavLink>
          ))}
        </nav>
      </section>
    </div>
  );
}
