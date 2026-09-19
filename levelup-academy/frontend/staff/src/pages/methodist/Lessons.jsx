import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FileQuestion, ClipboardCheck, ArrowLeft, Trash2, Copy, Coins, Pencil, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLessons, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

// practical → Aqlli tahlil (AI-review, Groq) shu description'ga qarab
// tekshiradi (backend: content.schemas.js, xuddi shu qoida).
const makeSchema = (t) => z.object({
  title: z.string().trim().min(1, t('methodist.lessons.title_required')).max(200),
  lessonType: z.enum(['test', 'practical']),
  description: z.string().trim().max(2000).optional(),
  instruction: z.string().trim().max(2000).optional(),
  coinReward: z.coerce.number().int().min(0).default(0),
}).refine((v) => v.lessonType !== 'practical' || Boolean(v.description?.trim()), {
  message: t('methodist.editor.description_required_practical'),
  path: ['description'],
});

function LessonTypeBadge({ type, t }) {
  const isTest = type === 'test';
  return (
    <span className={`mt-badge ${isTest ? 'mt-badge-test' : 'mt-badge-practical'}`}>
      {isTest ? <FileQuestion size={10} /> : <ClipboardCheck size={10} />}
      {isTest ? t('methodist.lessons.badge_test') : t('methodist.lessons.badge_practical')}
    </span>
  );
}

