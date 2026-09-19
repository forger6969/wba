import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

/**
 * Shared User Menu Modal component.
 * Replaces the simple dropdown with a more structured modal/popover
 * similar to the branch-manager pattern.
 */
export default function UserMenu({ user, role, roleTitle, onLogout, langSwitch: LangSwitch }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasProfilePage = ['admin', 'ceo', 'mentor', 'methodist'].includes(role);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setShow(!show)}
        className={`flex items-center gap-2.5 p-1 sm:pr-3 rounded-full transition-colors ${
          show ? 'bg-[var(--green-bg)]' : 'hover:bg-[var(--green-bg)]'
        }`}
      >
        <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={36} />
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-sm font-bold text-[var(--text)]">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="block text-[11px] text-[var(--text-muted)]">
            {roleTitle || role}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`hidden sm:block text-[var(--text-muted)] transition-transform ${
            show ? 'rotate-180' : ''
          }`}
        />
      </button>

      {show && (
        <div className="popover-surface fixed sm:absolute left-3 right-3 top-[4.25rem] sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-64 overflow-hidden animate-scale-in z-50">
          {/* User Info Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] bg-base-200/30">
            <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={48} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--text)] truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">{user?.email}</div>
              <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 uppercase tracking-wider">
                {roleTitle || role}
              </span>
            </div>
          </div>

          <div className="p-1.5 space-y-1">
            {/* Language Switcher integrated into the menu */}
            <div className="px-1 py-1">
              <LanguageSwitcher />
            </div>
            
            <div className="border-t border-[var(--border)] my-1" />

            {hasProfilePage && (
              <button
                onClick={() => { setShow(false); navigate('/profile'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-primary/5 hover:text-primary transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-base-200 grid place-items-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <UserIcon size={16} />
                </span>
                <span>{t('common.myProfile')}</span>
              </button>
            )}

            <button
              onClick={() => { setShow(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/5 transition-all group"
            >
              <span className="w-8 h-8 rounded-lg bg-error/10 grid place-items-center shrink-0 group-hover:bg-error/20 transition-colors">
                <LogOut size={16} />
              </span>
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
