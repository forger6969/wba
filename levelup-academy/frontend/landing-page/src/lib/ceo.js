import { createContext, useContext, useEffect } from 'react';
import { LANGS, localizePath, useLang } from '../i18n/index.js';

// Боевой домен лендинга — база для canonical, og:url, sitemap.
export const SITE_URL = 'https://levelup-academy.uz';
export const OG_IMAGE = `${SITE_URL}/og-cover.png`;

/**
 * hreflang-набор для канонического пути ('/landing/finance').
 *
 * Набор строится из LANGS, а не перечисляется руками: добавленный язык, забытый здесь,
 * выпал бы из связки молча — страница проиндексировалась бы как самостоятельный дубль.
 *
 * x-default — версия для посетителя, чей язык не совпал ни с одним из объявленных.
 * Указывает на АНГЛИЙСКУЮ: продукт позиционируется глобально, и для аудитории вне
 * Узбекистана и СНГ английский — осмысленный дефолт, а русский был бы случайным.
 *
 * Каждая версия обязана перечислять ВСЕ варианты, включая саму себя — иначе Google
 * игнорирует связку целиком.
 */
export const X_DEFAULT_LANG = 'en';

export function hreflangsFor(path) {
  return [
    ...LANGS.map((lang) => ({ hreflang: lang, href: `${SITE_URL}${localizePath(path, lang)}` })),
    { hreflang: 'x-default', href: `${SITE_URL}${localizePath(path, X_DEFAULT_LANG)}` },
  ];
}

/**
 * WebPage-узел конкретной страницы.
 *
 * Генерируется автоматически для каждого маршрута, а не объявляется страницами:
 * `inLanguage` в статическом @graph (index.html) один на весь сайт и всегда сообщал
 * `ru` — включая узбекские страницы. Для поисковика и AI это означало «узбекского
 * контента здесь нет». Язык страницы обязан объявляться на самой странице.
 *
 * Ссылается на узлы статического графа по @id, а не дублирует их: так Organization,
 * WebSite и SoftwareApplication остаются единственными в своём роде.
 */
const BCP47 = { ru: 'ru-UZ', uz: 'uz-UZ', en: 'en' };
const OG_LOCALE = { ru: 'ru_UZ', uz: 'uz_UZ', en: 'en_US' };

/** Язык страницы в формате BCP 47. `en` без региона — версия не привязана к стране. */
export const bcp47 = (lang) => BCP47[lang] ?? BCP47.ru;
export const ogLocale = (lang) => OG_LOCALE[lang] ?? OG_LOCALE.ru;

export function webPage({ title, description, url, lang }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: bcp47(lang),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#software` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/**
 * Канал сбора CEO во время серверного рендера (prerender).
 * На клиенте провайдера нет → значение null → сбор не выполняется, работает только DOM-ветка.
 * На сервере entry-server кладёт сюда объект-приёмник и после renderToString читает из него
 * то, что объявила отрисованная страница.
 */
export const CeoCollectorContext = createContext(null);

function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMetaName(name, content) {
  const el = upsert(`meta[name="${name}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('name', name);
    return m;
  });
  el.setAttribute('content', content);
}

function setMetaProp(property, content) {
  const el = upsert(`meta[property="${property}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('property', property);
    return m;
  });
  el.setAttribute('content', content);
}

function setCanonical(href) {
  const el = upsert('link[rel="canonical"]', () => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    return l;
  });
  el.setAttribute('href', href);
}

