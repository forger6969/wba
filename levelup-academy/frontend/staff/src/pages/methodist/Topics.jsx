import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Layers, FileQuestion, ArrowLeft, Trash2, ArrowRight, Info, X, AlertTriangle, RefreshCw, Pencil } from 'lucide-react';
import { useTopics, useInvalidate } from '../../queries.js';
import { api, uploadToPresignedUrl } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

const makeSchema = (t) => z.object({
  name: z.string().trim().min(1, t('methodist.topics.name_required')).max(200),
  description: z.string().trim().max(2000).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  coinReward: z.coerce.number().int().min(0).default(0),
});

function formatBytes(n) {
  if (!n) return '';
  const mb = n / 1_000_000;
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}
function formatDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Длительность локального файла до загрузки — читается прямо в браузере, без обращения к серверу. */
function readVideoDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement('methodist.video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(Math.round(v.duration) || undefined); };
    v.onerror = () => resolve(undefined);
    v.src = URL.createObjectURL(file);
  });
}

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
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--mt-text-muted)]">{t('methodist.topics.description')}</span>
            </div>
            <p className="text-[13px] text-[var(--mt-text-muted)] leading-relaxed">{description}</p>
            <div className="absolute bottom-0 left-6 w-3 h-3 bg-white border-r border-b border-[var(--mt-border)] transform rotate-45 translate-y-1/2" />
          </div>
        </div>
      )}
    </>
  );
}

