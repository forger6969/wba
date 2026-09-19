import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import ru from './ru.js';
import uz from './uz.js';
import en from './en.js';

/**
 * I18n кабинета ученика.
 *
 * Способ — как в landing-page (словари + хук), но язык живёт в localStorage,
 * а не в URL: кабинет за логином, CEO-индексация ему не нужна, зато выбор
 * должен переживать перезагрузку. По умолчанию — русский (текущий язык
 * интерфейса), о'збекча — переключаемый.
 *
 *   const { lang, setLanguage, t, fmt } = useI18n();
 *   <p>{t.home.hello}</p>
 *   <p>{fmt(t.home.coinsToNext, { n: 42 })}</p>
 */
export const LANGS = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'uz', label: "O'zbekcha", short: 'UZ' },
  { code: 'en', label: 'English', short: 'EN' },
];
export const DEFAULT_LANG = 'ru';
const KEY = 'member_lang';
const DICTS = { ru, uz, en };

const I18nCtx = createContext(null);

function loadLang() {
  try {
    const saved = localStorage.getItem(KEY);
    return DICTS[saved] ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** Текущий язык вне React (format.js, ErrorBoundary — класс-компонент). */
let currentLang = loadLang();
export function getLang() {
  return currentLang;
}

/** Словарь текущего языка вне React. Не реактивен — только для разового чтения. */
export function getDict() {
  return DICTS[currentLang];
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(loadLang);

  useEffect(() => {
    currentLang = lang;
    try {
      localStorage.setItem(KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      /* localStorage недоступен — язык живёт только в памяти сессии */
    }
  }, [lang]);

  const setLanguage = useCallback((code) => {
    if (DICTS[code]) setLang(code);
  }, []);

  return (
    <I18nCtx.Provider value={{ lang, setLanguage, t: DICTS[lang] }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Подстановка {name} в строку словаря: fmt(t.home.x, { n: 5 }). */
export function fmt(template, vars) {
  if (!template) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : `{${k}}`));
}
