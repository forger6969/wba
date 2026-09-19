import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Ban, Coins, Plus, ScrollText, UserX, BookOpen, AlertTriangle, AlertCircle, Percent, Lightbulb, Info } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { fmt } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonKpis, SkeletonTable } from '../../components/Skeleton.jsx';
import { Kpi, Panel, EmptyState, Modal } from '../mentor/_ui.jsx';
import { useAdminPenalties, useAdminMentors, useMyDisciplineRules } from '../../queries.js';
import { TYPE_META, LevelBadge } from '../../discipline-meta.jsx';

/**
 * Дисциплина сотрудников филиала (панель Admin).
 *
 * Admin выписывает предупреждения (sariq/qizil) менторам и методистам,
 * а увольнение (qora) — только менторам (см. CAN_ISSUE в discipline.service.js).
 *
 * Бэкенд принимает только sariq/qizil/qora. shtraf отменён 2026-07-29.
 * amount — процент от оклада (0-100), НЕ сумма в сумах.
 *
 * Цвета/названия уровней — единый источник в discipline-meta.jsx (TYPE_META),
 * не дублируются здесь. Иконки для компактных кнопок-пикеров — локальная карта.
 */

const TYPE_ICONS = { sariq: AlertTriangle, qizil: AlertCircle, qora: Ban };

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

const roleLabelMap = (t) => ({
  mentor: t('admin.discipline.roleMentor'),
  methodist: t('admin.discipline.roleMethodist'),
  admin: t('admin.discipline.roleAdmin'),
});

