import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowLeft, Trash2, Check, FileQuestion, Settings, FileText, HelpCircle, Pencil, Layers, Play, Puzzle, MessageCircle, ListChecks, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLessonDetails, useInvalidate } from '../../queries.js';
import { api, uploadToPresignedUrl } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

// 'riddle' и 'open' на бэке проверяются одинаково (текст без учёта регистра) —
// два значения существуют только чтобы методист различал их в списке, разница
// не в логике, а в том, как сформулирован вопрос (загадка vs прямой вопрос).
const QUESTION_TYPES = [
  { value: 'choice', labelKey: 'editor.type_choice', icon: ListChecks },
  { value: 'riddle', labelKey: 'editor.type_riddle', icon: Puzzle },
  { value: 'open', labelKey: 'editor.type_open', icon: MessageCircle },
];

const makeChoiceSchema = (t) => z.object({
  questionText: z.string().trim().min(1, t('methodist.editor.question_required')).max(1000),
  optionA: z.string().trim().min(1, t('methodist.editor.option_required', { letter: 'A' })).max(300),
  optionB: z.string().trim().min(1, t('methodist.editor.option_required', { letter: 'B' })).max(300),
  optionC: z.string().trim().min(1, t('methodist.editor.option_required', { letter: 'C' })).max(300),
  optionD: z.string().trim().min(1, t('methodist.editor.option_required', { letter: 'D' })).max(300),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
});
const makeTextSchema = (t) => z.object({
  questionText: z.string().trim().min(1, t('methodist.editor.question_required')).max(1000),
  correctTextAnswer: z.string().trim().min(1, t('methodist.editor.correct_answer_required')).max(300),
});

// Схема формы вопроса зависит от выбранного типа — обычный статический
// resolver zodResolver() тут не подходит, поэтому свой маленький резолвер.
const makeQuestionResolver = (t) => (values) => {
  const schema = values.questionType === 'choice' ? makeChoiceSchema(t) : makeTextSchema(t);
  const result = schema.safeParse(values);
  if (result.success) return { values: { ...values, ...result.data }, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    errors[issue.path[0]] = { type: 'manual', message: issue.message };
  }
  return { values: {}, errors };
};

/** Из строки таблицы/API (snake_case или camelCase) — плоский payload под create/update. */
function questionPayload(q) {
  const questionType = q.question_type || q.questionType || 'choice';
  if (questionType === 'choice') {
    return {
      questionType,
      questionText: q.question_text ?? q.questionText,
      optionA: q.option_a ?? q.optionA,
      optionB: q.option_b ?? q.optionB,
      optionC: q.option_c ?? q.optionC,
      optionD: q.option_d ?? q.optionD,
      correctAnswer: q.correct_answer ?? q.correctAnswer,
    };
  }
  return {
    questionType,
    questionText: q.question_text ?? q.questionText,
    correctTextAnswer: q.correct_text_answer ?? q.correctTextAnswer,
  };
}

// isPractical — Aqlli tahlil (AI-review, Groq) shu description'ga qarab
// tekshiradi (backend: content.schemas.js, xuddi shu qoida). Bo'sh bo'lsa
// AI vazifa nima ekanini bilmaydi, faqat kodning umumiy sifatini baholaydi.
const makeLessonSettingsSchema = (t, isPractical) => z.object({
  title: z.string().trim().min(1, t('methodist.editor.title_required')).max(200),
  description: isPractical
    ? z.string().trim().min(1, t('methodist.editor.description_required_practical')).max(4000)
    : z.string().trim().max(4000).optional(),
  instruction: z.string().trim().max(2000).optional(),
  coinReward: z.coerce.number().int().min(0).default(0),
  videoUrl: z.string().trim().url(t('methodist.editor.invalid_url')).or(z.literal('')).optional(),
});

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_STYLES = {
  A: { bg: 'rgba(220, 38, 38, 0.06)', border: 'rgba(220, 38, 38, 0.15)', text: '#DC2626' },
  B: { bg: 'rgba(37, 99, 235, 0.06)', border: 'rgba(37, 99, 235, 0.15)', text: '#2563EB' },
  C: { bg: 'rgba(217, 119, 6, 0.06)', border: 'rgba(217, 119, 6, 0.15)', text: '#D97706' },
  D: { bg: 'rgba(220, 38, 38, 0.06)', border: 'rgba(220, 38, 38, 0.15)', text: '#dc2626' },
};

