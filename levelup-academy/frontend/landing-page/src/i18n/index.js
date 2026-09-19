import { useLocation } from 'react-router-dom';
import ru from './ru.js';
import uz from './uz.js';
import en from './en.js';

/**
 * Язык живёт в URL, а не в состоянии: русский — на своих исходных адресах
 * (`/landing/...`), остальные языки — с префиксом (`/uz/landing/...`, `/en/landing/...`).
 *
 * Почему так, а не переключатель в localStorage: у каждой языковой версии должен быть
 * собственный адрес, иначе Google не сможет её проиндексировать, а hreflang — связать
 * версии между собой. Русские URL при этом остались неизменными — они уже поданы в
 * Search Console, менять их нельзя.
 *
 * Русский остаётся языком без префикса не потому, что он «главный» по смыслу, а потому
 * что его адреса уже проиндексированы. Перенос корня на другой язык стоил бы
 * переиндексации всех русских страниц.
 */
export const DEFAULT_LANG = 'ru';

/** Языки с префиксом в URL. DEFAULT_LANG сюда не входит — он живёт на корне. */
export const PREFIXED_LANGS = ['uz', 'en'];

export const LANGS = [DEFAULT_LANG, ...PREFIXED_LANGS];

const DICTS = { ru, uz, en };

/** Язык текущего маршрута. */
export function langOf(pathname) {
  const lang = PREFIXED_LANGS.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  return lang ?? DEFAULT_LANG;
}

export function useLang() {
  return langOf(useLocation().pathname);
}

/** Словарь текущего языка. */
export function useT() {
  return DICTS[useLang()];
}

/** Словарь произвольного языка — нужен переключателю, чтобы подписать чужие языки. */
export function dictOf(lang) {
  return DICTS[lang];
}

/** Канонический путь (`/landing/finance`) → путь на нужном языке. */
export function localizePath(path, lang) {
  return lang === DEFAULT_LANG ? path : `/${lang}${path}`;
}

/** Локализатор для ссылок внутри компонентов: <Link to={lp('/landing/contacts')}>. */
export function useLocalizePath() {
  const lang = useLang();
  return (path) => localizePath(path, lang);
}

/** Локализованный путь (`/uz/landing/finance`) → канонический (`/landing/finance`). */
export function canonicalPath(pathname) {
  const lang = langOf(pathname);
  if (lang === DEFAULT_LANG) return pathname;
  return pathname.slice(lang.length + 1) || '/landing';
}