function dateTime(iso, locale = 'ru-RU') {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── Модалка «Выписать взыскание» ──────────────────────────────────────── */
function IssueModal({ open, onClose, staffList, onDone }) {
  const { t } = useTranslation();
  const ROLE_LABEL = roleLabelMap(t);
  const { token } = useAuth();
  const [type, setType] = useState('sariq');
  const [targetUserId, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rules, setRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [rulesError, setRulesError] = useState(false);

  // Load discipline rules when modal opens.
  // GET /super/discipline-rules — супер-эндпоинт (authorize('superadmin')):
  // Admin получает 403, пока Karis не добавит GET /admin/discipline-rules
  // (см. todos.md Task 7). Тогда молча прячем селектор и честно подсказываем.
  useEffect(() => {
    if (open) {
      setRulesError(false);
      api.superDisciplineRules(token)
        .then(res => {
          const data = res?.data?.rules || res?.data || res || [];
          setRules(data);
        })
        .catch(() => {
          setRules([]);
          setRulesError(true);
        });
    }
  }, [open, token]);

  // Auto-fill amount when a rule is selected
  useEffect(() => {
    const rule = rules.find(r => r.id === selectedRuleId);
    if (rule && rule.amount !== undefined && rule.amount !== null) {
      setAmount(String(rule.amount));
    }
  }, [selectedRuleId, rules]);

  const submit = async () => {
    setErr('');
    if (!targetUserId) return setErr(t('admin.discipline.selectStaff'));
    if (!reason.trim()) return setErr(t('admin.discipline.specifyReason'));

    const parsed = amount !== '' ? Number(amount) : undefined;
    if (parsed != null && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
      return setErr(t('admin.discipline.percentRange'));
    }

    setBusy(true);
    try {
      await api.adminIssuePenalty(token, {
        targetUserId,
        type,
        reason: reason.trim(),
        ...(parsed != null ? { amount: parsed } : {}),
      });
      onDone();
      onClose();
      setTarget(''); setAmount(''); setReason(''); setType('sariq'); setSelectedRuleId('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('admin.discipline.issueTitle')}
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t('admin.discipline.cancel')}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : t('admin.discipline.issue')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <div className="alert alert-error text-sm py-2">{err}</div>}

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TYPE_META).map(([key, m]) => {
            const active = type === key;
            const Icon = TYPE_ICONS[key] ?? AlertTriangle;
            const fillText = m.dark ? '#141B10' : '#ffffff';
            return (
              <button
                key={key}
                type="button"
                className="btn btn-sm h-auto py-2 gap-1 whitespace-nowrap border-2 bg-transparent"
                style={active
                  ? { background: m.color, borderColor: m.color, color: fillText }
                  : { background: 'transparent', borderColor: m.color, color: m.color }}
                onMouseEnter={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = m.color;
                  e.currentTarget.style.color = fillText;
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = m.color;
                }}
                onClick={() => setType(key)}
              >
                <Icon size={14} /> {m.short}
              </button>
            );
          })}
        </div>

        <label className="form-control">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
            {t('admin.discipline.staffLabel')}
          </span>
          <select
            className="select select-bordered select-sm rounded-lg"
            value={targetUserId}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">{t('admin.discipline.chooseStaff')}</option>
            {staffList.map((m) => (
              <option key={m.id} value={m.id}>
                {[m.firstName || m.first_name, m.lastName || m.last_name].filter(Boolean).join(' ')} — {ROLE_LABEL[m.role] ?? m.role}
              </option>
            ))}
          </select>
          {staffList.length === 0 && (
            <span className="text-xs text-warning mt-1">
              {t('admin.discipline.noStaffFound')}
            </span>
          )}
        </label>

        <label className="form-control">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
            {t('admin.discipline.percentLabel')}
          </span>
          <div className="join w-full">
            <input
              type="number"
              min="0"
              max="100"
              className="input input-bordered input-sm rounded-lg text-base sm:text-sm join-item flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            <span className="join-item btn btn-sm btn-ghost pointer-events-none text-base-content/45">%</span>
          </div>
          <span className="text-xs text-base-content/45 mt-1">
            {t('admin.discipline.percentHint')}
          </span>
        </label>

        <label className="form-control">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
            {t('admin.discipline.reasonLabel')}
          </span>
          <textarea
            rows={3}
            className="textarea textarea-bordered rounded-lg text-base sm:text-sm resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('admin.discipline.reasonPlaceholder')}
          />
        </label>

        {type === 'qora' && (
          <div className="alert alert-warning text-sm py-2">
            <UserX size={15} className="shrink-0" />
            <span>{t('admin.discipline.qoraWarning')}</span>
          </div>
        )}

        {rules.length > 0 && (
          <label className="form-control">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5 flex items-center gap-1.5">
              {t('admin.discipline.ruleLabel')}
              <Info size={13} className="text-primary" />
            </span>
            <div className="relative">
              <select
                className="select select-bordered select-sm rounded-lg w-full pr-10"
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
              >
                <option value="">{t('admin.discipline.chooseRule')}</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.description} — {TYPE_META[r.type]?.short || r.type} {r.amount !== undefined ? `(${r.amount}%)` : ''}
                  </option>
                ))}
              </select>
              <Lightbulb size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" title={t('admin.discipline.ruleTooltip')} />
            </div>
            <span className="text-xs text-base-content/45 mt-1">
              {t('admin.discipline.ruleHint')}
            </span>
          </label>
        )}

        {rulesError && (
          <div className="alert alert-warning text-sm py-2">
            <Info size={15} className="shrink-0" />
            <span>
              {t('admin.discipline.rulesUnavailablePrefix')}{' '}
              <code>GET /admin/discipline-rules</code> {t('admin.discipline.rulesUnavailableSuffix')}
            </span>
          </div>
        )}

      </div>
    </Modal>
  );
}

/* ── Новая правило (qoyda) ───────────────────────────────────────────────
   Тот же «новый дизайн», что и в панели Super Admin (pages/super/Discipline.jsx):
   уровень выбирается карточками с заливкой цветом уровня (при наведении и при
   выборе), тёмный текст на жёлтом — из discipline-meta.jsx.

   Правило — общее на организацию: полей «ментор» нет ни в схеме бэкенда
   (createRuleSchema: type/amount/description), ни здесь — оно применяется ко
   всем сотрудникам, конкретного ментора спрашивать не нужно (см. todos.md, п.7).

   Backend-гэп: маршрута POST /admin/discipline-rules в admin.routes.js пока нет
   (создание правил — только Super Admin, /super/discipline-rules). Фронт готов;
   если бэкенд ответит 404 — показываем честную жёлтую заглушку вместо ошибки
   (тот же подход, что в Task 6 для email/пароля ментора). */
