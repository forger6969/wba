import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, FileText, Video, ArrowRight, ChevronRight } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { PageHeader, IconTile, Button, C } from '../components/ui.jsx';
import { deadlineLabel } from '../format.js';
import { fmt, useI18n } from '../../i18n/index.jsx';

/**
 * «Мои уроки» — отдельная страница-меню (роут /study). Друг посоветовал:
 * вместо раскрывающегося списка в сайдбаре — СВОЯ страница, чтобы ребёнок
 * всегда понимал, где находится. Разделы разложены большими карточками-
 * коробками (не списком), чтобы страница не выглядела пустой.
 *
 * Цвета семантики: учёба = бнафша, действие = зелёный. «Задания» — это
 * действие (сдать вовремя), поэтому зелёная карточка; на странице всегда
 * видно минимум два цвета.
 */
/* Подписи секций — из словаря (hub.*), чтобы меняться вместе с языком. */
function buildSections(t) {
  return [
    { to: '/lessons', label: t.hub.lessons, meta: t.hub.lessonsMeta, icon: BookOpen, hue: 'violet' },
    { to: '/tests', label: t.hub.tests, meta: t.hub.testsMeta, icon: ClipboardCheck, hue: 'violet' },
    { to: '/homework', label: t.hub.homework, meta: t.hub.homeworkMeta, icon: FileText, hue: 'lime' },
    { to: '/videos', label: t.hub.videos, meta: t.hub.videosMeta, icon: Video, hue: 'violet' },
  ];
}

export default function LessonsHub() {
  const toast = useToast();
  const { lang, t } = useI18n();
  const sections = buildSections(t);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .home()
      .then((d) => { if (!cancelled) setData(d.data); })
      .catch((err) => { if (!cancelled) toast(err.message, 'error'); });
    return () => { cancelled = true; };
  }, [toast]);

  const hw = data?.upcomingHomework?.[0] ?? null;
  const continueTo = hw ? '/homework' : '/tests';

  return (
    <>
      <PageHeader
        title={t.hub.title}
        subtitle={t.hub.subtitle}
        icon={BookOpen}
        hue="violet"
      />

      {/* Что дальше — крупная зелёная карточка-действие.
          Не используем <Skeleton/>: он всегда рендерится в grid-cols-3
          (рассчитан на ряд из нескольких плиток), а тут одна карточка на всю
          ширину — с count={1} она занимала только 1/3 колонки на sm+ вместо
          полной ширины настоящей карточки (баг найден 21.08.2026). */}
      {!data ? (
        <div className="animate-pulse mb-4" style={{ height: 92, background: C.line, borderRadius: 16 }} />
      ) : (
        <Link
          to={continueTo}
          className="k-card k-hover k-pop-in block p-5 sm:p-6 relative overflow-hidden mb-4"
        >
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            <IconTile icon={hw ? FileText : ClipboardCheck} hue="lime" size={54} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.limeDk }}>
                {hw ? t.hub.nextTask : t.hub.taskOfDay}
              </div>
              <div className="text-[18px] sm:text-[20px] font-extrabold leading-tight mt-1 truncate" style={{ color: C.text }}>
                {hw ? hw.title : t.hub.passTestTitle}
              </div>
              <div className="text-[13px] font-semibold mt-1" style={{ color: C.muted }}>
                {hw ? fmt(t.hub.dueLabel, { date: deadlineLabel(hw.deadline, lang) }) : t.hub.checkYourself}
              </div>
            </div>
            <Button hue="lime" className="hidden sm:inline-flex shrink-0">
              {hw ? t.hub.submit : t.hub.go} <ArrowRight size={15} strokeWidth={2.6} />
            </Button>
            <Button hue="lime" className="sm:hidden w-full">
              {hw ? t.hub.submit : t.hub.go} <ArrowRight size={15} strokeWidth={2.6} />
            </Button>
          </div>
        </Link>
      )}

      {/* Четыре раздела — большими карточками-коробками */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ to, label, meta, icon, hue }, i) => (
          <Link
            key={to}
            to={to}
            className="k-card k-hover k-press k-pop-in block p-5 sm:p-6"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-4">
              <IconTile icon={icon} hue={hue} size={56} />
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-extrabold leading-tight" style={{ color: C.text }}>{label}</div>
                <div className="text-[13px] font-semibold mt-1" style={{ color: C.muted }}>{meta}</div>
              </div>
              <ChevronRight size={18} strokeWidth={2.8} className="shrink-0" style={{ color: C.muted }} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
