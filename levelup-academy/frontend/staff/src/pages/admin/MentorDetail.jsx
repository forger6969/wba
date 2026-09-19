import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Edit3, Save, Loader2, CalendarDays,
  KeyRound, Snowflake, Sun, Archive, Copy, Check,
  AlertCircle, User, MessageSquare, Users, Award, Download
} from 'lucide-react';

import { useAuth } from '../../auth.jsx';
import { useAdminMentors, useAdminGroups } from '../../queries.js';
import { api } from '../../api.js';
import PhoneInput from '../../components/PhoneInput.jsx';
import { Avatar, RowSkeleton, Modal } from '../mentor/_ui.jsx';
import { formatPhone } from '../../format.js';
import ExportDialog from '../../components/ExportDialog.jsx';

// helpers
const fullName = (s) =>
  s.fullName || [s.firstName || s.first_name, s.lastName || s.last_name].filter(Boolean).join(' ') || '—';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayLabelsFor = (locale) => Object.fromEntries(
  DAY_KEYS.map((key, i) => [key, new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })]),
);

const statusColorsMap = (t) => ({
  active: { bg: '#2ECC7115', text: '#2ECC71', label: t('status.active') },
  frozen: { bg: '#E8543E15', text: '#E8543E', label: t('status.frozen') },
});

const gradesFor = (t) => [
  { value: '', label: t('admin.mentors.gradeNotSet'), className: 'text-base-content/60' },
  { value: 'junior', label: 'Junior', className: 'text-info' },
  { value: 'middle', label: 'Middle', className: 'text-warning' },
  { value: 'senior', label: 'Senior', className: 'text-success' },
];