const EMPTY_QUESTION_FORM = {
  questionType: 'choice',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  correctTextAnswer: '',
};

function LessonEditorView() {
  const { t } = useTranslation();
  const { lessonId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useLessonDetails(lessonId);
  const lesson = data?.data;
  const isTest = lesson?.lesson_type === 'test';
  const isPractical = lesson?.lesson_type === 'practical';
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [questionCount, setQuestionCount] = useState(1);

  // Требования практического задания (shartlar) — локально редактируются,
  // сохраняются кнопкой «Сохранить требования».
  const [reqs, setReqs] = useState([]);
  const [removedReqIds, setRemovedReqIds] = useState([]);
  const [reqBusy, setReqBusy] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: makeQuestionResolver(t),
    defaultValues: EMPTY_QUESTION_FORM,
  });
  const questionType = watch('questionType');

  const { register: regSettings, handleSubmit: handleSettingsSubmit, reset: resetSettings, formState: { errors: settingsErrors } } = useForm({
    resolver: zodResolver(makeLessonSettingsSchema(t, isPractical)),
  });

  const questions = lesson?.questions || [];
  const requirements = lesson?.requirements || [];

  // Инициализируем требования из сервера после каждой загрузки урока.
  useEffect(() => {
    setReqs(requirements.map((r) => ({
      id: r.id,
      text: r.text,
      points: r.points ?? 0,
      origText: r.text,
      origPoints: r.points ?? 0,
    })));
    setRemovedReqIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  const reqTotal = reqs.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

  const addRequirement = () => setReqs((prev) => [...prev, { _new: true, text: '', points: 0 }]);

  const updateReq = (index, field, value) => {
    setReqs((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeReq = (index) => {
    setReqs((prev) => {
      const r = prev[index];
      if (r.id && !r._new) setRemovedReqIds((ids) => [...ids, r.id]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const saveRequirements = async () => {
    setErr(''); setReqBusy(true);
    try {
      for (const id of removedReqIds) {
        await api.methodistDeleteRequirement(token, id);
      }
      for (const r of reqs) {
        const text = r.text.trim();
        const points = Math.max(0, Number(r.points) || 0);
        if (!text) continue;
        if (!r.id || r._new) {
          await api.methodistCreateRequirement(token, { lessonId, text, points });
        } else if (text !== r.origText || points !== r.origPoints) {
          await api.methodistUpdateRequirement(token, r.id, { text, points });
        }
      }
      invalidate('lesson', lessonId);
    } catch (e) { setErr(e.message); } finally { setReqBusy(false); }
  };


  const openAdd = () => {
    setEditingId(null);
    reset(EMPTY_QUESTION_FORM);
  };

  const openEdit = (q) => {
    setEditingId(q.id);
    reset({
      ...EMPTY_QUESTION_FORM,
      ...questionPayload(q),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSettings = () => {
    resetSettings({
      title: lesson?.title || '',
      description: lesson?.description || '',
      instruction: lesson?.instruction || '',
      coinReward: lesson?.coin_reward || lesson?.coinReward || 0,
      videoUrl: lesson?.video_url || lesson?.videoUrl || '',
    });
    setErr('');
    setSettingsOpen(true);
  };

  const onSubmit = async (formData) => {
    setErr(''); setBusy(true);
    try {
      const payload = questionPayload(formData);
      if (editingId) {
        await api.methodistUpdateQuestion(token, editingId, payload);
      } else {
        await api.methodistCreateQuestion(token, { lessonId, ...payload });
      }
      invalidate('lesson', lessonId);
      reset(EMPTY_QUESTION_FORM);
      setEditingId(null);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const onSaveSettings = async (formData) => {
    setErr(''); setBusy(true);
    try {
      await api.methodistUpdateLesson(token, lessonId, formData);
      invalidate('lesson', lessonId);
      setSettingsOpen(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doUpload = async (file) => {
    setErr('');
    setUploading(true);
    try {
      const d = await api.methodistLessonUploadUrl(token, lessonId, file.name, file.type || 'application/octet-stream');
      await uploadToPresignedUrl(d.data.uploadUrl, file);
      await api.methodistUpdateLesson(token, lessonId, { fileKey: d.data.fileKey });
      invalidate('lesson', lessonId);
    } catch (err) {
      setErr(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doUpload(file);
    e.target.value = '';
  };

  const deleteQ = async (id) => {
    setErr('');
    try {
      await api.methodistDeleteQuestion(token, id);
      invalidate('lesson', lessonId);
    } catch (e) { setErr(e.message); }
  };

  const moveQuestion = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setErr('');
    setBusy(true);
    try {
      const q1 = questions[index];
      const q2 = questions[targetIndex];

      await Promise.all([
        api.methodistUpdateQuestion(token, q1.id, questionPayload(q2)),
        api.methodistUpdateQuestion(token, q2.id, questionPayload(q1)),
      ]);

      invalidate('lesson', lessonId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addBatch = async () => {
    setErr(''); setBusy(true);
    try {
      const qs = [];
      for (let i = 0; i < questionCount; i++) {
        qs.push({
          lessonId,
          questionType: 'choice',
          questionText: `${t('methodist.editor.question_prefix')} ${questions.length + i + 1}`,
          optionA: t('methodist.editor.option_label', { letter: 'A' }),
          optionB: t('methodist.editor.option_label', { letter: 'B' }),
          optionC: t('methodist.editor.option_label', { letter: 'C' }),
          optionD: t('methodist.editor.option_label', { letter: 'D' }),
          correctAnswer: 'A',
        });
      }
      await api.methodistCreateQuestionsBatch(token, qs);
      invalidate('lesson', lessonId);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (isLoading) return (
    <div className="mt-page-bg p-6">
      <SkeletonTable rows={5} cols={5} />
    </div>
  );

  if (error) return (
    <div className="mt-page-bg space-y-6 p-6">
      <div className="mt-fade-in">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--mt-text-muted)] mb-3">
          <button onClick={() => navigate(-1)} className="hover:text-[var(--mt-accent)] transition-colors font-medium cursor-pointer">← {t('methodist.common.back')}</button>
          <span className="opacity-50">/</span>
          <span className="text-[var(--mt-text)] font-semibold">{t('methodist.editor.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--mt-text-muted)]" />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.editor.title')}</h1>
            <p className="text-[13px] text-[var(--mt-text-muted)]">{t('methodist.editor.subtitle')}</p>
          </div>
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
      <div className="mt-fade-in">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--mt-text-muted)] mb-3">
          <button onClick={() => navigate(-1)} className="hover:text-[var(--mt-accent)] transition-colors font-medium cursor-pointer">← {t('methodist.common.back')}</button>
          <span className="opacity-50">/</span>
          <span className="text-[var(--mt-text)] font-semibold">{t('methodist.editor.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openSettings}
            className="w-10 h-10 rounded-[10px] bg-[var(--surface-hover)] grid place-items-center hover:bg-base-300 transition-colors"
            title={t('methodist.editor.settings_tooltip')}
          >
            <Settings size={18} className="text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--mt-surface-warm)] hover:bg-[var(--mt-accent-light)] transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--mt-text-muted)]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-extrabold text-[var(--mt-text)] tracking-tight truncate">{lesson?.title || t('methodist.editor.title')}</h1>
            <p className="text-[13px] text-[var(--mt-text-muted)]">{isTest ? t('methodist.editor.test_count', { count: questions.length }) : t('methodist.editor.type_practical')}</p>
          </div>
          <LanguageSwitcher />
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

      {/* Video lesson details */}
      {(lesson?.video_url || lesson?.videoUrl) && (
        <div className="card bg-[#F6FBEA] border border-[#E6EDD8] hover:shadow-sm transition-shadow">
          <div className="card-body p-4 flex flex-row items-center gap-3">
            <div className="p-2.5 bg-white rounded-lg text-[#ffffff]">
              <Play size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t('methodist.editor.video_label')}</h3>
              <a href={lesson?.video_url || lesson?.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-medium break-all">
                {lesson?.video_url || lesson?.videoUrl}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Description for practical tasks */}
      {isPractical && lesson?.description && (
        <div className="mt-card mt-animate-in mt-stagger-1" style={{ borderLeftColor: '#D97706' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: 'rgba(217,119,6,0.12)' }}>
              <FileQuestion size={14} className="text-[var(--mt-warning)]" />
            </div>
            <h3 className="text-[13px] font-bold text-[var(--mt-text)]">{t('methodist.editor.task_desc')}</h3>
          </div>
          <p className="text-[13px] text-[var(--mt-text-muted)] whitespace-pre-wrap leading-relaxed pl-[42px]">{lesson.description}</p>
        </div>
      )}

      {/* Practical task attachment */}
      {isPractical && (
        <div
          className={`card bg-white border transition-shadow ${dragOver ? 'border-[#7CB342] border-dashed bg-[#FAFDF3]' : 'border-[#E6EDD8] hover:shadow-sm'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) doUpload(f);
          }}
        >
          <div className="card-body p-4 flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#F6FBEA] rounded-lg text-[#ffffff]">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('methodist.editor.attachment_label')}</h3>
                {(lesson?.file_key || lesson?.fileKey) ? (
                  <p className="text-xs opacity-60 mt-0.5 break-all max-w-xs md:max-w-md">
                    {String(lesson?.file_key || lesson?.fileKey).split('methodist./').pop()}
                  </p>
                ) : (
                  <p className="text-xs opacity-40 mt-0.5">{t('methodist.editor.no_file')}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <input
                type="file"
                className="file-input file-input-bordered file-input-sm max-w-[240px]"
                accept=".pdf,.zip,.rar,.tar,.gz,.7z"
                disabled={uploading}
                onChange={handleFileUpload}
              />
              <span className="text-[11px] opacity-40">{t('methodist.editor.upload_drop_hint')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Instruction */}
      {lesson?.instruction && (
        <div className="mt-card mt-animate-in mt-stagger-2" style={{ borderLeftColor: '#2563EB' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: 'rgba(37,99,235,0.12)' }}>
              <HelpCircle size={14} className="text-[#2563EB]" />
            </div>
            <h3 className="text-[13px] font-bold text-[var(--mt-text)]">{t('methodist.editor.instruction')}</h3>
          </div>
          <p className="text-[13px] text-[var(--mt-text-muted)] whitespace-pre-wrap leading-relaxed pl-[42px]">{lesson.instruction}</p>
        </div>
      )}

      {/* Requirements for practical tasks */}
      {isPractical && (
        <div className="mt-card-flat mt-animate-in mt-stagger-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'rgba(217,119,6,0.12)' }}>
                <ListChecks size={16} className="text-[var(--mt-warning)]" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[var(--mt-text)]">{t('methodist.editor.requirements_title')}</h3>
                <p className="text-[12px] text-[var(--mt-text-muted)]">{t('methodist.editor.requirements_hint')}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold" style={{ background: 'var(--mt-accent-light)', color: 'var(--mt-accent)' }}>
              <Check size={13} /> {t('methodist.editor.requirements_total', { points: reqTotal })}
            </div>
          </div>

          {reqs.length === 0 ? (
            <div className="mt-3">
              <div className="mt-empty py-8">
                <div className="w-12 h-12 rounded-2xl grid place-items-center mb-2.5" style={{ background: 'rgba(217,119,6,0.1)' }}>
                  <ListChecks size={22} className="text-[var(--mt-warning)]" />
                </div>
                <p className="text-[13px] text-[var(--mt-text-muted)] font-medium">{t('methodist.editor.no_requirements')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {reqs.map((r, idx) => (
                <div key={r.id || `new-${idx}`} className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={r.text}
                    onChange={(e) => updateReq(idx, 'text', e.target.value)}
                    placeholder={t('methodist.editor.requirement_text')}
                    className="mt-input flex-1"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={r.points}
                      onChange={(e) => updateReq(idx, 'points', e.target.value)}
                      className="mt-input w-20 text-center"
                      title={t('methodist.editor.requirement_points')}
                    />
                    <span className="text-[11px] text-[var(--mt-text-muted)] font-semibold whitespace-nowrap">{t('methodist.editor.requirement_points')}</span>
                  </div>
                  <button
                    className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[rgba(220,38,38,0.08)] transition-colors shrink-0"
                    onClick={() => removeReq(idx)}
                    title={t('methodist.common.delete')}
                  >
                    <Trash2 size={14} className="text-[var(--mt-danger)]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-4">
            <button className="mt-btn-ghost" onClick={addRequirement} disabled={reqBusy}>
              <Plus size={14} /> {t('methodist.editor.add_requirement')}
            </button>
            <button className="mt-btn-primary" onClick={saveRequirements} disabled={reqBusy}>
              {reqBusy ? <span className="loading loading-spinner loading-xs" /> : <Check size={14} />} {t('methodist.editor.save_requirements')}
            </button>
          </div>
        </div>
      )}

      {/* Add question form */}
      {isTest && (
      <div className="mt-card-flat mt-animate-in mt-stagger-4">
        <div className="mt-section-header">
          <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'var(--mt-accent-light)' }}>
            {editingId ? <Pencil size={16} className="text-[var(--mt-accent)]" /> : <Plus size={16} className="text-[var(--mt-accent)]" />}
          </div>
          <h3 className="text-[14px] font-bold text-[var(--mt-text)]">
            {editingId ? t('methodist.editor.edit_question') : t('methodist.editor.add_question')}
          </h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <span className="label-text mb-1.5 font-semibold text-[12px] text-[var(--text-secondary)] block">{t('methodist.editor.question_type')}</span>
            <div className="inline-flex p-1 rounded-[12px] bg-[var(--surface-hover)] gap-1">
              {QUESTION_TYPES.map(({ value, labelKey, icon: Icon }) => {
                const active = questionType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('questionType', value, { shouldValidate: true })}
                    className={`flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[12.5px] font-semibold transition-all ${
                      active ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon size={14} /> {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="form-control w-full">
            <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.editor.question_text')}</span>
            <input
              type="text"
              {...register('questionText')}
              placeholder={t('methodist.editor.question_placeholder')}
              className={`mt-input ${errors.questionText ? 'border-[var(--mt-danger)]' : ''}`}
            />
            {errors.questionText && <span className="text-[11px] text-[var(--mt-danger)] mt-1 block">{errors.questionText.message}</span>}
          </label>

          {questionType === 'choice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPTION_LETTERS.map((letter) => {
                const s = OPTION_STYLES[letter];
                return (
                  <label key={letter} className="form-control w-full">
                    <span className="text-[12px] font-semibold mb-1.5 block" style={{ color: s.text }}>{t('methodist.editor.option_label', { letter })}</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold opacity-60" style={{ color: s.text }}>{letter})</span>
                      <input
                        type="text"
                        {...register(`option${letter}`)}
                        placeholder={t('methodist.editor.option_label', { letter })}
                        className={`mt-input pl-8 ${errors[`option${letter}`] ? 'border-[var(--mt-danger)]' : ''}`}
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {questionType === 'choice' ? (
            <label className="form-control w-full max-w-xs">
              <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.editor.correct_answer')}</span>
              <select {...register('correctAnswer')} className="mt-select">
                {OPTION_LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          ) : (
            <label className="form-control w-full">
              <span className="text-[12px] font-semibold text-[var(--mt-text-muted)] mb-1.5 block">{t('methodist.editor.correct_answer')}</span>
              <input
                type="text"
                {...register('correctTextAnswer')}
                placeholder={t('methodist.editor.correct_answer_required')}
                className={`mt-input ${errors.correctTextAnswer ? 'border-[var(--mt-danger)]' : ''}`}
              />
              {errors.correctTextAnswer && <span className="text-[11px] text-[var(--mt-danger)] mt-1 block">{errors.correctTextAnswer.message}</span>}
            </label>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="mt-btn-primary" disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : editingId ? t('methodist.common.save') : t('methodist.editor.add_question')}
            </button>
            {editingId && (
              <button type="button" className="mt-btn-ghost" onClick={openAdd}>
                {t('methodist.common.cancel')}
              </button>
            )}
          </div>
        </form>
      </div>
      )}

      {/* Batch create */}
      {isTest && (
      <div className="mt-card-flat mt-animate-in mt-stagger-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)' }}>
            <Layers size={16} className="text-[var(--mt-accent)]" />
          </div>
          <span className="text-[13px] font-semibold text-[var(--mt-text)]">{t('methodist.editor.batch_title')}</span>
        </div>
        <div className="flex items-center gap-3 mt-3 pl-[44px]">
          <input
            type="number"
            min={1}
            max={20}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="mt-input w-20 text-center"
          />
          <span className="text-[12px] text-[var(--mt-text-muted)]">{t('methodist.editor.empty_questions')}</span>
          <button
            className="mt-btn-ghost"
            onClick={addBatch}
            disabled={busy}
          >
            <Plus size={14} /> {t('methodist.common.create')}
          </button>
        </div>
      </div>
      )}

      {/* Questions list */}
      {isTest && (
      <div className="space-y-3 mt-animate-in mt-stagger-6">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-bold text-[var(--mt-text)]">{t('methodist.editor.questions')}</h3>
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-bold tabular-nums" style={{ background: 'var(--mt-accent-light)', color: 'var(--mt-accent)' }}>
            {questions.length}
          </span>
        </div>
        {questions.length === 0 ? (
          <div className="mt-card-flat">
            <div className="mt-empty py-10">
              <div className="w-14 h-14 rounded-2xl grid place-items-center mb-3" style={{ background: 'var(--mt-accent-light)' }}>
                <FileQuestion size={24} className="text-[var(--mt-accent)]" />
              </div>
              <p className="text-[13px] text-[var(--mt-text-muted)] font-medium">{t('methodist.editor.no_questions')}</p>
            </div>
          </div>
        ) : (
          questions.map((q, idx) => {
            const qType = q.question_type || q.questionType || 'choice';
            return (
            <div
              key={q.id}
              className={`mt-question-card mt-animate-in ${editingId === q.id ? 'editing' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-[12px] font-bold tabular-nums mt-0.5"
                  style={{ background: 'var(--mt-surface-warm)', color: 'var(--mt-text-muted)' }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: 'var(--mt-accent-light)', color: 'var(--mt-accent)' }}
                    >
                      {qType === 'choice' ? t('methodist.editor.type_choice') : qType === 'riddle' ? t('methodist.editor.type_riddle') : t('methodist.editor.type_open')}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--mt-text)] mb-3 leading-relaxed">{q.question_text}</p>
                  {qType === 'choice' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {OPTION_LETTERS.map((letter) => {
                        const val = q[`option_${letter.toLowerCase()}`] || q[`option${letter}`];
                        const isCorrect = (q.correct_answer || q.correctAnswer) === letter;
                        const s = OPTION_STYLES[letter];
                        return (
                          <div
                            key={letter}
                            className={`mt-option-pill ${isCorrect ? 'mt-option-correct' : ''}`}
                            style={!isCorrect ? { background: s.bg, border: `1.5px solid ${s.border}`, color: 'var(--mt-text-muted)' } : {}}
                          >
                            {isCorrect && <Check size={12} className="text-[var(--mt-success)] shrink-0" />}
                            <span className="font-bold text-[11px]" style={{ color: s.text }}>{letter})</span>
                            <span className="truncate">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-option-pill mt-option-correct" style={{ background: 'rgba(220, 38, 38,0.06)', border: '1.5px solid rgba(220, 38, 38,0.15)' }}>
                      <Check size={12} className="text-[var(--mt-success)] shrink-0" />
                      <span className="truncate">{q.correct_text_answer || q.correctTextAnswer}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[var(--mt-accent-light)] transition-colors"
                    onClick={() => openEdit(q)}
                    title={t('methodist.common.edit')}
                  >
                    <Pencil size={13} className="text-[var(--mt-accent)]" />
                  </button>
                  <button
                    className="w-8 h-8 rounded-lg grid place-items-center hover:bg-[rgba(220,38,38,0.08)] transition-colors"
                    onClick={() => { if (window.confirm(t('methodist.editor.delete_confirm'))) deleteQ(q.id); }}
                    title={t('methodist.common.delete')}
                  >
                    <Trash2 size={13} className="text-[var(--mt-danger)]" />
                  </button>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
      )}

      {settingsOpen && (
        <div className="modal modal-open">
          <div className="modal-box border border-[#E6EDD8] shadow-xl bg-white max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{t('methodist.editor.settings_title')}</h3>
              <button onClick={() => setSettingsOpen(false)} className="btn btn-ghost btn-sm btn-circle" disabled={busy}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSettingsSubmit(onSaveSettings)} className="space-y-4 mt-4">
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">{t('methodist.editor.settings_name')}</span>
                <input type="text" {...regSettings('title')} className={`input input-bordered w-full ${settingsErrors.title ? 'input-error' : ''}`} />
                {settingsErrors.title && <span className="text-xs text-error mt-1">{settingsErrors.title.message}</span>}
              </label>

              {isPractical && (
                <label className="form-control w-full">
                  <span className="label-text mb-1 font-medium">{t('methodist.editor.task_desc')} <span className="text-error">*</span></span>
                  <textarea {...regSettings('description')} className={`textarea textarea-bordered w-full ${settingsErrors.description ? 'textarea-error' : ''}`} rows={3} />
                  {settingsErrors.description && <span className="text-xs text-error mt-1">{settingsErrors.description.message}</span>}
                </label>
              )}

              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">{t('methodist.editor.instruction')}</span>
                <textarea {...regSettings('instruction')} className="textarea textarea-bordered w-full" rows={2} />
              </label>

              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">{t('methodist.editor.video_url_label')}</span>
                <input type="text" {...regSettings('videoUrl')} placeholder="https://youtube.com/watch?v=..." className={`input input-bordered w-full ${settingsErrors.videoUrl ? 'input-error' : ''}`} />
                {settingsErrors.videoUrl && <span className="text-xs text-error mt-1">{settingsErrors.videoUrl.message}</span>}
              </label>

              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">{t('methodist.editor.coin_label')}</span>
                <input type="number" {...regSettings('coinReward')} className="input input-bordered w-full" />
              </label>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen(false)} disabled={busy}>{t('methodist.common.cancel')}</button>
                <button type="submit" className="btn btn-primary font-bold" disabled={busy}>
                  {busy ? <span className="loading loading-spinner loading-xs" /> : t('methodist.common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LessonEditor() {
  return (
    <LessonEditorView />
  );
}
