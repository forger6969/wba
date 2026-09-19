import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, GraduationCap, Wallet, Calendar,
  Globe, GitBranch, Landmark, UserPlus, RefreshCw,
  TrendingUp, Shield, Clock, ChevronRight, Hash, Users,
  LayoutDashboard, CreditCard, Info, KeyRound, Gift, Receipt,
} from 'lucide-react';
import { useDashboard, usePricing, useInvalidate, usePartnerFeatures, useOrgLedger } from '../queries.js';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmt, money, dateShort, ORG_STATUS } from '../format.js';
import { tierForUsers, tierRange, tierPriceLabel } from '../lib/pricing.js';
import Avatar from '../components/Avatar.jsx';
import OnboardModal from '../components/OnboardModal.jsx';
import { Modal, Kpi } from '../components/_ui.jsx';
import { SkeletonKpis } from '../components/Skeleton.jsx';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
  { value: 'other', label: 'Другое' },
];

const LEDGER_TYPE_LABEL = {
  payment: { label: 'Оплата', cls: 'badge-success' },
  bonus: { label: 'Бонус', cls: 'badge-info' },
  addon_credit: { label: 'Кредит', cls: 'badge-warning' },
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Дни до грейс-дедлайна (5 число месяца после access_until) — та же логика,
 * что backend/src/shared/orgAccess.js, только для отображения на фронте. */
function accessStatus(accessUntil) {
  if (!accessUntil) return { label: 'Не оплачено', tone: 'error', days: null };
  const until = new Date(accessUntil);
  const now = new Date();
  if (now <= until) {
    const days = Math.ceil((until - now) / 86_400_000);
    return { label: `Оплачено до ${dateShort(accessUntil)}`, tone: 'success', days };
  }
  const graceDeadline = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth() + 1, 5, 23, 59, 59));
  if (now <= graceDeadline) {
    const days = Math.ceil((graceDeadline - now) / 86_400_000);
    return { label: `Грейс-период — доступ отключится через ${days} дн.`, tone: 'warning', days };
  }
  return { label: 'Доступ заблокирован (не оплачено)', tone: 'error', days: 0 };
}

