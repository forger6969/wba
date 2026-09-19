import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, BookOpen, Layers, Trash2, ArrowRight, Info, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTrainingTypes, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import TrainingTypeIcon from '../../components/TrainingTypeIcon.jsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';


const makeSchema = (t) => z.object({
  name: z.string().trim().min(1, t('methodist.types.name_required')).max(160),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(60).optional(),
  aiReviewEnabled: z.boolean().optional(),
});

const TYPE_COLORS = ['#dc2626', '#2563EB', '#D97706', '#059669', '#DC2626', '#0891B2'];

function DescriptionPopover({ description, children, t }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({ top: rect.top - 8, left: Math.min(rect.left, window.innerWidth - 320) });
      }
      setShow(true);
    }, 400);
  };
  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 200);
  };
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  if (!description) return children;

  return (
    <>
      <div ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave} className="relative">
        {children}
      </div>
      {show && (
        <div
          className="fixed z-[65] mt-animate-in"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={handleLeave}
        >
          <div className="rounded-[14px] p-4 max-w-[300px] shadow-[0_16px_48px_rgba(29,36,23,0.12)] border border-[var(--mt-border)] bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-[var(--mt-accent)] shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--mt-text-muted)]">{t('methodist.types.description')}</span>
            </div>
            <p className="text-[13px] text-[var(--mt-text-muted)] leading-relaxed">{description}</p>
            <div className="absolute bottom-0 left-6 w-3 h-3 bg-white border-r border-b border-[var(--mt-border)] transform rotate-45 translate-y-1/2" />
          </div>
        </div>
      )}
    </>
  );
}

