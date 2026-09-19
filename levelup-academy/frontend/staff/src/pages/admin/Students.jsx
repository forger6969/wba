import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Snowflake, Sun, Archive, KeyRound, GraduationCap, UserCheck, UserX,
  Copy, Check, Coins, LayoutGrid, List, AlertTriangle, Download
} from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useAdminStudents, useAdminGroups } from '../../queries.js';
import { api } from '../../api.js';
import PhoneInput from '../../components/PhoneInput.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ExportDialog from '../../components/ExportDialog.jsx';
import { Avatar, EmptyState, Kpi, RowSkeleton, SearchInput, Tip } from '../mentor/_ui.jsx';

const fullName = (s) =>
  s.fullName || [s.firstName || s.first_name, s.lastName || s.last_name].filter(Boolean).join(' ') || '—';

// backend хранит имя/фамилию раздельно, форма — одним полем «Имя Фамилия»
// (как «Vakil ismi» у референса): делим по первому пробелу, остаток — фамилия;
// без пробела — и то, и то одно слово (лучше так, чем блокировать сохранение).
const splitName = (full) => {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || parts[0] || '' };
};

// Поля 1:1 с backend createStudentSchema (admin.schemas.js). Родитель —
// вложенный объект {firstName,lastName,phone}, а не плоский parentPhone.
// gender/address/school/leadSource/hasLaptop/offerSigned подключены к
// student_profiles 08.08.2026 (миграция 1784340000000) — были декоративными,
// теперь реально сохраняются и питают виджет «Профиль заполнен» на StudentDetail.
// preferredLanguage/comment/phoneOwner-поля остаются статикой — под них ещё
// нет колонок, Karis подтвердил 08.08.2026: можно копить, пока не появятся.
const emptyForm = {
  firstName: '', lastName: '', phone: '', birthDate: '', groupId: '',
  // Родитель — поля всегда видны (как у референса), не за чекбоксом.
  // Отправляется на backend, только если заполнены имя и телефон разом.
  parentName: '', parentPhone: '',
  gender: '', address: '', school: '', leadSource: '', hasLaptop: false, offerSigned: false,
  preferredLanguage: '', comment: '',
  phoneOwner: '', parentPhoneOwner: '', extraPhone: '', extraPhoneOwner: '',
};

/* Подпись над полем — как у референса (marsit.uz), но нашим зелёным вместо их синего. */
function Lbl({ children }) {
  return <label className="text-[10px] font-extrabold text-primary uppercase tracking-wide mb-1 block">{children}</label>;
}

const statusClassesMap = (t) => ({
  active: { className: 'bg-success/10 text-success', label: t('status.active') },
  frozen: { className: 'bg-error/10 text-error', label: t('status.frozen') },
});

