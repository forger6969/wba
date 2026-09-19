import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LANGS, canonicalPath, dictOf, localizePath, useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const close = () => setOpen(false);
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      setScrolled(currentY > 12);
      if (currentY < 60 || open) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  // Без этого скролл жеста внутри drawer уходил на страницу за ним (drawer
  // не был выше по scroll-контексту) — пользователь не мог долистать до
  // «Войти», фон под ним скроллился вместо списка ссылок.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const links = [
    { to: lp('/landing/features'), label: t.nav.features },
    { to: lp('/landing/roles'), label: t.nav.roles },
    { to: lp('/landing/finance'), label: t.nav.finance },
    { to: lp('/landing/pricing'), label: t.nav.pricing },
    { to: lp('/landing/gamification'), label: t.nav.gamification },
  ];

  // Переключатель ведёт на ЭТУ ЖЕ страницу на другом языке, а не на главную:
  // сбрасывать пользователя на главную при смене языка — потеря контекста.
  //
  // Языков больше двух, поэтому это список, а не тумблер. Каждый вариант — обычная
  // <a> с hrefLang: перекрёстные ссылки между версиями сами по себе сигнал для
  // краулера, что версии связаны, и работают они без JavaScript.
  const canonical = canonicalPath(pathname);
  const LangSwitch = ({ className = '' }) => (
    <span className={`lang-switch ${className}`}>
      {LANGS.map((l) => l === lang ? (
        <span key={l} className="lang-switch__current" aria-current="true">
          {dictOf(l).lang.label}
        </span>
      ) : (
        <Link key={l} to={localizePath(canonical, l)} hrefLang={l}
          aria-label={dictOf(l).lang.label} onClick={close}>
          {dictOf(l).lang.label}
        </Link>
      ))}
    </span>
  );

  return (
    <>
      <header className={`header${hidden ? ' header--hidden' : ''}${scrolled ? ' header--scrolled' : ''}`}>
        <div className="container header__inner">
          <Link to={lp('/landing')} className="header__logo" onClick={close}>
            <span className="header__logo-mark">
              <img src="/logo-mark.svg" alt="" width="30" height="30" />
            </span>
            <span className="header__brand"><strong>LevelUp</strong><small>Academy</small></span>
          </Link>

          {/* Десктоп-навигация */}
          <nav className="nav" aria-label={t.nav.primaryLabel}>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="header__actions">
            <LangSwitch />
            <Link to={lp('/landing/contacts')} className="btn btn--dark header__cta">
              <span>{t.nav.login}</span>
            </Link>
          </div>

          {/* Мобильный бургер */}
          <button
            className={`burger${open ? ' burger--open' : ''}`}
            aria-label={t.nav.menu}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Мобильный sidebar — ВНЕ header: backdrop-filter хедера ломает
          position:fixed у потомков */}
      <div
        className={`drawer-overlay${open ? ' drawer-overlay--show' : ''}`}
        onClick={close}
      />
      <aside className={`drawer${open ? ' drawer--open' : ''}`}>
        <div className="drawer__head">
          <span className="drawer__brand"><img src="/logo-mark.svg" alt="" width="28" height="28" /><span>LevelUp Academy</span></span>
          <button type="button" className="drawer__close" onClick={close} aria-label={t.nav.menu}>×</button>
        </div>
        <nav className="drawer__nav" aria-label={t.nav.mobileLabel}>
          <NavLink to={lp('/landing')} end onClick={close}>
            {t.nav.home}
          </NavLink>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={close}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink to={lp('/landing/contacts')} onClick={close}>
            {t.nav.contacts}
          </NavLink>
          <LangSwitch className="drawer__lang" />
        </nav>
        <Link
          to={lp('/landing/contacts')}
          className="btn btn--accent drawer__cta"
          onClick={close}
        >
          {t.nav.login}
        </Link>
      </aside>
    </>
  );
}
