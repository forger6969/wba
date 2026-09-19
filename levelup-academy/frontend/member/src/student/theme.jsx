import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Тема кабинета ученика: 'light' | 'dark' | 'system'.
 *
 * Палитры живут в index.css (:root и :root[data-kid-theme="dark"]). Здесь —
 * только выбор: пишем атрибут data-kid-theme на <html> (его видит и модалка-
 * portal в body), храним выбор в localStorage, следим за системной темой,
 * когда режим 'system'. Атрибут именно data-kid-theme — data-theme занят
 * daisyUI (<html data-theme="levelup">) и трогать его нельзя.
 *
 * currentResolved держим и на модуле — нужно коду вне React (getKidTheme).
 */

const KEY = 'kid_theme';
const MODES = ['light', 'dark', 'system'];

let currentResolved = 'light'; // 'light' | 'dark' — фактическая тема сейчас
export const getKidTheme = () => currentResolved;

function loadMode() {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolve = (mode) => (mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode);

function apply(resolved) {
  currentResolved = resolved;
  const root = document.documentElement;
  root.dataset.kidTheme = resolved;
  // цвет адресной строки на мобильных — под цвет шапки кабинета
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = resolved === 'dark' ? '#0E1B14' : '#1E3A24';
}

const KidThemeCtx = createContext(null);

export function KidThemeProvider({ children }) {
  const [mode, setMode] = useState(loadMode);
  const [resolved, setResolved] = useState(() => resolve(loadMode()));

  useEffect(() => {
    const r = resolve(mode);
    setResolved(r);
    apply(r);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  }, [mode]);

  // режим 'system' — реагируем на смену системной темы на лету
  useEffect(() => {
    if (mode !== 'system' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r = systemPrefersDark() ? 'dark' : 'light';
      setResolved(r);
      apply(r);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode, // выбор пользователя
      resolved, // что реально показываем
      isDark: resolved === 'dark',
      setMode,
      // быстрый тумблер: system сначала фиксируется на противоположное текущему
      toggle: () => setMode(resolved === 'dark' ? 'light' : 'dark'),
      cycle: () => setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light')),
    }),
    [mode, resolved],
  );

  return <KidThemeCtx.Provider value={value}>{children}</KidThemeCtx.Provider>;
}

export function useKidTheme() {
  const ctx = useContext(KidThemeCtx);
  if (!ctx) throw new Error('useKidTheme must be used within KidThemeProvider');
  return ctx;
}
