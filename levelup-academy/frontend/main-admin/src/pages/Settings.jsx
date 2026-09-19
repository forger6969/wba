import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Shield, CreditCard, Building2, GraduationCap, Wallet,
  Info, ExternalLink, GitBranch, TrendingUp,
  Settings2, Pencil, LogOut, Megaphone, Check, HardDrive,
} from 'lucide-react';
import { useDashboard, usePricing } from '../queries.js';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { fmt, ORG_STATUS } from '../format.js';
import { tierRange, tierPriceLabel } from '../lib/pricing.js';
import PageHeader from '../components/PageHeader.jsx';

/** Спецификация-строка: подпись сверху, значение снизу — не список с разделителями. */
function Spec({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}

function CardHead({ Icon, title }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="w-8 h-8 rounded-md bg-ink/[0.06] text-ink grid place-items-center shrink-0">
        <Icon size={15} strokeWidth={2.3} />
      </span>
      <h2 className="font-bold text-sm">{title}</h2>
    </div>
  );
}

export default function Settings() {
  const { user, token, logout, patchUser } = useAuth();
  const { data } = useDashboard();
  const { data: pricing } = usePricing();

  const t = data?.totals;
  const cur = t?.currency || pricing?.currency || 'UZS';
  const partners = data?.partners || [];
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'MA';

  const statusStats = partners.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  // ---- Profile edit state ----
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState('');

  const openEdit = () => {
    setEditForm({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
    setEditError('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditError('');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setEditBusy(true);
    setEditError('');
    try {
      const { profile } = await api.updateProfile(token, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      });
      // Кладём ответ сервера в контекст, а не то, что напечатали в форме:
      // сервер тримит и нормализует поля, и шапка должна показывать сохранённое.
      patchUser({ firstName: profile.firstName, lastName: profile.lastName });
      setEditSuccess(true);
      setEditMode(false);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      // Раньше здесь 404/500 подменялись «успехом»: эндпоинта PATCH /main/profile
      // не существовало, и пользователь видел «сохранено», хотя не сохранялось ничего.
      // Эндпоинт написан — глушить ошибки больше нельзя, иначе поломка снова станет невидимой.
      setEditError(
        err?.status === 409
          ? 'Такой email или телефон уже заняты'
          : err?.message || 'Не удалось сохранить',
      );
    } finally {
      setEditBusy(false);
    }
  };

  const doLogout = async () => {
    if (!window.confirm('Выйти из аккаунта?')) return;
    try {
      await logout();
    } catch {
      /* ignore */
    }
  };

  // ---- Revenue block calculations ----
  const activePartnersCount = partners.filter((p) => p.status === 'active').length;
  const avgBillFromIncome = partners.length > 0
    ? Math.round((t?.ourMonthlyIncome || 0) / partners.length)
    : 0;
  const activePartnersShare = partners.length > 0
    ? ((activePartnersCount / partners.length) * 100).toFixed(0)
    : '0';
  const topPartners = [...partners]
    .sort((a, b) => (b.monthlyBill || 0) - (a.monthlyBill || 0))
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="flex items-center gap-2"><Settings2 size={22} /> Настройки</span>}
        subtitle="Профиль Main Admin и конфигурация платформы"
      />

      {editSuccess && (
        <div className="alert alert-success text-sm">
          <Check size={16} />
          <span>Профиль обновлён</span>
        </div>
      )}

      {/* Identity — тёмная ink-панель, как на странице партнёра: это владелец
          платформы, а не ещё одна белая карточка среди прочих. */}
      <div className="rounded-lg bg-ink text-white overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, #dc2626, transparent 45%)' }}
        />
        <div className="relative flex flex-wrap items-center gap-5 p-6">
          <div className="w-16 h-16 rounded-lg bg-limebrand text-ink font-extrabold text-2xl grid place-items-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-extrabold">{user?.firstName} {user?.lastName}</div>
            <div className="text-sm text-white/50 mt-0.5">{user?.email || '—'}</div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="badge badge-sm bg-limebrand text-ink border-0 gap-1 font-semibold">
                <Shield size={10} /> Main Admin
              </span>
              <span className="badge badge-sm bg-white/10 text-white border-0 gap-1">
                Полный доступ · вся платформа
              </span>
            </div>
          </div>
          <button
            onClick={doLogout}
            className="btn btn-sm bg-white/10 hover:bg-error hover:text-white border-0 text-white/80 gap-1.5 shrink-0"
          >
            <LogOut size={13} /> Выйти
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Profile details */}
        <div className="card bg-base-100 border border-base-200/60 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-md bg-ink/[0.06] text-ink grid place-items-center shrink-0">
                  <User size={15} strokeWidth={2.3} />
                </span>
                <h2 className="font-bold text-sm">Данные профиля</h2>
              </div>
              {!editMode && (
                <button className="btn btn-sm btn-outline gap-1" onClick={openEdit}>
                  <Pencil size={13} /> Изменить
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={saveProfile} className="space-y-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs">Имя</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm focus:border-lime-400 focus:outline-lime-200"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Имя"
                    autoFocus
                  />
                </div>
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs">Фамилия</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm focus:border-lime-400 focus:outline-lime-200"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Фамилия"
                  />
                </div>

                {editError && (
                  <div className="alert alert-error text-xs py-2">
                    <span>{editError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={editBusy}>
                    Отмена
                  </button>
                  <button type="submit" className="btn bg-limebrand hover:brightness-95 border-0 text-ink btn-sm gap-1" disabled={editBusy}>
                    {editBusy ? <span className="loading loading-spinner loading-xs" /> : <><Check size={13} /> Сохранить</>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-y-4">
                <Spec label="Имя" value={user?.firstName || '—'} />
                <Spec label="Фамилия" value={user?.lastName || '—'} />
                <Spec label="Email" value={user?.email || '—'} />
                <Spec label="Роль" value="Main Admin" />
              </div>
            )}
          </div>
        </div>

        {/* Platform info */}
        <div className="card bg-base-100 border border-base-200/60 shadow-sm">
          <div className="card-body">
            <CardHead Icon={Info} title="Платформа" />
            <div className="grid grid-cols-2 gap-y-4">
              <Spec label="Название" value="LevelUp Academy" />
              <Spec label="Версия" value={<span className="badge badge-sm badge-outline">v1.0</span>} />
              <Spec label="Среда" value={<span className="badge badge-sm badge-success badge-outline">Production</span>} />
              <Spec label="Валюта" value={cur} />
              <Spec label="Часовой пояс" value="UTC+5 (Ташкент)" />
              {t && <Spec label="Партнёров" value={fmt(t.partners)} />}
            </div>
          </div>
        </div>

        {/* Platform stats */}
        <div className="card bg-base-100 border border-base-200/60 shadow-sm">
          <div className="card-body">
            <CardHead Icon={Building2} title="Статистика платформы" />
            {!t ? (
              <div className="flex justify-center py-6"><span className="loading loading-spinner opacity-40" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-y-4">
                  <Spec label="Учебных центров" value={fmt(t.partners)} />
                  <Spec label="Учеников всего" value={fmt(t.students)} />
                  <Spec label="Филиалов всего" value={fmt(t.branches)} />
                  <Spec label="Доход / мес" value={<span className="text-lime-700 font-bold">{fmt(t.ourMonthlyIncome)} {cur}</span>} />
                </div>
                {Object.keys(statusStats).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-base-200 flex items-stretch divide-x divide-base-200">
                    {Object.entries(statusStats).map(([status, count]) => {
                      const st = ORG_STATUS[status] || { label: status, cls: 'badge-ghost' };
                      return (
                        <div key={status} className="flex-1 text-center px-2">
                          <div className="text-xl font-extrabold tabular-nums">{count}</div>
                          <span className={`badge badge-xs mt-1 ${st.cls}`}>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="card bg-base-100 border border-base-200/60 shadow-sm">
          <div className="card-body">
            <CardHead Icon={CreditCard} title="Текущие тарифы" />
            {!pricing ? (
              <div className="flex justify-center py-6"><span className="loading loading-spinner opacity-40" /></div>
            ) : (
              <>
                {/* Бакеты по общему числу пользователей (ученики+родители+сотрудники) */}
                <div className="divide-y divide-base-200 border-y border-base-200 mb-4">
                  {(pricing.tiers ?? []).map((tr) => (
                    <div key={tr.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="flex items-center gap-2 text-base-content/60">
                        <GraduationCap size={13} className="text-base-content/35" /> {tr.label}
                        <span className="text-base-content/40">· {tierRange(tr)} польз.</span>
                      </span>
                      <span className="font-bold">{tierPriceLabel(tr, cur)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-base-content/45 mb-4">
                  <GitBranch size={12} /> Филиалы входят в тариф без доплаты
                </div>
                {/* Тарифы зашиты в backend/src/config/plans.js, правка через БД — v2,
                    поэтому ссылка ведёт на просмотр, а не на редактирование. */}
                <Link to="/billing" className="btn btn-sm btn-outline gap-1.5 w-full">
                  <ExternalLink size={13} /> Открыть тарифы
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Revenue detail block (full width) */}
      <div className="card bg-base-100 border border-base-200/60 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-md bg-ink/[0.06] text-ink grid place-items-center shrink-0">
                <Wallet size={15} strokeWidth={2.3} />
              </span>
              <h2 className="font-bold text-sm">Доход платформы — детали</h2>
            </div>
            <Link to="/revenue" className="btn btn-xs btn-outline gap-1">
              <ExternalLink size={11} /> Подробнее
            </Link>
          </div>

          {/* Плоская строка с разделителями — не сетка пастельных мини-карточек */}
          <div className="flex items-stretch divide-x divide-base-200 border-y border-base-200 mb-5">
            <div className="flex-1 text-center py-3.5 px-2">
              <div className="text-2xl font-extrabold text-lime-700">{fmt(t?.ourMonthlyIncome || 0)}</div>
              <div className="text-xs text-base-content/50 font-semibold mt-0.5">{cur}/мес (этот месяц)</div>
            </div>
            <div className="flex-1 text-center py-3.5 px-2">
              <div className="text-2xl font-extrabold">{fmt(avgBillFromIncome)}</div>
              <div className="text-xs text-base-content/50 mt-0.5">Средний счёт ({cur})</div>
            </div>
            <div className="flex-1 text-center py-3.5 px-2">
              <div className="text-2xl font-extrabold">{activePartnersShare}%</div>
              <div className="text-xs text-base-content/50 mt-0.5">Активных партнёров</div>
            </div>
          </div>

          {/* Top-3 partners */}
          {topPartners.length > 0 ? (
            <>
              <div className="text-xs text-base-content/45 mb-2 font-semibold uppercase tracking-wider">
                Топ партнёры
              </div>
              <div className="space-y-2">
                {topPartners.map((p, i) => {
                  const share = (t?.ourMonthlyIncome || 0) > 0
                    ? ((p.monthlyBill / t.ourMonthlyIncome) * 100).toFixed(1)
                    : '0';
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs text-base-content/40 w-4">#{i + 1}</span>
                      <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                      <div className="w-24 h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lime-400 rounded-full"
                          style={{ width: `${Math.min(100, parseFloat(share))}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-lime-700 w-20 text-right tabular-nums">
                        {fmt(p.monthlyBill)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-sm text-base-content/40">
              Пока нет партнёров для отображения
            </div>
          )}
        </div>
      </div>

      {/* Разделы, которых нет в меню.
          Сайдбар сокращён до ежедневной работы (дашборд, партнёры, заявки),
          а редкие экраны собраны здесь. Ссылка на «Штрафы» удалена вместе со
          страницей: дисциплина сотрудников — зона CEO. */}
      <div className="card bg-base-100 border border-base-200/60 shadow-sm">
        <div className="card-body">
          <h2 className="font-bold text-sm mb-4">Ещё разделы</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { to: '/revenue', Icon: TrendingUp, title: 'Доход', desc: 'Наш счёт партнёрам' },
              { to: '/billing', Icon: Wallet, title: 'Тарифы', desc: 'Бакеты по числу пользователей' },
              { to: '/announcements', Icon: Megaphone, title: 'Анонсы', desc: 'Сообщения партнёрам' },
              { to: '/video-storage', Icon: HardDrive, title: 'Хранение видео', desc: 'Расход на Storj за видео-файлы тем' },
            ].map(({ to, Icon, title, desc }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-4 rounded-md border border-base-200/60 bg-base-100
                           hover:border-lime-400/50 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <span className="w-9 h-9 rounded-md bg-ink/[0.06] text-ink grid place-items-center shrink-0">
                  <Icon size={17} />
                </span>
                <div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-base-content/45">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
