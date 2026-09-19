import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers, BookOpen } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { IconTile, Ring, Skeleton, EmptyState, ErrorState, C } from '../components/ui.jsx';
import { fmt, useI18n } from '../../i18n/index.jsx';
import { lessonPercent, isLessonDone } from './TopicDetail.jsx';

/**
 * «Мои уроки» — список ТЕМ (training_types → topics), маршрут /lessons.
 * Каждая тема — отдельная карточка с названием, ведёт на /lessons/topics/:id
 * (TopicDetail.jsx), где уже видео темы → уроки с гейтингом. Раньше все темы
 * рисовались одной лентой на этой же странице — по запросу пользователя
 * (21.08.2026) разделено на два уровня: тут выбор темы, там — её содержимое.
 */
export default function Lessons() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    return api
      .lessons()
      .then((d) => setTopics(d.data))
      .catch((err) => { setError(err); toast(err.message, 'error'); });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorState message={error.message} onRetry={load} />;
  if (!topics) return <Skeleton h={90} count={3} />;

  const allLessons = topics.flatMap((tp) => tp.lessons);

  if (topics.length === 0) {
    return (
      <div className="k-card">
        <EmptyState icon={Layers} hue="violet" title={t.lessons.empty} text={t.lessons.emptyText} />
      </div>
    );
  }

  const doneCount = allLessons.filter((l) => isLessonDone(l)).length;
  const coursePercent = allLessons.length
    ? Math.round(allLessons.reduce((sum, l) => sum + lessonPercent(l), 0) / allLessons.length)
    : 0;

  return (
    <>
      <div className="k-card p-5 mb-5 flex items-center gap-5">
        <Ring percent={coursePercent} size={84} thickness={8}>
          <div className="text-center leading-none">
            <div className="k-num text-[21px]" style={{ color: C.text }}>{coursePercent}%</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[29px] font-extrabold leading-[1.1] tracking-[-0.025em]" style={{ color: C.text }}>
            {t.lessons.title}
          </h1>
          <p className="text-[13.5px] font-semibold mt-1" style={{ color: C.muted }}>
            {fmt(t.lessons.doneOf, { done: doneCount, total: allLessons.length })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {topics.map((topic, i) => {
          const topicDone = topic.lessons.filter((l) => isLessonDone(l)).length;
          const topicPercent = topic.lessons.length
            ? Math.round(topic.lessons.reduce((sum, l) => sum + lessonPercent(l), 0) / topic.lessons.length)
            : 0;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => navigate(`/lessons/topics/${topic.id}`)}
              className="k-card k-pop-in k-hover k-press w-full flex items-center gap-4 p-5 sm:p-6 text-left"
              style={{ animationDelay: `${Math.min(i, 9) * 60}ms` }}
            >
              <IconTile icon={BookOpen} hue="violet" size={56} />
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>{topic.name}</div>
                <div className="text-[13px] font-semibold mt-1" style={{ color: C.muted }}>
                  {topic.lessons.length > 0
                    ? fmt(t.lessons.doneOf, { done: topicDone, total: topic.lessons.length })
                    : t.lessons.soon}
                </div>
              </div>
              {topic.lessons.length > 0 && (
                <Ring percent={topicPercent} size={44} thickness={5} color={topicPercent >= 100 ? C.teal : C.lime}>
                  <span className="k-num text-[11px]" style={{ color: C.text }}>{topicPercent}%</span>
                </Ring>
              )}
              <ChevronRight size={18} strokeWidth={2.8} style={{ color: C.muted }} className="shrink-0" />
            </button>
          );
        })}
      </div>
    </>
  );
}