function TrainingTypesView() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { data, isLoading, error } = useTrainingTypes();
  const invalidate = useInvalidate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(makeSchema(t)),
    defaultValues: { name: '', description: '', icon: '📚', aiReviewEnabled: false },
  });

  const types = data?.data || [];

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', description: '', icon: '📚', aiReviewEnabled: false });
    setErr('');
    setModalOpen(true);
  };

  const openEdit = (tt) => {
    setEditingId(tt.id);
    reset({ name: tt.name, description: tt.description || '', icon: tt.icon || '📚', aiReviewEnabled: Boolean(tt.ai_review_enabled) });
    setErr('');
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setErr('');
    setBusy(true);
    try {
      if (editingId) {
        await api.methodistUpdateTrainingType(token, editingId, formData);
      } else {
        await api.methodistCreateTrainingType(token, formData);
      }
      invalidate('training-types');
      setModalOpen(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const archive = async (id) => {
    setErr('');
    try {
      await api.methodistArchiveTrainingType(token, id);
      invalidate('training-types');
      setConfirmArchive(null);
    } catch (e) { setErr(e.message); }
  };

  if (isLoading) return (
    <div className="mt-page-bg p-6">
      <SkeletonTable rows={4} cols={3} />
    </div>
  );

  if (error) return (
    <div className="mt-page-bg space-y-6 p-6">
      <div className="mt-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--mt-accent-light)] grid place-items-center">
              <BookOpen size={20} className="text-[var(--mt-accent)]" />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.types.title')}</h1>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.types.subtitle')}</p>
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
      {/* Header */}
      <div className="mt-fade-in flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--mt-accent-light)] grid place-items-center">
            <BookOpen size={20} className="text-[var(--mt-accent)]" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.types.title')}</h1>
            <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.types.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button className="mt-btn-primary" onClick={openCreate}>
            <Plus size={16} strokeWidth={2.5} /> {t('methodist.types.add')}
          </button>
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
      {types.length === 0 ? (
        <div className="mt-card-flat mt-animate-in">
          <div className="mt-empty">
            <div className="w-20 h-20 rounded-[20px] grid place-items-center mb-5" style={{ background: 'var(--mt-accent-light)' }}>
              <BookOpen size={32} className="text-[var(--mt-accent)]" />
            </div>
            <p className="text-[15px] font-bold text-[var(--mt-text)] mb-1">{t('methodist.types.no_types')}</p>
            <p className="text-[13px] text-[var(--mt-text-muted)] mb-5">{t('methodist.types.no_types_hint')}</p>
            <button className="mt-btn-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.5} /> {t('methodist.types.create_first')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((tt, i) => {
            const color = TYPE_COLORS[i % TYPE_COLORS.length];
            return (
              <div
                key={tt.id}
                className={`mt-card mt-animate-in mt-stagger-${Math.min(i + 1, 6)}`}
                style={{ borderLeftColor: color }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-12 h-12 rounded-2xl grid place-items-center text-[22px] shrink-0 transition-transform duration-300 hover:scale-110"
                      style={{ background: `${color}12` }}
                    >
                      {tt.icon || '📚'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/methodist/types/${tt.id}/topics`}
                        className="text-[14px] font-bold text-[var(--mt-text)] hover:text-[var(--mt-accent)] transition-colors block truncate"
                      >
                        {tt.name}
                      </Link>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--mt-text-muted)] mt-0.5">
                        <Layers size={11} />
                        <span className="font-medium">{t('methodist.types.topics_count', { count: tt.topics_count || 0 })}</span>
                        {tt.description && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="opacity-70 flex items-center gap-1">
                              <Info size={10} /> {t('methodist.types.description_short')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-8 h-8 rounded-lg grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-[rgba(220,38,38,0.08)] transition-all duration-200 shrink-0"
                    onClick={() => setConfirmArchive({ id: tt.id, name: tt.name })}
                    title={t('methodist.types.archive_tooltip')}
                  >
                    <Trash2 size={14} className="text-[var(--mt-danger)]" />
                  </button>
                </div>
                <DescriptionPopover description={tt.description} t={t}>
                  <Link
                    to={`/methodist/types/${tt.id}/topics`}
                    className="mt-notebook-item mt-notebook-item:hover !p-3"
                  >
                    <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] flex-1">{t('methodist.types.open_topics')}</span>
                    <ArrowRight size={14} className="text-[var(--mt-text-muted)] group-hover/link:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                </DescriptionPopover>
              </div>
            );
          })}
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
                <h3 className="font-bold text-[15px] text-[var(--mt-text)]">{t('methodist.types.archive_confirm')}</h3>
                <p className="text-[12px] text-[var(--mt-text-muted)]">{t('methodist.types.archive_hidden', { name: confirmArchive.name })}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="mt-btn-ghost flex-1 justify-center" onClick={() => setConfirmArchive(null)}>{t('methodist.common.cancel')}</button>
              <button
                className="flex-1 h-10 px-4 rounded-xl text-[13px] font-bold transition-colors"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                onClick={() => archive(confirmArchive.id)}
              >
                {t('methodist.types.archive')}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-backdrop" onClick={() => setModalOpen(false)} />
          <div className="modal-box mt-modal max-w-md p-0 modal-enter">
            <div className="mt-modal-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: 'var(--mt-accent-light)' }}>
                  <BookOpen size={18} className="text-[var(--mt-accent)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-[var(--mt-text)]">{t('methodist.types.new_title')}</h3>
                  <p className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.types.new_hint')}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[var(--mt-accent-light)] transition-colors">
                <X size={16} className="text-[var(--mt-text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-modal-body space-y-4">
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.types.name_label')}</span>
                <input
                  type="text"
                  {...register('name')}
                  placeholder={t('methodist.types.name_placeholder')}
                  className={`mt-input ${errors.name ? 'border-[var(--mt-danger)]' : ''}`}
                />
                {errors.name && <span className="text-[11px] text-[var(--mt-danger)] mt-1 block">{errors.name.message}</span>}
              </label>
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.types.description_label')}</span>
                <textarea
                  {...register('description')}
                  placeholder={t('methodist.types.description_placeholder')}
                  className="mt-textarea"
                  rows={2}
                />
              </label>
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.types.icon_label')}</span>
                <input
                  type="text"
                  {...register('icon')}
                  placeholder="📚"
                  className="mt-input"
                />
              </label>
              <label className="flex items-start gap-2.5 rounded-xl p-3 cursor-pointer" style={{ background: 'var(--mt-accent-light)' }}>
                <input type="checkbox" {...register('aiReviewEnabled')} className="mt-1 shrink-0" />
                <span>
                  <span className="text-[13px] font-bold text-[var(--mt-text)] block">{t('methodist.types.ai_review_label')}</span>
                  <span className="text-[11px] text-[var(--mt-text-muted)] block mt-0.5 leading-relaxed">{t('methodist.types.ai_review_hint')}</span>
                </span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" className="mt-btn-ghost flex-1 justify-center" onClick={() => setModalOpen(false)} disabled={busy}>
                  {t('methodist.common.cancel')}
                </button>
                <button type="submit" className="mt-btn-primary flex-1 justify-center" disabled={busy}>
                  {busy && <span className="loading loading-spinner loading-xs" />} {t('methodist.common.create')}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default function TrainingTypes() {
  return (
    <TrainingTypesView />
  );
}