function AccessTab({ partner, token, invalidate }) {
  const { data: ledger } = useOrgLedger(partner.id);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [period, setPeriod] = useState(currentPeriod());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [confirmBonus, setConfirmBonus] = useState(null); // число месяцев или null

  const status = accessStatus(partner.accessUntil);

  const askPayment = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setErr('');
    setConfirmPayment(true);
  };

  const submitPayment = async () => {
    setBusy(true);
    setErr('');
    try {
      await api.recordPayment(token, partner.id, { amount: Number(amount), method, periodCovered: period });
      setAmount('');
      setConfirmPayment(false);
      invalidate('dashboard', 'orgLedger');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const grantBonus = async () => {
    const months = confirmBonus;
    setBusy(true);
    setErr('');
    try {
      await api.grantBonus(token, partner.id, months);
      setConfirmBonus(null);
      invalidate('dashboard', 'orgLedger');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const methodLabel = PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;

  return (
    <div className="space-y-5">
      <div className={`alert ${status.tone === 'success' ? 'alert-success' : status.tone === 'warning' ? 'alert-warning' : 'alert-error'} text-sm`}>
        <KeyRound size={16} />
        <span className="font-semibold">{status.label}</span>
      </div>

      {err && <div className="alert alert-error text-sm"><span>{err}</span></div>}

      <div className="grid md:grid-cols-2 gap-5">
        <form onSubmit={askPayment} className="p-4 border border-base-200 rounded-lg space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Receipt size={15} className="text-lime-600" /> Записать оплату</h3>
          <input
            type="number" min="0" placeholder="Сумма, UZS" required
            className="input input-bordered input-sm w-full"
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
          <select className="select select-bordered select-sm w-full" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input
            type="month" required
            className="input input-bordered input-sm w-full"
            value={period} onChange={(e) => setPeriod(e.target.value)}
          />
          <button type="submit" className="btn btn-sm bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 w-full" disabled={busy}>
            Записать
          </button>
        </form>

        <div className="p-4 border border-base-200 rounded-lg space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2"><Gift size={15} className="text-lime-600" /> Бонус — бесплатный период</h3>
          <p className="text-xs text-base-content/50">Продлевает доступ поверх текущего срока. Не считается выручкой.</p>
          <div className="flex gap-2">
            {[1, 2, 3].map((m) => (
              <button key={m} type="button" className="btn btn-sm btn-outline flex-1" onClick={() => setConfirmBonus(m)} disabled={busy}>
                +{m} мес
              </button>
            ))}
          </div>
        </div>

        <Modal
          isOpen={confirmPayment}
          onClose={() => !busy && setConfirmPayment(false)}
          title="Подтвердите оплату"
          size="sm"
          actions={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmPayment(false)} disabled={busy}>Отмена</button>
              <button className="btn btn-sm bg-lime-400 hover:bg-lime-500 border-0 text-lime-950" onClick={submitPayment} disabled={busy}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Подтвердить'}
              </button>
            </>
          }
        >
          <p className="text-sm text-base-content/70">
            Записать оплату <span className="font-bold">{money(Number(amount) || 0)}</span> ({methodLabel}) за период <span className="font-semibold">{period}</span> для «{partner.name}»?
          </p>
        </Modal>

        <Modal
          isOpen={confirmBonus != null}
          onClose={() => !busy && setConfirmBonus(null)}
          title="Подтвердите бонус"
          size="sm"
          actions={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmBonus(null)} disabled={busy}>Отмена</button>
              <button className="btn btn-sm bg-lime-400 hover:bg-lime-500 border-0 text-lime-950" onClick={grantBonus} disabled={busy}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Подтвердить'}
              </button>
            </>
          }
        >
          <p className="text-sm text-base-content/70">
            Продлить доступ «{partner.name}» на <span className="font-bold">{confirmBonus} мес</span> бесплатно? Не считается выручкой.
          </p>
        </Modal>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">Журнал</h3>
        {!ledger?.length ? (
          <div className="text-sm text-base-content/40 py-4 text-center">Пока пусто</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Тип</th><th>Сумма</th><th>Способ</th><th>Период</th><th>Примечание</th><th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => {
                  const t = LEDGER_TYPE_LABEL[row.type] || { label: row.type, cls: 'badge-ghost' };
                  return (
                    <tr key={row.id}>
                      <td><span className={`badge badge-sm ${t.cls}`}>{t.label}</span></td>
                      <td className="font-semibold tabular-nums">{row.amount ? money(row.amount) : '—'}</td>
                      <td>{row.method ? PAYMENT_METHODS.find((m) => m.value === row.method)?.label ?? row.method : '—'}</td>
                      <td>{row.period_covered || (row.months_granted ? `+${row.months_granted} мес` : '—')}</td>
                      <td className="text-base-content/50 max-w-xs truncate">{row.note || '—'}</td>
                      <td className="text-base-content/40 whitespace-nowrap">{dateShort(row.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureToggles({ partner, token, invalidate }) {
  const { data: features } = usePartnerFeatures(partner.id);
  const [busyKey, setBusyKey] = useState(null);

  // GET /main/partners/:id/features -> { paid: [{key,label,price,enabled}], free: [{key,enabled}] }
  const paid = features?.paid ?? [];
  const free = features?.free ?? [];

  const toggle = async (key, current) => {
    setBusyKey(key);
    try {
      await api.setPartnerFeature(token, partner.id, key, !current);
      invalidate('dashboard', 'partnerFeatures');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-sm mb-2">Платные фичи</h3>
        {!paid.length ? (
          <div className="text-xs text-base-content/40">Каталог пуст — добавь фичу на странице «Фичи».</div>
        ) : (
          <div className="space-y-2">
            {paid.map((f) => (
              <div key={f.key} className="flex items-center justify-between p-3 border border-base-200 rounded-md">
                <div>
                  <div className="font-semibold text-sm">{f.label}</div>
                  <div className="text-xs text-base-content/45">{money(f.price)}/мес</div>
                </div>
                <input
                  type="checkbox" className="toggle toggle-success"
                  checked={f.enabled} disabled={busyKey === f.key}
                  onChange={() => toggle(f.key, f.enabled)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-sm mb-2">Бесплатные кабинеты</h3>
        <div className="space-y-2">
          {free.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-3 border border-base-200 rounded-md">
              <div className="font-semibold text-sm">{f.key === 'student_panel' ? 'Кабинет ученика' : 'Кабинет родителя'}</div>
              <input
                type="checkbox" className="toggle toggle-success"
                checked={f.enabled} disabled={busyKey === f.key}
                onChange={() => toggle(f.key, f.enabled)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Локальный Kpi убран (30.08.2026) — мигрировано на общий Kpi из _ui.jsx.

function BillingRow({ Icon, tint, label, sub, value }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <span className="flex items-center gap-3 min-w-0">
        <span
          className="w-9 h-9 rounded-md grid place-items-center shrink-0"
          style={{ background: tint.bg, color: tint.fg }}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-base-content/85 truncate">{label}</span>
          {sub && <span className="block text-xs text-base-content/45 mt-0.5">{sub}</span>}
        </span>
      </span>
      <span className="font-semibold tabular-nums text-sm shrink-0">{value}</span>
    </div>
  );
}

function BillingBreakdown({ partner, pricing, cur }) {
  if (!pricing) return <div className="flex justify-center py-8"><span className="loading loading-spinner opacity-40" /></div>;

  // Цена зависит от общего числа пользователей (ученики+родители+сотрудники),
  // филиалы входят безлимитом. Пересчитано с "только ученики" 11.08.2026 —
  // партнёр с 31 учеником, но 50 пользователями всего, тарифицируется по 50.
  const totalUsers = partner.totalUsers ?? (partner.students + partner.parents + partner.staff);
  const tier = tierForUsers(pricing.tiers, totalUsers);
  const calc = Number(tier?.price) || 0;
  const actual = partner.monthlyBill || 0;
  // договорной тариф не с чем сверять — расхождение показываем только по цене
  const diff = tier?.price != null && Math.abs(calc - actual) > 1;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-base-200 overflow-hidden">
        <div className="bg-gradient-to-r from-lime-100 via-lime-50 to-transparent px-4 py-3.5 border-b border-base-200">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-md bg-lime-400 text-lime-950 grid place-items-center shrink-0">
              <Landmark size={16} strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <div className="font-extrabold text-sm leading-tight">{tier?.label ?? '—'}</div>
              <div className="text-xs text-base-content/55 mt-0.5">бакет {tierRange(tier)} пользователей</div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-base-200">
          <BillingRow
            Icon={Users}
            tint={{ bg: '#eef2ee', fg: '#ffffff' }}
            label={`Пользователей: ${fmt(totalUsers)}`}
            sub={`${fmt(partner.students)} учеников · ${fmt(partner.parents)} родителей · ${fmt(partner.staff)} сотрудников`}
            value={tierPriceLabel(tier, cur)}
          />
          <BillingRow
            Icon={GitBranch}
            tint={{ bg: '#eef2ee', fg: '#ffffff' }}
            label={`Филиалы: ${fmt(partner.branches)}`}
            sub="входят в тариф безлимитом"
            value={`0 ${cur}`}
          />
        </div>

        <div className="bg-lime-50/70 border-t border-lime-200 px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-sm text-lime-950">По тарифу / мес</span>
          <span className="text-2xl font-extrabold text-lime-700 tabular-nums">{tierPriceLabel(tier, cur)}</span>
        </div>
      </div>
      {diff && (
        <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md text-xs text-base-content/60">
          <Info size={13} className="text-warning shrink-0 mt-0.5" />
          Фактический счёт: <span className="font-semibold">{fmt(actual)} {cur}</span> — расхождение с расчётом тарифа
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: 'overview', label: 'Обзор', Icon: LayoutDashboard },
  { key: 'finance', label: 'Финансы', Icon: CreditCard },
  { key: 'access', label: 'Доступ', Icon: KeyRound },
  { key: 'details', label: 'Детали', Icon: Info },
];

export default function OrgDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const invalidate = useInvalidate();

  const { data, isLoading, error, refetch } = useDashboard();
  const { data: pricing } = usePricing();

  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [onboard, setOnboard] = useState(false);

  const partner = data?.partners?.find((p) => String(p.id) === String(id));
  const cur = data?.totals?.currency || 'UZS';

  const toggle = async () => {
    if (!partner) return;
    const next = partner.status === 'frozen' ? 'active' : 'frozen';
    setBusy(true);
    setErr('');
    try {
      await api.setPartnerStatus(token, partner.id, next);
      invalidate('dashboard');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const s = partner ? (ORG_STATUS[partner.status] || { label: partner.status, cls: 'badge-ghost' }) : null;
  const daysSince = partner
    ? Math.floor((Date.now() - new Date(partner.createdAt).getTime()) / 86_400_000)
    : 0;

  const totalIncome = data?.partners?.reduce((sum, p) => sum + (p.monthlyBill || 0), 0) || 0;
  const share = totalIncome > 0 && partner ? ((partner.monthlyBill / totalIncome) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button className="btn btn-ghost btn-sm gap-1.5 -ml-2 text-base-content/60 hover:text-base-content" onClick={() => navigate('/organizations')}>
          <ArrowLeft size={15} /> Все партнёры
        </button>
        <ChevronRight size={14} className="text-base-content/30" />
        <span className="font-medium">{partner?.name || '...'}</span>
      </div>

      {(err || (error && error.status !== 401)) && (
        <div className="alert alert-error text-sm">
          <span>{err || error?.message}</span>
          <button className="btn btn-xs btn-ghost ml-auto gap-1" onClick={() => { setErr(''); refetch(); }}>
            <RefreshCw size={13} /> Повторить
          </button>
        </div>
      )}

      {isLoading ? (
        <>
          <div className="card bg-base-100 border border-base-200/60 shadow-sm">
            <div className="card-body h-32 animate-pulse bg-base-200/30 rounded-lg" />
          </div>
          <SkeletonKpis count={4} />
        </>
      ) : !partner ? (
        <div className="alert alert-warning">
          <span>Партнёр не найден.</span>
          <button className="btn btn-xs btn-ghost ml-auto" onClick={() => refetch()}>Обновить</button>
        </div>
      ) : (
        <>
          {/* Hero header — тёмная ink-панель вместо белой карточки с зелёной полоской:
              главная сущность страницы должна читаться сразу, а не сливаться с
              остальными белыми карточками ниже. */}
          <div className="rounded-lg bg-ink text-white overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #dc2626, transparent 45%)' }}
            />
            <div className="relative flex flex-row flex-wrap items-start gap-5 p-6">
              <div className="relative shrink-0">
                <Avatar name={partner.name} size={68} />
                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-ink ${
                  partner.status === 'active' ? 'bg-success' :
                  partner.status === 'trial' ? 'bg-warning' : 'bg-error'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl font-extrabold leading-tight">{partner.name}</h1>
                  <span className={`badge ${s.cls} badge-sm border-0`}>{s.label}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/50">
                  {partner.domain && (
                    <span className="flex items-center gap-1.5">
                      <Globe size={13} />
                      <span className="font-mono">{partner.domain}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    С {dateShort(partner.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Hash size={13} />
                    <span className="font-mono text-xs">{partner.id}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-white/40">Филиалов</span>
                    <span className="font-bold tabular-nums">{fmt(partner.branches)}</span>
                  </span>
                  <span className="w-px bg-white/15" />
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-white/40">Учеников</span>
                    <span className="font-bold tabular-nums">{fmt(partner.students)}</span>
                  </span>
                  <span className="w-px bg-white/15" />
                  <span className="flex items-baseline gap-1.5 text-limebrand">
                    <Wallet size={13} />
                    <span className="font-bold tabular-nums">{fmt(partner.monthlyBill)} {cur}/мес</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start">
                <button
                  className="btn btn-sm bg-white/10 hover:bg-white/15 border-0 text-white gap-1.5"
                  onClick={() => setOnboard(true)}
                >
                  <UserPlus size={14} /> Онбординг
                </button>
                <button
                  className={`btn btn-sm border-0 ${partner.status === 'frozen' ? 'bg-success text-success-content hover:bg-success/90' : 'bg-error/90 text-white hover:bg-error'}`}
                  onClick={toggle}
                  disabled={busy}
                >
                  {busy
                    ? <span className="loading loading-spinner loading-xs" />
                    : partner.status === 'frozen' ? 'Активировать' : 'Заморозить'}
                </button>
              </div>
            </div>
          </div>

          {/* KPIs — единая дуотон-палитра (ink/lime), не радуга случайных пастелей */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi
              Icon={Wallet}
              label="Счёт / мес"
              value={fmt(partner.monthlyBill)}
              sub={cur}
              tint={{ bg: '#E6F4D7', fg: '#3F6212' }}
              accent
            />
            <Kpi Icon={Building2} label="Филиалы" value={fmt(partner.branches)} sub="активных" tint={{ bg: '#eef2ee', fg: '#ffffff' }} />
            <Kpi Icon={Users} label="Пользователи" value={fmt(partner.totalUsers ?? (partner.students + partner.parents + partner.staff))} sub={`${fmt(partner.students)} учеников`} tint={{ bg: '#eef2ee', fg: '#ffffff' }} />
            <Kpi Icon={Clock} label="Дней на платформе" value={String(daysSince)} sub={`с ${dateShort(partner.createdAt)}`} tint={{ bg: '#eef2ee', fg: '#ffffff' }} />
          </div>

          {/* Tabs */}
          <div className="card bg-base-100 border border-base-200/60 shadow-sm">
            {/* Tab nav */}
            <div className="border-b border-base-200 px-5">
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                      tab === t.key
                        ? 'border-lime-500 text-lime-700'
                        : 'border-transparent text-base-content/50 hover:text-base-content'
                    }`}
                  >
                    <t.Icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-body">
              {/* Overview Tab */}
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Revenue share */}
                    <div className="p-4 border border-base-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={15} className="text-lime-600" />
                          <span className="font-semibold text-sm">Доля в доходе платформы</span>
                        </div>
                        <span className="text-lg font-extrabold text-lime-600">{share}%</span>
                      </div>
                      <div className="h-2 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, parseFloat(share))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-base-content/40 mt-1.5">
                        <span>{fmt(partner.monthlyBill)} {cur}</span>
                        <span>из {fmt(totalIncome)} {cur} общих</span>
                      </div>
                    </div>

                    {/* Status card */}
                    <div className="p-4 border border-base-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={15} className="text-base-content/50" />
                        <span className="font-semibold text-sm">Статус аккаунта</span>
                      </div>
                      <div className={`badge ${s.cls} badge-lg gap-1.5 mb-3`}>{s.label}</div>
                      <div className="text-xs text-base-content/50 space-y-1">
                        <div>Зарегистрирован: <span className="font-semibold">{dateShort(partner.createdAt)}</span></div>
                        <div>Дней на платформе: <span className="font-semibold">{daysSince}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Расчётные показатели — плоская строка с разделителями, не сетка мини-карточек */}
                  <div className="flex items-stretch divide-x divide-base-200 border border-base-200 rounded-lg">
                    {[
                      { label: 'Ученик / филиал', value: partner.branches ? (partner.students / partner.branches).toFixed(1) : '—', note: 'среднее' },
                      { label: 'Счёт / ученик', value: partner.students ? fmt(Math.round(partner.monthlyBill / partner.students)) : '—', note: cur + '/мес' },
                      { label: 'Счёт / филиал', value: partner.branches ? fmt(Math.round(partner.monthlyBill / partner.branches)) : '—', note: cur + '/мес' },
                    ].map((item) => (
                      <div key={item.label} className="flex-1 text-center py-3.5 px-2">
                        <div className="text-xl font-extrabold tabular-nums">{item.value}</div>
                        <div className="text-xs font-semibold text-base-content/60 mt-0.5">{item.label}</div>
                        <div className="text-[10px] text-base-content/35">{item.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Finance Tab */}
              {tab === 'finance' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                      <CreditCard size={15} className="text-lime-600" />
                      Расчёт счёта по тарифам
                    </h3>
                    <BillingBreakdown partner={partner} pricing={pricing} cur={cur} />
                  </div>

                  <div className="border-t border-base-200 pt-4">
                    <h3 className="font-bold text-sm mb-3">Фактические данные</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-lime-50 border border-lime-100 rounded-md p-4">
                        <div className="text-xs text-lime-700/70 mb-1 font-semibold uppercase tracking-wide">К оплате / мес</div>
                        <div className="text-2xl font-extrabold text-lime-700">{fmt(partner.monthlyBill)}</div>
                        <div className="text-xs text-lime-700/60 mt-0.5">{cur}</div>
                      </div>
                      <div className="bg-base-200/40 border border-base-200 rounded-md p-4">
                        <div className="text-xs text-base-content/50 mb-1 font-semibold uppercase tracking-wide">Доля платформы</div>
                        <div className="text-2xl font-extrabold">{share}%</div>
                        <div className="text-xs text-base-content/40 mt-0.5">от общего дохода</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-base-200 pt-4">
                    <FeatureToggles partner={partner} token={token} invalidate={invalidate} />
                  </div>
                </div>
              )}

              {/* Access Tab */}
              {tab === 'access' && <AccessTab partner={partner} token={token} invalidate={invalidate} />}

              {/* Details Tab */}
              {tab === 'details' && (
                <div className="space-y-1">
                  {[
                    ['Название организации', partner.name],
                    ['Домен', partner.domain || '—'],
                    ['Статус', <span key="s" className={`badge badge-sm ${s.cls}`}>{s.label}</span>],
                    ['Дата регистрации', dateShort(partner.createdAt)],
                    ['Дней на платформе', String(daysSince)],
                    ['Количество филиалов', fmt(partner.branches)],
                    ['Учеников', fmt(partner.students)],
                    ['Родителей', fmt(partner.parents)],
                    ['Сотрудников', fmt(partner.staff)],
                    ['Всего пользователей', fmt(partner.students + partner.parents + partner.staff)],
                    ['Ежемесячный счёт', <span key="b" className="font-bold text-lime-700">{fmt(partner.monthlyBill)} {cur}</span>],
                    ['Доля в доходе', `${share}%`],
                    ['ID', <span key="id" className="font-mono text-xs text-base-content/50">{partner.id}</span>],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center border-b border-base-200 py-3 text-sm last:border-0">
                      <dt className="text-base-content/55">{label}</dt>
                      <dd className="font-semibold text-right">{val}</dd>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {onboard && (
        <OnboardModal
          lead={null}
          onClose={() => setOnboard(false)}
          onDone={() => { setOnboard(false); invalidate('leads', 'dashboard'); }}
        />
      )}
    </div>
  );
}
