import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Plus, Edit2, ShieldAlert, KeyRound, Copy, Check, AlertTriangle,
  MoreVertical, ChevronDown, Users, UserCheck, Building2,
} from 'lucide-react';
import { dateShort } from '../../format.js';
import { useSuperAdmins, useSuperMentors, useSuperMethodists, useSuperBranches, useSuperBranchManagers, useSuperEmployees, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import PhoneInput from '../../components/PhoneInput.jsx';
import { Card, SearchInput, StatusBadge, Modal, Dropdown, DropdownItem, Avatar } from './_ui.jsx';

/**
 * «Сотрудники» — раньше две отдельные вкладки (Администраторы / Методисты),
 * каждая со своим поиском. Karis: поиск сверху должен видеть ВСЕХ сотрудников
 * разом (включая менторов — read-only, заводит их Admin филиала, но видеть
 * и находить их CEO должен), а у каждой строки должно быть видно,
 * кто это — админ/ментор/методист. Поэтому одна таблица на всех троих.
 *
 * Действия (редактировать/сбросить пароль/заморозить) раньше сидели прямо в
 * строке рядом с местом, по которому кликают, чтобы открыть карточку —
 * лёгкий промах мышью бил не туда. Теперь они в выпадающем меню (тот же
 * паттерн, что и ActionDropdown в admin/Expenses.jsx), с остановкой всплытия
 * клика, чтобы не открывать карточку сотрудника по ошибке.
 */

const phoneRegex = /^\+?\d{7,20}$/;

// Оклад — метаданные карточки, не пересчитывается автоматически (см. backend
// super.schemas.js). Пустое поле = не трогать текущее значение, поэтому '' до
// coerce превращается в undefined, а не в 0.
const monthlySalaryFieldFor = (t) => z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.number().min(0, t('super.admins.salaryNegative')).max(1_000_000_000_000).optional(),
);

const adminCreateSchemaFor = (t) => z.object({
  firstName: z.string().trim().min(1, t('super.admins.firstNameRequired')).max(80),
  lastName:  z.string().trim().min(1, t('super.admins.lastNameRequired')).max(80),
  email:     z.string().trim().min(1, t('super.admins.emailRequired')).email(t('super.admins.emailInvalid')).max(120),
  branchId:  z.string().uuid(t('super.admins.selectBranch')).min(1, t('super.admins.selectBranch')),
  phone:     z.string().trim().regex(phoneRegex, t('super.admins.phoneFormat')).or(z.literal('')),
});

const adminEditSchemaFor = (t) => z.object({
  firstName: z.string().trim().min(1, t('super.admins.firstNameRequired')).max(80),
  lastName:  z.string().trim().min(1, t('super.admins.lastNameRequired')).max(80),
  branchId:  z.string().uuid(t('super.admins.selectBranch')).min(1, t('super.admins.selectBranch')),
  phone:     z.string().trim().regex(phoneRegex, t('super.admins.phoneFormat')).or(z.literal('')),
  monthlySalary: monthlySalaryFieldFor(t),
});

const employeeCreateSchemaFor = (t) => adminCreateSchemaFor(t).extend({
  jobTitle: z.string().trim().min(2, t('super.admins.jobTitleRequired')).max(120),
});
const employeeEditSchemaFor = (t) => adminEditSchemaFor(t).extend({
  jobTitle: z.string().trim().min(2, t('super.admins.jobTitleRequired')).max(120),
});

const methodistCreateSchemaFor = (t) => z.object({
  firstName: z.string().trim().min(1, t('super.admins.firstNameRequired')).max(80),
  lastName:  z.string().trim().min(1, t('super.admins.lastNameRequired')).max(80),
  email:     z.string().trim().min(1, t('super.admins.emailRequired')).email(t('super.admins.emailInvalid')).max(120),
  phone:     z.string().trim().regex(phoneRegex, t('super.admins.phoneFormat')).or(z.literal('')),
});

