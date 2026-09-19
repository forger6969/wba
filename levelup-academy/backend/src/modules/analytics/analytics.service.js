import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { isConfigured, missingConfig } from './google.auth.js';
import { fetchTraffic, fetchBehaviour, ga4Error } from './ga4.client.js';
import { fetchSearch, gscRange, gscError } from './gsc.client.js';

/**
 * Аналитика сайта levelup-academy.uz для Main Admin (Karis 25.08.2026).
 *
 * Сводит в один экран три источника, по которым раньше приходилось ходить
 * руками в три разных кабинета:
 *   Search Console — по каким запросам нас находят в Google;
 *   GA4            — сколько людей пришло, сколько пробыли, откуда пришли;
 *   GA4 + page_exit — на каких страницах уходят.
 *
 * Принцип: НИКОГДА не выдавать отсутствие данных за нули. Если ключа нет —
 * configured:false и список недостающих переменных. Если один из API ответил
 * ошибкой — соответствующий блок приходит как null плюс текст ошибки в errors,
 * а остальные блоки рисуются. Пустой массив здесь означает ровно одно: Google
 * ответил успешно и данных за период действительно нет.
 */

/** Периоды, которые отдаём панели. Больше 90 дней Search Console не хранит
 *  в отчётах по запросам вовсе — предлагать 180 дней было бы обманом. */
export const ALLOWED_DAYS = [7, 28, 90];

/**
 * Дата, с которой на лендинге стоит событие page_exit. До неё точек выхода
 * физически не существует — GA4 не хранит exit rate (метрику убрали вместе с
 * Universal Analytics). Фронт показывает эту дату рядом с таблицей, иначе
 * короткий список выглядел бы как поломка.
 */
export const EXIT_TRACKING_SINCE = '2026-08-25';

/**
 * Кеш в памяти процесса, а не в Redis: Upstash у нас уже упёрся в лимит
 * бесплатного плана, а данные тут не критичные и переживать рестарт им незачем.
 * Смысл кеша не в квотах Google (они щедрые), а в скорости: восемь сетевых
 * вызовов к Google — это несколько секунд на каждое открытие страницы.
 */
const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

function fromCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) { cache.delete(key); return null; }
  return { ...hit.payload, cachedAt: new Date(hit.at).toISOString() };
}

/** Процент изменения к прошлому периоду. null, когда сравнивать не с чем:
 *  показать «+100%» вместо «данных не было» — это враньё в цифре. */
function deltaPct(now, before) {
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  return ((now - before) / before) * 100;
}

function trends(totals, previousTotals) {
  const keys = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration'];
  return Object.fromEntries(keys.map((k) => [k, deltaPct(totals?.[k], previousTotals?.[k])]));
}

export async function siteAnalytics(days = 28) {
  const period = ALLOWED_DAYS.includes(Number(days)) ? Number(days) : 28;

  if (!isConfigured()) {
    return {
      configured: false,
      missing: missingConfig(),
      // то, что уже известно — чтобы на экране было видно, куда именно
      // добавлять сервисный аккаунт
      serviceAccountEmail: env.GOOGLE_SA_CLIENT_EMAIL || null,
      ga4PropertyId: env.GA4_PROPERTY_ID || null,
      gscSiteUrl: env.GSC_SITE_URL,
    };
  }

  const cacheKey = `site:${period}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  // allSettled, а не all: падение Search Console не должно уносить с собой
  // блок посещаемости — это независимые источники
  const [trafficRes, behaviourRes, searchRes] = await Promise.allSettled([
    fetchTraffic(period),
    fetchBehaviour(period),
    fetchSearch(period),
  ]);

  const errors = {};
  let traffic = null;
  let behaviour = null;
  let search = null;

  if (trafficRes.status === 'fulfilled') {
    traffic = trafficRes.value;
  } else {
    errors.traffic = ga4Error(trafficRes.reason);
    logger.warn({ err: trafficRes.reason }, 'GA4 traffic report failed');
  }

  if (behaviourRes.status === 'fulfilled') {
    behaviour = behaviourRes.value;
  } else {
    errors.behaviour = ga4Error(behaviourRes.reason);
    logger.warn({ err: behaviourRes.reason }, 'GA4 behaviour report failed');
  }

  if (searchRes.status === 'fulfilled') {
    search = searchRes.value;
  } else {
    errors.search = gscError(searchRes.reason);
    logger.warn({ err: searchRes.reason }, 'Search Console report failed');
  }

  const payload = {
    configured: true,
    site: 'levelup-academy.uz',
    days: period,
    // периоды у источников разные и это не ошибка: Search Console публикует
    // данные с задержкой в 3 дня, поэтому его окно сдвинуто назад
    searchRange: gscRange(period),
    traffic,
    behaviour,
    search,
    trends: traffic ? trends(traffic.totals, traffic.previousTotals) : null,
    exitTrackingSince: EXIT_TRACKING_SINCE,
    errors: Object.keys(errors).length ? errors : null,
    generatedAt: new Date().toISOString(),
  };

  // в кеш кладём только удачные сборки: закешировать ошибку на 10 минут
  // значит показывать её ещё десять минут после того, как всё починили
  if (!payload.errors) cache.set(cacheKey, { at: Date.now(), payload });

  return payload;
}
