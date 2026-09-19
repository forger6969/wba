import { useState } from 'react';
import {
  Users, MousePointerClick, Timer, Eye, Search, Percent, TrendingUp, Globe,
  Monitor, LogOut, FileText, DoorOpen, AlertTriangle, ExternalLink, Settings2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSiteAnalytics } from '../queries.js';
import PageHeader from '../components/PageHeader.jsx';
import { Kpi, Panel, EmptyState, FilterPills, CHART_PRIMARY } from '../components/_ui.jsx';
import { SkeletonKpis, SkeletonTable } from '../components/Skeleton.jsx';
import { fmt, dateShort } from '../format.js';

/**
 * Аналитика сайта levelup-academy.uz (Karis 25.08.2026).
 *
 * Раньше эти цифры жили в трёх чужих кабинетах — Search Console, GA4 и
 * Clarity — и владелец платформы ходил туда руками. Здесь они сведены в один
 * экран, но НЕ смешаны: у поиска и у поведения на сайте разные источники и
 * даже разные периоды (Search Console публикует данные с задержкой в 3 дня),
 * и подписи об этом честно говорят.
 */

const PERIODS = [
  { key: 7, label: '7 дней' },
  { key: 28, label: '28 дней' },
  { key: 90, label: '90 дней' },
];

/** Секунды → «2 мин 14 с». Голое «134» на экране нечитаемо. */
function dur(seconds) {
  const s = Math.round(Number(seconds ?? 0));
  if (!s) return '0 с';
  if (s < 60) return `${s} с`;
  return `${Math.floor(s / 60)} мин ${String(s % 60).padStart(2, '0')} с`;
}

/** Доля 0..1 → «12,3%». Google отдаёт ctr и bounceRate именно долей. */
const pct = (v) => `${(Number(v ?? 0) * 100).toFixed(1).replace('.', ',')}%`;

/** Путь страницы: домен убираем, «/» подписываем — иначе строка пустая. */
function shortPath(raw) {
  if (!raw) return '—';
  const path = String(raw).replace(/^https?:\/\/[^/]+/, '') || '/';
  return path === '/' ? '/ (главная)' : path;
}

