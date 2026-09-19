import { env } from '../../config/env.js';
import { googleClient, describeGoogleError } from './google.auth.js';

/**
 * Google Search Console API — как сайт находят в поиске (Karis 25.08.2026).
 *
 * Search Console отвечает ровно на один вопрос: по каким запросам нас видят и
 * кликают в выдаче Google. Что человек делал ПОСЛЕ клика — сколько пробыл,
 * куда ушёл — он не знает в принципе, данные обрываются на переходе. Поведение
 * приходит из GA4 (ga4.client.js); подменять одно другим нельзя.
 */
const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3';

/**
 * Search Console публикует данные с задержкой в 2–3 дня. Если брать период
 * по сегодняшний день, последние дни всегда приходят нулями, и график врёт —
 * выглядит как обвал трафика. Поэтому окно сдвинуто на 3 дня назад, а фронт
 * показывает реальные даты периода рядом с цифрами.
 */
const LAG_DAYS = 3;

const ymd = (d) => d.toISOString().slice(0, 10);

export function gscRange(days) {
  const end = new Date(Date.now() - LAG_DAYS * 86_400_000);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  return { startDate: ymd(start), endDate: ymd(end) };
}

async function query(body) {
  const client = googleClient();
  // Ресурс идёт в путь и обязан быть закодирован целиком: в domain-property
  // есть двоеточие ('sc-domain:levelup-academy.uz'), без кодирования Google
  // видит обрезанное имя сайта и отвечает 404.
  const site = encodeURIComponent(env.GSC_SITE_URL);
  const res = await client.request({
    url: `${GSC_API}/sites/${site}/searchAnalytics/query`,
    method: 'POST',
    data: { type: 'web', ...body },
  });
  return res.data.rows ?? [];
}

const shape = (r) => ({
  clicks: r.clicks ?? 0,
  impressions: r.impressions ?? 0,
  ctr: r.ctr ?? 0,
  position: r.position ?? 0,
});

/**
 * Шесть срезов сразу. Search Console не умеет батчить несколько отчётов в один
 * HTTP-вызов (в отличие от GA4), поэтому запускаем параллельно — по времени это
 * один запрос, а не шесть подряд.
 *
 * Итоги берём отдельным запросом, а не суммой по дням: клики и показы сложить
 * можно, а средняя позиция — это взвешенное среднее, сумма дала бы чушь.
 */
export async function fetchSearch(days) {
  const range = gscRange(days);

  const [totals, queries, pages, byDate, countries, devices] = await Promise.all([
    query({ ...range }),
    query({ ...range, dimensions: ['query'], rowLimit: 25 }),
    query({ ...range, dimensions: ['page'], rowLimit: 25 }),
    query({ ...range, dimensions: ['date'], rowLimit: 500 }),
    query({ ...range, dimensions: ['country'], rowLimit: 10 }),
    query({ ...range, dimensions: ['device'], rowLimit: 5 }),
  ]);

  return {
    range,
    totals: totals[0] ? shape(totals[0]) : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    queries: queries.map((r) => ({ query: r.keys[0], ...shape(r) })),
    pages: pages.map((r) => ({ page: r.keys[0], ...shape(r) })),
    timeline: byDate.map((r) => ({ date: r.keys[0], clicks: r.clicks ?? 0, impressions: r.impressions ?? 0 })),
    countries: countries.map((r) => ({ country: r.keys[0], ...shape(r) })),
    devices: devices.map((r) => ({ device: r.keys[0], ...shape(r) })),
  };
}

export const gscError = (err) => describeGoogleError(err, 'Search Console');