export default function AdminMentorDetail() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const DAY_LABELS = dayLabelsFor(locale);
  const STATUS_COLORS = statusColorsMap(t);
  const GRADES = gradesFor(t);
  const formatMoney = (n) => (n != null ? `${Number(n).toLocaleString(locale)} ${t('admin.mentorDetail.currency')}` : '—');
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data: mentorsRaw, isLoading, error, refetch } = useAdminMentors();
  const { data: groupsRaw } = useAdminGroups();
  
  const mentors = mentorsRaw?.data?.mentors || mentorsRaw?.mentors || (Array.isArray(mentorsRaw?.data) ? mentorsRaw.data : (Array.isArray(mentorsRaw) ? mentorsRaw : []));
  const mentor = mentors.find(m => String(m.id) === String(id));
  
  const groupsList = groupsRaw?.data?.groups || groupsRaw?.groups || (Array.isArray(groupsRaw?.data) ? groupsRaw.data : (Array.isArray(groupsRaw) ? groupsRaw : []));
  const mentorGroups = groupsList.filter(g => String(g.mentorId) === String(id) || String(g.mentor_id) === String(id));

  // state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionModal, setActionModal] = useState(null); // 'freeze' | 'archive'
  const [actionReason, setActionReason] = useState('');
  const [showExport, setShowExport] = useState(false);

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const startEdit = () => {
    if (!mentor) return;
    setForm({
      firstName: mentor.firstName || mentor.first_name || '',
      lastName: mentor.lastName || mentor.last_name || '',
      phone: mentor.phone || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.adminUpdateMentor(token, id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      setEditing(false);
      refetch();
    } catch (e) {
      alert(e.message || t('admin.mentors.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const isActive = mentor?.status !== 'frozen';
  const status = STATUS_COLORS[mentor?.status] || STATUS_COLORS.active;
  const grade = GRADES.find((g) => g.value === (mentor?.grade || '')) || GRADES[0];

  const toggleFreeze = () => {
    if (isActive) { setActionReason(''); setActionModal('freeze'); }
    else doFreeze(false, '');
  };
  
  const doFreeze = async (frozen, reason) => {
    setBusy(true);
    try { await api.adminFreezeMentor(token, id, frozen); refetch(); }
    catch (e) { alert(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };

  const confirmArchive = async () => {
    setBusy(true);
    try { await api.adminDeleteMentor(token, id); navigate('/mentors'); }
    catch (e) { alert(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); setActionModal(null); }
  };

  if (isLoading) return <div><div className="mt-6"><RowSkeleton count={3} /></div></div>;
  if (error) {
    return (
      <div className="card bg-base-100 p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-[14px] font-bold text-base-content">{t('mentor.coins.genericError')}</p>
        <p className="text-[12px] text-base-content/45 mt-1">{error.message}</p>
        <Link to="/mentors" className="btn btn-primary btn-sm mt-4"><ArrowLeft size={14} /> {t('mentor.back')}</Link>
      </div>
    );
  }
  if (!mentor) {
    return (
      <div className="card bg-base-100 p-8 text-center">
        <User size={40} className="mx-auto mb-3 text-base-content/45 opacity-30" />
        <p className="text-[14px] font-bold text-base-content">{t('admin.mentorDetail.notFound')}</p>
        <Link to="/mentors" className="btn btn-primary btn-sm mt-4"><ArrowLeft size={14} /> {t('mentor.back')}</Link>
      </div>
    );
  }

  const totalStudents = mentorGroups.reduce((acc, g) => acc + (g.studentsCount || 0), 0);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <Link to="/mentors" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-base-content/45 hover:text-primary transition-colors">
          <ArrowLeft size={16} /> {t('admin.mentorDetail.backToMentors')}
        </Link>
        <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setShowExport(true)}>
          <Download size={14} /> {t('admin.mentors.export')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-4 w-full shrink-0" style={{ maxWidth: 380 }}>
          <div className="card bg-base-100 p-5">
             <div className="flex items-start gap-4 mb-4">
               <Avatar name={fullName(mentor)} size="lg" />
               <div className="flex-1">
                 <h1 className="text-[19px] font-extrabold text-base-content leading-tight mb-1">{fullName(mentor)}</h1>
                 <div className="flex items-center gap-2">
                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: status.bg, color: status.text }}>
                     {status.label}
                   </span>
                   <span className="inline-flex items-center gap-1 text-[11px] font-bold" title={t('admin.mentorDetail.gradeTooltip')}>
                     <Award size={11} className={grade.className} /> {grade.label}
                   </span>
                 </div>
               </div>
             </div>

             <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-200/60">
                <span className="text-[11px] font-semibold text-base-content/50 uppercase">{t('admin.mentorDetail.emailLabel')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-base-content">{mentor.email || t('admin.mentorDetail.notSpecified')}</span>
                  {mentor.email && (
                    <button onClick={() => copyToClipboard(mentor.email, 'email')} className="text-base-content/45 hover:text-primary">
                      {copied === 'email' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-200/60">
                <span className="text-[11px] font-semibold text-base-content/50 uppercase">{t('admin.mentorDetail.phoneLabel')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-base-content">{mentor.phone ? formatPhone(mentor.phone) : t('admin.mentorDetail.notSpecified')}</span>
                  {mentor.phone && (
                    <button onClick={() => copyToClipboard(mentor.phone, 'phone')} className="text-base-content/45 hover:text-primary">
                      {copied === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
             </div>

             {mentor.skills?.length > 0 && (
               <div className="mt-4 p-3 rounded-[10px] bg-base-200/60">
                 <span className="text-[11px] font-semibold text-base-content/50 uppercase block mb-2">{t('admin.mentorDetail.skills')}</span>
                 <div className="flex flex-wrap gap-1">
                   {mentor.skills.map(s => (
                     <span key={s} className="text-[11px] px-2 py-0.5 rounded bg-base-100 text-base-content/70 shadow-sm border border-base-300">
                       {s}
                     </span>
                   ))}
                 </div>
               </div>
             )}

             {/* ACTIONS */}
             <div className="grid grid-cols-2 gap-1.5 mt-4">
               <button onClick={toggleFreeze} disabled={busy} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                 {isActive ? <Snowflake size={13} /> : <Sun size={13} />} {isActive ? t('admin.mentorDetail.freeze') : t('admin.mentorDetail.unfreeze')}
               </button>
               <button onClick={startEdit} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                 <Edit3 size={13} /> {t('admin.mentorDetail.edit')}
               </button>
               <button onClick={() => navigate('/chat')} className="btn btn-sm btn-ghost bg-base-200/60 justify-start gap-1.5 text-[12px]">
                 <MessageSquare size={13} /> {t('admin.mentorDetail.chat')}
               </button>
               <button onClick={() => { setActionReason(''); setActionModal('archive'); }} className="btn btn-sm btn-ghost bg-error/10 text-error hover:bg-error/20 justify-start gap-1.5 text-[12px] col-span-2">
                 <Archive size={13} /> {t('admin.mentorDetail.archive')}
               </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="card bg-base-100 p-4 text-center">
               <div className="text-[18px] font-extrabold text-base-content tabular-nums">{mentorGroups.length}</div>
               <div className="text-[10px] font-semibold text-base-content/45 uppercase mt-0.5 flex items-center justify-center gap-1"><Users size={11} /> {t('admin.mentorDetail.groups')}</div>
             </div>
             <div className="card bg-base-100 p-4 text-center">
               <div className="text-[18px] font-extrabold text-base-content tabular-nums">{totalStudents}</div>
               <div className="text-[10px] font-semibold text-base-content/45 uppercase mt-0.5">{t('admin.mentorDetail.students')}</div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 w-full flex-1 min-w-0">
          <div className="card bg-base-100 p-5">
            <h3 className="text-[16px] font-extrabold text-base-content mb-4">{t('admin.mentorDetail.groups')}</h3>
            {mentorGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users size={28} className="mx-auto mb-2 text-base-content/45 opacity-30" />
                <p className="text-[13px] text-base-content/45">{t('admin.mentorDetail.noGroups')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mentorGroups.map(g => (
                  <Link key={g.id} to={`/groups/${g.id}`} className="block p-4 rounded-[12px] bg-base-200/60 hover:bg-base-200 transition-colors border border-transparent hover:border-base-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-[14px] text-base-content">{g.name}</div>
                      <div className="text-[12px] font-semibold bg-base-100 px-2 py-0.5 rounded border border-base-300">
                        {t('admin.mentorDetail.studentsShort', { count: g.studentsCount || 0 })}
                      </div>
                    </div>
                    <div className="text-[12px] text-base-content/70 mb-2 font-medium">{g.subject}</div>
                    <div className="flex items-center justify-between text-[11px] text-base-content/45">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {(g.days || []).map((d) => DAY_LABELS[d] || d).join('/')} {g.startTime ? `· ${g.startTime}` : ''}
                      </span>
                      <span className="font-bold text-base-content">{formatMoney(g.monthlyPrice)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} pageKey="mentorDetail" data={[mentor]} />

      {/* Edit Modal */}
      {editing && (
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300">
            <h3 className="font-bold text-lg mb-4">{t('admin.mentorDetail.editTitle')}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.mentorDetail.firstNameLabel')}</label>
                  <input className="input input-bordered w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.mentorDetail.lastNameLabel')}</label>
                  <input className="input input-bordered w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">{t('admin.mentorDetail.phoneLabel')}</label>
                <PhoneInput className="input input-bordered w-full" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>{t('admin.mentorDetail.cancel')}</button>
              <button className="btn btn-primary gap-1" onClick={saveEdit} disabled={saving || !form.firstName || !form.lastName}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t('admin.mentorDetail.save')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditing(false)} />
        </dialog>
      )}

      {/* Freeze Modal */}
      <Modal
        isOpen={actionModal === 'freeze'}
        onClose={() => setActionModal(null)}
        title={t('admin.mentorDetail.freezeTitle')}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setActionModal(null)} disabled={busy}>{t('admin.mentorDetail.cancel')}</button>
            <button className="btn btn-warning btn-sm gap-1" onClick={() => { const r = actionReason.trim(); setActionModal(null); doFreeze(true, r); }} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Snowflake size={14} />} {t('admin.mentorDetail.freeze')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-base-content/70 mb-1">{t('admin.mentorDetail.freezeConfirm', { name: fullName(mentor) })}</p>
        <p className="text-xs text-base-content/45 mb-3">{t('admin.mentorDetail.freezeHint')}</p>
        <textarea className="textarea textarea-bordered w-full" rows={3} placeholder={t('admin.mentorDetail.freezeReasonPlaceholder')} value={actionReason} onChange={(e) => setActionReason(e.target.value)} autoFocus />
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={actionModal === 'archive'}
        onClose={() => setActionModal(null)}
        title={t('admin.mentorDetail.archiveTitle')}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setActionModal(null)} disabled={busy}>{t('admin.mentorDetail.cancel')}</button>
            <button className="btn btn-error btn-sm gap-1" onClick={confirmArchive} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} {t('admin.mentorDetail.archive')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-base-content/70 mb-1">{t('admin.mentorDetail.archiveConfirm', { name: fullName(mentor) })}</p>
        <p className="text-xs text-base-content/45 mb-3">{t('admin.mentorDetail.archiveHint')}</p>
      </Modal>
    </div>
  );
}