/** Строка-бар: значение видно и цифрой, и длиной полосы. */
function BarRow({ label, value, max, hint }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-sm font-medium truncate" title={label}>{label}</span>
        <span className="text-sm font-bold tabular-nums shrink-0">{fmt(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      {hint && <div className="text-[11px] text-base-content/40 mt-1">{hint}</div>}
    </div>
  );
}

function BarList({ items, empty }) {
  if (!items?.length) return <div className="text-sm text-base-content/40 text-center py-8">{empty}</div>;
  const max = Math.max(...items.map((i) => i.value));
  return <div className="divide-y divide-base-200/60">{items.map((i) => <BarRow key={i.label} {...i} max={max} />)}</div>;
}

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid var(--fallback-b3,#e5e7eb)', fontSize: 12 },
};

/**
 * Экран «ключа ещё нет». Показываем не ошибку, а список дел: без сервисного
 * аккаунта Google данных взять физически неоткуда, и вина тут не в панели.
 */
function SetupGuide({ data }) {
  const steps = [
    {
      title: 'Создать сервисный аккаунт Google',
      body: 'console.cloud.google.com → проект levelup-1c059 → IAM и администрирование → Сервисные аккаунты → Создать. Роль не нужна — доступ выдаётся не здесь, а в самих сервисах (шаги 3 и 4). Затем Ключи → Добавить ключ → JSON.',
      link: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    },
    {
      title: 'Включить два API',
      body: 'В том же проекте: Google Analytics Data API и Google Search Console API. Без этого ключ рабочий, а запросы отвечают 403.',
      link: 'https://console.cloud.google.com/apis/library',
    },
    {
      title: 'Дать доступ в GA4',
      body: 'analytics.google.com → Администратор → Управление доступом к ресурсу → добавить e-mail сервисного аккаунта с ролью «Читатель». Там же, в «Настройках ресурса», взять числовой идентификатор — это GA4_PROPERTY_ID (не G-RWCK0B6TXP из тега).',
      link: 'https://analytics.google.com/',
    },
    {
      title: 'Дать доступ в Search Console',
      body: 'search.google.com/search-console → ресурс sc-domain:levelup-academy.uz → Настройки → Пользователи и разрешения → Добавить пользователя, тот же e-mail, разрешение «Ограниченный доступ» — проверено, этого хватает для чтения статистики.',
      link: 'https://search.google.com/search-console',
    },
    {
      title: 'Положить значения в backend/.env',
      body: 'GOOGLE_SA_CLIENT_EMAIL, GOOGLE_SA_PRIVATE_KEY (из JSON, переводы строк оставить как \\n), GA4_PROPERTY_ID. GSC_SITE_URL уже задан по умолчанию. После этого перезапустить бэкенд.',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="alert bg-warning/10 border border-warning/30 text-sm">
        <Settings2 size={18} className="text-warning shrink-0" />
        <div>
          <div className="font-bold">Доступ к данным Google ещё не настроен</div>
          <div className="text-base-content/60 mt-0.5">
            Сбор данных на сайте идёт давно — GA4 с 17.07.2026, Search Console с 15.07.2026.
            Не хватает только ключа, которым сервер их прочитает.
          </div>
        </div>
      </div>

      <Panel title="Что нужно сделать" icon={Settings2}>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
                  {s.title}
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 text-xs font-medium">
                      открыть <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <p className="text-sm text-base-content/60 mt-0.5 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Чего не хватает сейчас">
        <div className="space-y-2">
          {(data.missing ?? []).map((k) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
              <code className="font-mono text-xs bg-base-200 px-1.5 py-0.5 rounded">{k}</code>
              <span className="text-base-content/45 text-xs">не задана в backend/.env</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            <code className="font-mono text-xs bg-base-200 px-1.5 py-0.5 rounded">GSC_SITE_URL</code>
            <span className="text-base-content/45 text-xs">{data.gscSiteUrl}</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SourceError({ text }) {
  return (
    <div className="alert bg-error/10 border border-error/25 text-sm">
      <AlertTriangle size={16} className="text-error shrink-0" />
      <span className="text-base-content/70">{text}</span>
    </div>
  );
}

export default function SiteAnalytics() {
  const [days, setDays] = useState(28);
  const { data, isLoading, error } = useSiteAnalytics(days);

  if (error && error.status !== 401) {
    return <div className="alert alert-error text-sm"><span>{error.message}</span></div>;
  }

  const header = (
    <PageHeader
      title="Аналитика сайта"
      subtitle="levelup-academy.uz — как находят в Google и что делают на сайте"
    >
      <FilterPills options={PERIODS} value={days} onChange={setDays} />
    </PageHeader>
  );

  if (isLoading && !data) {
    return <div className="space-y-6">{header}<SkeletonKpis count={4} /><SkeletonTable rows={6} cols={4} /></div>;
  }

  if (data && !data.configured) {
    return <div>{header}<SetupGuide data={data} /></div>;
  }

  const { traffic, behaviour, search, trends, errors } = data ?? {};
  const t = traffic?.totals;

  return (
    <div className="space-y-6">
      {header}

      {errors?.traffic && <SourceError text={errors.traffic} />}
      {errors?.behaviour && <SourceError text={errors.behaviour} />}
      {errors?.search && <SourceError text={errors.search} />}

      {/* --- Поведение на сайте (GA4) --- */}
      {traffic && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi Icon={Users} title="Посетители" value={fmt(t.activeUsers)}
              unit={`${fmt(t.newUsers)} впервые`} trend={trends?.activeUsers} trendLabel="к прошлому периоду" />
            <Kpi Icon={MousePointerClick} title="Сеансы" value={fmt(t.sessions)}
              unit={`${fmt(t.screenPageViews)} просмотров страниц`} trend={trends?.sessions} trendLabel="к прошлому периоду" tone="success" />
            <Kpi Icon={Timer} title="Среднее время" value={dur(t.averageSessionDuration)}
              unit="за один визит" trend={trends?.averageSessionDuration} trendLabel="к прошлому периоду" tone="warning" />
            <Kpi Icon={Percent} title="Вовлечённость" value={pct(t.engagementRate)}
              unit={`отказы ${pct(t.bounceRate)}`} tone="neutral" />
          </div>

          <Panel title={`Посетители по дням · ${days} дн.`} icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={traffic.timeline} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="siteUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
                <XAxis dataKey="date" tickFormatter={(d) => dateShort(d).replace(/ \d{4} г\.$/, '')}
                  fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip {...tooltipStyle} labelFormatter={(d) => dateShort(d)}
                  formatter={(v, name) => [fmt(v), name === 'users' ? 'Посетители' : 'Сеансы']} />
                <Area type="monotone" dataKey="users" stroke={CHART_PRIMARY} strokeWidth={2} fill="url(#siteUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="Откуда приходят" icon={Globe}>
              <BarList
                empty="За период переходов не зафиксировано"
                items={traffic.channels.map((c) => ({
                  label: c.channel, value: c.sessions, hint: `${fmt(c.users)} человек`,
                }))}
              />
            </Panel>

            <Panel title="Что смотрят" icon={FileText}>
              <BarList
                empty="Просмотров за период нет"
                items={traffic.pages.slice(0, 8).map((p) => ({
                  label: shortPath(p.path), value: p.views, hint: `в среднем ${dur(p.avgSeconds)} на странице`,
                }))}
              />
            </Panel>
          </div>
        </>
      )}

      {/* --- Куда уходят (GA4 + собственное событие page_exit) --- */}
      {behaviour && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Panel title="Где уходят с сайта" icon={DoorOpen}>
            <p className="text-xs text-base-content/45 mb-2 leading-relaxed">
              В GA4 нет метрики «выходов» — её убрали вместе с Universal Analytics.
              Поэтому лендинг шлёт собственное событие при закрытии вкладки.
              Данные копятся с {dateShort(data.exitTrackingSince)}.
            </p>
            {behaviour.exitPages.length ? (
              <BarList items={behaviour.exitPages.slice(0, 8).map((p) => ({
                label: shortPath(p.path), value: p.exits,
              }))} />
            ) : (
              <EmptyState icon={LogOut} title="Данных пока нет"
                hint={`Событие выкатили ${dateShort(data.exitTrackingSince)} — первые цифры появятся, когда на сайт зайдут после этой даты.`} />
            )}
          </Panel>

          <Panel title="Страницы входа" icon={LogOut}>
            <p className="text-xs text-base-content/45 mb-2 leading-relaxed">
              С какой страницы начинают визит и как часто он ничем не заканчивается.
            </p>
            {behaviour.landingPages.length ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr>
                    <th>Страница</th>
                    <th className="text-right">Визиты</th>
                    <th className="text-right">Отказы</th>
                    <th className="text-right">Время</th>
                  </tr></thead>
                  <tbody>
                    {behaviour.landingPages.slice(0, 8).map((p) => (
                      <tr key={p.path} className="hover">
                        <td className="max-w-[220px] truncate" title={p.path}>{shortPath(p.path)}</td>
                        <td className="text-right tabular-nums">{fmt(p.sessions)}</td>
                        <td className={`text-right tabular-nums font-semibold ${p.bounceRate > 0.7 ? 'text-error' : ''}`}>{pct(p.bounceRate)}</td>
                        <td className="text-right tabular-nums text-base-content/50">{dur(p.avgSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-base-content/40 text-center py-8">За период визитов не было</div>
            )}
          </Panel>
        </div>
      )}

      {behaviour && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Panel title="Страны" icon={Globe}>
            <BarList empty="Нет данных" items={behaviour.countries.slice(0, 6).map((c) => ({
              label: c.country || 'Не определено', value: c.users,
            }))} />
          </Panel>
          <Panel title="Устройства" icon={Monitor}>
            <BarList empty="Нет данных" items={behaviour.devices.map((d) => ({
              label: { desktop: 'Компьютер', mobile: 'Телефон', tablet: 'Планшет' }[d.device] ?? d.device,
              value: d.sessions,
            }))} />
          </Panel>
          <Panel title="Заявки с сайта" icon={MousePointerClick}>
            <div className="text-center py-6">
              <div className="text-4xl font-extrabold tabular-nums">{fmt(behaviour.leadEvents)}</div>
              <p className="text-xs text-base-content/45 mt-2 leading-relaxed">
                отправок формы за период (событие generate_lead).
                Сколько из них дошло до нас — на странице «Заявки».
              </p>
            </div>
          </Panel>
        </div>
      )}

      {/* --- Поиск Google (Search Console) --- */}
      {search && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <Search size={16} className="text-primary" />
            <h2 className="text-sm font-bold">Поиск Google</h2>
            <span className="text-xs text-base-content/40">
              {dateShort(data.searchRange.startDate)} — {dateShort(data.searchRange.endDate)} ·
              Google публикует эти данные с задержкой в 3 дня
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi Icon={MousePointerClick} title="Кликов" value={fmt(search.totals.clicks)} unit="переходов из выдачи" tone="success" />
            <Kpi Icon={Eye} title="Показов" value={fmt(search.totals.impressions)} unit="раз показались в поиске" />
            <Kpi Icon={Percent} title="CTR" value={pct(search.totals.ctr)} unit="кликов на показ" tone="warning" />
            <Kpi Icon={TrendingUp} title="Позиция" value={search.totals.position.toFixed(1).replace('.', ',')} unit="средняя в выдаче" tone="neutral" />
          </div>

          {search.timeline.length > 0 && (
            <Panel title="Показы и клики по дням" icon={Search}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={search.timeline} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
                  <XAxis dataKey="date" tickFormatter={(d) => dateShort(d).replace(/ \d{4} г\.$/, '')}
                    fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip {...tooltipStyle} labelFormatter={(d) => dateShort(d)}
                    formatter={(v, name) => [fmt(v), name === 'clicks' ? 'Клики' : 'Показы']} />
                  <Bar dataKey="impressions" fill={CHART_PRIMARY} fillOpacity={0.25} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="clicks" fill={CHART_PRIMARY} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="По каким запросам находят" icon={Search}>
              {search.queries.length ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead><tr>
                      <th>Запрос</th>
                      <th className="text-right">Клики</th>
                      <th className="text-right">Показы</th>
                      <th className="text-right">Позиция</th>
                    </tr></thead>
                    <tbody>
                      {search.queries.slice(0, 15).map((q) => (
                        <tr key={q.query} className="hover">
                          <td className="max-w-[240px] truncate" title={q.query}>{q.query}</td>
                          <td className="text-right tabular-nums font-semibold">{fmt(q.clicks)}</td>
                          <td className="text-right tabular-nums text-base-content/50">{fmt(q.impressions)}</td>
                          <td className="text-right tabular-nums text-base-content/50">{q.position.toFixed(1).replace('.', ',')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Search} title="Запросов за период нет"
                  hint="Google не показывал сайт в выдаче — либо страницы ещё не проиндексированы." />
              )}
            </Panel>

            <Panel title="Какие страницы находят" icon={FileText}>
              {search.pages.length ? (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead><tr>
                      <th>Страница</th>
                      <th className="text-right">Клики</th>
                      <th className="text-right">Показы</th>
                      <th className="text-right">CTR</th>
                    </tr></thead>
                    <tbody>
                      {search.pages.slice(0, 15).map((p) => (
                        <tr key={p.page} className="hover">
                          <td className="max-w-[240px] truncate" title={p.page}>{shortPath(p.page)}</td>
                          <td className="text-right tabular-nums font-semibold">{fmt(p.clicks)}</td>
                          <td className="text-right tabular-nums text-base-content/50">{fmt(p.impressions)}</td>
                          <td className="text-right tabular-nums text-base-content/50">{pct(p.ctr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-base-content/40 text-center py-8">Нет данных за период</div>
              )}
            </Panel>
          </div>
        </>
      )}

      {data?.generatedAt && (
        <p className="text-[11px] text-base-content/35 text-center pt-2">
          Данные обновлены {new Date(data.cachedAt ?? data.generatedAt).toLocaleString('ru-RU')} ·
          кешируются на 10 минут, чтобы не дёргать Google на каждое открытие
        </p>
      )}
    </div>
  );
}
