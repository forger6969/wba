import { env } from '../../config/env.js';
import { googleClient, describeGoogleError } from './google.auth.js';

/**
 * Google Analytics 4 Data API — поведение посетителей на levelup-academy.uz
 * (Karis 25.08.2026).
 *
 * Ходим напрямую по REST через уже подключённый google-auth-library, без пакета
 * @google-analytics/data: он тянет grpc и protobuf ради двух эндпоинтов.
 *
 * Все отчёты уходят одним batchRunReports вместо пяти отдельных запросов —
 * каждый вызов это ~1 секунда сетевого пути, последовательно страница
 * открывалась бы десяток секунд. Лимит Google — 5 отчётов на batch, поэтому
 * их ровно два.
 */
const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';

/** Относительные даты вместо календарных: GA4 считает их в таймзоне ресурса,
 *  а сервер живёт в своей — на календарных периоды разъезжались бы на сутки. */
function ranges(days) {
  return {
    current: { startDate: `${days - 1}daysAgo`, endDate: 'today' },
    previous: { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` },
  };
}

const metrics = (...names) => names.map((name) => ({ name }));
const dimensions = (...names) => names.map((name) => ({ name }));
const byMetricDesc = (metricName) => [{ metric: { metricName }, desc: true }];

/** Строки отчёта → массив простых объектов: [{ keys:[...], values:[...] }]. */
function rows(report) {
  return (report?.rows ?? []).map((r) => ({
    keys: (r.dimensionValues ?? []).map((d) => d.value),
    values: (r.metricValues ?? []).map((m) => Number(m.value ?? 0)),
  }));
}

/** Первая строка отчёта без разбивки — это и есть итоги за период. */
function totalsOf(report, names) {
  const first = rows(report)[0];
  const out = {};
  names.forEach((name, i) => { out[name] = first ? first.values[i] : 0; });
  return out;
}

/** "20260825" → "2026-08-25" (GA4 отдаёт дату без разделителей). */
const isoDate = (raw) => `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

async function batch(requests) {
  const client = googleClient();
  const res = await client.request({
    url: `${DATA_API}/properties/${env.GA4_PROPERTY_ID}:batchRunReports`,
    method: 'POST',
    data: { requests },
  });
  return res.data.reports ?? [];
}

const TOTAL_METRICS = [
  'activeUsers', 'newUsers', 'sessions', 'screenPageViews',
  'averageSessionDuration', 'bounceRate', 'engagementRate',
];

/**
 * Весь блок «Посетители» одним вызовом.
 *
 * Возвращает и предыдущий период: без него число «412 посетителей» ничего не
 * говорит — важно, больше это или меньше, чем было.
 */
export async function fetchTraffic(days) {
  const { current, previous } = ranges(days);

  const [totals, prevTotals, byDate, channels, pages] = await batch([
    { dateRanges: [current], metrics: metrics(...TOTAL_METRICS) },
    { dateRanges: [previous], metrics: metrics(...TOTAL_METRICS) },
    {
      dateRanges: [current],
      dimensions: dimensions('date'),
      metrics: metrics('activeUsers', 'sessions'),
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 400,
    },
    {
      dateRanges: [current],
      dimensions: dimensions('sessionDefaultChannelGroup'),
      metrics: metrics('sessions', 'activeUsers'),
      orderBys: byMetricDesc('sessions'),
      limit: 10,
    },
    {
      dateRanges: [current],
      dimensions: dimensions('pagePath'),
      metrics: metrics('screenPageViews', 'activeUsers', 'userEngagementDuration'),
      orderBys: byMetricDesc('screenPageViews'),
      limit: 15,
    },
  ]);

  const now = totalsOf(totals, TOTAL_METRICS);
  const before = totalsOf(prevTotals, TOTAL_METRICS);

  return {
    totals: now,
    previousTotals: before,
    timeline: rows(byDate).map((r) => ({
      date: isoDate(r.keys[0]),
      users: r.values[0],
      sessions: r.values[1],
    })),
    channels: rows(channels).map((r) => ({
      channel: r.keys[0],
      sessions: r.values[0],
      users: r.values[1],
    })),
    pages: rows(pages).map((r) => ({
      path: r.keys[0],
      views: r.values[0],
      users: r.values[1],
      // суммарное время вовлечения делим на просмотры — среднее «сколько
      // человек реально провёл на этой странице», в секундах
      avgSeconds: r.values[0] > 0 ? r.values[2] / r.values[0] : 0,
    })),
  };
}

/**
 * Блок «Куда уходят»: страницы входа, точки выхода, страны, устройства, заявки.
 *
 * Про точки выхода важно понимать: метрики exit rate в GA4 НЕ существует —
 * её убрали при переходе с Universal Analytics. Поэтому лендинг шлёт
 * собственное событие page_exit (frontend/landing-page/src/lib/analytics.js),
 * а здесь мы считаем его в разрезе pagePath. Данные копятся только с момента
 * выкатки этого события — сервис помечает блок флагом sinceDeploy, чтобы
 * пустая таблица не выглядела как «на сайт никто не заходит».
 */
export async function fetchBehaviour(days) {
  const { current } = ranges(days);

  const [landings, exits, countries, devices, leads] = await batch([
    {
      dateRanges: [current],
      dimensions: dimensions('landingPage'),
      metrics: metrics('sessions', 'bounceRate', 'averageSessionDuration'),
      orderBys: byMetricDesc('sessions'),
      limit: 15,
    },
    {
      dateRanges: [current],
      dimensions: dimensions('pagePath'),
      metrics: metrics('eventCount'),
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'page_exit' } } },
      orderBys: byMetricDesc('eventCount'),
      limit: 15,
    },
    {
      dateRanges: [current],
      dimensions: dimensions('country'),
      metrics: metrics('activeUsers', 'sessions'),
      orderBys: byMetricDesc('activeUsers'),
      limit: 10,
    },
    {
      dateRanges: [current],
      dimensions: dimensions('deviceCategory'),
      metrics: metrics('sessions'),
      orderBys: byMetricDesc('sessions'),
      limit: 5,
    },
    {
      dateRanges: [current],
      dimensions: dimensions('eventName'),
      metrics: metrics('eventCount'),
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'generate_lead' } } },
      limit: 1,
    },
  ]);

  return {
    landingPages: rows(landings).map((r) => ({
      path: r.keys[0],
      sessions: r.values[0],
      bounceRate: r.values[1],
      avgSeconds: r.values[2],
    })),
    exitPages: rows(exits).map((r) => ({ path: r.keys[0], exits: r.values[0] })),
    countries: rows(countries).map((r) => ({
      country: r.keys[0], users: r.values[0], sessions: r.values[1],
    })),
    devices: rows(devices).map((r) => ({ device: r.keys[0], sessions: r.values[0] })),
    leadEvents: rows(leads)[0]?.values[0] ?? 0,
  };
}

export const ga4Error = (err) => describeGoogleError(err, 'Google Analytics');
