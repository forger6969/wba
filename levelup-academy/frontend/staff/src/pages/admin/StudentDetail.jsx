import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  ArrowLeft, Edit3, Save, Loader2, Coins, CalendarDays,
  KeyRound, Phone, Snowflake, Sun, Archive, Copy, Check, CreditCard,
  AlertCircle, User, GraduationCap, QrCode, Send, MessageSquare, Gift,
  UserX, Plus, Wallet, Users,
} from 'lucide-react';

// Ссылка на member-app для QR-входа студента (сканирует камерой — сразу
// логинится, см. backend/src/modules/auth/qr-login.service.js). VITE_MEMBER_URL
// в frontend/staff/.env (не в репозитории, dev-only) переопределяет на LAN IP,
// чтобы камера телефона доставала до dev-сервера — см. .env.example.
// Фолбэк — прод-домен: на Vercel сборке этот VITE_MEMBER_URL сегодня не задан
// (нет доступа к дашборду Vercel из агента), а localhost в проде был бы 100%
// нерабочей ссылкой.
const MEMBER_URL = import.meta.env.VITE_MEMBER_URL || 'https://member.levelup-academy.uz';
import { useAuth } from '../../auth.jsx';
import { useAdminStudentDetail, useAdminGroups, useAdminGroupDetail, useAdminInvoices, useAdminStudentAttendance, useAdminStudentTelegram, useAdminStudentCredentials, useAdminParentCredentials, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import PhoneInput from '../../components/PhoneInput.jsx';
import { Avatar, RowSkeleton, Modal } from '../mentor/_ui.jsx';
import { formatPhone } from '../../format.js';
import { paymentMethodLabel } from '../finance/_ui.jsx';

/* ─── helpers ─── */
const fullName = (s) =>
  s.fullName || [s.firstName || s.first_name, s.lastName || s.last_name].filter(Boolean).join(' ') || '—';
const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const formatMoney = (n, locale = 'ru-RU', currencyWord = 'сум') => (n != null ? `${Number(n).toLocaleString(locale)} ${currencyWord}` : '—');
const formatDate = (d, locale = 'ru-RU') => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayLabelsFor = (locale) => Object.fromEntries(
  DAY_KEYS.map((key, i) => [key, new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })]),
);
const invoiceStatusMap = (t) => ({
  paid: { label: t('admin.studentDetail.stPaid'), bg: '#2ECC7115', text: '#2ECC71' },
  partially_paid: { label: t('admin.studentDetail.stPartial'), bg: '#F5A62315', text: '#F5A623' },
  pending: { label: t('admin.studentDetail.stPending'), bg: '#94A3B815', text: '#64748B' },
  overdue: { label: t('admin.studentDetail.stOverdue'), bg: '#E8543E15', text: '#E8543E' },
  cancelled: { label: t('admin.studentDetail.stCancelled'), bg: '#94A3B815', text: '#94A3B8' },
});
const monthLabel = (d, locale = 'ru-RU') => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};
const attendanceColorsMap = (t) => ({
  present: { bg: '#2ECC7120', text: '#2ECC71', label: t('admin.studentDetail.attPresent') },
  late: { bg: '#F5A62320', text: '#F5A623', label: t('admin.studentDetail.attLate') },
  absent: { bg: '#E8543E20', text: '#E8543E', label: t('admin.studentDetail.attAbsent') },
  excused: { bg: '#94A3B820', text: '#64748B', label: t('admin.studentDetail.attExcused') },
});
const dayShort = (d, locale = 'ru-RU') => new Date(d).toLocaleDateString(locale, { day: 'numeric' });
const weekdayShort = (d, locale = 'ru-RU') => new Date(d).toLocaleDateString(locale, { weekday: 'short' });
const monthInputValue = (d) => {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

/* ═══════════════ Main StudentDetail ═══════════════ */
export default function AdminStudentDetail() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const currencyWord = t('admin.studentDetail.currency');
  const DAY_LABELS = dayLabelsFor(locale);
  const INVOICE_STATUS = invoiceStatusMap(t);
  const ATTENDANCE_COLORS = attendanceColorsMap(t);
  const soon = () => alert(t('admin.studentDetail.soon'));
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const tgEnabled = Boolean(user?.orgFeatures?.telegramIntegration);
  const { data, isLoading, error, refetch } = useAdminStudentDetail(id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionModal, setActionModal] = useState(null); // null | 'freeze' | 'archive'
  const [actionReason, setActionReason] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [showParentCreds, setShowParentCreds] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  const raw = data?.data || data || {};
  const student = raw.student || raw;
  const groups = student.groups || [];
  const primaryGroup = groups[0];

  const { data: groupDetailRaw } = useAdminGroupDetail(primaryGroup?.id);
  const groupDetailPayload = groupDetailRaw?.data || groupDetailRaw || {};
  const groupDetail = groupDetailPayload.group || groupDetailPayload;
  const groupSchedule = groupDetail.schedule || primaryGroup?.schedule || [];
  const groupStartTime = groupDetail.startTime
    || groupDetail.start_time
    || groupSchedule[0]?.start
    || primaryGroup?.startTime
    || null;
  const groupDays = groupDetail.days?.length
    ? groupDetail.days
    : groupSchedule.map((item) => item.day).filter(Boolean);
  const { data: groupsListRaw } = useAdminGroups();
  const groupOptions = (groupsListRaw?.data?.groups || groupsListRaw?.groups || []).filter((g) => !g.isArchived);
  const { data: invoicesRaw, refetch: refetchInvoices } = useAdminInvoices(`?studentId=${id}`);
  const { data: attendanceRaw } = useAdminStudentAttendance(id);
  const attendanceDays = attendanceRaw?.data?.days || attendanceRaw?.days || [];
  const { data: tgRaw } = useAdminStudentTelegram(id);
  const telegram = tgRaw?.data || tgRaw;
  const [showTgMessage, setShowTgMessage] = useState(false);
  const { data: credsRaw, isLoading: credsLoading } = useAdminStudentCredentials(id, showCreds);
  const realCreds = credsRaw?.data || credsRaw;
  const [qrImage, setQrImage] = useState(null);
  const [qrError, setQrError] = useState(false);

  // Токен постоянный (users.qr_token) — тот же QR при каждом открытии модалки
  // (см. auth/qr-login.service.js).
  useEffect(() => {
    if (!showCreds) { setQrImage(null); setQrError(false); return; }
    let cancelled = false;
    api.adminCreateStudentQrToken(token, id)
      .then((res) => {
        const r = res?.data || res;
        const url = `${MEMBER_URL}/qr-login?token=${encodeURIComponent(r.token)}`;
        return QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#ffffff', light: '#ffffff' } });
      })
      .then((dataUrl) => { if (!cancelled) setQrImage(dataUrl); })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [showCreds, id, token]);

  const { data: parentCredsRaw, isLoading: parentCredsLoading } = useAdminParentCredentials(id, showParentCreds);
  const parentCreds = parentCredsRaw?.data || parentCredsRaw;
  const [parentQrImage, setParentQrImage] = useState(null);
  const [parentQrError, setParentQrError] = useState(false);

  // Тот же постоянный QR-токен, что у студента, только на users.id родителя.
  useEffect(() => {
    if (!showParentCreds) { setParentQrImage(null); setParentQrError(false); return; }
    let cancelled = false;
    api.adminCreateParentQrToken(token, id)
      .then((res) => {
        const r = res?.data || res;
        const url = `${MEMBER_URL}/qr-login?token=${encodeURIComponent(r.token)}`;
        return QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#ffffff', light: '#ffffff' } });
      })
      .then((dataUrl) => { if (!cancelled) setParentQrImage(dataUrl); })
      .catch(() => { if (!cancelled) setParentQrError(true); });
    return () => { cancelled = true; };
  }, [showParentCreds, id, token]);
  const invalidate = useInvalidate();
  const invoices = (invoicesRaw?.data?.invoices || invoicesRaw?.invoices || []).slice().sort(
    (a, b) => new Date(b.periodMonth || b.createdAt) - new Date(a.periodMonth || a.createdAt)
  );
  const currentMonthKey = monthInputValue(new Date());
  const currentInvoice = invoices.find((inv) =>
    monthInputValue(inv.periodMonth) === currentMonthKey
    && ['pending', 'partially_paid', 'overdue'].includes(inv.status)
  ) || invoices.find((inv) => monthInputValue(inv.periodMonth) === currentMonthKey);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const startEdit = () => {
    setForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      phone: student.phone || '',
      birthDate: student.birthDate ? String(student.birthDate).slice(0, 10) : '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.adminUpdateStudent(token, id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        birthDate: form.birthDate || undefined,
      });
      setEditing(false);
      refetch();
    } catch (e) {
      alert(e.message || t('admin.mentors.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const isActive = student.status === 'active';

  const toggleFreeze = () => {
    if (isActive) { setActionReason(''); setActionModal('freeze'); }
    else doFreeze(false, '');
  };
  const doFreeze = async (frozen, reason) => {
    setBusy(true);
    try { await api.adminFreezeStudent(token, id, frozen, reason || ''); refetch(); }
    catch (e) { alert(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };
  const handleDelete = () => { setActionReason(''); setActionModal('archive'); };
  const confirmArchive = async () => {
    setBusy(true);
    try { await api.adminDeleteStudent(token, id, actionReason || ''); navigate('/students'); }
    catch (e) { alert(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); setActionModal(null); }
  };
  const handleRegen = async () => {
    setBusy(true);
    try {
      const res = await api.adminRegenStudentPassword(token, id);
      const r = res?.data || res;
      alert(t('admin.studentDetail.newPasswordAlert', { password: r.password || t('admin.studentDetail.generated') }));
      refetch();
      invalidate(['admin-student-credentials', id]);
    } catch (e) { alert(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };
  const [parentBusy, setParentBusy] = useState(false);
  const handleRegenParent = async () => {
    setParentBusy(true);
    try {
      const res = await api.adminRegenParentPassword(token, id);
      const r = res?.data || res;
      alert(t('admin.studentDetail.newParentPasswordAlert', { password: r.password || t('admin.studentDetail.generated') }));
      invalidate(['admin-parent-credentials', id]);
    } catch (e) { alert(e.message || t('admin.mentors.genericError')); }
    finally { setParentBusy(false); }
  };

  /* ─── Loading / Error / Not found ─── */
  if (isLoading) return <div><div className="mt-6"><RowSkeleton count={3} /></div></div>;
  if (error) {
    return (
      <div className="card bg-base-100 p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-[14px] font-bold text-base-content">{t('mentor.coins.genericError')}</p>
        <p className="text-[12px] text-base-content/45 mt-1">{error.message}</p>
        <Link to="/students" className="btn btn-primary btn-sm mt-4"><ArrowLeft size={14} /> {t('mentor.back')}</Link>
      </div>
    );
  }
  if (!student || !student.id) {
    return (
      <div className="card bg-base-100 p-8 text-center">
        <User size={40} className="mx-auto mb-3 text-base-content/45 opacity-30" />
        <p className="text-[14px] font-bold text-base-content">{t('admin.studentDetail.notFound')}</p>
        <Link to="/students" className="btn btn-primary btn-sm mt-4"><ArrowLeft size={14} /> {t('mentor.back')}</Link>
      </div>
    );
  }

  // «Профиль заполнен» — gender/address/school/hasLaptop подключены к
  // student_profiles 08.08.2026 (миграция 1784340000000, задача #20).
  const profileFields = [
    { key: 'birthDate', label: t('admin.studentDetail.fieldBirthDate'), ok: !!student.birthDate },
    { key: 'phone', label: t('admin.studentDetail.fieldPhone'), ok: !!student.phone },
    { key: 'parent', label: t('admin.studentDetail.fieldParent'), ok: !!student.parent },
    { key: 'gender', label: t('admin.studentDetail.fieldGender'), ok: !!student.gender },
    { key: 'address', label: t('admin.studentDetail.fieldAddress'), ok: !!student.address },
    { key: 'school', label: t('admin.studentDetail.fieldSchool'), ok: !!student.school },
    { key: 'hasLaptop', label: t('admin.studentDetail.fieldLaptop'), ok: student.hasLaptop === true },
  ];
  const profilePct = Math.round((profileFields.filter((f) => f.ok).length / profileFields.length) * 100);

  return (
    <div className="space-y-4 pb-8">
      <Link to="/students" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-base-content/45 hover:text-primary transition-colors">
        <ArrowLeft size={16} /> {t('admin.studentDetail.backToStudents')}
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_300px] gap-4 items-start">
        {/* ══════════════ КОЛОНКА 1 — карточка студента ══════════════ */}
        <div className="space-y-4 w-full min-w-0 xl:col-start-1 xl:row-start-1 xl:row-span-3">
          <div className="card bg-base-100 p-5">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-[19px] font-extrabold text-base-content leading-tight">{fullName(student)}</h1>
              <button
                className="w-8 h-8 rounded-[8px] border border-base-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors shrink-0"
                onClick={() => setShowCreds(true)}
                title={t('admin.studentDetail.loginPasswordTooltip')}
              >
                <QrCode size={15} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {isActive ? t('status.active') : t('status.frozen')}
              </span>
              <span className="text-[11px] font-mono text-base-content/45">#{student.loginCode || student.login_code || '—'}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-base-content/45">
                <CalendarDays size={11} /> {formatDate(student.createdAt, locale)}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${student.offerSigned ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                {student.offerSigned ? t('admin.studentDetail.offerSigned') : t('admin.studentDetail.offerNotSigned')}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-200/60">
                <span className="text-[11px] font-semibold text-base-content/50 uppercase">{t('admin.studentDetail.phoneLabel')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-base-content">{student.phone ? formatPhone(student.phone) : t('admin.studentDetail.notSpecified')}</span>
                  {student.phone && (
                    <button onClick={() => copyToClipboard(student.phone, 'phone')} className="text-base-content/45 hover:text-primary">
                      {copied === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-200/60">
                <span className="text-[11px] font-semibold text-base-content/50 uppercase">{t('admin.studentDetail.parentLabel')}</span>
                {student.parent ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-base-content">
                      {[student.parent.firstName, student.parent.lastName].filter(Boolean).join(' ')} · {formatPhone(student.parent.phone)}
                    </span>
                    <button
                      className="w-6 h-6 rounded-[6px] border border-base-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors shrink-0"
                      onClick={() => setShowParentCreds(true)}
                      title={t('admin.studentDetail.parentLoginTooltip')}
                    >
                      <QrCode size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[12px] text-base-content/40 italic">{t('admin.studentDetail.notSpecified')}</span>
                )}
              </div>

              {tgEnabled && (
                <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-200/60">
                  <span className="text-[11px] font-semibold text-base-content/50 uppercase">{t('admin.studentDetail.telegramLabel')}</span>
                  {telegram?.student?.linked ? (
                    <button onClick={() => setShowTgMessage(true)} className="flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline">
                      <Send size={12} /> {telegram.student.username ? `@${telegram.student.username}` : t('admin.studentDetail.write')}
                    </button>
                  ) : (
                    <span className="text-[12px] text-base-content/40 italic">{t('admin.studentDetail.notConnected')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Действия */}
            <div className="grid grid-cols-2 gap-1.5 mt-4">
              <button onClick={toggleFreeze} disabled={busy} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                {isActive ? <Snowflake size={13} /> : <Sun size={13} />} {isActive ? t('admin.mentorDetail.freeze') : t('admin.mentorDetail.unfreeze')}
              </button>
              <button onClick={soon} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                <GraduationCap size={13} /> {t('admin.studentDetail.graduate')}
              </button>
              <button onClick={soon} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                <UserX size={13} /> {t('admin.studentDetail.expel')}
              </button>
              <button onClick={handleRegen} disabled={busy} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                <KeyRound size={13} /> {t('admin.studentDetail.newPassword')}
              </button>
              <button onClick={startEdit} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                <Edit3 size={13} /> {t('admin.mentorDetail.edit')}
              </button>
              <button onClick={soon} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                <MessageSquare size={13} /> {t('admin.studentDetail.sms')}
              </button>
              <button onClick={soon} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px] col-span-2">
                <Gift size={13} /> {t('admin.studentDetail.referral')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => setShowAddGroup(true)} className="btn btn-sm bg-base-200/60 border-0 text-[12px] font-bold">
                {groups.length > 0 ? t('admin.studentDetail.changeGroup') : t('admin.studentDetail.addToGroup')}
              </button>
              <button onClick={() => setShowTopUp(true)} className="btn btn-sm btn-primary gap-1 text-[12px] font-bold">
                <Plus size={13} /> {t('admin.studentDetail.topUpBalance')}
              </button>
            </div>
          </div>

          {/* Профиль заполнен */}
          <div className="card bg-base-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-base-content/60">{t('admin.studentDetail.profileFilled')}</span>
              <span className="text-[13px] font-extrabold text-primary">{profilePct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-base-200 overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profilePct}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profileFields.map((f) => (
                <span key={f.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${f.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {f.ok ? '✓' : '×'} {f.label}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* ══════════════ КОЛОНКА 2 — группа + платежи ══════════════ */}
        <div className="space-y-4 w-full min-w-0 xl:contents xl:[&>*]:!mt-0">
          <div className="card bg-base-100 p-5 xl:col-start-2 xl:row-start-1">
            {primaryGroup ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[16px] font-extrabold text-base-content">{primaryGroup.name}</h3>
                  <Link to="/groups" className="text-[11px] font-semibold text-primary hover:underline">{t('admin.studentDetail.allGroups')}</Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-[10px] bg-base-200/60">
                    <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.courseLabel')}</div>
                    <div className="text-[13px] font-bold text-base-content mt-0.5">{primaryGroup.subject}</div>
                  </div>
                  <div className="p-3 rounded-[10px] bg-base-200/60">
                    <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.mentorLabel')}</div>
                    <div className="text-[13px] font-bold text-base-content mt-0.5">{primaryGroup.mentor}</div>
                  </div>
                  <div className="p-3 rounded-[10px] bg-base-200/60">
                    <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.lessonTimeLabel')}</div>
                    <div className="text-[13px] font-bold text-base-content mt-0.5">
                      {groupStartTime ? `${groupStartTime} · ${groupDays.map((d) => DAY_LABELS[d] || d).join('/')}` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-[10px] bg-base-200/60">
                    <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.priceLabel')}</div>
                    <div className="text-[13px] font-bold text-base-content mt-0.5">{formatMoney(primaryGroup.monthlyPrice, locale, currencyWord)}{t('admin.studentDetail.perMonth')}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Users size={28} className="mx-auto mb-2 text-base-content/45 opacity-30" />
                <p className="text-[13px] text-base-content/45">{t('admin.studentDetail.noGroupAttached')}</p>
              </div>
            )}
          </div>

          <div className="card bg-base-100 p-5 xl:col-start-2 xl:col-span-2 xl:row-start-2">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={15} className="text-primary" />
                <h3 className="text-[13px] font-bold text-base-content">{t('admin.studentDetail.attendanceTitle')}</h3>
              </div>
              {attendanceDays.length > 0 ? <div className="flex gap-1.5 overflow-x-auto pb-1">
                {attendanceDays.map((d) => {
                  const c = ATTENDANCE_COLORS[d.status] || ATTENDANCE_COLORS.absent;
                  return (
                    <div
                      key={d.date}
                      title={`${c.label} · ${formatDate(d.date, locale)}`}
                      className="shrink-0 w-11 h-14 rounded-[10px] flex flex-col items-center justify-center gap-0.5 border"
                      style={{ background: c.bg, color: c.text, borderColor: c.text + '40' }}
                    >
                      <span className="text-[13px] font-extrabold">{dayShort(d.date, locale)}</span>
                      <span className="text-[9px] font-semibold uppercase opacity-70">{weekdayShort(d.date, locale)}</span>
                    </div>
                  );
                })}
              </div> : (
                <div className="min-h-16 rounded-[10px] bg-base-200/45 flex items-center justify-center text-center px-4">
                  <div>
                    <p className="text-[13px] font-semibold text-base-content/55">{t('admin.studentDetail.noDataYet')}</p>
                    <p className="text-[11px] text-base-content/35 mt-0.5">{t('admin.studentDetail.attendanceHint')}</p>
                  </div>
                </div>
              )}
            </div>

          <div className="card bg-base-100 p-5 h-full min-h-0 max-h-[420px] xl:max-h-[280px] overflow-hidden flex flex-col xl:col-start-2 xl:col-span-2 xl:row-start-3 self-stretch">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <CreditCard size={15} className="text-primary" />
              <h3 className="text-[13px] font-bold text-base-content">{t('admin.studentDetail.paymentHistory')}</h3>
              <span className="text-[11px] text-base-content/45 ml-auto">{invoices.length}</span>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard size={28} className="mx-auto mb-2 text-base-content/45 opacity-30" />
                <p className="text-[13px] text-base-content/45">{t('admin.studentDetail.noPayments')}</p>
              </div>
            ) : (
              <div className="space-y-1.5 min-h-0 overflow-y-auto overscroll-contain pr-1">
                {invoices.map((inv) => {
                  const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.pending;
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-[10px] hover:bg-base-200/60 transition-colors">
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-base-content capitalize">{monthLabel(inv.periodMonth, locale)}</div>
                        <div className="text-[10px] font-semibold text-base-content/45 mt-0.5">
                          {t('admin.studentDetail.acceptedBy', { name: inv.acceptedBy || '—' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[13px] font-bold text-base-content tabular-nums">{formatMoney(inv.paidAmount, locale, currencyWord)}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════ КОЛОНКА 3 — текущий месяц ══════════════ */}
        <div className="space-y-4 w-full min-w-0 xl:col-start-3 xl:row-start-1">
          <div className="card bg-base-100 p-5">
            <div className="text-[13px] font-extrabold text-base-content capitalize">{monthLabel(new Date(), locale)}</div>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-[12px] font-bold ${currentInvoice?.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>
                {currentInvoice?.status === 'paid' ? t('admin.studentDetail.paid') : t('admin.studentDetail.notPaid')}
              </span>
              <span className="text-[20px] font-extrabold text-base-content tabular-nums">{formatMoney(currentInvoice?.paidAmount ?? 0, locale, currencyWord)}</span>
            </div>
            <div className="text-[11px] text-base-content/45 mt-1">
              {t('admin.studentDetail.monthlyDebtLine', { price: formatMoney(primaryGroup?.monthlyPrice, locale, currencyWord), debt: formatMoney(student.totalDebt, locale, currencyWord) })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-base-100 p-4 text-center">
              <div className="text-[18px] font-extrabold text-base-content tabular-nums">{student.coinBalance ?? 0}</div>
              <div className="text-[10px] font-semibold text-base-content/45 uppercase mt-0.5 flex items-center justify-center gap-1"><Coins size={11} /> {t('admin.studentDetail.coins')}</div>
            </div>
            <div className="card bg-base-100 p-4 text-center">
              <div className={`text-[18px] font-extrabold tabular-nums ${student.totalDebt > 0 ? 'text-red-500' : 'text-base-content'}`}>{formatMoney(student.totalDebt, locale, currencyWord)}</div>
              <div className="text-[10px] font-semibold text-base-content/45 uppercase mt-0.5">{t('admin.studentDetail.debt')}</div>
            </div>
          </div>

          <div className="hidden">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={15} className="text-primary" />
              <h3 className="text-[13px] font-bold text-base-content">{t('admin.studentDetail.invoices')}</h3>
            </div>
            {invoices.length === 0 ? (
              <p className="text-[12px] text-base-content/40 text-center py-4">{t('admin.studentDetail.emptyYet')}</p>
            ) : (
              <div className="space-y-2 max-h-[720px] overflow-y-auto overscroll-contain pr-1">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-2.5 rounded-[10px] bg-base-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-extrabold text-emerald-600 tabular-nums">+{formatMoney(inv.paidAmount, locale, currencyWord).replace(` ${currencyWord}`, '')}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-base-300 text-base-content/60 uppercase">{inv.type === 'split' ? t('admin.studentDetail.split') : t('admin.studentDetail.full')}</span>
                    </div>
                    <div className="text-[10px] text-base-content/45 mt-0.5">{formatDate(inv.createdAt, locale)} · {monthLabel(inv.periodMonth, locale)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Модалка логин/пароль ═══ */}
      <Modal isOpen={showCreds} onClose={() => setShowCreds(false)} title={t('admin.studentDetail.credsTitle')}>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-base-200/60">
            <div>
              <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.loginCode')}</div>
              <div className="text-[15px] font-mono font-extrabold text-base-content">{realCreds?.loginCode || student.loginCode || student.login_code || '—'}</div>
            </div>
            <button onClick={() => copyToClipboard(realCreds?.loginCode || student.loginCode, 'lc')} className="btn btn-ghost btn-sm">
              {copied === 'lc' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-base-200/60">
            <div>
              <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.password')}</div>
              <div className="text-[15px] font-mono font-extrabold text-base-content">
                {credsLoading ? '…' : realCreds?.password || t('admin.studentDetail.passwordUnavailable')}
              </div>
            </div>
            {realCreds?.password && (
              <button onClick={() => copyToClipboard(realCreds.password, 'pw')} className="btn btn-ghost btn-sm">
                {copied === 'pw' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 pt-1">
            {qrImage ? (
              <img src={qrImage} alt={t('admin.studentDetail.qrAlt')} width={180} height={180} className="rounded-[10px] border border-base-300" />
            ) : qrError ? (
              <p className="text-[11px] text-error text-center">{t('admin.studentDetail.qrError')}</p>
            ) : (
              <div className="w-[180px] h-[180px] rounded-[10px] border border-base-300 grid place-items-center bg-base-200/60">
                <span className="loading loading-spinner loading-sm text-primary" />
              </div>
            )}
            <p className="text-[11px] text-base-content/45 text-center">
              {t('admin.studentDetail.qrHint')}
            </p>
          </div>
        </div>
      </Modal>

      {/* ═══ Модалка логин/пароль родителя ═══ */}
      <Modal isOpen={showParentCreds} onClose={() => setShowParentCreds(false)} title={t('admin.studentDetail.parentCredsTitle')}>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-base-200/60">
            <div>
              <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.loginCode')}</div>
              <div className="text-[15px] font-mono font-extrabold text-base-content">
                {parentCredsLoading ? '…' : parentCreds?.loginCode || '—'}
              </div>
            </div>
            {parentCreds?.loginCode && (
              <button onClick={() => copyToClipboard(parentCreds.loginCode, 'plc')} className="btn btn-ghost btn-sm">
                {copied === 'plc' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-base-200/60">
            <div>
              <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.studentDetail.password')}</div>
              <div className="text-[15px] font-mono font-extrabold text-base-content">
                {parentCredsLoading ? '…' : parentCreds?.password || t('admin.studentDetail.passwordUnavailable')}
              </div>
            </div>
            {parentCreds?.password && (
              <button onClick={() => copyToClipboard(parentCreds.password, 'ppw')} className="btn btn-ghost btn-sm">
                {copied === 'ppw' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <button onClick={handleRegenParent} disabled={parentBusy} className="btn btn-sm btn-ghost bg-base-200/60 gap-1.5 text-[12px] w-full">
            {parentBusy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} {t('admin.studentDetail.newParentPassword')}
          </button>

          <div className="flex flex-col items-center gap-2 pt-1">
            {parentQrImage ? (
              <img src={parentQrImage} alt={t('admin.studentDetail.qrAltParent')} width={180} height={180} className="rounded-[10px] border border-base-300" />
            ) : parentQrError ? (
              <p className="text-[11px] text-error text-center">{t('admin.studentDetail.qrError')}</p>
            ) : (
              <div className="w-[180px] h-[180px] rounded-[10px] border border-base-300 grid place-items-center bg-base-200/60">
                <span className="loading loading-spinner loading-sm text-primary" />
              </div>
            )}
            <p className="text-[11px] text-base-content/45 text-center">
              {t('admin.studentDetail.qrHintParent')}
            </p>
          </div>
        </div>
      </Modal>

      {/* ═══ Модалка отправки сообщения в Telegram ═══ */}
      <TgMessageModal
        isOpen={showTgMessage}
        onClose={() => setShowTgMessage(false)}
        token={token}
        studentId={id}
      />

      {/* ═══ Модалка «Пополнить счёт» ═══ */}
      <TopUpModal
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        student={student}
        primaryGroup={primaryGroup}
        currentInvoice={currentInvoice}
        token={token}
        onDone={() => { setShowTopUp(false); refetch(); refetchInvoices(); }}
      />

      {/* ═══ Модалка «Добавить в группу» ═══ */}
      <AddGroupModal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        groupOptions={groupOptions}
        token={token}
        studentId={id}
        currentGroups={groups}
        onDone={() => { setShowAddGroup(false); refetch(); }}
      />

      {/* ═══ Edit Modal ═══ */}
      {editing && (
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300">
            <h3 className="font-bold text-lg mb-4">{t('admin.studentDetail.editTitle')}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.studentDetail.firstNameLabel')}</label>
                  <input className="input input-bordered w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.studentDetail.lastNameLabel')}</label>
                  <input className="input input-bordered w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.studentDetail.phoneLabel')}</label>
                <PhoneInput className="input input-bordered w-full" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.studentDetail.birthDateLabel')}</label>
                <input className="input input-bordered w-full" type="date" value={form.birthDate || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>{t('admin.studentDetail.cancel')}</button>
              <button className="btn btn-primary gap-1" onClick={saveEdit} disabled={saving || !form.firstName || !form.lastName}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t('admin.studentDetail.save')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditing(false)} />
        </dialog>
      )}

      {/* ═══ Freeze Modal ═══ */}
      <Modal
        isOpen={actionModal === 'freeze'}
        onClose={() => setActionModal(null)}
        title={t('admin.studentDetail.freezeTitle')}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setActionModal(null)} disabled={busy}>{t('admin.studentDetail.cancel')}</button>
            <button className="btn btn-warning btn-sm gap-1" onClick={() => { const r = actionReason.trim(); setActionModal(null); doFreeze(true, r); }} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Snowflake size={14} />} {t('admin.mentorDetail.freeze')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-base-content/70 mb-1">{t('admin.studentDetail.freezeConfirm', { name: fullName(student) })}</p>
        <p className="text-xs text-base-content/45 mb-3">{t('admin.studentDetail.freezeHint')}</p>
        <textarea className="textarea textarea-bordered w-full" rows={3} placeholder={t('admin.studentDetail.freezeReasonPlaceholder')} value={actionReason} onChange={(e) => setActionReason(e.target.value)} autoFocus />
      </Modal>

      {/* ═══ Archive Modal ═══ */}
      <Modal
        isOpen={actionModal === 'archive'}
        onClose={() => setActionModal(null)}
        title={t('admin.studentDetail.archiveTitle')}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setActionModal(null)} disabled={busy}>{t('admin.studentDetail.cancel')}</button>
            <button className="btn btn-error btn-sm gap-1" onClick={confirmArchive} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} {t('admin.mentorDetail.archive')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-base-content/70 mb-1">{t('admin.studentDetail.archiveConfirm', { name: fullName(student) })}</p>
        <p className="text-xs text-base-content/45 mb-3">{t('admin.studentDetail.archiveHint')}</p>
        <textarea className="textarea textarea-bordered w-full" rows={3} placeholder={t('admin.studentDetail.archiveReasonPlaceholder')} value={actionReason} onChange={(e) => setActionReason(e.target.value)} autoFocus />
      </Modal>
    </div>
  );
}

/* ═══════════════ Модалка пополнения счёта ═══════════════ */
function TopUpModal({ isOpen, onClose, student, primaryGroup, currentInvoice, token, onDone }) {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const currencyWord = t('admin.studentDetail.currency');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(monthInputValue(new Date()));
  const [method, setMethod] = useState('cash');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!isOpen) return null;
  // Один пресет — реальная цена методики группы (training_type.price), а не
  // выдуманные 75%/50% без опоры на данные (Karis, 08.08.2026).
  const presets = primaryGroup?.monthlyPrice ? [primaryGroup.monthlyPrice] : [];

  const submit = async () => {
    const numericAmount = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setErr(t('admin.studentDetail.invalidAmount')); return; }
    setBusy(true); setErr('');
    try {
      const hasOpenInvoice = currentInvoice
        && ['pending', 'partially_paid', 'overdue'].includes(currentInvoice.status);
      if (hasOpenInvoice) {
        await api.adminPayInvoice(token, currentInvoice.id, {
          parts: [{ method, amount: numericAmount }],
        });
      } else {
        await api.adminCreatePayment(token, {
          studentId: student.id,
          groupId: primaryGroup?.id,
          periodMonth: `${month}-01`,
          totalAmount: numericAmount,
          parts: [{ method, amount: numericAmount }],
          comment: comment || undefined,
        });
      }
      setAmount(''); setComment('');
      onDone();
    } catch (e) {
      // The first request may have committed while the browser was still
      // waiting on an older backend/Redis response. Treat an already-paid
      // invoice as an idempotent success and refresh instead of trapping the
      // cashier in a stale modal.
      if (String(e.message).toLowerCase().includes('invoice is already paid')) {
        setAmount(''); setComment('');
        onDone();
      } else {
        setErr(e.message || t('admin.mentors.genericError'));
      }
    }
    finally { setBusy(false); }
  };

  const METHOD_ORDER = ['cash', 'humo', 'uzcard', 'uzum', 'payme', 'click', 'bank_transfer'];

  return (
    <dialog className="modal modal-open">
      <div className="modal-box card bg-base-100 border border-base-300 max-w-lg p-0 max-h-[calc(100dvh-2rem)] overflow-hidden !flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-base-200 shrink-0">
          <h3 className="font-extrabold text-lg text-base-content">{t('admin.studentDetail.topUpTitle')}</h3>
          <p className="text-[12px] text-base-content/45 mt-0.5">{fullName(student)} {primaryGroup ? `· ${primaryGroup.name}` : ''}</p>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0 overscroll-contain">
          {err && <div className="alert alert-error py-2 text-sm">{err}</div>}
          <div>
            <label className="text-[10px] font-extrabold text-primary uppercase tracking-wide mb-1 block">{t('admin.studentDetail.amountRequired')}</label>
            <input
              className="input input-bordered w-full"
              type="text"
              inputMode="decimal"
              placeholder={t('admin.studentDetail.amountPlaceholder')}
              value={amount}
              onChange={(e) => {
                const next = e.target.value.replace(',', '.');
                if (/^\d*(?:\.\d{0,2})?$/.test(next)) setAmount(next);
              }}
            />
            {currentInvoice && ['pending', 'partially_paid', 'overdue'].includes(currentInvoice.status) && (
              <p className="text-[11px] text-base-content/50 mt-1.5">
                {t('admin.studentDetail.remainingOnInvoice', { amount: formatMoney(Number(currentInvoice.totalAmount) - Number(currentInvoice.paidAmount), locale, currencyWord) })}
              </p>
            )}
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presets.map((p) => (
                  <button key={p} type="button" className="btn btn-xs btn-outline" onClick={() => setAmount(String(p))}>
                    +{p.toLocaleString(locale)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-primary uppercase tracking-wide mb-1 block">{t('admin.studentDetail.forWhichMonth')}</label>
            <input className="input input-bordered w-full" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-primary uppercase tracking-wide mb-1 block">{t('admin.studentDetail.methodRequired')}</label>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_ORDER.map((k) => (
                <label key={k} className={`flex items-center justify-center gap-1.5 cursor-pointer input input-bordered text-[13px] ${method === k ? 'border-primary text-primary' : ''}`}>
                  <input type="radio" name="method" className="radio radio-xs" checked={method === k} onChange={() => setMethod(k)} />
                  {paymentMethodLabel(k, t)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-primary uppercase tracking-wide mb-1 block">{t('admin.studentDetail.commentLabel')}</label>
            <textarea className="textarea textarea-bordered w-full" rows={2} placeholder={t('admin.studentDetail.commentPlaceholder')} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <div className="modal-action px-6 py-4 mt-0 border-t border-base-200 shrink-0 bg-base-100">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('admin.studentDetail.cancel')}</button>
          <button type="button" className="btn btn-primary gap-1.5" onClick={submit} disabled={busy || !amount}>
            {busy && <span className="loading loading-spinner loading-xs" />} {t('admin.studentDetail.save')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

/* ═══════════════ Модалка добавления/перевода в группу ═══════════════
   Если у студента уже есть группа — это перевод: сначала выходит из старой
   (adminRemoveStudentFromGroup), потом входит в новую. Backend атомарного
   «transfer»-эндпоинта нет — два вызова подряд, второй не идёт при ошибке первого. */
/* ═══════════════ Модалка отправки сообщения студенту в Telegram ═══════════════ */
function TgMessageModal({ isOpen, onClose, token, studentId }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  if (!isOpen) return null;

  const submit = async () => {
    if (!text.trim()) { setErr(t('admin.studentDetail.enterText')); return; }
    setBusy(true); setErr('');
    try {
      await api.adminSendStudentTelegramMessage(token, studentId, text.trim());
      setSent(true);
      setTimeout(() => { setSent(false); setText(''); onClose(); }, 900);
    } catch (e) { setErr(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box card bg-base-100 border border-base-300 max-w-md">
        <h3 className="font-extrabold text-lg text-base-content mb-4">{t('admin.studentDetail.writeToTelegram')}</h3>
        {err && <div className="alert alert-error mb-3 py-2 text-sm">{err}</div>}
        <textarea
          className="textarea textarea-bordered w-full"
          rows={4}
          placeholder={t('admin.studentDetail.messagePlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('admin.studentDetail.cancel')}</button>
          <button className="btn btn-primary gap-1.5" onClick={submit} disabled={busy || !text.trim()}>
            {busy && <span className="loading loading-spinner loading-xs" />}
            {sent ? <Check size={14} /> : <Send size={14} />} {sent ? t('admin.studentDetail.sent') : t('admin.studentDetail.send')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

function AddGroupModal({ isOpen, onClose, groupOptions, token, studentId, currentGroups, onDone }) {
  const { t } = useTranslation();
  const [groupId, setGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!isOpen) return null;

  const isTransfer = (currentGroups || []).length > 0;

  const submit = async () => {
    if (!groupId) { setErr(t('admin.studentDetail.selectGroupError')); return; }
    setBusy(true); setErr('');
    try {
      for (const g of currentGroups || []) {
        await api.adminRemoveStudentFromGroup(token, g.id, studentId);
      }
      await api.adminAddStudentToGroup(token, groupId, studentId);
      setGroupId('');
      onDone();
    } catch (e) { setErr(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box card bg-base-100 border border-base-300 max-w-sm">
        <h3 className="font-extrabold text-lg text-base-content mb-1">{isTransfer ? t('admin.studentDetail.transferToOtherGroup') : t('admin.studentDetail.addToGroup')}</h3>
        {isTransfer && (
          <p className="text-[12px] text-base-content/45 mb-3">
            {t('admin.studentDetail.currentGroupsHint', { groups: currentGroups.map((g) => g.name).join(', ') })}
          </p>
        )}
        {err && <div className="alert alert-error mb-3 py-2 text-sm mt-3">{err}</div>}
        <select className="select select-bordered w-full mt-3" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">{t('admin.studentDetail.selectGroupPlaceholder')}</option>
          {groupOptions.filter((g) => !(currentGroups || []).some((cg) => cg.id === g.id)).map((g) => (
            <option key={g.id} value={g.id}>{g.name}{g.subject ? ` — ${g.subject}` : ''}</option>
          ))}
        </select>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('admin.studentDetail.cancel')}</button>
          <button className="btn btn-primary gap-1.5" onClick={submit} disabled={busy || !groupId}>
            {busy && <span className="loading loading-spinner loading-xs" />} {isTransfer ? t('admin.studentDetail.transfer') : t('admin.studentDetail.add')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