function LessonsView() {
  const { t } = useTranslation();
  const { topicId } = useParams();
  const { token } = useAuth();
  const { data, isLoading, error } = useLessons(topicId);
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(makeSchema(t)),
    defaultValues: { title: '', lessonType: 'test', description: '', instruction: '', coinReward: 0 },
  });

  const lessons = data?.data || [];
  const lessonType = watch('lessonType');

  const openCreate = () => {
    reset({ title: '', lessonType: 'test', description: '', instruction: '', coinReward: 0 });
    setErr('');
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setErr(''); setBusy(true);
    try {
      const result = await api.methodistCreateLesson(token, { topicId, ...formData });
      invalidate('lessons', topicId);
      setModalOpen(false);
      navigate(`/methodist/lessons/${result.data.id}/edit`);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doArchive = async (id) => {
    setErr('');
    try {
      await api.methodistArchiveLesson(token, id);
      invalidate('lessons', topicId);
      setConfirmArchive(null);
    } catch (e) { setErr(e.message); }
  };

  const copyLesson = async (id) => {
    setErr('');
    try {
      await api.methodistCopyLesson(token, id, topicId);
      invalidate('lessons', topicId);
    } catch (e) { setErr(e.message); }
  };

  if (isLoading) return (
    <div className="mt-page-bg p-6">
      <SkeletonTable rows={4} cols={4} />
    </div>
  );

  if (error) return (
    <div className="mt-page-bg space-y-6 p-6">
      <div className="mt-fade-in">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--mt-text-muted)] mb-3">
          <Link to="/methodist/types" className="hover:text-[var(--mt-accent)] transition-colors font-medium">{t('methodist.lessons.breadcrumb_types')}</Link>
          <span className="opacity-50">/</span>
          <Link to="/methodist/types" className="hover:text-[var(--mt-accent)] transition-colors font-medium">{t('methodist.lessons.breadcrumb_topics')}</Link>
          <span className="opacity-50">/</span>
          <span className="text-[var(--mt-text)] font-semibold">{t('methodist.lessons.breadcrumb_lessons')}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-colors"
            >
              <ArrowLeft size={18} className="text-[var(--mt-text-muted)]" />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.lessons.title')}</h1>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.lessons.subtitle')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="mt-card-flat p-6 mt-animate-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'rgba(220,38,38,0.08)' }}>
            <AlertTriangle size={22} className="text-[var(--mt-danger)]" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-[var(--mt-text)] mb-0.5">{t('methodist.common.loading_error')}</p>
            <p className="text-[12px] text-[var(--mt-text-muted)]">{error?.message || t('methodist.common.loading_failed')}</p>
          </div>
          <button
            className="mt-btn-ghost"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} /> {t('methodist.common.retry')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-page-bg space-y-6 p-6">
      {/* Breadcrumb + Header */}
      <div className="mt-fade-in">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--mt-text-muted)] mb-3">
          <Link to="/methodist/types" className="hover:text-[var(--mt-accent)] transition-colors font-medium">{t('methodist.lessons.breadcrumb_types')}</Link>
          <span className="opacity-50">/</span>
          <Link to="/methodist/types" className="hover:text-[var(--mt-accent)] transition-colors font-medium">{t('methodist.lessons.breadcrumb_topics')}</Link>
          <span className="opacity-50">/</span>
          <span className="text-[var(--mt-text)] font-semibold">{t('methodist.lessons.breadcrumb_lessons')}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-colors"
            >
              <ArrowLeft size={18} className="text-[var(--mt-text-muted)]" />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.lessons.title')}</h1>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.lessons.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="mt-btn-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.5} /> {t('methodist.lessons.create')}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="mt-animate-in flex items-center gap-3 p-4 rounded-xl border border-[rgba(220,38,38,0.15)]" style={{ background: 'rgba(220,38,38,0.04)' }}>
          <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(220,38,38,0.1)' }}>
            <span className="text-[var(--mt-danger)] text-sm font-bold">!</span>
          </div>
          <span className="text-[13px] text-[var(--mt-danger)] flex-1">{err}</span>
        </div>
      )}

      {/* Empty state */}
      {lessons.length === 0 ? (
        <div className="mt-card-flat mt-animate-in">
          <div className="mt-empty">
            <div className="w-20 h-20 rounded-[20px] grid place-items-center mb-5" style={{ background: 'rgba(217,119,6,0.08)' }}>
              <FileQuestion size={32} className="text-[var(--mt-warning)]" />
            </div>
            <p className="text-[15px] font-bold text-[var(--mt-text)] mb-1">{t('methodist.lessons.no_lessons')}</p>
            <p className="text-[13px] text-[var(--mt-text-muted)] mb-5">{t('methodist.lessons.no_lessons_hint')}</p>
            <button className="mt-btn-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.5} /> {t('methodist.lessons.create')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((ls, i) => (
            <div
              key={ls.id}
              className={`mt-card mt-animate-in mt-stagger-${Math.min(i + 1, 6)}`}
              style={{ borderLeftColor: ls.lesson_type === 'test' ? '#D97706' : '#059669' }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link
                      to={`/methodist/lessons/${ls.id}/edit`}
                      className="text-[14px] font-bold text-[var(--mt-text)] hover:text-[var(--mt-accent)] transition-colors truncate"
                    >
                      {ls.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <LessonTypeBadge type={ls.lesson_type} t={t} />
                    <span className="text-[11px] text-[var(--mt-text-muted)] font-medium">
                      {ls.lesson_type === 'practical'
                        ? t('methodist.lessons.requirements_count', { count: ls.requirements_count || 0 })
                        : t('methodist.lessons.questions_count', { count: ls.questions_count || 0 })}
                    </span>
                    {ls.coin_reward > 0 && (
                      <span className="mt-badge" style={{ background: 'rgba(217,119,6,0.1)', color: '#B45309' }}>
                        <Coins size={10} /> +{ls.coin_reward}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[var(--mt-accent-light)] transition-colors"
                    onClick={() => copyLesson(ls.id)}
                    title={t('methodist.lessons.copy_tooltip')}
                  >
                    <Copy size={14} className="text-[var(--mt-accent)]" />
                  </button>
                  <button
                    className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[rgba(220,38,38,0.08)] transition-colors"
                    onClick={() => setConfirmArchive({ id: ls.id, name: ls.title })}
                    title={t('methodist.lessons.archive_tooltip')}
                  >
                    <Trash2 size={14} className="text-[var(--mt-danger)]" />
                  </button>
                </div>
                <Link
                  to={`/methodist/lessons/${ls.id}/edit`}
                  className="w-9 h-9 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-all group/edit shrink-0"
                  title={t('methodist.lessons.edit_tooltip')}
                >
                  <Pencil size={14} className="text-[var(--mt-text-muted)] group-hover/edit:text-[var(--mt-accent)] transition-colors" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Archive Modal */}
      {confirmArchive && (
        <dialog className="modal modal-open">
          <div className="modal-backdrop" onClick={() => setConfirmArchive(null)} />
          <div className="modal-box mt-modal mt-modal-header max-w-sm p-0 mt-modal-body modal-enter">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(220,38,38,0.1)' }}>
                <Trash2 size={18} className="text-[var(--mt-danger)]" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-[var(--mt-text)]">{t('methodist.lessons.archive_confirm')}</h3>
                <p className="text-[12px] text-[var(--mt-text-muted)] truncate max-w-[200px]">«{confirmArchive.name}»</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="mt-btn-ghost flex-1 justify-center" onClick={() => setConfirmArchive(null)}>{t('methodist.common.cancel')}</button>
              <button
                className="flex-1 h-10 px-4 rounded-xl text-[13px] font-bold transition-colors"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                onClick={() => doArchive(confirmArchive.id)}
              >
                {t('methodist.lessons.archive')}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-backdrop" onClick={() => setModalOpen(false)} />
          <div className="modal-box mt-modal max-w-lg p-0 modal-enter">
            <div className="mt-modal-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: 'rgba(217,119,6,0.1)' }}>
                  <FileQuestion size={18} className="text-[var(--mt-warning)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-[var(--mt-text)]">{t('methodist.lessons.new_title')}</h3>
                  <p className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.lessons.new_hint')}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[var(--mt-accent-light)] transition-colors">
                <X size={16} className="text-[var(--mt-text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-modal-body space-y-4">
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.lessons.field_title')}</span>
                <input
                  type="text"
                  {...register('title')}
                  placeholder={t('methodist.lessons.title_placeholder')}
                  className={`mt-input ${errors.title ? 'border-[var(--mt-danger)]' : ''}`}
                />
                {errors.title && <span className="text-[11px] text-[var(--mt-danger)] mt-1 block">{errors.title.message}</span>}
              </label>

              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.lessons.lesson_type_label')}</span>
                <select {...register('lessonType')} className="mt-select">
                  <option value="test">{t('methodist.lessons.type_test')}</option>
                  <option value="practical">{t('methodist.lessons.type_practical')}</option>
                </select>
              </label>

              {lessonType === 'practical' && (
                <label className="form-control w-full">
                  <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">
                    {t('methodist.lessons.desc_label')} <span className="text-error">*</span>
                  </span>
                  <textarea
                    {...register('description')}
                    placeholder={t('methodist.lessons.desc_placeholder')}
                    className={`mt-textarea ${errors.description ? 'textarea-error' : ''}`}
                    rows={3}
                  />
                  {errors.description && <span className="text-xs text-error mt-1">{errors.description.message}</span>}
                </label>
              )}

              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.lessons.instruction_label')}</span>
                <textarea
                  {...register('instruction')}
                  placeholder={t('methodist.lessons.instruction_placeholder')}
                  className="mt-textarea"
                  rows={2}
                />
              </label>

              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.lessons.coin_label')}</span>
                <input
                  type="number"
                  {...register('coinReward')}
                  className="mt-input"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button type="button" className="mt-btn-ghost flex-1 justify-center" onClick={() => setModalOpen(false)} disabled={busy}>
                  {t('methodist.common.cancel')}
                </button>
                <button type="submit" className="mt-btn-primary flex-1 justify-center" disabled={busy}>
                  {busy ? <span className="loading loading-spinner loading-xs" /> : t('methodist.lessons.create_and_edit')}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default function Lessons() {
  return (
    <LessonsView />
  );
}
