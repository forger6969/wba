import { useHomeworkDetail, useTestDetail } from '../queries.js';
import { dateShort, gradePercent } from '../format.js';
import Icon from './Icons.jsx';
import { ProgressBar } from './ui.jsx';
import { useI18n, fmt as fmtStr } from '../i18n/index.jsx';

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <span className="loading loading-dots loading-md text-primary" />
    </div>
  );
}

function HomeworkDetail({ data }) {
  const { t } = useI18n();
  const pct = gradePercent(data.score, data.maxScore, 'hw');
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon name="document-text" className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold">{data.title}</h3>
          <p className="text-sm opacity-50 flex items-center gap-2 mt-0.5">
            {data.groupName && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'rgba(59,130,246,.1)', color: '#3b82f6' }}>
                {data.groupName}
              </span>
            )}
            <span>{dateShort(data.gradedAt)}</span>
          </p>
        </div>
      </div>

      {data.description && (
        <div className="bg-base-200/50 rounded-xl p-4">
          <p className="text-xs font-semibold opacity-50 mb-1">{t.gd.taskCondition}</p>
          <p className="text-sm leading-relaxed">{data.description}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs opacity-50 mb-1">
            <span>{t.gd.score}</span>
            <span className="font-bold" style={{ color }}>{data.score} / {data.maxScore}</span>
          </div>
          <ProgressBar value={pct} color={color} height={8} />
        </div>
      </div>

      {data.comment && (
        <div className={`flex items-start gap-3 p-3 rounded-xl ${pct >= 80 ? 'bg-success/5 border border-success/20' : 'bg-warning/5 border border-warning/20'}`}>
          <Icon name={pct >= 80 ? 'check-circle' : 'information-circle'} className="w-5 h-5 shrink-0 mt-0.5" style={{ color: pct >= 80 ? '#22c55e' : '#f59e0b' }} />
          <div>
            <p className="text-xs font-semibold opacity-60 mb-0.5">{t.gd.mentorComment}</p>
            <p className="text-sm">{data.comment}</p>
          </div>
        </div>
      )}

      {data.mistakes?.length > 0 && (
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Icon name="alert" className="w-4 h-4 text-error" />
            {fmtStr(t.gd.mistakes, { count: data.mistakes.length })}
          </h4>
          <div className="space-y-2">
            {data.mistakes.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-error/5 border border-error/15">
                <p className="text-sm font-semibold mb-1">{m.question}</p>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-2">
                    <Icon name="x-circle" className="w-3.5 h-3.5 text-error shrink-0" />
                    <span className="opacity-60">{t.gd.yourAnswer}</span>
                    <span className="text-error">{m.studentAnswer}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name="check-circle" className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="opacity-60">{t.gd.correct}</span>
                    <span className="text-success">{m.correctAnswer}</span>
                  </p>
                  {m.comment && (
                    <p className="flex items-center gap-2 mt-1 opacity-50">
                      <Icon name="information-circle" className="w-3.5 h-3.5 shrink-0" />
                      {m.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pct >= 90 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20">
          <Icon name="sparkles" className="w-5 h-5 text-success shrink-0" />
          <p className="text-sm">{t.gd.excellent}</p>
        </div>
      )}
    </div>
  );
}

function TestDetail({ data }) {
  const { t } = useI18n();
  const pct = gradePercent(data.score, data.maxScore, 'test');
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon name="academic" className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold">{data.title}</h3>
          <p className="text-sm opacity-50 flex items-center gap-2 mt-0.5">
            {data.groupName && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'rgba(168,85,247,.1)', color: '#a855f7' }}>
                {data.groupName}
              </span>
            )}
            <span>{dateShort(data.finishedAt)}</span>
            {data.durationMin && <span className="opacity-40">· {fmtStr(t.gd.min, { min: data.durationMin })}</span>}
          </p>
        </div>
      </div>

      {data.totalQuestions != null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-base-200/50">
            <p className="text-xl font-extrabold">{data.totalQuestions}</p>
            <p className="text-[11px] opacity-40">{t.gd.total}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-success/5">
            <p className="text-xl font-extrabold text-success">{data.correctCount}</p>
            <p className="text-[11px] opacity-40">{t.gd.correctCount}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-error/5">
            <p className="text-xl font-extrabold text-error">{data.wrongCount}</p>
            <p className="text-[11px] opacity-40">{t.gd.wrongCount}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs opacity-50 mb-1">
          <span>{t.gd.result}</span>
          <span className="font-bold" style={{ color }}>{pct}%</span>
        </div>
        <ProgressBar value={pct} color={color} height={8} />
      </div>

      {data.wrongAnswers?.length > 0 && (
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Icon name="x-circle" className="w-4 h-4 text-error" />
            {fmtStr(t.gd.wrongAnswers, { count: data.wrongAnswers.length })}
          </h4>
          <div className="space-y-2">
            {data.wrongAnswers.map((q, i) => (
              <div key={i} className="p-3 rounded-xl bg-error/5 border border-error/15">
                <p className="text-sm font-semibold mb-2">{i + 1}. {q.question}</p>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-2">
                    <Icon name="x-circle" className="w-3.5 h-3.5 text-error shrink-0" />
                    <span className="opacity-60">{t.gd.yourAnswer}</span>
                    <span className="text-error font-medium">{q.studentAnswer}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name="check-circle" className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="opacity-60">{t.gd.correct}</span>
                    <span className="text-success font-medium">{q.correctAnswer}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.correctAnswers?.length > 0 && (
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Icon name="check-circle" className="w-4 h-4 text-success" />
            {fmtStr(t.gd.correctAnswers, { count: data.correctAnswers.length })}
          </h4>
          <div className="space-y-1.5">
            {data.correctAnswers.map((q, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 text-sm">
                <Icon name="check" className="w-4 h-4 text-success shrink-0" strokeWidth={2.5} />
                <span className="truncate opacity-70">{q.question}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GradeDetail({ type, id, item, onClose }) {
  const { t } = useI18n();
  const isHomework = type === 'hw';
  const homeworkQuery = useHomeworkDetail(isHomework ? id : null);
  const testQuery = useTestDetail(isHomework ? null : id);
  const { data: response, isLoading, error } = isHomework ? homeworkQuery : testQuery;
  const data = response?.data;

  // API возвращает { data: {...} }; в списке же строка — без обёртки.
  // Если detail-эндпоинт недоступен (нет id в списке, 404) — показываем
  // read-only вариант из данных строки (score/maxScore достаточно для %).
  const detail = data?.data ?? item;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Icon name={isHomework ? 'document-text' : 'academic'} className="w-5 h-5 text-primary" />
            {isHomework ? t.gd.homework : t.gd.testResult}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <Icon name="xmark" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && <Loading />}
          {error && !item && (
            <div className="text-center py-8">
              <Icon name="exclamation-circle" className="w-10 h-10 text-error mx-auto mb-3" />
              <p className="text-sm opacity-60">{error.message}</p>
            </div>
          )}
          {detail && (isHomework ? <HomeworkDetail data={detail} /> : <TestDetail data={detail} />)}
        </div>
      </div>
    </div>
  );
}