const methodistEditSchemaFor = (t) => z.object({
  firstName: z.string().trim().min(1, t('super.admins.firstNameRequired')).max(80),
  lastName:  z.string().trim().min(1, t('super.admins.lastNameRequired')).max(80),
  phone:     z.string().trim().regex(phoneRegex, t('super.admins.phoneFormat')).or(z.literal('')),
  monthlySalary: monthlySalaryFieldFor(t),
});

// admin и branch_manager заводятся/правятся одинаково (firstName/lastName/email/branchId/phone) —
// у обоих ровно один филиал, в отличие от methodist (вся организация, без филиала).
const needsBranch = (role) => role === 'admin' || role === 'branch_manager' || role === 'employee' || role === 'mentor';

function schemaFor(role, mode, t) {
  if (role === 'employee') return mode === 'create' ? employeeCreateSchemaFor(t) : employeeEditSchemaFor(t);
  if (needsBranch(role)) return mode === 'create' ? adminCreateSchemaFor(t) : adminEditSchemaFor(t);
  return mode === 'create' ? methodistCreateSchemaFor(t) : methodistEditSchemaFor(t);
}

const statusMetaFor = (t) => ({
  active: { label: t('super.admins.statusActive'), tone: 'success' },
  frozen: { label: t('super.admins.statusFrozen'), tone: 'danger' },
  fired:  { label: t('super.admins.statusFired'), tone: 'danger' },
});

