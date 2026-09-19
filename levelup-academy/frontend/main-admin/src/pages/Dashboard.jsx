import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Building2, GraduationCap, Store, RefreshCw, ArrowRight,
  Inbox, Crown, Sparkles, PhoneCall, CheckCircle2, XCircle,
  TrendingUp, Snowflake, Zap, PieChart as PieIcon,
  Calculator, Percent, Award, ChevronRight, Power, Pause,
  Landmark, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { fmt, dateShort, LEAD_STATUS, ORG_STATUS } from '../format.js';
import { tierRange, tierPriceLabel } from '../lib/pricing.js';
import { useDashboard, useLeads, useInvalidate, useFinance } from '../queries.js';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonKpis, SkeletonList } from '../components/Skeleton.jsx';
import { Modal, ConfirmDialog, Avatar, CHART_PRIMARY, CHART_SERIES } from '../components/_ui.jsx';
import ActionCenterPanel from '../components/ActionCenterPanel.jsx';

// Цвет — из ORG_STATUS (общий с бейджами в остальной панели), подписи здесь
// намеренно во множественном числе — это легенда по группе партнёров, а не
// бейдж одного (тот берёт "Активен"/"Заморожен" прямо из ORG_STATUS).
const PIE_LABELS = { active: 'Активные', trial: 'Триал', frozen: 'Заморожены' };
const STATUS_ICON = { new: Sparkles, contacted: PhoneCall, onboarded: CheckCircle2, rejected: XCircle };

// Цвета сетки/осей/курсора графика — chrome вокруг данных, не сами данные
// (для тех есть CHART_PRIMARY/CHART_SERIES), поэтому осознанно нейтральные,
// не бренд-лайм: подсвеченные лаймом подписи осей отвлекали бы от бара.
// Вынесены в константы, а не разбросаны по JSX — одно место на случай темы.
const CHART_GRID = '#f0f0f0';
const CHART_AXIS_TEXT = '#9ca3af';
const CHART_TOOLTIP_CURSOR = '#F7FEE7';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-base-100 border border-base-200 rounded-md shadow-xl px-4 py-3 text-sm">
      <div className="font-semibold mb-1 truncate max-w-[200px]">{payload[0]?.payload?.fullName || label}</div>
      <div className="text-primary font-bold">{fmt(payload[0]?.value)} UZS/мес</div>
    </div>
  );
};

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { data: allLeads } = useLeads();

  const recentLeads = useMemo(
    () => (allLeads || [])
      .filter((l) => l.status === 'new' || l.status === 'contacted')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4),
    [allLeads],
  );
  const newLeadsCount = (allLeads || []).filter((l) => l.status === 'new').length;

  if (error && error.status !== 401) {
    return (
      <div className="alert alert-error text-sm flex items-center justify-between">
        <span>{error.message}</span>
        <button className="btn btn-sm btn-ghost gap-1" onClick={() => refetch()}>
          <RefreshCw size={14} /> Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Обзор" />

      <ActionCenterPanel />

      {isLoading || !data ? (
        <>
          <SkeletonKpis count={4} />
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            <div className="card bg-base-100 lg:col-span-2"><div className="card-body"><SkeletonList rows={6} /></div></div>
            <div className="card bg-base-100"><div className="card-body"><SkeletonList rows={5} /></div></div>
          </div>
        </>
      ) : (
        <Loaded
          data={data}
          recentLeads={recentLeads}
          newLeadsCount={newLeadsCount}
          allLeadsCount={(allLeads || []).length}
        />
      )}
    </div>
  );
}

