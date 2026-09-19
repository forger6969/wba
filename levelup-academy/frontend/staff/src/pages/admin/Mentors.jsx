import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Users, UserCheck, UserX, Mail, Phone, Award, MessageCircle, Download, Copy, Check, KeyRound } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useAdminMentors } from '../../queries.js';
import { api } from '../../api.js';
import PhoneInput from '../../components/PhoneInput.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ExportDialog from '../../components/ExportDialog.jsx';
import { Avatar, EmptyState, Kpi, RowSkeleton, Tip } from '../mentor/_ui.jsx';

const fullName = (m) =>
  [m.firstName || m.first_name, m.lastName || m.last_name].filter(Boolean).join(' ') || '—';

const emptyForm = { id: null, firstName: '', lastName: '', phone: '', email: '' };

const statusColorsMap = (t) => ({
  active: { bg: '#2ECC7115', text: '#2ECC71', label: t('status.active') },
  frozen: { bg: '#E8543E15', text: '#E8543E', label: t('status.frozen') },
});

const GRADE_LABELS = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

/* ═══════════════ Stat Card ═══════════════ */
/* Грейд ментора. Меняется только отсюда: сам ментор в своём профиле видит его
   как read-only — PATCH /api/users/me это поле не принимает. */
/* ═══════════════ Mentor Card ═══════════════ */
function MentorCard({ m, onEdit, canMessage }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const STATUS_COLORS = statusColorsMap(t);
  const status = STATUS_COLORS[m.status] || STATUS_COLORS.active;

  return (
    <div className="card bg-base-100 p-5 card-hover-premium group">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="transition-transform duration-300 group-hover:scale-105">
          <Avatar name={fullName(m)} size="lg" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] font-bold text-base-content truncate">{fullName(m)}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: status.bg, color: status.text }}>
              {status.label}
            </span>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-base-content/45">
            {m.email && (
              <span className="flex items-center gap-1.5">
                <Mail size={10} className="opacity-50" /> {m.email}
              </span>
            )}
            {m.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={10} className="opacity-50" /> {m.phone}
              </span>
            )}
          </div>

          {/* Навыки — короткой строкой */}
          {m.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {m.skills.slice(0, 3).map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/70">
                  {s}
                </span>
              ))}
              {m.skills.length > 3 && (
                <span className="text-[10px] px-1 text-base-content/45">+{m.skills.length - 3}</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            <span className="h-7 px-2.5 rounded-[8px] flex items-center gap-1 text-[11px] font-semibold bg-base-200 text-base-content/65" title={t('admin.mentors.gradeTooltip')}>
              <Award size={11} /> {GRADE_LABELS[m.grade] || t('admin.mentors.gradeNotSet')}
            </span>
            <button className="h-7 px-2.5 rounded-[8px] flex items-center gap-1 text-[11px] font-semibold text-base-content/70 bg-base-100 border border-base-300 hover:border-primary/40 hover:bg-primary/10 transition-all"
              onClick={() => onEdit(m)}>
              <Pencil size={11} /> {t('admin.mentors.edit')}
            </button>
            {canMessage && <button
              className="h-7 w-7 rounded-[8px] flex items-center justify-center text-base-content/45 hover:bg-primary/10 hover:text-primary transition-all"
              title={t('admin.mentors.chatTooltip')}
              onClick={() => navigate(`/chat?with=${m.id}`)}
            >
              <MessageCircle size={13} />
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Main Mentors ═══════════════ */
export default function AdminMentors() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { data, isLoading, error, refetch } = useAdminMentors();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [creds, setCreds] = useState(null);
  const [copied, setCopied] = useState('');
  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(field); setTimeout(() => setCopied(''), 2000); });
  };

  const raw = data?.data || data || {};
  const rows = raw.mentors || (Array.isArray(raw) ? raw : []);

  const activeCount = rows.filter((m) => m.status !== 'frozen').length;
  const frozenCount = rows.filter((m) => m.status === 'frozen').length;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const body = { firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined };
      if (form.id) {
        await api.adminUpdateMentor(token, form.id, body);
        setForm(null);
      } else {
        const res = await api.adminCreateMentor(token, { ...body, email: form.email });
        const r = res?.data || res;
        setForm(null);
        if (r.mentor?.password) {
          setCreds({ email: form.email, password: r.mentor.password });
        }
      }
      refetch();
    } catch (e) { setErr(e.message || t('admin.mentors.genericError')); }
    finally { setBusy(false); }
  };

  const edit = (m) => setForm({ id: m.id, firstName: m.firstName || m.first_name || '', lastName: m.lastName || m.last_name || '', phone: m.phone || '', email: m.email || '' });

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t('admin.mentors.title')} subtitle={t('admin.mentors.subtitle')}>
        <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setShowExport(true)} disabled={rows.length === 0}>
          <Download size={14} /> {t('admin.mentors.export')}
        </button>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm(emptyForm); setErr(''); }}>
          <Plus size={16} /> {t('admin.mentors.addMentor')}
        </button>
      </PageHeader>

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi Icon={Users} title={t('admin.mentors.total')} value={rows.length}  tone="neutral" />
        <Kpi Icon={UserCheck} title={t('admin.mentors.active')} value={activeCount}  tone="success" />
        <Kpi Icon={UserX} title={t('admin.mentors.frozen')} value={frozenCount}  tone="danger" />
      </div>

      {/* ═══ Mentor Cards ═══ */}
      {isLoading ? (
        <RowSkeleton count={4} />
      ) : error ? (
        <div className="alert alert-error mt-4">{t('admin.mentors.loadError', { message: error.message })}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('admin.mentors.emptyTitle')}
          hint={t('admin.mentors.emptyHint')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((m) => (
            <MentorCard
              key={m.id}
              m={m}
              onEdit={edit}
              canMessage={user?.role === 'admin'}
            />
          ))}
        </div>
      )}

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} pageKey="mentors" data={rows} />

      {/* ═══ Create/Edit Modal ═══ */}
      {form && (
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300">
            <h3 className="font-bold text-lg mb-4">{form.id ? t('admin.mentors.editTitle') : t('admin.mentors.newTitle')}</h3>
            {err && <div className="alert alert-error mb-3 py-2 text-sm">{err}</div>}
            <div className="space-y-3">
              <input className="input input-bordered w-full" placeholder={t('admin.mentors.firstNamePlaceholder')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <input className="input input-bordered w-full" placeholder={t('admin.mentors.lastNamePlaceholder')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              <PhoneInput className="input input-bordered w-full" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              {!form.id && (
                <input className="input input-bordered w-full" type="email" placeholder={t('admin.mentors.emailPlaceholder')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              )}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>{t('admin.mentors.cancel')}</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || !form.firstName || !form.lastName || (!form.id && !form.email)}>
                {busy && <span className="loading loading-spinner loading-xs" />} {t('admin.mentors.save')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setForm(null)} />
        </dialog>
      )}

      {/* ═══ Модалка с паролем нового ментора — показывается один раз ═══ */}
      {creds && (
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300 max-w-sm">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><KeyRound size={18} className="text-primary" /> {t('admin.mentors.createdTitle')}</h3>
            <p className="text-[12px] text-base-content/45 mb-4">{t('admin.mentors.createdHint')}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-base-200/60">
                <div>
                  <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.mentors.emailLabel')}</div>
                  <div className="text-[13px] font-semibold text-base-content">{creds.email}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-base-200/60">
                <div>
                  <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.mentors.passwordLabel')}</div>
                  <div className="text-[15px] font-mono font-extrabold text-base-content">{creds.password}</div>
                </div>
                <button onClick={() => copyToClipboard(creds.password, 'pw')} className="btn btn-ghost btn-sm">
                  {copied === 'pw' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setCreds(null)}>{t('admin.mentors.done')}</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setCreds(null)} />
        </dialog>
      )}
    </div>
  );
}
