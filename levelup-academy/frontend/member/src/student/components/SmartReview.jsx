import { Brain, TrendingUp, Lightbulb, Sparkles } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useI18n, fmt } from '../../i18n/index.jsx';
import { C, alpha, IconTile } from './ui.jsx';

/**
 * «Умный разбор» — реальная версия FeedbackDemo.jsx (макет, XOB, 2026-08-07/08).
 *
 * Данные — /student/home → data.review, уже посчитан бэкендом:
 *   backend/src/modules/student/home/home.service.js:getDashboard() →
 *   backend/src/modules/student/lessons/lessons.repository.js:getLatestReview()
 *   → последняя сдача практики со review_status='done'.
 * Текст (praise/growth_area/tips/summary) — не наш шаблон, а живой ответ AI
 * (Groq, backend/src/modules/student/lessons/ai-review/groq.client.js) по
 * ИМЕННО этому коду ученика — «AI сам отвечает», как просили.
 *
 * review === null — ни одна сдача ещё не прошла AI-разбор (курс без AI,
 * фича не куплена организацией, или ученик ничего не сдавал). Karis
 * (21.08.2026): в этом случае карточка не показывается ВООБЩЕ — ни пустого
 * состояния, ни "AI ещё считает" — блок либо есть с готовым ответом, либо
 * его нет на странице совсем.
 */
const AMBER_FG = 'var(--k-honey-dk)';

export default function SmartReview({ review }) {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const f = t.feedback;
  const name = user?.firstName || (lang === 'uz' ? "o'quvchi" : 'ученик');

  if (!review) return null;

  const { score, praise, growth_area: growth, tips, summary, lessonTitle } = review;

  return (
    <section aria-label={f.title} className="k-pop-in mt-4 overflow-hidden rounded-2xl" style={{ background: C.card, border: `1px solid ${C.limeLine}` }}>
      <div className="p-3.5 sm:p-4">
        {/* ── Заголовок ── */}
        <div className="flex items-center gap-3">
          <IconTile icon={Brain} hue="lime" size={40} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] sm:text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>{f.title}</h2>
            <p className="text-[11.5px] font-semibold mt-0.5 truncate" style={{ color: C.muted }}>
              {lessonTitle ? fmt(f.lessonLabel, { lesson: lessonTitle }) : f.titleSub}
            </p>
          </div>
        </div>

        {/* ── Похвала: gradient-баннер + score ── */}
        <div className="mt-2.5 relative overflow-hidden rounded-xl px-3.5 py-3" style={{ background: `linear-gradient(135deg, ${C.lime}, ${C.teal})` }}>
          <span className="absolute -right-7 -top-9 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} aria-hidden="true" />
          <span className="absolute right-14 -bottom-8 w-16 h-16 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} aria-hidden="true" />

          <div className="relative flex items-center gap-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.92)' }}>
                🎉 {f.praiseTag}
              </div>
              <div className="text-[17px] sm:text-[19px] font-extrabold mt-0.5 leading-snug text-white">
                {fmt(f.praiseTitle, { name })}
              </div>
              {praise?.topic && (
                <div className="text-[13px] font-bold mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  {fmt(f.praiseTopic, { topic: praise.topic })}
                </div>
              )}
              {praise?.comment && (
                <p className="text-[12px] font-semibold mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>{praise.comment}</p>
              )}
            </div>

            {typeof score === 'number' && (
              <div className="k-pop-in shrink-0 w-[62px] h-[62px] rounded-xl grid place-items-center" style={{ background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.5)' }}>
                <div className="text-center leading-none">
                  <div className="k-num text-[22px] font-extrabold text-white">{score}</div>
                  <div className="text-[10px] font-extrabold mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>%</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Точка роста + Советы — рядом ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
          {growth?.topic && (
            <div className="rounded-xl p-3" style={{ background: alpha(C.amber, 8), border: `1px solid ${alpha(C.amber, 34)}` }}>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} strokeWidth={2.6} color={C.amber} />
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.06em]" style={{ color: AMBER_FG }}>
                  🌱 {f.growTag}
                </span>
              </div>
              <div className="text-[13.5px] font-extrabold mt-1 leading-snug" style={{ color: C.text }}>
                {fmt(f.growTopic, { topic: growth.topic })}
              </div>
              {growth.comment && <p className="text-[11.5px] font-semibold mt-1 leading-snug" style={{ color: C.muted }}>{growth.comment}</p>}
            </div>
          )}

          {Array.isArray(tips) && tips.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: alpha(C.blue, 7), border: `1px solid ${alpha(C.blue, 27)}` }}>
              <div className="flex items-center gap-1.5">
                <Lightbulb size={14} strokeWidth={2.6} color={C.blue} />
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.06em]" style={{ color: C.blue }}>{f.tipTitle}</span>
              </div>
              <ul className="mt-1.5 space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="k-num text-[11px] font-extrabold w-4 h-4 rounded grid place-items-center shrink-0 mt-[2px]" style={{ background: alpha(C.blue, 12), color: C.blue }}>
                      {i + 1}
                    </span>
                    <span className="text-[11.5px] font-semibold leading-snug" style={{ color: C.text }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Общий итог ── */}
        {summary && (
          <div className="mt-2.5 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5" style={{ background: alpha(C.lime, 8), border: `1px solid ${C.limeLine}` }}>
            <span className="text-[18px] leading-none shrink-0" aria-hidden="true">🤝</span>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.07em]" style={{ color: C.limeDk }}>{f.summaryTitle}</div>
              <p className="text-[13px] font-extrabold mt-0.5 leading-snug" style={{ color: C.text }}>{summary}</p>
            </div>
          </div>
        )}

        {/* ── AI-разбор, не наш текст — коротко помечаем источник ── */}
        <p className="text-[10px] font-semibold mt-2.5 text-center flex items-center justify-center gap-1" style={{ color: C.muted }}>
          <Sparkles size={11} strokeWidth={2.6} /> AI · Groq
        </p>
      </div>
    </section>
  );
}
