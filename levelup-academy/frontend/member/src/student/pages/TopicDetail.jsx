import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check, ChevronLeft, ChevronRight, ClipboardCheck, BookOpen, Star, Clock, Lock,
  PlayCircle, Play, Pause, Volume2, VolumeX,
} from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { IconTile, Ring, Pill, Skeleton, ErrorState, C } from '../components/ui.jsx';
import { fmt, useI18n } from '../../i18n/index.jsx';

/**
 * Одна тема (mavzu) — маршрут /lessons/topics/:topicId. Раньше все темы
 * рисовались одной длинной лентой на /lessons; по запросу пользователя
 * (21.08.2026) разделено на два уровня: список тем (Lessons.jsx) → детали
 * одной темы (этот файл) — видео темы → уроки (тест → домашка), гейтинг
 * последовательный, как и был.
 *
 * Данные не грузятся заново отдельным эндпоинтом — api.lessons() и так
 * отдаёт все темы целиком, здесь просто берём нужную по id из того же
 * списка (эндпоинта "одна тема" на бэке нет и не нужен ради этого).
 */

export function lessonPercent(lesson) {
  if (lesson.type === 'test') return lesson.score ?? 0;
  if (lesson.submissionStatus === 'graded') return lesson.submissionScore ?? 100;
  if (lesson.submissionStatus === 'submitted' || lesson.submissionStatus === 'late') return 50;
  return 0;
}

/* Для гейтинга (открывать ли следующий шаг) — лениво: достаточно, что
   студент что-то сдал (submitted/late), не обязательно уже оценено. */
export function isLessonCompleted(lesson) {
  return lesson.type === 'test' ? lesson.score != null : lesson.submissionStatus != null;
}

/* Для счётчиков "готово X из Y" — строго: домашка засчитана только когда
   реально оценена (graded), "на проверке" ещё не готово. Раньше (до разбивки
   на список тем + деталь темы) это была одна и та же функция — регрессия
   поймана на первой же живой проверке ("Готово 2 из 2" вместо "1 из 2"). */
export function isLessonDone(lesson) {
  return lesson.type === 'test' ? lesson.score != null : lesson.submissionStatus === 'graded';
}

function LessonRow({ lesson, locked, lockReason, onOpen, delay = 0 }) {
  const { t } = useI18n();
  const isTest = lesson.type === 'test';
  const percent = lessonPercent(lesson);
  const done = isTest ? lesson.score != null : lesson.submissionStatus === 'graded';
  const inProgress = !isTest && (lesson.submissionStatus === 'submitted' || lesson.submissionStatus === 'late');

  if (locked) {
    return (
      <div
        className="k-card k-pop-in w-full flex items-center gap-4 p-5 sm:p-6 text-left opacity-55"
        style={{ animationDelay: `${delay}ms` }}
      >
        <span
          className="shrink-0 grid place-items-center rounded-2xl"
          style={{ width: 56, height: 56, background: C.line }}
        >
          <Lock size={24} strokeWidth={2.2} color={C.muted} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>{lesson.title}</div>
          <div className="text-[13px] font-semibold mt-1" style={{ color: C.muted }}>{lockReason}</div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(lesson)}
      className="k-card k-pop-in k-hover k-press w-full flex items-center gap-4 p-5 sm:p-6 text-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <IconTile icon={isTest ? ClipboardCheck : BookOpen} hue={isTest ? 'blue' : 'coral'} size={56} />

      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>{lesson.title}</div>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-[13px] font-semibold" style={{ color: C.muted }}>
            {isTest ? t.lessons.test : t.lessons.homework}
          </span>
          {done && <Pill hue="teal"><Check size={11} strokeWidth={3.5} /> {t.lessons.done}</Pill>}
          {inProgress && <Pill hue="amber"><Clock size={11} strokeWidth={3} /> {t.lessons.checking}</Pill>}
        </div>
        {lesson.coinReward > 0 && (
          <div className="text-[12.5px] font-bold mt-1 flex items-center gap-1" style={{ color: C.limeDk }}>
            <Star size={11} strokeWidth={3} fill="currentColor" /> {fmt(t.lessons.coins, { n: lesson.coinReward })}
          </div>
        )}
      </div>

      <Ring percent={percent} size={50} thickness={6} color={done ? C.teal : C.lime}>
        <span className="k-num text-[12px]" style={{ color: C.text }}>{percent}%</span>
      </Ring>
      <ChevronRight size={18} strokeWidth={2.8} style={{ color: C.muted }} className="shrink-0" />
    </button>
  );
}

/* youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID → embed-ссылка.
   Своя копия (не импорт из LessonDetail.jsx) — это видео ТЕМЫ, другой уровень
   данных (topics.video_url, не methodology_lessons.video_url), и тут ещё
   нужен enablejsapi для честного отслеживания "досмотрено до конца". */
function toYoutubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.slice('/embed/'.length);
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
  } catch {
    return null;
  }
}

let ytApiPromise = null;
/** Грузит YouTube IFrame API один раз на страницу, даже если тем с видео несколько. */
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