function removeCanonical() {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

/**
 * Client-side per-route CEO: обновляет title, description, canonical и
 * переменную часть Open Graph / Twitter. Статический baseline (og:image,
 * og:type, twitter:card и JSON-LD Organization/WebSite/SoftwareApplication)
 * живёт в index.html — его видят соц-скраперы без JS.
 *
 * @param {{ title:string, description:string, path:string, jsonLd?:object[], noindex?:boolean }} opts
 *   jsonLd должен быть стабильной ссылкой (объявлять на уровне модуля страницы),
 *   иначе effect будет перезапускаться каждый рендер.
 *   noindex — страница не должна попасть в индекс (клиентский 404): робот получает
 *   noindex, а canonical снимается, т.к. указывать его на несуществующий URL нельзя.
 */
export function useCeo({ title, description, path, jsonLd, noindex = false }) {
  const lang = useLang();
  // `path` — канонический путь без языка ('/landing/finance'). Локализуем здесь, чтобы
  // страницам не приходилось знать про языковые префиксы. Исключение — noindex-страница
  // (404): её path уже реальный, локализовать его повторно нельзя.
  const localized = noindex ? path : localizePath(path, lang);

  // Серверная ветка: useEffect при renderToString не выполняется, поэтому единственный
  // момент, когда страница может сообщить о себе, — сам рендер. Запись безопасна: приёмник
  // существует только внутри одного prerender-прохода и на клиенте всегда null.
  const collector = useContext(CeoCollectorContext);
  if (collector) collector.ceo = { title, description, path, jsonLd, noindex, lang };

  useEffect(() => {
    const url = `${SITE_URL}${localized}`;

    // Язык страницы — сигнал и для поисковика, и для скринридера.
    document.documentElement.lang = lang;

    if (title) {
      document.title = title;
      setMetaProp('og:title', title);
      setMetaName('twitter:title', title);
    }
    if (description) {
      setMetaName('description', description);
      setMetaProp('og:description', description);
      setMetaName('twitter:description', description);
    }
    // Выставляется на каждом роуте, а не только на noindex-странице: иначе уход
    // с 404 на обычную страницу оставил бы noindex висеть в <head>.
    setMetaName('robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    if (noindex) removeCanonical();
    else setCanonical(url);
    setMetaProp('og:url', url);
    setMetaProp('og:locale', ogLocale(lang));

    // hreflang: связывает языковые версии одной страницы. Без него Google считает их
    // конкурирующими дублями и показывает не ту, что нужна пользователю.
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
    const alternates = noindex ? [] : hreflangsFor(path);
    const altNodes = alternates.map(({ hreflang, href }) => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'alternate');
      l.setAttribute('hreflang', hreflang);
      l.setAttribute('href', href);
      document.head.appendChild(l);
      return l;
    });

    // WebPage идёт первым и добавляется автоматически — см. webPage(). Для noindex-страницы
    // (404) его нет: объявлять несуществующий URL как страницу сайта незачем.
    const graph = noindex ? (jsonLd ?? []) : [webPage({ title, description, url, lang }), ...(jsonLd ?? [])];

    // Разметку, впечатанную prerender'ом, надо снять перед вставкой своей: она описывает
    // ту же страницу теми же узлами, и без этого после гидратации в <head> висели два
    // одинаковых набора JSON-LD. Свой cleanup удаляет только то, что создал сам, — до
    // серверных тегов он не дотягивался.
    document.head.querySelectorAll('script[data-ceo-jsonld]').forEach((n) => n.remove());

    const nodes = graph.map((obj) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute('data-ceo-jsonld', '');
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
      return s;
    });

    return () => [...nodes, ...altNodes].forEach((n) => n.remove());
  }, [title, description, path, localized, jsonLd, noindex, lang]);
}

const escapeAttr = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Собранный на сервере CEO → готовые теги для <head> статической страницы.
 * Клиентский useCeo делает ровно то же самое, но через DOM: списки тегов обязаны
 * совпадать, иначе гидратация даст странице другой <head>, чем видел краулер.
 *
 * Только переменная часть. Постоянная (og:image, og:type, twitter:card, JSON-LD @graph)
 * живёт статикой в index.html и здесь не дублируется.
 */
export function renderCeoHead(ceo) {
  if (!ceo) return '';
  const { title, description, path, jsonLd, noindex = false, lang = 'ru' } = ceo;
  const url = `${SITE_URL}${noindex ? path : localizePath(path, lang)}`;
  const tags = [];

  if (title) {
    tags.push(`<title>${escapeAttr(title)}</title>`);
    tags.push(`<meta property="og:title" content="${escapeAttr(title)}" />`);
    tags.push(`<meta name="twitter:title" content="${escapeAttr(title)}" />`);
  }
  if (description) {
    tags.push(`<meta name="description" content="${escapeAttr(description)}" />`);
    tags.push(`<meta property="og:description" content="${escapeAttr(description)}" />`);
    tags.push(`<meta name="twitter:description" content="${escapeAttr(description)}" />`);
  }

  tags.push(
    `<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`,
  );
  // canonical на несуществующий URL указывать нельзя — см. noindex в useCeo.
  if (!noindex) tags.push(`<link rel="canonical" href="${escapeAttr(url)}" />`);
  tags.push(`<meta property="og:url" content="${escapeAttr(url)}" />`);
  tags.push(`<meta property="og:locale" content="${ogLocale(lang)}" />`);

  if (!noindex) {
    for (const { hreflang, href } of hreflangsFor(path)) {
      tags.push(`<link rel="alternate" hreflang="${hreflang}" href="${escapeAttr(href)}" />`);
    }
  }

  // Тот же автоматический WebPage, что и в useCeo — списки обязаны совпадать, иначе
  // гидратация даст странице другой набор разметки, чем видел краулер.
  const graph = noindex ? (jsonLd ?? []) : [webPage({ title, description, url, lang }), ...(jsonLd ?? [])];

  for (const obj of graph) {
    // </script> внутри JSON закрыл бы тег раньше времени.
    const json = JSON.stringify(obj).replace(/</g, '\\u003c');
    tags.push(`<script type="application/ld+json" data-ceo-jsonld>${json}</script>`);
  }

  return tags.join('\n    ');
}

/**
 * BreadcrumbList JSON-LD из пар { name, path }.
 * `path` — канонический (без языка); ссылки строятся под текущий язык, иначе узбекская
 * страница указывала бы хлебными крошками на русские URL.
 */
export function breadcrumb(items, lang = 'ru') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${localizePath(it.path, lang)}`,
    })),
  };
}

/**
 * FAQPage JSON-LD из пар { q, a }.
 *
 * Живёт в коде, а не статикой в index.html: разметка обязана быть на языке страницы —
 * русский FAQ на узбекской странице противоречил бы её содержимому, а для AI-поиска
 * именно FAQ — главный источник цитат.
 */
export function faqPage(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
