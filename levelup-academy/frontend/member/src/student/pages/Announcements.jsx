import { useEffect, useState } from 'react';
import { Megaphone, Building2, Clock3, UserRound } from 'lucide-react';
import { api } from '../api.js';
import { IconTile, PageHeader, Pill, EmptyState, ErrorState, C } from '../components/ui.jsx';
import { fmtDateTime } from '../format.js';
import { useI18n } from '../../i18n/index.jsx';

/**
 * 22.08.2026 (запрос пользователя): страница жила отдельным нестилизованным
 * куском (slate-палитра, ни разу не app design system) — ни k-card/IconTile,
 * ни i18n (текст был жёстко на узбекском независимо от языка интерфейса).
 * Заодно найден и исправлен реальный баг: dateStyle:'medium' с локалью
 * 'uz-UZ' в этом окружении отдаёт "2026 M08 22" вместо человеческого месяца
 * (узкое место ICU-данных именно у dateStyle-шортката) — общий fmtDateTime
 * из format.js этого не делает (day/month/hour отдельными полями), его и
 * переиспользуем, а не чиним второй форматтер.
 */
function AnnouncementsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="k-card p-5 sm:p-6 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex gap-4">
            <div className="shrink-0 rounded-2xl" style={{ width: 52, height: 52, background: C.line }} />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-4 w-1/3 rounded-full" style={{ background: C.line }} />
              <div className="h-3 w-full rounded-full" style={{ background: C.line }} />
              <div className="h-3 w-2/3 rounded-full" style={{ background: C.line }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Announcements() {
  const { lang, t } = useI18n();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    return api.announcements()
      .then((r) => setItems(r.announcements || []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHeader title={t.announcements.title} subtitle={t.announcements.subtitle} icon={Megaphone} hue="violet" />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items ? (
        <AnnouncementsSkeleton />
      ) : items.length === 0 ? (
        <div className="k-card">
          <EmptyState icon={Megaphone} hue="violet" title={t.announcements.empty} text={t.announcements.emptyText} />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a, i) => {
            const expired = a.expiresAt && new Date(a.expiresAt).getTime() < Date.now();
            return (
              <article
                key={a.id}
                className="k-card k-pop-in p-5 sm:p-6"
                style={{ animationDelay: `${Math.min(i, 9) * 60}ms` }}
              >
                <div className="flex gap-4">
                  <IconTile icon={Megaphone} hue="violet" size={52} />
                  <div className="min-w-0 flex-1">
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt="" className="mb-4 max-h-96 w-full rounded-2xl object-cover" />
                    )}
                    <h2 className="text-[16px] font-extrabold leading-tight" style={{ color: C.text }}>{a.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed font-medium" style={{ color: C.muted }}>
                      {a.body}
                    </p>
                    <div
                      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-[12px] font-bold"
                      style={{ borderColor: C.limeLine, color: C.muted }}
                    >
                      <span className="inline-flex items-center gap-1"><UserRound size={13} />{a.senderName || t.announcements.center}</span>
                      <span className="inline-flex items-center gap-1"><Building2 size={13} />{a.branchName || t.announcements.allBranches}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} />{fmtDateTime(a.createdAt, lang)}</span>
                      {a.expiresAt && (
                        <Pill hue={expired ? 'coral' : 'amber'}>
                          {expired ? t.announcements.expired : `${t.announcements.expires} ${fmtDateTime(a.expiresAt, lang)}`}
                        </Pill>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