function NewRuleModal({ open, onClose, onDone }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [type, setType] = useState('sariq');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [gap, setGap] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setErr('');
    setGap(false);
    if (!description.trim()) return setErr(t('admin.discipline.describeRule'));

    setBusy(true);
    try {
      await api.adminCreateDisciplineRule(token, {
        type,
        description: description.trim(),
        // необязательный довесок у sariq/qizil/qora — шлём, только если вписали
        ...(amount ? { amount: Number(amount) } : {}),
      });
      onDone();
      onClose();
      setType('sariq'); setAmount(''); setDescription('');
    } catch (e) {
      if (e.status === 404) setGap(true);
      else setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('admin.discipline.newRuleTitle')}
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t('admin.discipline.cancel')}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : t('admin.discipline.save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <div className="alert alert-error text-sm py-2">{err}</div>}
        {gap && (
          <div className="alert alert-warning text-sm py-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>
              {t('admin.discipline.gapWarningPrefix')}{' '}
              <code>POST /admin/discipline-rules</code> {t('admin.discipline.gapWarningSuffix')}
            </span>
          </div>
        )}

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5 block">
            {t('admin.discipline.levelLabel')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_META).map(([key, m]) => {
              const active = type === key;
              const fillText = m.dark ? '#141B10' : '#ffffff';
              return (
                <button
                  key={key}
                  type="button"
                  className="btn btn-sm h-auto py-2.5 whitespace-normal leading-tight text-center border-2 bg-transparent"
                  style={active
                    ? { background: m.color, borderColor: m.color, color: fillText }
                    : { background: 'transparent', borderColor: m.color, color: m.color }}
                  onMouseEnter={(e) => {
                    if (active) return;
                    e.currentTarget.style.background = m.color;
                    e.currentTarget.style.color = fillText;
                  }}
                  onMouseLeave={(e) => {
                    if (active) return;
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = m.color;
                  }}
                  onClick={() => setType(key)}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="form-control">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
            {t('admin.discipline.percentAmountLabel')}
          </span>
          <input
            type="number"
            min="0"
            max="100"
            className="input input-bordered input-sm rounded-lg text-base sm:text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('admin.discipline.percentPlaceholder')}
          />
        </label>

        <label className="form-control">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
            {t('admin.discipline.whatForLabel')}
          </span>
          <textarea
            rows={2}
            className="textarea textarea-bordered rounded-lg text-base sm:text-sm resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('admin.discipline.whatForPlaceholder')}
          />
        </label>

        <div className="alert alert-info text-sm py-2">
          <BookOpen size={15} className="shrink-0" />
          <span>{t('admin.discipline.appliesToAll')}</span>
        </div>
      </div>
    </Modal>
  );
}

/* ── Панель правил дисциплины (каталог) ───────────────────────────────── */
function RulesPanel() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const qc = useQueryClient();
  const { data, isLoading } = useMyDisciplineRules();
  const rules = data?.data ?? data ?? [];
  const [open, setOpen] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-discipline-rules'] });

  return (
    <Panel
      title={t('admin.discipline.rulesTitle')}
      icon={BookOpen}
      bodyClass="p-0"
      action={
        <button className="btn btn-outline btn-xs gap-1" onClick={() => setOpen(true)}>
          <Plus size={13} /> {t('admin.discipline.newRule')}
        </button>
      }
    >
      {isLoading ? (
        <div className="p-4"><SkeletonTable /></div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('admin.discipline.noRulesTitle')}
          hint={t('admin.discipline.noRulesHint')}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>{t('admin.discipline.colRule')}</th>
                <th>{t('admin.discipline.colLevel')}</th>
                <th className="text-right w-24">{t('admin.discipline.colPercent')}</th>
                <th className="w-40">{t('admin.discipline.colAdded')}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="text-sm max-w-md">{r.description}</td>
                  <td><LevelBadge type={r.type} size="sm" /></td>
                  <td className="text-right tabular-nums">
                    {r.amount != null ? (
                      <span className="inline-flex items-center gap-0.5 font-semibold">
                        {r.amount} <Percent size={11} className="text-base-content/45" />
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-xs text-base-content/55">
                    {dateTime(r.created_at || r.createdAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewRuleModal open={open} onClose={() => setOpen(false)} onDone={refresh} />
    </Panel>
  );
}

/* ── Основной компонент ────────────────────────────────────────────────── */
export default function AdminDiscipline() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const ROLE_LABEL = roleLabelMap(t);
  const { token } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [issueOpen, setIssueOpen] = useState(false);

  const penalties = useAdminPenalties();
  const mentorsQuery = useAdminMentors();

  const items = penalties.data?.data ?? penalties.data ?? [];
  const mentorsRaw = mentorsQuery.data?.data || mentorsQuery.data || {};
  const mentorsList = mentorsRaw.mentors || (Array.isArray(mentorsRaw) ? mentorsRaw : []);

  // Admin может выдать sariq/qizil менторам и методистам, qora — только менторам.
  // Собираем методистов и менторов вместе для формы, чтобы admin мог выбрать любого.
  const staff = useMemo(() =>
    mentorsList.map((m) => ({ ...m, role: m.role || 'mentor' })),
    [mentorsList],
  );

  const totals = useMemo(() => items.reduce((acc, p) => {
    if (p.type === 'sariq') acc.sariq += 1;
    else if (p.type === 'qizil') acc.qizil += 1;
    else if (p.type === 'qora') acc.qora += 1;
    return acc;
  }, { sariq: 0, qizil: 0, qora: 0 }), [items]);

  const shown = filter === 'all' ? items : items.filter((p) => p.type === filter);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-penalties'] });

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.discipline.title')} subtitle={t('admin.discipline.subtitle')}>
        <button
          className="btn btn-primary btn-sm gap-1.5"
          onClick={() => setIssueOpen(true)}
        >
          <Plus size={15} /> {t('admin.discipline.issueBtn')}
        </button>
      </PageHeader>

      {penalties.isLoading ? (
        <SkeletonKpis count={3} className="grid-cols-2 lg:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Kpi Icon={AlertTriangle} tone="warning" title={t('admin.discipline.yellow')} value={fmt(totals.sariq, i18n.language)} unit={t('admin.discipline.warningsUnit')} />
          <Kpi Icon={AlertCircle} tone="danger" title={t('admin.discipline.red')} value={fmt(totals.qizil, i18n.language)} unit={t('admin.discipline.warningsUnit')} />
          <Kpi Icon={Ban} tone="neutral" title={t('admin.discipline.black')} value={fmt(totals.qora, i18n.language)} unit={t('admin.discipline.dismissalsUnit')} />
        </div>
      )}

      <Panel
        title={t('admin.discipline.historyTitle')}
        icon={ScrollText}
        bodyClass="p-0"
        action={
          <div className="join">
            {[['all', t('admin.discipline.filterAll')], ['sariq', t('admin.discipline.yellow')], ['qizil', t('admin.discipline.red')], ['qora', t('admin.discipline.black')]].map(([key, label]) => (
              <button
                key={key}
                className={`btn btn-xs join-item ${filter === key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {penalties.isLoading ? (
          <div className="p-4"><SkeletonTable /></div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={items.length === 0 ? t('admin.discipline.noPenaltiesTitle') : t('admin.discipline.emptyCategoryTitle')}
            hint={items.length === 0 ? t('admin.discipline.noPenaltiesHint') : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t('admin.discipline.colStaff')}</th>
                  <th>{t('admin.discipline.colType')}</th>
                  <th className="text-right">{t('admin.discipline.colPercent')}</th>
                  <th>{t('admin.discipline.colReason')}</th>
                  <th>{t('admin.discipline.colIssuedBy')}</th>
                  <th>{t('admin.discipline.colWhen')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="font-semibold">{p.target_name ?? p.targetName ?? '—'}</div>
                        <div className="text-xs text-base-content/45">
                          {ROLE_LABEL[p.target_role ?? p.targetRole] ?? p.target_role}
                        </div>
                      </td>
                      <td>
                        <LevelBadge type={p.type} size="sm" />
                      </td>
                      <td className="text-right tabular-nums font-semibold">
                        {p.amount == null ? '—' : `${Number(p.amount)}%`}
                      </td>
                      <td className="max-w-xs"><span className="text-sm">{p.reason}</span></td>
                      <td className="text-sm">
                        {p.issued_by_name ?? p.issuedByName ?? '—'}
                        <div className="text-xs text-base-content/45">
                          {ROLE_LABEL[p.issuer_role ?? p.issuerRole] ?? ''}
                        </div>
                      </td>
                      <td className="text-xs text-base-content/55 whitespace-nowrap">
                        {dateTime(p.created_at ?? p.createdAt, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <RulesPanel />

      <IssueModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        staffList={staff}
        onDone={refresh}
      />
    </div>
  );
}