/** Видео темы по ссылке — БЕЗ ограничений на перемотку (по просьбе пользователя,
    YouTube хостит сам, это бесплатно для нас). "Досмотрено" — честно по
    настоящему onStateChange === ENDED из IFrame API, не по таймеру. */
function TopicVideoYoutube({ url, onEnded, bare = false }) {
  const { t } = useI18n();
  const embed = toYoutubeEmbed(url);
  const iframeRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!embed) return undefined;
    let player;
    let cancelled = false;
    loadYoutubeApi().then((YT) => {
      if (cancelled || !iframeRef.current) return;
      player = new YT.Player(iframeRef.current, {
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) onEndedRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player?.destroy?.();
    };
  }, [embed]);

  if (!embed) return null;
  const player = (
    <>
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          ref={iframeRef}
          src={embed}
          title="topic-video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-[12.5px] font-semibold px-4 py-3" style={{ color: C.muted }}>{t.lessons.watchToUnlock}</p>
    </>
  );
  if (bare) return player;
  return (
    <div className="k-card k-pop-in overflow-hidden mb-4" style={{ borderColor: C.limeLine }}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <PlayCircle size={16} strokeWidth={2.4} color={C.violet} />
        <span className="text-[12px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.violet }}>
          {t.lessons.topicVideo}
        </span>
      </div>
      {player}
    </div>
  );
}

function fmtTime(sec) {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Видео темы файлом (загружено методистом на Storj) — здесь перемотку
    РЕАЛЬНО можно заблокировать (в отличие от YouTube): свои контролы без
    seek-бара, откат currentTime вперёд, блокировка стрелок с фокусом на
    видео. Не железобетонно (devtools всегда можно), но реально мешает
    случайно/лениво промотать — это уже обсуждено и принято. */
function TopicVideoFile({ topicId, onEnded, bare = false }) {
  const { t } = useI18n();
  const [streamUrl, setStreamUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const videoRef = useRef(null);
  const maxReachedRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.lessonTopicVideoUrl(topicId)
      .then((d) => { if (!cancelled) setStreamUrl(d.data.streamUrl); })
      .catch((err) => { if (!cancelled) setLoadError(err); });
    return () => { cancelled = true; };
  }, [topicId]);

  if (loadError) return null; // видео недоступно — не блокируем уроки навсегда молча, но и не выдумываем плеер
  if (!streamUrl) return <Skeleton h={220} count={1} />;

  const player = (
    <>
      <div className="relative w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
        <video
          ref={videoRef}
          src={streamUrl}
          className="absolute inset-0 w-full h-full"
          controlsList="nodownload noplaybackrate nofullscreen"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault(); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            if (time > maxReachedRef.current) maxReachedRef.current = time;
            setCurrent(time);
          }}
          onSeeking={(e) => {
            const v = e.currentTarget;
            if (v.currentTime > maxReachedRef.current + 1) v.currentTime = maxReachedRef.current;
          }}
          onEnded={onEnded}
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => { const v = videoRef.current; if (v.paused) v.play(); else v.pause(); }}
          className="k-press shrink-0 grid place-items-center h-9 w-9 rounded-full"
          style={{ background: C.limeSoft, color: C.limeDk }}
        >
          {playing ? <Pause size={16} strokeWidth={2.8} /> : <Play size={16} strokeWidth={2.8} />}
        </button>
        <button
          type="button"
          onClick={() => { const v = videoRef.current; v.muted = !v.muted; setMuted(v.muted); }}
          className="k-press shrink-0 grid place-items-center h-9 w-9 rounded-full"
          style={{ background: C.bg, color: C.muted }}
        >
          {muted ? <VolumeX size={16} strokeWidth={2.6} /> : <Volume2 size={16} strokeWidth={2.6} />}
        </button>
        <span className="text-[12.5px] font-bold tabular-nums" style={{ color: C.muted }}>
          {fmtTime(current)} / {fmtTime(duration)}
        </span>
      </div>
      <p className="text-[12.5px] font-semibold px-4 pb-3" style={{ color: C.muted }}>{t.lessons.watchToUnlock}</p>
    </>
  );
  if (bare) return player;
  return (
    <div className="k-card k-pop-in overflow-hidden mb-4" style={{ borderColor: C.limeLine }}>
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <PlayCircle size={16} strokeWidth={2.4} color={C.violet} />
        <span className="text-[12px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.violet }}>
          {t.lessons.topicVideo}
        </span>
      </div>
      {player}
    </div>
  );
}

/* Видео — такая же карточка в общем списке, что Тест/ДЗ (запрос
   пользователя, 21.08.2026: "test bolak, uyga vazifa bolak, video yoq" —
   раньше плеер был отдельным блоком НАД списком и исчезал навсегда после
   просмотра, из трёх частей темы виднелись только две). Свёрнута — обычная
   строка с чекой "Готово"; открыта — тот же плеер внутри той же карточки.
   Пересмотреть можно в любой момент, гейтинг завязан на videoWatched,
   не на том, открыта ли карточка сейчас. */