function Loaded({ data, recentLeads, newLeadsCount, allLeadsCount }) {
  const t = data.totals;
  const cur = t.currency;
  const pricing = data.pricing || {};
  const partners = data.partners || [];

  const [modal, setModal] = useState(null); // 'income' | 'partners' | 'students' | 'branches' | { type:'partner', p }
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  const { token } = useAuth();
  const invalidate = useInvalidate();

  // Реально собранные платежи (не путать с ourMonthlyIncome выше — тот
  // считается «здесь и сейчас» по тарифам активных партнёров, это — то,
  // что фактически пришло по месяцам). Раньше карточка стояла отдельно
  // в правой колонке специально ради спарклайна по finance.trend — но
  // третья карточка там делала колонку заметно длиннее графика слева,
  // и разница высот вскрывалась пустым фоном страницы. Теперь это плоская
  // MetricCell в общей ленте сверху (не поддерживает спарклайн) — trend
  // (дельта в %) при этом остался настоящим, только линия графика ушла.
  const { data: finance, isLoading: financeLoading } = useFinance();
  const collectedThisMonth = finance?.thisMonth?.revenue ?? 0;
  const collectedLastMonth = finance?.lastMonth?.revenue ?? 0;
  const collectedDelta = collectedLastMonth > 0
    ? ((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100
    : null;

  /* Здесь был блок «Скоро разморозка»: он читал дату разморозки из
     localStorage браузера. Ни база, ни API такого поля не хранят — напоминание
     видел только тот, кто сам нажал «Заморозить», на своей же машине, и оно
     исчезало вместе с очисткой кэша. Убрано вместе с формой причины и срока
     заморозки (см. Organizations.jsx). Если напоминание нужно по-настоящему —
     это поля frozen_until/frozen_reason у organizations плюс отдача их в
     /main/dashboard, то есть работа на бэкенде, а не в браузере. */

  const sorted = [...partners].sort((a, b) => (b.monthlyBill || 0) - (a.monthlyBill || 0));
  const topPartners = sorted.slice(0, 6);
  const maxBill = Math.max(1, ...partners.map((p) => p.monthlyBill || 0));
  const totalIncome = partners.reduce((s, p) => s + (p.monthlyBill || 0), 0);
  const activeCount = partners.filter((p) => p.status === 'active').length;
  const trialCount = partners.filter((p) => p.status === 'trial').length;
  const frozenCount = partners.filter((p) => p.status === 'frozen').length;
  const avgBill = partners.length ? Math.round(totalIncome / partners.length) : 0;
  const activeShare = partners.length ? Math.round((activeCount / partners.length) * 100) : 0;
  const frozenShare = partners.length ? Math.round((frozenCount / partners.length) * 100) : 0;
  const trialShare = partners.length ? Math.round((trialCount / partners.length) * 100) : 0;

  const barData = topPartners.map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
    fullName: p.name,
    value: p.monthlyBill || 0,
    id: p.id,
  }));

  const statusCounts = partners.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: PIE_LABELS[status] || status,
    key: status,
    value: count,
    color: ORG_STATUS[status]?.color || '#94a3b8',
  }));

  const topByStudents = [...partners].sort((a, b) => (b.students || 0) - (a.students || 0)).slice(0, 5);
  const topByBranches = [...partners].sort((a, b) => (b.branches || 0) - (a.branches || 0)).slice(0, 5);

  const togglePartnerStatus = async (p) => {
    if (!p) return;
    // Раньше было `active ? frozen : active` — для триального партнёра
    // (status='trial') условие ложно, next='active', и кнопка «Заморозить»
    // в PartnerModal (её подпись зависит только от frozen=status==='frozen')
    // молча АКТИВИРОВАЛА триального партнёра вместо заморозки. Верная
    // формула — как в OrgDetail.jsx: только frozen размораживается,
    // всё остальное (active И trial) уходит в frozen.
    const next = p.status === 'frozen' ? 'active' : 'frozen';
    setBusyId(p.id);
    setErr('');
    try {
      await api.setPartnerStatus(token, p.id, next);
      invalidate('dashboard');
      setModal(null);
    } catch (e) {
      // было alert(): единственное место в панели, где ошибка выпадала
      // системным окном поверх интерфейса — везде остальное показывается в вёрстке
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {err && (
        <div className="alert alert-error mb-4 text-sm">
          <span>{err}</span>
        </div>
      )}

      <div className="grid overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)] sm:grid-cols-2 lg:grid-cols-5">
        <MetricCell Icon={Wallet} label="Доход / месяц" value={fmt(t.ourMonthlyIncome)} meta={`${cur} · ${activeCount} активных`} onClick={() => setModal('income')} />
        <MetricCell Icon={Building2} label="Партнёры" value={fmt(t.partners)} meta={`${activeShare}% активны`} onClick={() => setModal('partners')} />
        <MetricCell Icon={GraduationCap} label="Ученики" value={fmt(t.students)} meta={`${partners.length ? Math.round(t.students / partners.length) : 0} в среднем`} onClick={() => setModal('students')} />
        <MetricCell Icon={Store} label="Филиалы" value={fmt(t.branches)} meta={`${partners.length ? (t.branches / partners.length).toFixed(1) : 0} на партнёра`} onClick={() => setModal('branches')} />
        {/* «Собрано за месяц» — раньше отдельной карточкой в правой колонке
            (см. историю коммитов): третья карточка делала правую колонку
            заметно длиннее графика слева, а с items-start (нужен сам по
            себе — без него колонки растягивались друг под друга) разница
            высот обнажалась пустым фоном страницы под графиком. Здесь,
            в плоской ленте, высоты не зависят от количества карточек. */}
        {financeLoading ? (
          <div className="border-b border-base-300 p-3.5 sm:border-r lg:border-b-0 last:border-r-0">
            <div className="skeleton h-8 w-8 rounded-md mb-3" />
            <div className="skeleton h-6 w-20 mb-1" />
            <div className="skeleton h-3 w-14" />
          </div>
        ) : finance && (
          <MetricCell
            Icon={Landmark}
            label="Собрано за месяц"
            value={fmt(collectedThisMonth)}
            meta={collectedDelta == null ? `${cur} · факт оплат` : `${collectedDelta >= 0 ? '+' : ''}${collectedDelta.toFixed(0)}% к прошлому`}
            trend={collectedDelta}
            to="/revenue"
          />
        )}
      </div>

      {/* Раньше здесь стоял items-start: без него сетка растягивала обе колонки
          на высоту более длинной, а внутри карточки графика (фикс. height={240})
          это растяжение оседало пустым отступом внутри карточки. С items-start
          отступ ушёл из карточки, но вскрылся под ней — как голый фон страницы,
          потому что правая колонка (2-3 карточки) естественно выше графика.
          Правильный фикс — не выбирать, какую дыру спрятать, а убрать её: сетка
          снова тянет обе колонки (default stretch), а сам график растёт вместе
          с карточкой (flex-1 + height="100%" вместо фиксированных 240px) —
          теперь лишняя высота уходит в сам график, а не в пустоту рядом с ним. */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card flex flex-col overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_4px_24px_rgba(29,36,23,0.05)] lg:col-span-2">
          <div className="card-body flex flex-1 flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown size={17} className="text-primary" />
                <h2 className="card-title text-base">Доход по партнёрам</h2>
                <span className="text-xs text-base-content/40">({cur}/мес)</span>
              </div>
              <Link to="/revenue" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                Все <ArrowRight size={13} />
              </Link>
            </div>

            {barData.length === 0 ? (
              <div className="flex flex-1 min-h-[240px] flex-col items-center justify-center text-center">
                <Building2 size={32} className="mx-auto text-base-content/20 mb-2" />
                <p className="text-base-content/40 text-sm">Пока нет партнёров</p>
              </div>
            ) : (
              <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PRIMARY} />
                        <stop offset="100%" stopColor={CHART_SERIES[3]} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_TOOLTIP_CURSOR }} />
                    <Bar
                      dataKey="value"
                      fill="url(#revenue-grad)"
                      maxBarSize={44}
                      onClick={(d) => {
                        const bp = partners.find((pp) => pp.id === d?.payload?.id);
                        if (bp) setModal({ type: 'partner', p: bp });
                      }}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {pieData.length > 0 && (
            <div className="card rounded-xl border border-base-300 bg-base-100 shadow-[0_4px_24px_rgba(29,36,23,0.05)]">
              <div className="card-body p-5">
                <div className="flex items-center gap-2 mb-3">
                  <PieIcon size={15} className="text-primary" />
                  <h2 className="card-title text-sm">По статусам</h2>
                </div>
                <div className="flex items-center gap-3">
                  <PieChart width={100} height={100}>
                    <Pie data={pieData} cx={48} cy={48} innerRadius={26} outerRadius={46} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="space-y-1.5 flex-1">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="font-bold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card flex-1 rounded-xl border border-base-300 bg-base-100 shadow-[0_4px_24px_rgba(29,36,23,0.05)]">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Inbox size={15} className="text-primary" />
                  <h2 className="card-title text-sm">Активные заявки</h2>
                </div>
                {newLeadsCount > 0 && (
                  <Link to="/leads" className="badge badge-error badge-sm">{newLeadsCount} новых</Link>
                )}
              </div>
              <div className="divide-y divide-base-200 -mb-2">
                {recentLeads.length === 0 ? (
                  <div className="text-center py-6">
                    <Inbox size={24} className="mx-auto text-base-content/25 mb-1" />
                    <p className="text-base-content/40 text-xs">Активных заявок нет</p>
                  </div>
                ) : (
                  recentLeads.map((l) => {
                    const s = LEAD_STATUS[l.status] || { label: l.status, cls: 'badge-ghost' };
                    const StatusIcon = STATUS_ICON[l.status];
                    return (
                      <Link
                        key={l.id}
                        to="/leads"
                        className="py-2.5 flex items-center gap-2.5 hover:bg-base-200/50 -mx-5 px-5 transition-colors"
                      >
                        <Avatar name={l.centerName || l.name} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{l.centerName || l.name}</div>
                          <div className="text-xs text-base-content/50">{dateShort(l.createdAt)}</div>
                        </div>
                        <span className={`badge badge-sm gap-1 ${s.cls}`}>
                          {StatusIcon && <StatusIcon size={10} />}
                          {s.label}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
              {(allLeadsCount > 0 || recentLeads.length > 0) && (
                <Link to="/leads" className="btn btn-ghost btn-xs w-full mt-3 gap-1">
                  Все заявки ({allLeadsCount}) <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {partners.length > 0 && (
        <div className="card rounded-xl border border-base-300 bg-base-100 shadow-[0_4px_24px_rgba(29,36,23,0.05)]">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-primary" />
                <h2 className="card-title text-base">ТОП партнёров</h2>
                <span className="text-xs text-base-content/40">{activeCount} активных</span>
              </div>
              <Link to="/organizations" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                Все партнёры <ArrowRight size={13} />
              </Link>
            </div>
            <div className="space-y-2">
              {topPartners.map((p, i) => {
                const pct = Math.max(4, ((p.monthlyBill || 0) / maxBill) * 100);
                const share = totalIncome > 0 ? ((p.monthlyBill / totalIncome) * 100).toFixed(1) : '0.0';
                const statusInfo = ORG_STATUS[p.status];
                // Топ-3 — медаль вместо серого номера (то же ранжирование,
                // которое уже управляет цветом полосы ниже, теперь видно
                // и на самом ранге, а не только в градиенте бара #1).
                const medal = [
                  { bg: 'bg-gradient-to-br from-amber-300 to-amber-500', text: 'text-amber-950', ring: 'ring-amber-300/50' },
                  { bg: 'bg-gradient-to-br from-slate-300 to-slate-400', text: 'text-slate-900', ring: 'ring-slate-300/50' },
                  { bg: 'bg-gradient-to-br from-orange-300 to-orange-500', text: 'text-orange-950', ring: 'ring-orange-300/50' },
                ][i];
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/20 hover:bg-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      medal ? 'border-base-200 bg-base-200/25' : 'border-transparent'
                    }`}
                    onClick={() => setModal({ type: 'partner', p })}
                  >
                    {medal ? (
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ring-2 ${medal.bg} ${medal.text} ${medal.ring}`}>
                        {i + 1}
                      </span>
                    ) : (
                      <span className="w-7 text-center text-xs font-extrabold text-base-content/40 tabular-nums shrink-0">{i + 1}</span>
                    )}
                    <Avatar name={p.name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="truncate font-semibold text-sm hover:text-primary transition-colors">{p.name}</span>
                        {/* Тариф — уже в ответе API (p.tier), нигде на дашборде не
                            показан, хотя счёт monthlyBill рядом печатается всегда:
                            без него непонятно, ПОЧЕМУ у партнёра именно такая сумма. */}
                        {p.tier && <span className="badge badge-ghost badge-xs hidden sm:inline-flex shrink-0">{p.tier}</span>}
                        <span className={`badge badge-xs hidden sm:inline-flex shrink-0 ${statusInfo?.cls || 'badge-ghost'}`}>{statusInfo?.label || p.status}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-1.5 text-[11px] text-base-content/45">
                        <span className="inline-flex items-center gap-1"><Store size={10} />{fmt(p.branches)} фил.</span>
                        <span className="inline-flex items-center gap-1"><Users size={10} />{fmt(p.students)} учен.</span>
                        <span className="tabular-nums">{share}% дохода</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: i === 0 ? `linear-gradient(90deg,${CHART_PRIMARY},${CHART_SERIES[3]})` : CHART_PRIMARY }}
                        />
                      </div>
                    </div>
                    {/* Сумма — единственная главная цифра в строке (раньше
                        делила внимание с процентом/тарифом/статусом на той же
                        линии, что и имя партнёра). */}
                    <div className="text-right shrink-0">
                      <div className="font-extrabold tabular-nums text-sm sm:text-base">{fmt(p.monthlyBill)}</div>
                      <div className="text-[10px] text-base-content/35">{cur}/мес</div>
                    </div>
                    <ChevronRight size={16} className="text-base-content/30 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Platform metrics — pill cards. "Доля активных" раньше дублировала
          то же число из meta KPI «Партнёры» выше — заменена на «Триал»:
          единственная сводка по этому статусу вне модалки. */}
      {partners.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PillMetric
            Icon={Calculator}
            title="Средний счёт партнёра"
            value={`${fmt(avgBill)} ${cur}`}
            tone="primary"
          />
          <PillMetric
            Icon={Sparkles}
            title="На триале"
            value={`${trialShare}%`}
            sub={`${trialCount} партнёров`}
            tone="warning"
          />
          <PillMetric
            Icon={Snowflake}
            title="Доля замороженных"
            value={`${frozenShare}%`}
            sub={`${frozenCount} партнёров`}
            tone="danger"
          />
        </div>
      )}

      {/* ---------- MODALS ---------- */}
      <Modal
        isOpen={modal === 'income'}
        onClose={() => setModal(null)}
        title="Наш доход / месяц"
        subtitle="Как считается выручка платформы"
        Icon={Wallet}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-content">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Итого / мес</div>
            <div className="text-4xl font-black mt-1">{fmt(t.ourMonthlyIncome)} <span className="text-base font-bold">{cur}</span></div>
            <div className="text-xs mt-2 opacity-70">Сумма счетов {partners.length} активных партнёров</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-base-200 p-4">
              <div className="text-[11px] text-base-content/50 uppercase font-semibold">Средний счёт</div>
              <div className="text-2xl font-extrabold mt-1">{fmt(avgBill)} <span className="text-xs text-base-content/50">{cur}</span></div>
            </div>
            <div className="rounded-md border border-base-200 p-4">
              <div className="text-[11px] text-base-content/50 uppercase font-semibold">Партнёров на биллинге</div>
              <div className="text-2xl font-extrabold mt-1">{fmt(partners.length)}</div>
            </div>
          </div>

          {/* Тарифы — бакеты по общему числу активных аккаунтов. Здесь стояла старая
              формула (база + доп. филиал + за ученика): бэкенд этих полей не
              отдаёт, и все три строки печатали пустое значение. */}
          <div className="rounded-md bg-base-200/50 p-4 space-y-2">
            <div className="text-xs font-semibold text-base-content/60 uppercase mb-1">Тарифы по числу активных аккаунтов</div>
            {/* tier, не t — снаружи t уже занято data.totals (строка 126);
                до сих пор случайно безопасно (внутри .map везде именно
                тарифный объект), но одноимённая тень — заминированное
                место для следующей правки. */}
            {(pricing.tiers ?? []).map((tier) => (
              <div key={tier.id} className="flex justify-between text-sm">
                <span>{tier.label} <span className="text-base-content/45">· {tierRange(tier)}</span></span>
                <span className="font-bold tabular-nums">{tierPriceLabel(tier, cur)}</span>
              </div>
            ))}
            <div className="text-xs text-base-content/45 pt-1">Филиалы входят в тариф без доплаты</div>
          </div>

          <Link to="/revenue" className="btn btn-primary text-primary-content w-full gap-2" onClick={() => setModal(null)}>
            <TrendingUp size={16} /> Открыть отчёт по доходу
          </Link>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'partners'}
        onClose={() => setModal(null)}
        title="Партнёры по статусам"
        subtitle={`Всего ${partners.length} учебных центров`}
        Icon={Building2}
        size="lg"
      >
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatusTile color={ORG_STATUS.active.color} label="Активные" count={activeCount} total={partners.length} Icon={Zap} />
          <StatusTile color={ORG_STATUS.trial.color} label="Триал" count={trialCount} total={partners.length} Icon={Sparkles} />
          <StatusTile color={ORG_STATUS.frozen.color} label="Заморожены" count={frozenCount} total={partners.length} Icon={Snowflake} />
        </div>

        <div className="text-xs font-semibold text-base-content/50 uppercase mb-2">Партнёры</div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {sorted.slice(0, 20).map((p) => {
            const s = ORG_STATUS[p.status] || { label: p.status, cls: 'badge-ghost' };
            return (
              <Link
                to={`/organizations/${p.id}`}
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-base-200/50 transition-colors"
                onClick={() => setModal(null)}
              >
                <Avatar name={p.name} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-base-content/50">{p.branches} филиалов · {p.students} учеников</div>
                </div>
                <span className={`badge badge-sm ${s.cls}`}>{s.label}</span>
              </Link>
            );
          })}
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'students'}
        onClose={() => setModal(null)}
        title="Ученики платформы"
        subtitle={`Всего ${fmt(t.students)} учеников на платформе`}
        Icon={GraduationCap}
        size="lg"
      >
        <div className="rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 p-5 text-white mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Всего учеников</div>
          <div className="text-4xl font-black mt-1">{fmt(t.students)}</div>
          <div className="text-xs mt-2 opacity-70">В среднем {partners.length ? Math.round(t.students / partners.length) : 0} на партнёра</div>
        </div>

        {/* Родители/сотрудники/итого — уже считает бэкенд (totals.parents/
            staff/totalUsers), нигде на дашборде не показывалось. */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-md border border-base-200 p-3 text-center">
            <div className="text-lg font-extrabold tabular-nums">{fmt(t.parents)}</div>
            <div className="text-[10px] text-base-content/50 uppercase tracking-wide mt-0.5">Родителей</div>
          </div>
          <div className="rounded-md border border-base-200 p-3 text-center">
            <div className="text-lg font-extrabold tabular-nums">{fmt(t.staff)}</div>
            <div className="text-[10px] text-base-content/50 uppercase tracking-wide mt-0.5">Сотрудников</div>
          </div>
          <div className="rounded-md border border-base-200 p-3 text-center">
            <div className="text-lg font-extrabold tabular-nums">{fmt(t.totalUsers)}</div>
            <div className="text-[10px] text-base-content/50 uppercase tracking-wide mt-0.5">Всего аккаунтов</div>
          </div>
        </div>

        <div className="text-xs font-semibold text-base-content/50 uppercase mb-2">Топ-5 по ученикам</div>
        {topByStudents.length === 0 && (
          <div className="text-center py-8 text-sm text-base-content/40">Партнёров пока нет</div>
        )}
        <div className="space-y-2">
          {topByStudents.map((p, i) => {
            const pct = Math.max(4, ((p.students || 0) / Math.max(1, topByStudents[0]?.students || 1)) * 100);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-base-content/40">{i + 1}</span>
                <Avatar name={p.name} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{p.name}</span>
                    <span className="font-bold tabular-nums">{fmt(p.students)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'branches'}
        onClose={() => setModal(null)}
        title="Филиалы по партнёрам"
        subtitle={`Всего ${fmt(t.branches)} филиалов`}
        Icon={Store}
        size="lg"
      >
        <div className="rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 p-5 text-white mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Всего филиалов</div>
          <div className="text-4xl font-black mt-1">{fmt(t.branches)}</div>
          <div className="text-xs mt-2 opacity-80">
            В среднем {partners.length ? (t.branches / partners.length).toFixed(1) : 0} на партнёра
          </div>
        </div>

        <div className="text-xs font-semibold text-base-content/50 uppercase mb-2">Топ-5 по филиалам</div>
        {topByBranches.length === 0 && (
          <div className="text-center py-8 text-sm text-base-content/40">Партнёров пока нет</div>
        )}
        <div className="space-y-2">
          {topByBranches.map((p, i) => {
            const pct = Math.max(4, ((p.branches || 0) / Math.max(1, topByBranches[0]?.branches || 1)) * 100);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-base-content/40">{i + 1}</span>
                <Avatar name={p.name} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{p.name}</span>
                    <span className="font-bold tabular-nums">{fmt(p.branches)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Партнёр открыт — с топ-листа или кликом по бару графика.
          Раньше это были два отдельных стейта (modal/barModal) с почти
          одинаковыми блоками JSX ниже — клик по бару теперь просто ищет
          того же партнёра по id и кладёт в тот же modal. */}
      {modal && modal.type === 'partner' && (
        <PartnerModal
          p={modal.p}
          totalIncome={totalIncome}
          cur={cur}
          onClose={() => setModal(null)}
          onToggle={() => togglePartnerStatus(modal.p)}
          busy={busyId === modal.p?.id}
        />
      )}
    </>
  );
}

function MetricCell({ Icon, label, value, meta, trend, onClick, to }) {
  const cls = 'group relative min-h-[118px] border-b border-base-300 p-3.5 text-left transition-colors hover:bg-base-200/55 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:border-r lg:border-b-0 last:border-b-0 last:border-r-0';
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-base-200 text-base-content/55 transition-colors group-hover:bg-primary/20 group-hover:text-primary"><Icon size={16} /></span>
        <ChevronRight size={14} className="text-base-content/20 transition-transform group-hover:translate-x-0.5 group-hover:text-base-content/45" />
      </div>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-base-content/40">{label}</div>
      <div className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-base-content/40">
        {trend != null && (
          <span className={`inline-flex items-center gap-0.5 font-bold ${trend >= 0 ? 'text-success' : 'text-error'}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingUp size={11} className="rotate-90" />}
          </span>
        )}
        <span className="truncate">{meta}</span>
      </div>
    </>
  );
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function StatusTile({ color, label, count, total, Icon }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-base-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        {/* Текст/иконка тем же цветом, что и фон (только непрозрачным) —
            раньше был захардкожен один зелёный вне зависимости от color,
            и «Заморожены» (красный фон) читалась как ошибка вёрстки. */}
        <span className="w-8 h-8 rounded-md grid place-items-center" style={{ background: `${color}26`, color }}>
          <Icon size={15} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{label}</span>
      </div>
      <div className="text-2xl font-extrabold">{count}</div>
      <div className="text-[11px] text-base-content/50 mt-0.5">{pct}% от всех</div>
    </div>
  );
}

function PillMetric({ Icon, title, value, sub, tone }) {
  // Ключи раньше не совпадали с тем, что реально передавали (primary/
  // success/danger против lime/green/red) — фоллбэк на lime молча съедал
  // цветовую семантику успеха/тревоги на всех трёх плитках подряд.
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200/60">
      <div className="card-body p-4 flex flex-row items-center gap-3">
        <span className={`w-11 h-11 rounded-md grid place-items-center shrink-0 ${tones[tone] || tones.primary}`}>
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase font-semibold tracking-wider text-base-content/45">{title}</div>
          <div className="text-xl font-extrabold leading-tight mt-0.5">{value}</div>
          {sub && <div className="text-[11px] text-base-content/50 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function PartnerModal({ p, totalIncome, cur, onClose, onToggle, busy }) {
  const share = totalIncome > 0 ? ((p.monthlyBill / totalIncome) * 100).toFixed(1) : '0.0';
  const s = ORG_STATUS[p.status] || { label: p.status, cls: 'badge-ghost' };
  const frozen = p.status === 'frozen';
  // Заморозка/разморозка бьёт в API сразу по клику, без шага «вы уверены» —
  // единственное действие на странице, которое реально меняет доступ
  // платящего партнёра. ConfirmDialog в _ui.jsx для этого и был написан.
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal isOpen={true} onClose={onClose} title={p.name} subtitle={p.domain || 'домен не задан'} Icon={Building2} size="xl">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg truncate">{p.name}</span>
              <span className={`badge ${s.cls}`}>{s.label}</span>
              {p.tier && <span className="badge badge-ghost">{p.tier}</span>}
            </div>
            <div className="text-xs text-base-content/50">Регистрация: {dateShort(p.createdAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat Icon={Store} label="Филиалы" value={fmt(p.branches)} />
          <MiniStat Icon={GraduationCap} label="Ученики" value={fmt(p.students)} />
          <MiniStat Icon={Wallet} label={`Счёт/мес (${cur})`} value={fmt(p.monthlyBill)} accent />
          <MiniStat Icon={Percent} label="Доля дохода" value={`${share}%`} />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            to={`/organizations/${p.id}`}
            className="btn btn-primary text-primary-content gap-2 flex-1"
            onClick={onClose}
          >
            Открыть профиль <ArrowRight size={15} />
          </Link>
          <button
            className={`btn gap-2 ${frozen ? 'btn-success' : 'btn-outline btn-error'}`}
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : frozen ? (
              <><Power size={15} /> Активировать</>
            ) : (
              <><Pause size={15} /> Заморозить</>
            )}
          </button>
        </div>

        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={frozen ? 'Разморозить партнёра?' : 'Заморозить партнёра?'}
          text={
            frozen
              ? `«${p.name}» снова получит доступ ко всем панелям сразу после подтверждения.`
              : `«${p.name}» и все его сотрудники/ученики потеряют доступ к панелям до разморозки. Счёт продолжит копиться по тарифу.`
          }
          confirmLabel={frozen ? 'Активировать' : 'Заморозить'}
          onConfirm={() => { setConfirming(false); onToggle(); }}
          pending={busy}
        />
      </div>
    </Modal>
  );
}

function MiniStat({ Icon, label, value, accent }) {
  return (
    <div className={`rounded-md p-3 border ${accent ? 'bg-gradient-to-br from-primary to-primary/80 border-primary text-primary-content' : 'border-base-200 bg-base-100'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className={accent ? 'text-primary-content/70' : 'text-base-content/40'} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${accent ? 'text-primary-content/70' : 'text-base-content/50'}`}>{label}</span>
      </div>
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
