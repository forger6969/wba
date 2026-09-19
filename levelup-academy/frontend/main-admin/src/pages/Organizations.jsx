import { useState, useMemo, useEffect } from 'react';
import {
  Search, Building2, CheckCircle2, Clock, PauseCircle, UserPlus, ArrowRight,
  GraduationCap, Wallet, LayoutGrid, List, Play, Pause, Globe,
  Snowflake, X, Calendar, CheckCircle, RefreshCw,
  Megaphone, Percent, StickyNote, FileText, AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useDashboard, useInvalidate } from '../queries.js';
import { fmt, dateShort, ORG_STATUS } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import OnboardModal from '../components/OnboardModal.jsx';
import { SkeletonKpis, SkeletonTable } from '../components/Skeleton.jsx';

const STATUS_ICON = { active: CheckCircle2, trial: Clock, frozen: PauseCircle };

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'trial', label: 'Триал' },
  { key: 'frozen', label: 'Заморожены' },
];

const SORT_OPTIONS = [
  { key: 'bill_desc', label: 'По доходу ↓' },
  { key: 'students_desc', label: 'По ученикам ↓' },
  { key: 'date_desc', label: 'По дате ↓' },
  { key: 'name_asc', label: 'По названию ↑' },
];

function StatCard({ Icon, tint, title, value, unit }) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200/60">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-md grid place-items-center shrink-0" style={{ background: tint.bg, color: tint.fg }}>
            <Icon size={18} strokeWidth={2.3} />
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">{title}</div>
            <div className="text-2xl font-extrabold leading-tight mt-0.5">{value}</div>
            {unit && <div className="text-[11px] text-base-content/45">{unit}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ p, cur, maxBill, totalIncome, onToggle, busyId, onCardClick }) {
  const s = ORG_STATUS[p.status] || { label: p.status, cls: 'badge-ghost' };
  const StatusIcon = STATUS_ICON[p.status];
  const isBusy = busyId === p.id;
  const pct = Math.max(4, ((p.monthlyBill || 0) / maxBill) * 100);
  const share = totalIncome > 0 ? ((p.monthlyBill / totalIncome) * 100).toFixed(1) : '0';

  return (
    <div
      onClick={() => onCardClick(p)}
      className="card bg-base-100 shadow-sm border border-base-200/60 hover:shadow-lg hover:border-lime-400/60 hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="card-body p-5 gap-3">
        <div className="flex items-start gap-3">
          <Avatar name={p.name} size={46} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight block truncate">{p.name}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`badge badge-sm gap-1 ${s.cls}`}>
                {StatusIcon && <StatusIcon size={10} />}
                {s.label}
              </span>
              {p.domain && (
                <span className="text-xs text-base-content/50 flex items-center gap-1">
                  <Globe size={10} />
                  {p.domain}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-stretch divide-x divide-base-200 border-y border-base-200 -mx-5 px-5 py-2.5">
          <div className="flex-1 pr-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">Ученики</div>
            <div className="font-extrabold text-base tabular-nums mt-0.5">{fmt(p.students)}</div>
          </div>
          <div className="flex-1 px-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">Филиалы</div>
            <div className="font-extrabold text-base tabular-nums mt-0.5">{fmt(p.branches)}</div>
          </div>
          <div className="flex-1 pl-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-lime-700/60">Счёт/мес</div>
            <div className="font-extrabold text-base tabular-nums mt-0.5 text-lime-700">{fmt(p.monthlyBill)}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-base-content/40 mb-1">
            <span>Доля дохода</span>
            <span>{share}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
            <div className="h-full rounded-full bg-lime-400 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="text-xs text-base-content/40">
          Создан {dateShort(p.createdAt)} · {cur}/мес
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            className={`btn btn-sm flex-1 gap-1 ${p.status === 'frozen' ? 'btn-success' : 'btn-outline btn-error'}`}
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(p);
            }}
          >
            {isBusy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : p.status === 'frozen' ? (
              <><Play size={13} /> Активировать</>
            ) : (
              <><Pause size={13} /> Заморозить</>
            )}
          </button>
          <Link
            to={`/organizations/${p.id}`}
            className="btn btn-sm btn-ghost gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            Детали <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Подтверждение заморозки.
 *
 * Раньше форма ТРЕБОВАЛА причину и дату разморозки и обещала напоминание на
 * дашборде. Оба поля уходили в localStorage браузера: ни organizations, ни
 * /main/partners/:id/status их не хранят и не принимают (frozen_at и
 * frozen_reason в схеме есть, но у student_profiles, к организациям отношения
 * не имеют). Значит причина заморозки партнёра пропадала при чистке кэша и была
 * не видна больше никому. Обязательные поля, которые никуда не сохраняются,
 * хуже, чем их отсутствие, — поэтому здесь осталось только подтверждение.
 * Чтобы вернуть причину и срок по-настоящему, нужны колонки у organizations,
 * приём их в PATCH статуса и отдача в дашборде.
 */
function FreezeModal({ partner, onConfirm, onClose, busy }) {
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Snowflake size={18} className="text-blue-500" />
          Заморозить партнёра
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          <span className="font-semibold">{partner.name}</span> — доступ к платформе будет
          закрыт до момента, пока вы не активируете партнёра обратно
        </p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button
            className="btn bg-blue-500 hover:bg-blue-600 border-0 text-white gap-2"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <><Snowflake size={15} /> Заморозить</>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

function DetailModal({ partner, cur, totalIncome, onClose, onFreezeRequest, onActivate, busy }) {
  const s = ORG_STATUS[partner.status] || { label: partner.status, cls: 'badge-ghost' };
  const StatusIcon = STATUS_ICON[partner.status];
  const frozen = partner.status === 'frozen';

  const [detailTab, setDetailTab] = useState('overview');
  const [notes, setNotes] = useState('');

  // Reset tab + load notes when partner changes
  useEffect(() => {
    setDetailTab('overview');
    try {
      setNotes(localStorage.getItem(`partner_notes_${partner.id}`) || '');
    } catch {
      setNotes('');
    }
  }, [partner.id]);

  const registrationLabel = new Date(partner.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const daysOnPlatform = Math.max(
    0,
    Math.floor((Date.now() - new Date(partner.createdAt).getTime()) / 86400000),
  );
  const share = totalIncome > 0 ? ((partner.monthlyBill / totalIncome) * 100).toFixed(1) : '0';
  const sharePct = totalIncome > 0 ? Math.min(100, (partner.monthlyBill / totalIncome) * 100) : 0;
  const studentsPerBranch = partner.branches > 0
    ? (partner.students / partner.branches).toFixed(1)
    : '0';

  const onNotesChange = (val) => {
    setNotes(val);
    try {
      localStorage.setItem(`partner_notes_${partner.id}`, val);
    } catch {
      /* ignore quota */
    }
  };

  const onboardingDone = partner.status !== 'trial';

  return (
    <div className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-base-200 bg-gradient-to-r from-lime-50 to-transparent">
          <Avatar name={partner.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-lg leading-tight truncate">{partner.name}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`badge badge-sm gap-1 ${s.cls}`}>
                {StatusIcon && <StatusIcon size={10} />}
                {s.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-base-content/50">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> С {registrationLabel}
              </span>
              {partner.domain && (
                <span className="flex items-center gap-1">
                  <Globe size={11} /> {partner.domain}
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle shrink-0"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-200 px-6">
          {[['overview','Обзор'],['onboarding','Онбординг'],['finance','Инвестиции']].map(([key,label]) => (
            <button
              key={key}
              onClick={() => setDetailTab(key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                detailTab === key ? 'border-lime-500 text-lime-700' : 'border-transparent text-base-content/50 hover:text-base-content'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
          {/* ==== TAB: OVERVIEW ==== */}
          {detailTab === 'overview' && (
            <>
              {/* Metrics */}
              <div className="flex items-stretch divide-x divide-base-200 border-y border-base-200 py-3">
                <div className="flex-1 text-center px-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">Филиалы</div>
                  <div className="font-extrabold text-lg tabular-nums mt-0.5">{fmt(partner.branches)}</div>
                </div>
                <div className="flex-1 text-center px-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">Ученики</div>
                  <div className="font-extrabold text-lg tabular-nums mt-0.5">{fmt(partner.students)}</div>
                </div>
                <div className="flex-1 text-center px-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-lime-700/60">Счёт/мес</div>
                  <div className="font-extrabold text-lg tabular-nums mt-0.5 text-lime-700">{fmt(partner.monthlyBill)}</div>
                </div>
              </div>

              {/* Share progress */}
              <div>
                <div className="flex justify-between text-xs text-base-content/50 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Percent size={11} /> Доля в общем доходе
                  </span>
                  <span className="font-semibold tabular-nums">{share}%</span>
                </div>
                <div className="h-2 rounded-full bg-base-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-lime-400 transition-all duration-700"
                    style={{ width: `${sharePct}%` }}
                  />
                </div>
              </div>

              {frozen && (
                <div className="rounded-md border border-blue-200 bg-blue-50/60 p-4 flex items-center gap-2">
                  <Snowflake size={14} className="text-blue-500 shrink-0" />
                  <span className="text-sm text-blue-800">
                    Партнёр заморожен — вход на платформу для него закрыт
                  </span>
                </div>
              )}
            </>
          )}

          {/* ==== TAB: ONBOARDING ==== */}
          {detailTab === 'onboarding' && (
            <>
              <div>
                <div className="text-xs font-semibold text-base-content/50 uppercase mb-3 flex items-center gap-1.5">
                  <FileText size={12} /> Процесс онбординга
                </div>
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0 mt-0.5">
                      <CheckCircle size={16} strokeWidth={2.4} />
                    </span>
                    <div className="flex-1 pt-1">
                      <div className="font-semibold text-sm">Заявка принята</div>
                      <div className="text-xs text-base-content/50 mt-0.5">{dateShort(partner.createdAt)}</div>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0 mt-0.5">
                      <CheckCircle size={16} strokeWidth={2.4} />
                    </span>
                    <div className="flex-1 pt-1">
                      <div className="font-semibold text-sm">Партнёр создан</div>
                      <div className="text-xs text-base-content/50 mt-0.5">{dateShort(partner.createdAt)}</div>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 mt-0.5 ${
                      onboardingDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {onboardingDone
                        ? <CheckCircle size={16} strokeWidth={2.4} />
                        : <RefreshCw size={15} strokeWidth={2.4} className="animate-spin" />
                      }
                    </span>
                    <div className="flex-1 pt-1">
                      <div className="font-semibold text-sm">
                        {onboardingDone ? 'Онбординг завершён' : 'Онбординг в процессе'}
                      </div>
                      <div className="text-xs text-base-content/50 mt-0.5">
                        {onboardingDone
                          ? 'Партнёр активен на платформе'
                          : 'Партнёр на пробном периоде — ждём активации'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-base-200">
                <div className="text-xs font-semibold text-base-content/50 uppercase mb-3">Данные для связи</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/announcements"
                    className="btn btn-sm btn-outline gap-1.5"
                    onClick={onClose}
                  >
                    <Megaphone size={14} /> Написать анонс
                  </Link>
                  <Link
                    to={`/organizations/${partner.id}`}
                    className="btn btn-sm btn-outline gap-1.5"
                    onClick={onClose}
                  >
                    Открыть профиль <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* ==== TAB: FINANCE / INVEST ==== */}
          {detailTab === 'finance' && (
            <>
              <div>
                <div className="text-xs font-semibold text-base-content/50 uppercase mb-3 flex items-center gap-1.5">
                  <Wallet size={12} /> Финансовый профиль
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-base-200/40">
                    <span className="text-base-content/60">Счёт / мес</span>
                    <span className="font-bold text-lime-700 tabular-nums">
                      {fmt(partner.monthlyBill)} {cur}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-base-200/40">
                    <span className="text-base-content/60">Доля платформы</span>
                    <span className="font-bold tabular-nums">{share}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-base-200/40">
                    <span className="text-base-content/60">Дней на платформе</span>
                    <span className="font-bold tabular-nums">{daysOnPlatform}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-base-200/40">
                    <span className="text-base-content/60">Ученики на филиал</span>
                    <span className="font-bold tabular-nums">{studentsPerBranch}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-base-200">
                <div className="text-xs font-semibold text-base-content/50 uppercase mb-2 flex items-center gap-1.5">
                  <StickyNote size={12} /> Заметки
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Заметки о партнёре: причина инвестиции, история переговоров..."
                  rows={5}
                  className="textarea textarea-bordered w-full text-sm focus:border-lime-400 focus:outline-lime-200 resize-none"
                />
                {/* Ровно тот же провал, что уже нашли и вырезали для причины
                    заморозки (см. комментарий у FreezeModal выше): у
                    organizations нет колонки под заметки, значит это НЕ
                    "сохранено", а видно только в этом браузере и пропадёт
                    при очистке кэша. Раз поле уже приглашает писать сюда
                    историю переговоров и причину инвестиции — предупреждение
                    должно быть explicit, не мелким текстом внизу. Убрать
                    поле совсем нельзя (реальная нужда есть), но обманывать
                    видом «сохранено» тоже нельзя. Настоящее решение — колонка
                    organizations.notes + приём в PATCH статуса, это бэкенд. */}
                <div className="flex items-start gap-1.5 text-[11px] text-warning mt-1.5">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  <span>
                    Видно только вам, в этом браузере. Другие Main Admin'ы это не увидят,
                    очистка кэша — сотрёт. Для важного — дублируйте в чат команды.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-base-200 flex gap-2 flex-wrap">
          <Link
            to={`/organizations/${partner.id}`}
            className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 gap-2 flex-1"
            onClick={onClose}
          >
            Открыть профиль <ArrowRight size={15} />
          </Link>
          {frozen ? (
            <button
              className="btn btn-success gap-2"
              onClick={() => onActivate(partner)}
              disabled={busy}
            >
              {busy ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <><Play size={15} /> Активировать</>
              )}
            </button>
          ) : (
            <button
              className="btn btn-outline btn-error gap-2"
              onClick={() => onFreezeRequest(partner)}
              disabled={busy}
            >
              <Pause size={15} /> Заморозить
            </button>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

export default function Organizations() {
  const { token } = useAuth();
  const invalidate = useInvalidate();
  const { data, isLoading, error } = useDashboard();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('bill_desc');
  const [view, setView] = useState('cards');
  const [err, setErr] = useState('');
  const [onboard, setOnboard] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [detailPartner, setDetailPartner] = useState(null);
  const [freezeTarget, setFreezeTarget] = useState(null);

  const partners = data?.partners || [];
  const cur = data?.totals?.currency || 'UZS';

  // Клик по «Заморозить»: если сейчас active/trial — открываем модалку с причиной.
  // Если сейчас frozen — размораживаем сразу без модалки.
  const toggle = async (p) => {
    if (p.status !== 'frozen') {
      setFreezeTarget(p);
      return;
    }
    setBusyId(p.id);
    setErr('');
    try {
      await api.setPartnerStatus(token, p.id, 'active');
      invalidate('dashboard');
      if (detailPartner?.id === p.id) setDetailPartner(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmFreeze = async () => {
    if (!freezeTarget) return;
    const p = freezeTarget;
    setBusyId(p.id);
    setErr('');
    try {
      // запись в localStorage стояла ДО запроса: если сервер отвечал ошибкой,
      // партнёр оставался активным, а интерфейс уже показывал его замороженным
      await api.setPartnerStatus(token, p.id, 'frozen');
      invalidate('dashboard');
      setFreezeTarget(null);
      if (detailPartner?.id === p.id) setDetailPartner(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() =>
    partners.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}),
    [partners],
  );

  const totals = useMemo(() => ({
    all: partners.length,
    students: partners.reduce((s, p) => s + (p.students || 0), 0),
    branches: partners.reduce((s, p) => s + (p.branches || 0), 0),
    income: partners.reduce((s, p) => s + (p.monthlyBill || 0), 0),
  }), [partners]);

  const maxBill = Math.max(1, ...partners.map((p) => p.monthlyBill || 0));

  const rows = useMemo(() => {
    let list = partners.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.domain || '').includes(q.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchQ && matchStatus;
    });
    list = [...list];
    if (sort === 'bill_desc') list.sort((a, b) => (b.monthlyBill || 0) - (a.monthlyBill || 0));
    else if (sort === 'students_desc') list.sort((a, b) => (b.students || 0) - (a.students || 0));
    else if (sort === 'date_desc') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [partners, q, statusFilter, sort]);

  const showErr = err || (error && error.status !== 401 ? error.message : '');

  return (
    <div className="space-y-5">
      <PageHeader title="Партнёры" subtitle="Учебные центры на платформе — статус, ученики, счёт">
        <button
          className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 gap-2"
          onClick={() => setOnboard(true)}
        >
          <UserPlus size={17} /> Новый партнёр
        </button>
      </PageHeader>

      {showErr && <div className="alert alert-error text-sm"><span>{showErr}</span></div>}

      {isLoading ? (
        <>
          <SkeletonKpis count={4} />
          <SkeletonTable rows={5} cols={5} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard Icon={Building2} tint={{ bg: '#E0F2FE', fg: '#075985' }} title="Всего" value={fmt(totals.all)} unit="партнёров" />
            <StatCard Icon={GraduationCap} tint={{ bg: '#EDE9FE', fg: '#5B21B6' }} title="Ученики" value={fmt(totals.students)} unit="по всем" />
            <StatCard Icon={Building2} tint={{ bg: '#FFEDD5', fg: '#9A3412' }} title="Филиалы" value={fmt(totals.branches)} unit="всего" />
            <StatCard Icon={Wallet} tint={{ bg: '#ECFCCB', fg: '#365314' }} title="Доход" value={fmt(totals.income)} unit={`${cur}/мес`} />
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-200/60">
            <div className="card-body gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="input input-bordered input-sm max-w-xs flex items-center gap-2">
                  <Search size={14} className="text-base-content/40" />
                  <input
                    className="grow"
                    placeholder="Поиск по названию / домену…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </label>
                <div className="join">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`join-item btn btn-sm ${statusFilter === f.key ? 'bg-lime-400 hover:bg-lime-500 border-0 text-lime-950' : 'btn-ghost'}`}
                      onClick={() => setStatusFilter(f.key)}
                    >
                      {f.label}
                      {f.key !== 'all' && counts[f.key] ? <span className="badge badge-xs ml-1">{counts[f.key]}</span> : null}
                    </button>
                  ))}
                </div>
                <select
                  className="select select-bordered select-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <div className="join ml-auto">
                  <button
                    type="button"
                    className={`join-item btn btn-sm ${view === 'cards' ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => setView('cards')}
                    title="Карточки"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    className={`join-item btn btn-sm ${view === 'table' ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => setView('table')}
                    title="Таблица"
                  >
                    <List size={14} />
                  </button>
                </div>
                <span className="text-sm opacity-50">{rows.length} партнёров</span>
              </div>

              {rows.length === 0 ? (
                <div className="text-center py-14">
                  <Building2 size={36} className="mx-auto text-base-content/25 mb-2" />
                  <div className="opacity-50 text-sm">
                    {q || statusFilter !== 'all' ? 'Ничего не найдено' : 'Партнёров нет'}
                  </div>
                </div>
              ) : view === 'cards' ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {rows.map((p) => (
                    <PartnerCard
                      key={p.id}
                      p={p}
                      cur={cur}
                      maxBill={maxBill}
                      totalIncome={totals.income}
                      onToggle={toggle}
                      busyId={busyId}
                      onCardClick={setDetailPartner}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Учебный центр</th>
                        <th>Домен</th>
                        <th className="text-right">Филиалы</th>
                        <th className="text-right">Ученики</th>
                        <th className="text-right">Счёт/мес ({cur})</th>
                        <th className="text-right">Доля</th>
                        <th>Статус</th>
                        <th>Создан</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => {
                        const s = ORG_STATUS[p.status] || { label: p.status, cls: 'badge-ghost' };
                        const StatusIcon = STATUS_ICON[p.status];
                        const share = totals.income > 0 ? ((p.monthlyBill / totals.income) * 100).toFixed(1) : '0.0';
                        const isBusy = busyId === p.id;
                        return (
                          <tr
                            key={p.id}
                            className="hover cursor-pointer"
                            onClick={() => setDetailPartner(p)}
                          >
                            <td>
                              <div className="flex items-center gap-2.5">
                                <Avatar name={p.name} size={32} />
                                <span className="font-medium">{p.name}</span>
                              </div>
                            </td>
                            <td className="text-base-content/60 text-sm">{p.domain || '—'}</td>
                            <td className="text-right tabular-nums">{fmt(p.branches)}</td>
                            <td className="text-right tabular-nums">{fmt(p.students)}</td>
                            <td className="text-right font-semibold tabular-nums">{fmt(p.monthlyBill)}</td>
                            <td className="text-right text-xs text-base-content/50 tabular-nums">{share}%</td>
                            <td>
                              <span className={`badge badge-sm gap-1 ${s.cls}`}>
                                {StatusIcon && <StatusIcon size={11} />}
                                {s.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap text-sm text-base-content/60">{dateShort(p.createdAt)}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5 justify-end">
                                <Link
                                  to={`/organizations/${p.id}`}
                                  className="btn btn-xs btn-ghost"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ArrowRight size={13} />
                                </Link>
                                <button
                                  className={`btn btn-xs ${p.status === 'frozen' ? 'btn-success' : 'btn-outline btn-error'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggle(p);
                                  }}
                                  disabled={isBusy}
                                >
                                  {isBusy ? <span className="loading loading-spinner loading-xs" /> : p.status === 'frozen' ? 'Актив.' : 'Заморозить'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

      {detailPartner && (
        <DetailModal
          partner={detailPartner}
          cur={cur}
          totalIncome={totals.income}
          onClose={() => setDetailPartner(null)}
          onFreezeRequest={(p) => setFreezeTarget(p)}
          onActivate={(p) => toggle(p)}
          busy={busyId === detailPartner.id}
        />
      )}

      {freezeTarget && (
        <FreezeModal
          partner={freezeTarget}
          onConfirm={confirmFreeze}
          onClose={() => setFreezeTarget(null)}
          busy={busyId === freezeTarget.id}
        />
      )}
    </div>
  );
}