function VideoRow({ topic, watched, open, onToggleOpen, onEnded, delay = 0 }) {
  const { t } = useI18n();

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="k-card k-pop-in k-hover k-press w-full flex items-center gap-4 p-5 sm:p-6 text-left"
        style={{ animationDelay: `${delay}ms` }}
      >
        <IconTile icon={PlayCircle} hue="violet" size={56} />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>{t.lessons.topicVideo}</div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {watched
              ? <Pill hue="teal"><Check size={11} strokeWidth={3.5} /> {t.lessons.done}</Pill>
              : <span className="text-[13px] font-semibold" style={{ color: C.muted }}>{t.lessons.watchToUnlock}</span>}
          </div>
          {topic.videoCoinReward > 0 && (
            <div className="text-[12.5px] font-bold mt-1 flex items-center gap-1" style={{ color: C.limeDk }}>
              <Star size={11} strokeWidth={3} fill="currentColor" /> {fmt(t.lessons.coins, { n: topic.videoCoinReward })}
            </div>
          )}
        </div>
        <ChevronRight size={18} strokeWidth={2.8} style={{ color: C.muted }} className="shrink-0" />
      </button>
    );
  }

  return (
    <div className="k-card k-pop-in overflow-hidden" style={{ animationDelay: `${delay}ms`, borderColor: C.limeLine }}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="k-press w-full flex items-center gap-2 px-4 pt-3.5 pb-2 text-left"
      >
        <PlayCircle size={16} strokeWidth={2.4} color={C.violet} />
        <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] flex-1" style={{ color: C.violet }}>
          {t.lessons.topicVideo}
        </span>
        {watched && <Pill hue="teal"><Check size={11} strokeWidth={3.5} /> {t.lessons.done}</Pill>}
      </button>
      {topic.hasVideoFile
        ? <TopicVideoFile topicId={topic.id} onEnded={onEnded} bare />
        : <TopicVideoYoutube url={topic.videoUrl} onEnded={onEnded} bare />}
    </div>
  );
}

export default function TopicDetail() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState(null);
  const [watched, setWatched] = useState(false);
  // null = "ещё не трогал руками" → открыт по умолчанию, пока не досмотрено
  // (как раньше), но после ручного сворачивания/разворачивания — уже явно.
  const [videoOpenManual, setVideoOpenManual] = useState(null);

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

  const topic = topics.find((tp) => tp.id === topicId);
  if (!topic) return <ErrorState message={t.lessons.topicNotFound} onRetry={() => navigate('/lessons')} />;

  const anyProgress = topic.lessons.some(isLessonCompleted);
  const hasVideo = !!(topic.videoUrl || topic.hasVideoFile);
  // topic.videoWatched — честная серверная метка (topic_video_views), не
  // сбрасывается при перезагрузке страницы, в отличие от локального watched.
  const videoWatched = topic.videoWatched || anyProgress || watched;
  const showVideoGate = hasVideo && !videoWatched;
  const videoOpen = videoOpenManual === null ? showVideoGate : videoOpenManual;
  const doneCount = topic.lessons.filter((l) => isLessonDone(l)).length;

  // Один раз при реальном досмотре — бэк сам идемпотентен (coinsAwarded: 0
  // при повторном вызове), тут просто фиксируем локально, чтобы карточка
  // сразу перекрасилась в "Готово", не дожидаясь следующего load().
  const handleVideoEnded = () => {
    setWatched(true);
    api.markTopicVideoWatched(topic.id).catch((err) => toast(err.message, 'error'));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/lessons')}
        className="k-press inline-flex items-center gap-1 mb-4 text-[13.5px] font-bold"
        style={{ color: C.muted }}
      >
        <ChevronLeft size={16} strokeWidth={2.8} /> {t.lessons.title}
      </button>

      <div className="k-card p-5 mb-5">
        <h1 className="text-[22px] sm:text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]" style={{ color: C.text }}>
          {topic.name}
        </h1>
        {topic.description && (
          <p className="text-[13.5px] font-semibold mt-1.5" style={{ color: C.muted }}>{topic.description}</p>
        )}
        <p className="text-[13px] font-bold mt-2" style={{ color: C.limeDk }}>
          {fmt(t.lessons.doneOf, { done: doneCount, total: topic.lessons.length })}
        </p>
      </div>

      {topic.lessons.length === 0 && !hasVideo ? (
        <p className="text-[13px] font-semibold px-1" style={{ color: C.muted }}>{t.lessons.soon}</p>
      ) : (
        <div className="space-y-3">
          {hasVideo && (
            <VideoRow
              topic={topic}
              watched={videoWatched}
              open={videoOpen}
              onToggleOpen={() => setVideoOpenManual(!videoOpen)}
              onEnded={handleVideoEnded}
            />
          )}
          {topic.lessons.map((lesson, i) => {
            const prevDone = i === 0 ? true : isLessonCompleted(topic.lessons[i - 1]);
            const locked = showVideoGate || !prevDone;
            const lockReason = showVideoGate ? t.lessons.lockedByVideo : t.lessons.lockedByPrev;
            return (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                locked={locked}
                lockReason={lockReason}
                onOpen={(l) => navigate(`/lessons/${l.id}`)}
                delay={Math.min(i, 9) * 50}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