/* ═══════════════ Stat Card ═══════════════ */
/* ═══════════════ Student Card ═══════════════ */
function StudentCard({ s, onNavigate }) {
  const { t } = useTranslation();
  const STATUS_CLASSES = statusClassesMap(t);
  const status = STATUS_CLASSES[s.status] || STATUS_CLASSES.active;
  const groupNames = (s.groups || []).map((g) => g.name).filter(Boolean);

  return (
    <div className="card bg-base-100 p-4 card-hover-premium group cursor-pointer" onClick={() => onNavigate?.(s.id)}>
      <div className="flex items-start gap-3.5">
        {/* Avatar */}
        <div className="transition-transform duration-300 group-hover:scale-105">
          <Avatar name={fullName(s)} size="lg" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-base-content truncate">{fullName(s)}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-base-content/45">
            {s.login_code || s.loginCode ? (
              <span className="font-mono flex items-center gap-1">
                <KeyRound size={10} /> {s.login_code || s.loginCode}
              </span>
            ) : null}
            {s.phone && <span>{s.phone}</span>}
            {s.coins != null && s.coins > 0 && (
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Coins size={10} /> {s.coins}
              </span>
            )}
          </div>

          {groupNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {groupNames.map((name, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-primary/10 text-primary">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Main Students ═══════════════ */
export default function AdminStudents() {
  const { t } = useTranslation();
  const STATUS_CLASSES = statusClassesMap(t);
  const { token, user } = useAuth();
  // Main Admin включает/выключает "кабинет родителя" всей организации
  // (parent_panel) — когда включён, backend требует данные родителя при
  // создании студента (см. admin.service.js:createStudent), форма — тоже.
  const parentPanelEnabled = Boolean(user?.orgFeatures?.parentPanel);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'card' | 'table' — референс marsit.uz показывает плотную таблицу
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'frozen'
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data, isLoading, error, refetch } = useAdminStudents(qs);
  const { data: groupsData } = useAdminGroups();
  const groupOptions = (groupsData?.groups || groupsData?.data?.groups || []).filter((g) => !g.isArchived);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState(null);
  const [copied, setCopied] = useState('');
  const [showExport, setShowExport] = useState(false);

  const raw = data?.data || data || {};
  const rows = raw.students || (Array.isArray(raw) ? raw : []);

  const activeCount = rows.filter((s) => s.status !== 'frozen').length;
  const frozenCount = rows.filter((s) => s.status === 'frozen').length;
  const debtCount = rows.filter((s) => (s.debt || s.outstandingDebt || 0) > 0).length;
  const filteredRows = (() => {
    if (statusFilter === 'all') return rows;
    if (statusFilter === 'active') return rows.filter(s => s.status !== 'frozen');
    if (statusFilter === 'frozen') return rows.filter(s => s.status === 'frozen');
    if (statusFilter === 'debt') return rows.filter(s => (s.debt || s.outstandingDebt || 0) > 0);
    return rows;
  })();

  const hasParent = form && form.parentName.trim() && form.parentPhone;
  // Пока фича выключена у партнёра — не шлём parent вообще, backend всё равно
  // проигнорирует, но так честнее показывать, что реально уйдёт на сервер.
  const parentPayloadReady = parentPanelEnabled && hasParent;

  const create = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.adminCreateStudent(token, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        birthDate: form.birthDate || undefined,
        groupId: form.groupId || undefined,
        parent: parentPayloadReady
          ? { ...splitName(form.parentName), phone: form.parentPhone }
          : undefined,
        gender: form.gender || undefined,
        address: form.address.trim() || undefined,
        school: form.school.trim() || undefined,
        leadSource: form.leadSource || undefined,
        hasLaptop: form.hasLaptop || undefined,
        offerSigned: form.offerSigned || undefined,
      });
      // backend возвращает { student: { loginCode, password, ... }, parent }
      const r = res?.data || res;
      setForm(null);
      setCreds({ login_code: r.student?.loginCode, password: r.student?.password, parent: r.parent });
      refetch();
    } catch (e) { setErr(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };

  const toggleFreeze = async (s) => {
    const frozen = s.status === 'frozen';
    try { await api.adminFreezeStudent(token, s.id, !frozen, ''); refetch(); }
    catch (e) { alert(e.message || t('admin.mentors.genericError')); }
  };
  const archive = async (s) => {
    if (!confirm(t('admin.students.archiveConfirm', { name: fullName(s) }))) return;
    try { await api.adminDeleteStudent(token, s.id); refetch(); }
    catch (e) { alert(e.message || t('admin.mentors.genericError')); }
  };
  const regen = async (s) => {
    try {
      const res = await api.adminRegenStudentPassword(token, s.id);
      const r = res?.data || res;
      setCreds({ login_code: s.login_code || s.loginCode, password: r.password });
    } catch (e) { alert(e.message || t('admin.mentors.genericError')); }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t('admin.students.title')} subtitle={t('admin.students.subtitle')}>
        <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setShowExport(true)} disabled={filteredRows.length === 0}>
          <Download size={14} /> {t('admin.mentors.export')}
        </button>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm(emptyForm); setErr(''); }}>
          <Plus size={16} /> {t('admin.students.add')}
        </button>
      </PageHeader>

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi Icon={GraduationCap} title={t('admin.mentors.total')} value={rows.length}  tone="neutral" />
        <Kpi Icon={UserCheck} title={t('admin.mentors.active')} value={activeCount}  tone="success" />
        <Kpi Icon={UserX} title={t('admin.mentors.frozen')} value={frozenCount}  tone="danger" />
      </div>

      {/* ═══ Search + View Toggle ═══ */}
      <div className="flex items-center gap-3 animate-fade-in stagger-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('admin.students.searchPlaceholder')}
          className="flex-1"
        />
        {/* Status filter tabs */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-[12px] bg-base-100 border border-base-300">
          {[
            { key: 'all', label: t('admin.students.filterAll'), count: rows.length },
            { key: 'active', label: t('admin.mentors.active'), count: activeCount },
            { key: 'frozen', label: t('admin.mentors.frozen'), count: frozenCount },
            { key: 'debt', label: t('admin.students.filterDebt'), count: debtCount },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-[12px] text-[11px] font-bold transition-all duration-200 ${
                statusFilter === f.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/50 hover:text-base-content'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-[12px] bg-base-100 border border-base-300">
          <button
            onClick={() => setViewMode('card')}
            className={`w-8 h-8 rounded-[12px] flex items-center justify-center transition-all ${
              viewMode === 'card'
                ? 'bg-primary/10 text-primary'
                : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`w-8 h-8 rounded-[12px] flex items-center justify-center transition-all ${
              viewMode === 'table'
                ? 'bg-primary/10 text-primary'
                : 'text-base-content/50 hover:text-base-content'
            }`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Student List ═══ */}
      {isLoading ? (
        <RowSkeleton count={5} />
      ) : error ? (
        <div className="alert alert-error mt-4">{t('admin.mentors.loadError', { message: error.message })}</div>
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={search ? t('admin.students.emptySearchTitle') : t('admin.students.emptyTitle')}
          hint={search ? undefined : t('admin.students.emptyHint')}
          action={!search ? (
            <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm(emptyForm); setErr(''); }}>
              <Plus size={14} /> {t('admin.students.addShort')}
            </button>
          ) : undefined}
        />
      ) : viewMode === 'card' ? (
        /* Card view */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRows.map((s) => (
            <StudentCard key={s.id} s={s} onNavigate={(id) => navigate(`/students/${id}`)} />
          ))}
        </div>
      ) : (
        /* Table view — по референсу: № + студент, телефон, ментор, группа, направление */
        <div className="card bg-base-100 overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="table w-full text-[13px]">
              <thead>
                <tr>
                  <th>{t('admin.students.colStudent')}</th>
                  <th>{t('admin.students.colPhone')}</th>
                  <th>{t('admin.students.colMentor')}</th>
                  <th>{t('admin.students.colGroup')}</th>
                  <th>{t('admin.students.colDirection')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((s, i) => {
                  const g0 = (s.groups || [])[0];
                  const status = STATUS_CLASSES[s.status] || STATUS_CLASSES.active;
                  return (
                    <tr key={s.id} className="hover:bg-base-200 cursor-pointer" onClick={() => navigate(`/students/${s.id}`)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-base-content/40 font-mono text-[11px] tabular-nums">{i + 1}.</span>
                          <span className="font-semibold text-base-content">{fullName(s)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="text-primary font-medium">{s.phone || '—'}</td>
                      <td className="text-base-content/70">{g0?.mentor || '—'}</td>
                      <td className="text-base-content/70">{g0?.name || '—'}</td>
                      <td>
                        {g0?.subject ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-primary/10 text-primary">
                            {g0.subject}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Create Modal ═══ */}
      {form && (
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300 max-w-6xl p-0 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start px-8 pt-7 pb-5 border-b border-base-200 shrink-0">
              <div>
                <h3 className="font-extrabold text-2xl text-base-content">{t('admin.students.newTitle')}</h3>
                <p className="text-[13px] text-base-content/50 mt-1">{t('admin.students.newSubtitle')}</p>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => setForm(null)}><Check size={18} className="hidden" /><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            </div>

            <div className="px-8 pt-5 pb-6 overflow-y-auto">
              {err && <div className="alert alert-error mb-4 py-2 text-sm">{err}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <div className="space-y-3">
                    <div>
                      <Lbl>{t('admin.students.firstNameLabel')}</Lbl>
                      <input className="input input-bordered input-sm w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Lbl>{t('admin.students.lastNameLabel')}</Lbl>
                      <input className="input input-bordered input-sm w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>

                    {/* Пол — визуальное поле по референсу, backend его не хранит (нет колонки) */}
                    <div>
                      <Lbl>{t('admin.students.genderLabel')}</Lbl>
                      <div className="flex items-center gap-3">
                        <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer input input-bordered ${form.gender === 'male' ? 'border-primary text-primary' : ''}`}>
                          <input type="radio" name="gender" className="radio radio-xs" checked={form.gender === 'male'} onChange={() => setForm({ ...form, gender: 'male' })} />
                          {t('admin.students.male')}
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer input input-bordered ${form.gender === 'female' ? 'border-primary text-primary' : ''}`}>
                          <input type="radio" name="gender" className="radio radio-xs" checked={form.gender === 'female'} onChange={() => setForm({ ...form, gender: 'female' })} />
                          {t('admin.students.female')}
                        </label>
                      </div>
                    </div>

                    <div>
                      <Lbl>{t('admin.students.birthDateLabel')}</Lbl>
                      <input className="input input-bordered input-sm w-full" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-[3fr_2fr] gap-3">
                      <div>
                        <Lbl>{t('admin.students.phoneLabel')}</Lbl>
                        <PhoneInput className="input input-bordered input-sm w-full" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                      </div>
                      <div>
                        <Lbl>{t('admin.students.phoneOwnerLabel')}</Lbl>
                        <input className="input input-bordered input-sm w-full" placeholder={t('admin.students.phoneOwnerPlaceholder')} value={form.phoneOwner} onChange={(e) => setForm({ ...form, phoneOwner: e.target.value })} />
                      </div>
                    </div>

                    {/* Телефон родителя — реально уходит на backend как parent{firstName,lastName,phone}.
                        Секция видна, только если Main Admin включил "кабинет родителя" партнёру
                        (parent_panel) — иначе backend создание родителя всё равно отклонит. Когда
                        включена — поля обязательны, не опциональны (Karis, 20.08.2026). */}
                    {parentPanelEnabled && (
                      <>
                        <div>
                          <Lbl>{t('admin.students.parentNameLabel')}</Lbl>
                          <input className="input input-bordered input-sm w-full" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-[3fr_2fr] gap-3">
                          <div>
                            <Lbl>{t('admin.students.parentPhoneLabel')}</Lbl>
                            <PhoneInput className="input input-bordered input-sm w-full" value={form.parentPhone} onChange={(v) => setForm({ ...form, parentPhone: v })} />
                          </div>
                          <div>
                            <Lbl>{t('admin.students.phoneOwnerLabel')}</Lbl>
                            <input className="input input-bordered input-sm w-full" placeholder={t('admin.students.parentPhoneOwnerPlaceholder')} value={form.parentPhoneOwner} onChange={(e) => setForm({ ...form, parentPhoneOwner: e.target.value })} />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Доп. телефон — визуальное поле по референсу, backend хранит только один номер родителя */}
                    <div className="grid grid-cols-[3fr_2fr] gap-3">
                      <div>
                        <Lbl>{t('admin.students.extraPhoneLabel')}</Lbl>
                        <PhoneInput className="input input-bordered input-sm w-full" value={form.extraPhone} onChange={(v) => setForm({ ...form, extraPhone: v })} />
                      </div>
                      <div>
                        <Lbl>{t('admin.students.phoneOwnerLabel')}</Lbl>
                        <input className="input input-bordered input-sm w-full" value={form.extraPhoneOwner} onChange={(e) => setForm({ ...form, extraPhoneOwner: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-3">
                    <div>
                      <Lbl>{t('admin.students.groupLabel')}</Lbl>
                      <select className="select select-bordered select-sm w-full" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                        <option value="">{t('admin.students.noGroup')}</option>
                        {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.subject}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Lbl>{t('admin.students.languageLabel')}</Lbl>
                        <select className="select select-bordered select-sm w-full" value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}>
                          <option value="">----</option>
                          <option value="uz">O'zbekcha</option>
                          <option value="ru">{t('admin.students.langRu')}</option>
                        </select>
                      </div>
                      <div>
                        <Lbl>{t('admin.students.sourceLabel')}</Lbl>
                        <select className="select select-bordered select-sm w-full" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
                          <option value="">----</option>
                          <option value="instagram">Instagram</option>
                          <option value="telegram">Telegram</option>
                          <option value="referral">{t('admin.students.sourceReferral')}</option>
                          <option value="walk-in">{t('admin.students.sourceWalkIn')}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Lbl>{t('admin.students.schoolLabel')}</Lbl>
                        <input className="input input-bordered input-sm w-full" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
                      </div>
                      <div>
                        <Lbl>{t('admin.students.addressLabel')}</Lbl>
                        <input className="input input-bordered input-sm w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Lbl>{t('admin.students.commentLabel')}</Lbl>
                      <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 text-[12px] font-semibold text-base-content/70 cursor-pointer">
                        <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={form.hasLaptop} onChange={(e) => setForm({ ...form, hasLaptop: e.target.checked })} />
                        {t('admin.students.hasLaptop')}
                      </label>
                      <label className="flex items-center gap-1.5 text-[12px] font-semibold text-base-content/70 cursor-pointer">
                        <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={form.offerSigned} onChange={(e) => setForm({ ...form, offerSigned: e.target.checked })} />
                        {t('admin.students.offerSigned')}
                      </label>
                    </div>
                    <p className="text-[11px] text-base-content/40">
                      {t('admin.students.parentNote')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action px-8 pb-7 pt-4 mt-0 border-t border-base-200 shrink-0">
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>{t('admin.students.cancel')}</button>
              <button
                className="btn btn-primary gap-1.5"
                onClick={create}
                disabled={
                  busy || !form.firstName || !form.lastName || !form.phone ||
                  // фича включена у партнёра — оба поля родителя обязательны, не опциональны
                  (parentPanelEnabled && !(form.parentName.trim() && form.parentPhone))
                }
              >
                {busy && <span className="loading loading-spinner loading-xs" />} {t('admin.students.create')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setForm(null)} />
        </dialog>
      )}

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} pageKey="students" data={filteredRows} />

      {/* ═══ Credentials Modal ═══ */}
      {creds && (
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{t('admin.students.credsTitle')}</h3>
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => setCreds(null)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            </div>
            <p className="text-sm text-base-content/45 mb-4">{t('admin.students.credsHint')}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-[12px] bg-base-100 border border-base-300">
                <span className="text-[13px] text-base-content/70">{t('admin.students.loginCode')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[14px]">{creds.login_code || '—'}</span>
                  {creds.login_code && (
                    <button className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-primary/10 transition-colors"
                      onClick={() => copyToClipboard(creds.login_code, 'login')}>
                      {copied === 'login' ? <Check size={12} className="text-primary" /> : <Copy size={12} className="text-base-content/45" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-[12px] bg-base-100 border border-base-300">
                <span className="text-[13px] text-base-content/70">{t('admin.students.password')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[14px]">{creds.password || '—'}</span>
                  {creds.password && (
                    <button className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-primary/10 transition-colors"
                      onClick={() => copyToClipboard(creds.password, 'pass')}>
                      {copied === 'pass' ? <Check size={12} className="text-primary" /> : <Copy size={12} className="text-base-content/45" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {creds.parent && (
              <>
                <p className="text-sm text-base-content/45 mt-4 mb-2">{t('admin.students.parentLabel', { firstName: creds.parent.firstName, lastName: creds.parent.lastName })}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-[12px] bg-base-100 border border-base-300">
                    <span className="text-[13px] text-base-content/70">{t('admin.students.loginCode')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[14px]">{creds.parent.loginCode || '—'}</span>
                      {creds.parent.loginCode && (
                        <button className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-primary/10 transition-colors"
                          onClick={() => copyToClipboard(creds.parent.loginCode, 'parent-login')}>
                          {copied === 'parent-login' ? <Check size={12} className="text-primary" /> : <Copy size={12} className="text-base-content/45" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-[12px] bg-base-100 border border-base-300">
                    <span className="text-[13px] text-base-content/70">{t('admin.students.password')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[14px]">{creds.parent.password || '—'}</span>
                      {creds.parent.password && (
                        <button className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-primary/10 transition-colors"
                          onClick={() => copyToClipboard(creds.parent.password, 'parent-pass')}>
                          {copied === 'parent-pass' ? <Check size={12} className="text-primary" /> : <Copy size={12} className="text-base-content/45" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setCreds(null)}>{t('admin.students.gotIt')}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
