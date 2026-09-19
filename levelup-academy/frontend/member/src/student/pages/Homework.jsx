import { useEffect, useState } from 'react';
import { BookOpen, Link2, Coins } from 'lucide-react';
import { api, uploadToPresignedUrl } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { PageHeader, Skeleton, EmptyState, ErrorState, Modal, Pill, Button, CountUp, IconTile, Dropzone, C } from '../components/ui.jsx';
import { fmtDateTime, deadlineLabel } from '../format.js';
import { fmt, useI18n } from '../../i18n/index.jsx';

function StatusPill({ hw }) {
  const { lang, t } = useI18n();
  if (hw.submission_status === 'graded')
    return <Pill hue="teal">{fmt(t.homework.graded, { score: hw.score, max: hw.max_score })}</Pill>;
  if (hw.submission_status === 'late') return <Pill hue="coral">{t.homework.late}</Pill>;
  if (hw.submission_status === 'submitted') return <Pill hue="lime">{t.homework.checking}</Pill>;
  const overdue = hw.deadline && Date.now() > new Date(hw.deadline).getTime();
  return overdue ? <Pill hue="coral">{t.homework.overdue}</Pill> : <Pill hue="muted">{deadlineLabel(hw.deadline, lang)}</Pill>;
}

export default function Homework() {
  const toast = useToast();
  const { lang, t } = useI18n();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null); // ДЗ в модалке сдачи
  const [file, setFile] = useState(null);
  const [link, setLink] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError(null);
    return api
      .homework()
      .then((d) => setList(d.data))
      .catch((err) => { setError(err); toast(err.message, 'error'); });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSubmit = (hw) => {
    setActive(hw);
    setFile(null);
    setLink('');
    setComment(hw.text_answer || '');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file && !link.trim() && !comment.trim()) {
      toast(t.homework.attachRequired, 'error');
      return;
    }
    setBusy(true);
    try {
      let fileKey;
      if (file) {
        const d = await api.homeworkUploadUrl(active.id, file.name, file.type || 'application/octet-stream');
        await uploadToPresignedUrl(d.data.uploadUrl, file);
        fileKey = d.data.fileKey;
      }
      // Отдельного поля под ссылку в базе нет — кладём её в text_answer
      // вместе с комментарием.
      const textAnswer = [link.trim(), comment.trim()].filter(Boolean).join('\n\n');
      await api.submitHomework(active.id, {
        ...(fileKey ? { fileKey } : {}),
        ...(textAnswer ? { textAnswer } : {}),
      });
      toast(t.homework.sent, 'success');
      setActive(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t.homework.title} subtitle={t.homework.subtitle} icon={BookOpen} hue="violet" />

      {error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !list ? (
        <Skeleton h={80} count={4} />
      ) : list.length === 0 ? (
        <div className="k-card">
          <EmptyState icon={BookOpen} title={t.homework.empty} text={t.homework.emptyText} />
        </div>
      ) : (
        <div className="k-card divide-y" style={{ borderColor: C.limeLine }}>
          {list.map((hw, i) => {
            const canSubmit = hw.submission_status !== 'graded';
            return (
              <div
                key={hw.id}
                className="k-pop-in flex items-center gap-3 px-4 py-3.5 flex-wrap sm:flex-nowrap"
                style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}
              >
                <IconTile icon={BookOpen} hue="coral" size={42} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-extrabold truncate" style={{ color: C.text }}>{hw.title}</div>
                  <div className="text-[13px] font-bold mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: C.muted }}>
                    <span>{fmt(t.homework.meta, { date: fmtDateTime(hw.deadline, lang), max: hw.max_score })}</span>
                    {hw.coin_reward > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: C.limeDk }}>
                        · <Coins size={12} /> {fmt(t.homework.reward, { n: hw.coin_reward })}
                      </span>
                    )}
                  </div>
                </div>
                <StatusPill hw={hw} />
                {canSubmit && (
                  <Button size="sm" hue="lime" onClick={() => openSubmit(hw)}>
                    {hw.submission_status ? t.homework.resubmit : t.homework.submit}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <Modal title={fmt(t.homework.modalTitle, { title: active.title })} onClose={() => !busy && setActive(null)}>
          {active.description && (
            <p className="text-sm font-semibold mb-4" style={{ color: C.muted }}>{active.description}</p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-bold mb-1.5" style={{ color: C.text }}>{t.homework.fileLabel}</label>
              <Dropzone file={file} onFileChange={setFile} disabled={busy} />
            </div>

            <div className="flex items-center gap-3">
              <span className="flex-1 h-px" style={{ background: C.line }} />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.muted }}>{t.homework.or}</span>
              <span className="flex-1 h-px" style={{ background: C.line }} />
            </div>

            <div>
              <label htmlFor="hw-link" className="flex items-center gap-1.5 text-[13px] font-bold mb-1.5" style={{ color: C.text }}>
                <Link2 size={13} /> {t.homework.linkLabel}
              </label>
              <input
                id="hw-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                maxLength={2000}
                className="input w-full text-base sm:text-sm rounded-2xl border-2 focus:outline-none"
                style={{ borderColor: C.line, background: C.bg, color: C.text }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.lime; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.line; }}
              />
            </div>

            <div>
              <label htmlFor="hw-comment" className="block text-[13px] font-bold mb-1.5" style={{ color: C.text }}>
                {t.homework.commentLabel}
              </label>
              <textarea
                id="hw-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.homework.commentPlaceholder}
                maxLength={10000}
                rows={3}
                className="textarea w-full text-base sm:text-sm resize-y rounded-2xl border-2 focus:outline-none"
                style={{ borderColor: C.line, background: C.bg }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.lime; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.line; }}
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                className="k-press-sm px-5 py-2.5 rounded-2xl text-[14.5px] font-extrabold"
                style={{ color: C.muted }}
                onClick={() => setActive(null)}
                disabled={busy}
              >
                {t.homework.cancel}
              </button>
              <Button disabled={busy}>
                {busy ? <span className="loading loading-spinner loading-sm" /> : t.homework.send}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
