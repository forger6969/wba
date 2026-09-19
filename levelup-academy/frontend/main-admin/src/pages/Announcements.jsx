import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Megaphone, Users, Shield, Building2, Clock,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';

// ---- Constants ----

const TARGET_LABELS = {
  'all-partners': 'Все партнёры',
  'all-ceo':      'Все CEO',
};

const ROLE_LABEL = {
  ceo: 'CEO',
  admin:      'Администратор',
  mentor:     'Ментор',
  methodist:  'Методист',
  student:    'Студент',
  parent:     'Родитель',
};

// ---- Helpers ----

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}с назад`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}м назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч назад`;
  const d = Math.floor(h / 24);
  return `${d}д назад`;
}

function targetIcon(targetType) {
  if (targetType === 'all-ceo') return <Shield size={14} className="text-purple-600" />;
  if (targetType === 'all-partners') return <Building2 size={14} className="text-lime-600" />;
  return <Users size={14} className="text-primary" />;
}

function onlineTone(readCount, total) {
  if (total === 0) return 'progress-ghost';
  const pct = readCount / total;
  if (pct >= 0.8) return 'progress-success';
  if (pct >= 0.4) return 'progress-warning';
  return 'progress-error';
}

// ---- Query ----

function useAnnouncementsQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['main-announcements'],
    queryFn: () => api.mainAnnouncements(token),
    enabled: !!token,
    retry: false,
  });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

// ---- Main Component ----

export default function Announcements() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useAnnouncementsQuery();

  // Graceful degradation: если 404/500 — показываем пустой список
  const isServerMissing = error && error.status !== 401 && error.status !== 0;
  const items = isServerMissing
    ? []
    : (data?.items ?? data?.announcements ?? []);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState({});

  const [form, setForm] = useState({ title: '', body: '', targetType: 'all-partners' });
  const [formError, setFormError] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload) => api.mainCreateAnnouncement(token, payload),
    onSuccess: () => {
      setModalOpen(false);
      setForm({ title: '', body: '', targetType: 'all-partners' });
      setFormError('');
      qc.invalidateQueries({ queryKey: ['main-announcements'] });
    },
    onError: (e) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.mainDeleteAnnouncement(token, id),
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['main-announcements'] });
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Введите заголовок'); return; }
    if (!form.body.trim()) { setFormError('Введите текст анонса'); return; }
    createMutation.mutate(form);
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Анонсы" subtitle="Сообщения для партнёров платформы">
        <button
          className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 btn-sm gap-1.5"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} /> Новый анонс
        </button>
      </PageHeader>

      {/* Content */}
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Анонсов пока нет. Создайте первый!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const readCount = item.readCount ?? item.read_count ?? 0;
            const recipientCount = item.recipientCount ?? item.recipient_count ?? 0;
            const senderName = item.senderName ?? item.sender_name ?? '—';
            const targetType = item.targetType ?? item.target_type ?? 'all-partners';
            const targetLabel = TARGET_LABELS[targetType] ?? targetType;
            const createdAt = item.createdAt ?? item.created_at;
            const isExpanded = !!expanded[item.id];
            const readers = item.readers ?? [];
            const nonReaders = item.nonReaders ?? item.non_readers ?? [];

            return (
              <div key={item.id} className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {targetIcon(targetType)}
                        <span className="badge badge-outline badge-sm">{targetLabel}</span>
                        <span className="text-xs text-base-content/40 flex items-center gap-1">
                          <Clock size={11} /> {timeAgo(createdAt)}
                        </span>
                      </div>
                      <h3 className="font-bold text-base">{item.title}</h3>
                      <p className="text-sm text-base-content/60 mt-1 line-clamp-2">{item.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => toggleExpand(item.id)}
                        title="Подробнее"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => setDeleteTarget(item)}
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Read progress */}
                  {recipientCount > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-base-content/50 mb-1">
                        <span>Прочитано</span>
                        <span>{readCount} / {recipientCount}</span>
                      </div>
                      <progress
                        className={`progress w-full h-1.5 ${onlineTone(readCount, recipientCount)}`}
                        value={readCount}
                        max={recipientCount}
                      />
                    </div>
                  )}

                  <div className="text-xs text-base-content/40 mt-1">
                    Отправил: <span className="font-medium text-base-content/60">{senderName}</span>
                  </div>

                  {/* Expanded readers list */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-base-200">
                      <p className="text-sm text-base-content/70 mb-3">{item.body}</p>
                      {(readers.length > 0 || nonReaders.length > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {readers.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-success mb-2">
                                Прочитали ({readers.length})
                              </div>
                              <div className="space-y-1">
                                {readers.map((r, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                                    <span>{r.name ?? r}</span>
                                    {r.role && (
                                      <span className="text-base-content/40">{ROLE_LABEL[r.role] ?? r.role}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {nonReaders.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-error mb-2">
                                Не прочитали ({nonReaders.length})
                              </div>
                              <div className="space-y-1">
                                {nonReaders.map((r, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                                    <span>{r.name ?? r}</span>
                                    {r.role && (
                                      <span className="text-base-content/40">{ROLE_LABEL[r.role] ?? r.role}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">Новый анонс</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Заголовок</span></label>
                <input
                  type="text"
                  className="input input-bordered input-sm focus:border-lime-400 focus:outline-lime-200"
                  placeholder="Важное объявление"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Текст</span></label>
                <textarea
                  className="textarea textarea-bordered textarea-sm resize-none focus:border-lime-400 focus:outline-lime-200"
                  rows={4}
                  placeholder="Текст анонса..."
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Получатели</span></label>
                <select
                  className="select select-bordered select-sm focus:border-lime-400 focus:outline-lime-200"
                  value={form.targetType}
                  onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
                >
                  <option value="all-partners">Все партнёры</option>
                  <option value="all-ceo">Все CEO</option>
                </select>
              </div>

              {formError && (
                <div className="alert alert-error text-xs py-2">
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setModalOpen(false); setFormError(''); }}
                  disabled={createMutation.isPending}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 btn-sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => { setModalOpen(false); setFormError(''); }} />
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-2">Удалить анонс?</h3>
            <p className="text-sm text-base-content/70 mb-6">
              Вы уверены, что хотите удалить анонс <strong>«{deleteTarget.title}»</strong>?
            </p>
            {deleteMutation.error && (
              <div className="alert alert-error text-xs mb-3">
                <span>{deleteMutation.error.message}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Отмена
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Удалить'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)} />
        </div>
      )}
    </div>
  );
}