function TopicsView() {
  const { t } = useTranslation();
  const { trainingTypeId } = useParams();
  const { token } = useAuth();
  const { data, isLoading, error } = useTopics(trainingTypeId);
  const invalidate = useInvalidate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [videoMode, setVideoMode] = useState('url');
  const [videoUploading, setVideoUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(makeSchema(t)),
    defaultValues: { name: '', description: '', videoUrl: '', coinReward: 0 },
  });

  const topics = data?.data || [];
  const editingTopic = topics.find((tp) => tp.id === editingId) || null;

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', description: '', videoUrl: '', coinReward: 0 });
    setVideoMode('url');
    setErr('');
    setModalOpen(true);
  };

  const openEdit = (tp) => {
    setEditingId(tp.id);
    reset({ name: tp.name, description: tp.description || '', videoUrl: tp.video_url || '', coinReward: tp.coin_reward ?? 0 });
    setVideoMode(tp.video_file_key ? 'file' : 'url');
    setErr('');
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setErr(''); setBusy(true);
    try {
      const payload = { name: formData.name, description: formData.description, coinReward: formData.coinReward };
      // videoUrl трогаем только в режиме "Ссылка" — иначе сохранение имени/описания
      // могло бы случайно затереть уже загруженный видео-файл (взаимоисключающе на бэке).
      if (videoMode === 'url') {
        const v = (formData.videoUrl || '').trim();
        if (editingId || v) payload.videoUrl = v;
      }
      if (editingId) {
        await api.methodistUpdateTopic(token, editingId, payload);
      } else {
        await api.methodistCreateTopic(token, { trainingTypeId, ...payload });
      }
      invalidate('topics', trainingTypeId);
      setModalOpen(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doVideoUpload = async (file) => {
    if (!editingId) return;
    setErr(''); setVideoUploading(true);
    try {
      const durationSec = await readVideoDuration(file);
      const d = await api.methodistTopicVideoUploadUrl(token, editingId, file.name, file.type || 'video/mp4');
      await uploadToPresignedUrl(d.data.uploadUrl, file);
      await api.methodistConfirmTopicVideo(token, editingId, { fileKey: d.data.fileKey, durationSec });
      invalidate('topics', trainingTypeId);
    } catch (e) { setErr(e.message); } finally { setVideoUploading(false); }
  };

  const handleVideoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doVideoUpload(file);
    e.target.value = '';
  };

  const clearVideoFile = async () => {
    setErr('');
    try {
      await api.methodistClearTopicVideoFile(token, editingId);
      invalidate('topics', trainingTypeId);
    } catch (e) { setErr(e.message); }
  };

  const archive = async (id) => {
    setErr('');
    try {
      await api.methodistArchiveTopic(token, id);
      invalidate('topics', trainingTypeId);
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
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--mt-text-muted)] mb-3">
          <Link to="/methodist/types" className="hover:text-[var(--mt-accent)] transition-colors font-medium">{t('methodist.topics.breadcrumb_types')}</Link>
          <span className="opacity-50">/</span>
          <span className="text-[var(--mt-text)] font-semibold">{t('methodist.topics.breadcrumb_topics')}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/methodist/types"
              className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-colors"
            >
              <ArrowLeft size={18} className="text-[var(--mt-text-muted)]" />
            </Link>
            <div>
              <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.topics.title')}</h1>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.topics.subtitle')}</p>
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
      {/* Breadcrumb */}
      <div className="mt-fade-in">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--mt-text-muted)] mb-3">
          <Link to="/methodist/types" className="hover:text-[var(--mt-accent)] transition-colors font-medium">{t('methodist.topics.breadcrumb_types')}</Link>
          <span className="opacity-50">/</span>
          <span className="text-[var(--mt-text)] font-semibold">{t('methodist.topics.breadcrumb_topics')}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/methodist/types"
              className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-colors"
            >
              <ArrowLeft size={18} className="text-[var(--mt-text-muted)]" />
            </Link>
            <div>
              <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.topics.title')}</h1>
              <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.topics.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="mt-btn-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.5} /> {t('methodist.topics.add')}
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
      {topics.length === 0 ? (
        <div className="mt-card-flat mt-animate-in">
          <div className="mt-empty">
            <div className="w-20 h-20 rounded-[20px] grid place-items-center mb-5" style={{ background: 'var(--mt-accent-light)' }}>
              <Layers size={32} className="text-[var(--mt-accent)]" />
            </div>
            <p className="text-[15px] font-bold text-[var(--mt-text)] mb-1">{t('methodist.topics.no_topics')}</p>
            <p className="text-[13px] text-[var(--mt-text-muted)] mb-5">{t('methodist.topics.no_topics_hint')}</p>
            <button className="mt-btn-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.5} /> {t('methodist.topics.create')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((tp, i) => (
            <div
              key={tp.id}
              className={`mt-card mt-animate-in mt-stagger-${Math.min(i + 1, 6)}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0 transition-transform duration-300 hover:scale-110" style={{ background: 'var(--mt-accent-light)' }}>
                    <Layers size={18} className="text-[var(--mt-accent)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/methodist/topics/${tp.id}/lessons`}
                      className="text-[14px] font-bold text-[var(--mt-text)] hover:text-[var(--mt-accent)] transition-colors block truncate"
                    >
                      {tp.name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--mt-text-muted)] mt-0.5">
                      <FileQuestion size={11} />
                      <span className="font-medium">{t('methodist.topics.lessons_count', { count: tp.lessons_count || 0 })}</span>
                      {tp.description && (
                        <>
                          <span className="opacity-50">·</span>
                          <span className="opacity-70 flex items-center gap-1">
                            <Info size={10} /> {t('methodist.topics.description_short')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-square btn-xs" onClick={() => openEdit(tp)} title={t('methodist.topics.edit_tooltip')}>
                      <Pencil size={14} className="text-info" />
                    </button>
                    <button className="btn btn-ghost btn-square btn-xs" onClick={() => archive(tp.id)} title={t('methodist.topics.delete_tooltip')}>
                      <Trash2 size={14} className="text-error" />
                    </button>
                  </div>
                </div>
                <button
                  className="w-8 h-8 rounded-lg grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-[rgba(220,38,38,0.08)] transition-all duration-200 shrink-0"
                  onClick={() => setConfirmArchive({ id: tp.id, name: tp.name })}
                  title={t('methodist.topics.archive_tooltip')}
                >
                  <Trash2 size={14} className="text-[var(--mt-danger)]" />
                </button>
              </div>
              <DescriptionPopover description={tp.description} t={t}>
                <Link
                  to={`/methodist/topics/${tp.id}/lessons`}
                  className="mt-notebook-item mt-notebook-item:hover !p-3"
                >
                  <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] flex-1">{t('methodist.topics.lessons_and_tests')}</span>
                  <ArrowRight size={14} className="text-[var(--mt-text-muted)] group-hover/link:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              </DescriptionPopover>
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
                <h3 className="font-bold text-[15px] text-[var(--mt-text)]">{t('methodist.topics.archive_confirm')}</h3>
                <p className="text-[12px] text-[var(--mt-text-muted)]">{t('methodist.topics.archive_hidden', { name: confirmArchive.name })}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="mt-btn-ghost flex-1 justify-center" onClick={() => setConfirmArchive(null)}>{t('methodist.common.cancel')}</button>
              <button
                className="flex-1 h-10 px-4 rounded-xl text-[13px] font-bold transition-colors"
                style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}
                onClick={() => archive(confirmArchive.id)}
              >
                {t('methodist.topics.archive')}
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
                  <Layers size={18} className="text-[var(--mt-accent)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-[var(--mt-text)]">{t('methodist.topics.new_title')}</h3>
                  <p className="text-[11px] text-[var(--mt-text-muted)]">{t('methodist.topics.new_hint')}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[var(--mt-accent-light)] transition-colors">
                <X size={16} className="text-[var(--mt-text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-modal-body space-y-4">
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.topics.name_label')}</span>
                <input
                  type="text"
                  {...register('name')}
                  placeholder={t('methodist.topics.name_placeholder')}
                  className={`mt-input ${errors.name ? 'border-[var(--mt-danger)]' : ''}`}
                />
                {errors.name && <span className="text-[11px] text-[var(--mt-danger)] mt-1 block">{errors.name.message}</span>}
              </label>
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.topics.description_label')}</span>
                <textarea
                  {...register('description')}
                  placeholder={t('methodist.topics.description_placeholder')}
                  className="mt-textarea"
                  rows={2}
                />
              </label>
              <div className="space-y-2">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] block">{t('methodist.topics.video_label')}</span>
                <div className="flex gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setVideoMode('url')}
                    className={`px-3 h-8 rounded-lg text-[12px] font-semibold transition-colors ${videoMode === 'url' ? 'bg-[var(--mt-accent-light)] text-[var(--mt-accent)]' : 'text-[var(--mt-text-muted)] hover:bg-[var(--mt-surface-warm)]'}`}
                  >
                    {t('methodist.topics.video_mode_url')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoMode('file')}
                    disabled={!editingId}
                    className={`px-3 h-8 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 ${videoMode === 'file' ? 'bg-[var(--mt-accent-light)] text-[var(--mt-accent)]' : 'text-[var(--mt-text-muted)] hover:bg-[var(--mt-surface-warm)]'}`}
                  >
                    {t('methodist.topics.video_mode_file')}
                  </button>
                </div>

                {videoMode === 'url' ? (
                  <input
                    type="text"
                    {...register('videoUrl')}
                    placeholder={t('methodist.topics.video_url_placeholder')}
                    className="mt-input"
                  />
                ) : !editingId ? (
                  <p className="text-[12px] text-[var(--mt-text-muted)]">{t('methodist.topics.video_after_create_hint')}</p>
                ) : editingTopic?.video_file_key ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--mt-border)]">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--mt-text)] truncate">
                        {editingTopic.video_file_key.split('methodist./').pop()}
                      </p>
                      <p className="text-[11px] text-[var(--mt-text-muted)]">
                        {formatBytes(editingTopic.video_size_bytes)}
                        {editingTopic.video_duration_sec ? ` · ${formatDuration(editingTopic.video_duration_sec)}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={clearVideoFile} className="btn btn-ghost btn-square btn-xs shrink-0" title={t('methodist.topics.video_remove')}>
                      <Trash2 size={14} className="text-error" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={videoUploading}
                      onChange={handleVideoFileChange}
                      className="file-input file-input-bordered file-input-sm w-full"
                    />
                    <span className="text-[11px] opacity-40">
                      {videoUploading ? <span className="loading loading-spinner loading-xs" /> : t('methodist.topics.video_upload_hint')}
                    </span>
                  </div>
                )}
              </div>
              <label className="form-control w-full">
                <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.topics.coin_reward_label')}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  {...register('coinReward')}
                  className="mt-input"
                />
                <span className="text-[11px] text-[var(--mt-text-muted)] mt-1 block">{t('methodist.topics.coin_reward_hint')}</span>
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

export default function Topics() {
  return (
    <TopicsView />
  );
}