// Тон роли — не success/warning/error: те заняты статусом и уровнями
// дисциплины, брать их для роли было бы путаницей («красный» ментор ≠
// проблема). primary/info/neutral свободны на этой странице.
const roleMetaFor = (t) => ({
  admin:            { label: t('super.admins.roleAdmin'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mentor:           { label: t('super.admins.roleMentor'), cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  methodist:        { label: t('super.admins.roleMethodist'), cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  branch_manager:   { label: t('super.admins.roleBranchManager'), cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  employee:         { label: t('super.admins.roleEmployee'), cls: 'bg-slate-50 text-slate-700 border-slate-200' },
});

// винительный падеж для «Создать/Редактировать ...» — ROLE_META.label в именительном
const roleAccusativeFor = (t) => ({
  admin: t('super.admins.roleAccAdmin'),
  methodist: t('super.admins.roleAccMethodist'),
  branch_manager: t('super.admins.roleAccBranchManager'),
  employee: t('super.admins.roleAccEmployee'),
  mentor: t('super.admins.roleAccMentor'),
});

function RoleBadge({ role }) {
  const { t } = useTranslation();
  const ROLE_META = roleMetaFor(t);
  const m = ROLE_META[role] ?? { label: role, cls: 'bg-base-200 text-base-content/70 border-base-300' };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${m.cls}`}>{m.label}</span>;
}

// ─── Показ сгенерированного пароля (один раз) ────────────────
function TempPasswordModal({ email, password, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(password || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Modal isOpen title={t('super.admins.passwordGeneratedTitle')} onClose={onClose} className="max-w-lg border border-base-300" actions={<button className="btn btn-primary w-full" onClick={onClose}>{t('super.admins.done')}</button>}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-success/20 grid place-items-center">
          <Check size={24} className="text-success" />
        </div>
        <div>
          <h4 className="font-bold text-success">{t('super.admins.doneExclaim')}</h4>
          <p className="text-sm text-base-content/60">{t('super.admins.passwordAutoGenerated')}</p>
        </div>
      </div>
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-warning">{t('super.admins.savePasswordWarning')}</p>
        </div>
        <div className="bg-base-100 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base-content/55 w-16 shrink-0">{t('super.admins.loginLabel')}</span>
            <span className="font-semibold">{email}</span>
          </div>
          <div className="border-t border-base-200 pt-2 mt-2">
            <div className="text-xs text-base-content/50 mb-1.5 font-semibold uppercase tracking-wider">{t('super.admins.passwordLabel')}</div>
            <div className="flex items-center gap-2">
              <code className="font-mono font-bold text-xl tracking-widest bg-base-200 px-3 py-2 rounded-lg flex-1 text-center">
                {password}
              </code>
              <button className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'} gap-1.5`} onClick={copy}>
                {copied ? <><Check size={14} /> {t('super.admins.copied')}</> : <><Copy size={14} /> {t('super.admins.copy')}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Действия над строкой сотрудника ──────────────────────────
// Ментор — read-only для CEO (заводит и правит его Admin филиала),
// поэтому у него в меню нечего показывать.
function StaffActionsMenu({ row, resetBusy, onEdit, onResetPassword, onToggleFreeze }) {
  const { t } = useTranslation();
  if (row.role === 'mentor') {
    return <span className="text-xs text-base-content/30 px-2">{t('super.admins.viewOnly')}</span>;
  }
  const frozen = row.status === 'frozen';
  return (
    <Dropdown
      trigger={(toggle) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-base-content/45 hover:text-base-content hover:bg-base-200 transition-all"
        >
          <MoreVertical size={16} />
        </button>
      )}
    >
      {(close) => (
        <>
          {!frozen && (
            <>
              <DropdownItem icon={Edit2} onClick={() => { onEdit(row); close(); }}>
                {t('super.admins.edit')}
              </DropdownItem>
              <DropdownItem
                icon={KeyRound}
                disabled={resetBusy}
                onClick={() => { onResetPassword(row); close(); }}
              >
                {resetBusy ? t('super.admins.resettingPassword') : t('super.admins.resetPassword')}
              </DropdownItem>
              <div className="border-t border-base-300 my-1" />
            </>
          )}
          <DropdownItem
            icon={ShieldAlert}
            danger={!frozen}
            onClick={() => { onToggleFreeze(row); close(); }}
          >
            {frozen ? t('super.admins.unfreeze') : t('super.admins.freeze')}
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

// ─── Кнопка «Добавить» — выбор роли (ментора CEO не заводит) ────
function AddStaffButton({ onPick, disabled }) {
  const { t } = useTranslation();
  return (
    <Dropdown
      trigger={(toggle) => (
        <button
          className="btn btn-primary btn-sm gap-1.5"
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          disabled={disabled}
        >
          <Plus size={16} /> {t('super.admins.add')} <ChevronDown size={14} />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownItem onClick={() => { onPick('admin'); close(); }}>{t('super.admins.pickAdmin')}</DropdownItem>
          <DropdownItem onClick={() => { onPick('methodist'); close(); }}>{t('super.admins.pickMethodist')}</DropdownItem>
          <DropdownItem onClick={() => { onPick('branch_manager'); close(); }}>{t('super.admins.pickBranchManager')}</DropdownItem>
          <DropdownItem onClick={() => { onPick('employee'); close(); }}>{t('super.admins.pickEmployee')}</DropdownItem>
          <DropdownItem onClick={() => { onPick('mentor'); close(); }}>{t('super.admins.pickMentor')}</DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

export default function SuperAdmins() {
  const { t } = useTranslation();
  const ROLE_ACCUSATIVE = roleAccusativeFor(t);
  const STATUS_META = statusMetaFor(t);
  const { token } = useAuth();
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  const admins = useSuperAdmins();
  const mentors = useSuperMentors();
  const methodists = useSuperMethodists();
  const branchManagers = useSuperBranchManagers();
  const employees = useSuperEmployees();
  const branchesQ = useSuperBranches();

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [err, setErr] = useState('');
  const [formModal, setFormModal] = useState(null); // { role: 'admin'|'methodist', mode: 'create'|'edit', id }
  const [busy, setBusy] = useState(false);
  const [resetBusyId, setResetBusyId] = useState(null);
  const [tempPassword, setTempPassword] = useState(null); // { email, password }

  const schema = formModal ? schemaFor(formModal.role, formModal.mode, t) : adminCreateSchemaFor(t);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const branches = branchesQ.data?.branches || [];
  const activeBranches = branches.filter((b) => !b.isArchived);

  const allRows = useMemo(() => [
    ...(admins.data?.admins ?? []).map((u) => ({ ...u, role: 'admin' })),
    ...(mentors.data?.mentors ?? []).map((u) => ({ ...u, role: 'mentor' })),
    ...(methodists.data?.methodists ?? []).map((u) => ({ ...u, role: 'methodist' })),
    ...(branchManagers.data?.managers ?? []).map((u) => ({ ...u, role: 'branch_manager' })),
    ...(employees.data?.employees ?? []).map((u) => ({ ...u, role: 'employee' })),
  ], [admins.data, mentors.data, methodists.data, branchManagers.data, employees.data]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const byRole = roleFilter === 'all' ? allRows : allRows.filter((r) => r.role === roleFilter);
    const filtered = !query ? byRole : byRole.filter((r) => {
      const full = `${r.firstName} ${r.lastName}`.toLowerCase();
      return full.includes(query)
        || (r.email || '').toLowerCase().includes(query)
        || (r.branchName || '').toLowerCase().includes(query);
    });
    return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allRows, q, roleFilter]);

  const loading = admins.isLoading || mentors.isLoading || methodists.isLoading || branchManagers.isLoading || employees.isLoading;
  const loadError = [admins.error, mentors.error, methodists.error, branchManagers.error, employees.error].find((e) => e && e.status !== 401);
  const showErr = err || loadError?.message || '';

  const openCreate = (role) => {
    setErr('');
    if (needsBranch(role)) reset({ firstName: '', lastName: '', email: '', branchId: activeBranches?.[0]?.id || '', phone: '', jobTitle: '' });
    else reset({ firstName: '', lastName: '', email: '', phone: '' });
    setFormModal({ role, mode: 'create', id: null });
  };

  const openEdit = (row) => {
    setErr('');
    if (needsBranch(row.role)) {
      reset({
        firstName: row.firstName || '',
        lastName: row.lastName || '',
        branchId: row.branchId || '',
        phone: row.phone || '',
        monthlySalary: row.monthlySalary ?? '',
        jobTitle: row.jobTitle || '',
      });
    } else {
      reset({
        firstName: row.firstName || '',
        lastName: row.lastName || '',
        phone: row.phone || '',
        monthlySalary: row.monthlySalary ?? '',
      });
    }
    setFormModal({ role: row.role, mode: 'edit', id: row.id, email: row.email });
  };

  const onSubmit = async (formData) => {
    setErr('');
    setBusy(true);
    try {
      if (formModal.role === 'mentor') {
        const { mentor } = await api.superCreateMentor(token, {
          firstName: formData.firstName.trim(), lastName: formData.lastName.trim(), email: formData.email.trim(),
          branchId: formData.branchId, phone: formData.phone.trim() || undefined,
        });
        setTempPassword({ email: mentor.email, password: mentor.password });
        invalidate('super-mentors', 'super-dashboard');
      } else if (formModal.role === 'admin') {
        if (formModal.mode === 'create') {
          const { admin } = await api.superCreateAdmin(token, {
            firstName: formData.firstName.trim(),
            lastName:  formData.lastName.trim(),
            email:     formData.email.trim(),
            branchId:  formData.branchId,
            phone:     formData.phone.trim() || undefined,
          });
          setTempPassword({ email: admin.email, password: admin.tempPassword });
        } else {
          await api.superUpdateAdmin(token, formModal.id, {
            firstName: formData.firstName.trim(),
            lastName:  formData.lastName.trim(),
            branchId:  formData.branchId,
            phone:     formData.phone.trim() || undefined,
            monthlySalary: formData.monthlySalary,
          });
        }
        invalidate('super-admins', 'super-dashboard');
      } else if (formModal.role === 'employee') {
        if (formModal.mode === 'create') {
          const { employee } = await api.superCreateEmployee(token, {
            firstName: formData.firstName.trim(), lastName: formData.lastName.trim(), email: formData.email.trim(),
            branchId: formData.branchId, phone: formData.phone.trim() || undefined, jobTitle: formData.jobTitle.trim(),
          });
          setTempPassword({ email: employee.email, password: employee.tempPassword });
        } else {
          await api.superUpdateEmployee(token, formModal.id, {
            firstName: formData.firstName.trim(), lastName: formData.lastName.trim(), branchId: formData.branchId,
            phone: formData.phone.trim() || undefined, jobTitle: formData.jobTitle.trim(), monthlySalary: formData.monthlySalary,
          });
        }
        invalidate('super-employees');
      } else if (formModal.role === 'branch_manager') {
        if (formModal.mode === 'create') {
          const { manager } = await api.superCreateBranchManager(token, {
            firstName: formData.firstName.trim(),
            lastName:  formData.lastName.trim(),
            email:     formData.email.trim(),
            branchId:  formData.branchId,
            phone:     formData.phone.trim() || undefined,
          });
          setTempPassword({ email: manager.email, password: manager.tempPassword });
        } else {
          await api.superUpdateBranchManager(token, formModal.id, {
            firstName: formData.firstName.trim(),
            lastName:  formData.lastName.trim(),
            branchId:  formData.branchId,
            phone:     formData.phone.trim() || undefined,
          });
        }
        invalidate('super-branch-managers');
      } else {
        if (formModal.mode === 'create') {
          const { methodist } = await api.superCreateMethodist(token, {
            firstName: formData.firstName.trim(),
            lastName:  formData.lastName.trim(),
            email:     formData.email.trim(),
            phone:     formData.phone.trim() || undefined,
          });
          setTempPassword({ email: methodist.email, password: methodist.tempPassword });
        } else {
          await api.superUpdateMethodist(token, formModal.id, {
            firstName: formData.firstName.trim(),
            lastName:  formData.lastName.trim(),
            phone:     formData.phone.trim() || undefined,
            monthlySalary: formData.monthlySalary,
          });
        }
        invalidate('super-methodists');
      }
      setFormModal(null);
    } catch (e) {
      setErr(e.status === 409 ? t('super.admins.emailTaken') : e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFreeze = async (row) => {
    setErr('');
    try {
      if (row.role === 'admin') {
        if (row.status === 'frozen') await api.superUnfreezeAdmin(token, row.id);
        else await api.superFreezeAdmin(token, row.id);
        invalidate('super-admins', 'super-dashboard');
      } else if (row.role === 'employee') {
        await api.superFreezeEmployee(token, row.id, row.status !== 'frozen');
        invalidate('super-employees');
      } else if (row.role === 'branch_manager') {
        if (row.status === 'frozen') await api.superUnfreezeBranchManager(token, row.id);
        else await api.superFreezeBranchManager(token, row.id);
        invalidate('super-branch-managers');
      } else {
        if (row.status === 'frozen') await api.superUnfreezeMethodist(token, row.id);
        else await api.superFreezeMethodist(token, row.id);
        invalidate('super-methodists');
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  const resetPassword = async (row) => {
    setErr('');
    setResetBusyId(row.id);
    try {
      if (row.role === 'admin') {
        const { admin } = await api.superResetAdminPassword(token, row.id);
        setTempPassword({ email: row.email, password: admin.tempPassword });
      } else if (row.role === 'employee') {
        const { employee } = await api.superResetEmployeePassword(token, row.id);
        setTempPassword({ email: row.email, password: employee.tempPassword });
      } else if (row.role === 'branch_manager') {
        const { manager } = await api.superResetBranchManagerPassword(token, row.id);
        setTempPassword({ email: row.email, password: manager.tempPassword });
      } else {
        const { methodist } = await api.superResetMethodistPassword(token, row.id);
        setTempPassword({ email: row.email, password: methodist.tempPassword });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setResetBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="relative z-[60]">
        <PageHeader title={t('super.admins.teamTitle')} subtitle={t('super.admins.teamSubtitle')}>
          <AddStaffButton onPick={openCreate} disabled={!branches.length} />
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex flex-row items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Users size={19} /></span>
          <div><div className="text-2xl font-extrabold tabular-nums">{allRows.length}</div><div className="text-xs text-base-content/50">{t('super.admins.totalStaff')}</div></div>
        </Card>
        <Card className="p-4 flex flex-row items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-success/10 text-success grid place-items-center"><UserCheck size={19} /></span>
          <div><div className="text-2xl font-extrabold tabular-nums">{allRows.filter((r) => r.status === 'active').length}</div><div className="text-xs text-base-content/50">{t('super.admins.activeAccounts')}</div></div>
        </Card>
        <Card className="p-4 flex flex-row items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-info/10 text-info grid place-items-center"><Building2 size={19} /></span>
          <div><div className="text-2xl font-extrabold tabular-nums">{activeBranches.length}</div><div className="text-xs text-base-content/50">{t('super.admins.activeBranches')}</div></div>
        </Card>
      </div>

      <Card className="overflow-hidden">
          <div className="p-4 md:p-5 border-b border-base-300 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t('super.admins.searchPlaceholder')}
              className="w-full lg:max-w-md bg-base-100"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-base-content/45">
                {t('super.admins.shownOfTotal', { shown: rows.length, total: allRows.length })}
              </span>
            </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                ['all', t('super.admins.filterAll')], ['admin', t('super.admins.filterAdmins')], ['mentor', t('super.admins.filterMentors')],
                ['methodist', t('super.admins.filterMethodists')], ['branch_manager', t('super.admins.filterBranchManagers')], ['employee', t('super.admins.filterOther')],
              ].map(([value, label]) => (
                <button key={value} onClick={() => setRoleFilter(value)} className={`btn btn-sm whitespace-nowrap ${roleFilter === value ? 'btn-primary' : 'btn-ghost bg-base-200/70'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showErr && <div className="alert alert-error text-sm mb-3"><span>{showErr}</span></div>}

          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : rows.length === 0 ? (
            <p className="text-center opacity-50 py-8 text-sm">
              {allRows.length === 0 ? t('super.admins.noStaffYet') : t('super.admins.nothingFoundQuery')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-pin-rows">
                <thead>
                  <tr className="bg-base-200/60 text-[11px] uppercase tracking-wider text-base-content/55">
                    <th>{t('super.admins.colFullName')}</th><th>{t('super.admins.colRole')}</th><th>{t('super.admins.colEmail')}</th><th>{t('super.admins.colPhone')}</th>
                    <th>{t('super.admins.colBranch')}</th><th>{t('super.admins.colCreated')}</th><th>{t('super.admins.colStatus')}</th><th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const s = STATUS_META[row.status] || { label: row.status, tone: 'neutral' };
                    const dimmed = row.status === 'frozen' || row.status === 'fired';
                    return (
                      <tr
                        key={`${row.role}-${row.id}`}
                        className={`cursor-pointer border-b border-base-200 hover:bg-primary/[0.035] transition-colors ${dimmed ? 'opacity-60' : ''}`}
                        onClick={() => row.role !== 'employee' && navigate(`/admins/${row.role}/${row.id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={`${row.firstName} ${row.lastName}`} size="md" />
                            <span className="font-bold whitespace-nowrap">{row.firstName} {row.lastName}</span>
                          </div>
                        </td>
                        <td><RoleBadge role={row.role} />{row.jobTitle && <div className="text-xs text-base-content/45 mt-1">{row.jobTitle}</div>}</td>
                        <td className="text-sm max-w-[230px] truncate">{row.email}</td>
                        <td className="text-sm whitespace-nowrap">{row.phone || '—'}</td>
                        <td className="font-semibold whitespace-nowrap">{row.branchName || '—'}</td>
                        <td className="text-sm tabular-nums whitespace-nowrap">{dateShort(row.createdAt)}</td>
                        <td><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                        <td className="text-right">
                          <StaffActionsMenu
                            row={row}
                            resetBusy={resetBusyId === row.id}
                            onEdit={openEdit}
                            onResetPassword={resetPassword}
                            onToggleFreeze={toggleFreeze}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      <Modal
        isOpen={!!formModal}
        onClose={() => setFormModal(null)}
        title={formModal ? (
          formModal.mode === 'create'
            ? t('super.admins.createRolePrefix', { role: ROLE_ACCUSATIVE[formModal.role] ?? formModal.role })
            : t('super.admins.editRolePrefix', { role: ROLE_ACCUSATIVE[formModal.role] ?? formModal.role })
        ) : ''}
      >
        {formModal && (
          <>
            {err && <div className="alert alert-error text-sm py-2 mb-3"><span>{err}</span></div>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.firstNameLabel')}</span>
                  <input {...register('firstName')} placeholder={t('super.admins.firstNamePlaceholder')} className={`input input-bordered w-full ${errors.firstName ? 'input-error' : ''}`} />
                  {errors.firstName && <span className="text-xs text-error mt-1">{errors.firstName.message}</span>}
                </label>
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.lastNameLabel')}</span>
                  <input {...register('lastName')} placeholder={t('super.admins.lastNamePlaceholder')} className={`input input-bordered w-full ${errors.lastName ? 'input-error' : ''}`} />
                  {errors.lastName && <span className="text-xs text-error mt-1">{errors.lastName.message}</span>}
                </label>
              </div>
              {formModal.mode === 'create' ? (
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.emailLoginLabel')}</span>
                  <input {...register('email')} placeholder={`${formModal.role}@levelup.local`} className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`} />
                  {errors.email && <span className="text-xs text-error mt-1">{errors.email.message}</span>}
                  <span className="text-xs text-base-content/45 mt-1">{t('super.admins.passwordAutoGenHint')}</span>
                </label>
              ) : needsBranch(formModal.role) ? (
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.emailLoginLabelNoStar')}</span>
                  <input type="email" disabled value={formModal.email || ''} className="input input-bordered w-full bg-base-200 cursor-not-allowed opacity-70" />
                </label>
              ) : (
                <div className="text-xs text-base-content/50 bg-base-200 rounded-lg px-3 py-2">
                  {t('super.admins.emailCannotChange')}
                </div>
              )}
              {needsBranch(formModal.role) && (
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.assignBranchLabel')}</span>
                  <select {...register('branchId')} className={`select select-bordered w-full ${errors.branchId ? 'select-error' : ''}`}>
                    <option value="" disabled>{t('super.admins.selectBranchOption')}</option>
                    {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.branchId && <span className="text-xs text-error mt-1">{errors.branchId.message}</span>}
                </label>
              )}
              {formModal.role === 'employee' && (
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.jobTitleLabel')}</span>
                  <input {...register('jobTitle')} placeholder={t('super.admins.jobTitlePlaceholder')} className={`input input-bordered w-full ${errors.jobTitle ? 'input-error' : ''}`} />
                  {errors.jobTitle && <span className="text-xs text-error mt-1">{errors.jobTitle.message}</span>}
                </label>
              )}
              <label className="form-control w-full">
                <span className="label-text mb-1">{t('super.admins.phoneLabel')}</span>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
                    />
                  )}
                />
                {errors.phone && <span className="text-xs text-error mt-1">{errors.phone.message}</span>}
              </label>
              {formModal.mode === 'edit' && formModal.role !== 'branch_manager' && (
                <label className="form-control w-full">
                  <span className="label-text mb-1">{t('super.admins.salaryLabel')}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('monthlySalary')}
                    placeholder={t('super.admins.salaryPlaceholder')}
                    className={`input input-bordered w-full ${errors.monthlySalary ? 'input-error' : ''}`}
                  />
                  {errors.monthlySalary
                    ? <span className="text-xs text-error mt-1">{errors.monthlySalary.message}</span>
                    : <span className="text-xs text-base-content/45 mt-1">{t('super.admins.salaryHint')}</span>}
                </label>
              )}
              <div className="modal-action">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormModal(null)} disabled={busy}>{t('super.admins.cancel')}</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  {busy && <span className="loading loading-spinner loading-sm" />}
                  {formModal.mode === 'create' ? t('super.admins.create') : t('super.admins.save')}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {tempPassword && (
        <TempPasswordModal
          email={tempPassword.email}
          password={tempPassword.password}
          onClose={() => setTempPassword(null)}
        />
      )}
    </div>
  );
}
