import { useEffect, useState, useCallback } from 'react';
import { PlayCircle } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../components/toast.jsx';
import { PageHeader, Skeleton, EmptyState, ErrorState, Modal, Pill, IconTile, C } from '../components/ui.jsx';
import { fmtDate, fmtDuration } from '../format.js';
import { useI18n } from '../../i18n/index.jsx';

export default function Videos() {
  const toast = useToast();
  const { lang, t } = useI18n();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(null); // { video, streamUrl }

  const load = useCallback(() => {
    setError(null);
    api
      .videos()
      .then((d) => setList(d.data))
      .catch((err) => { setError(err); toast(err.message, 'error'); });
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const play = async (video) => {
    try {
      const d = await api.videoStreamUrl(video.id);
      setPlaying({ video, streamUrl: d.data.streamUrl });
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title={t.videos.title} subtitle={t.videos.subtitle} icon={PlayCircle} hue="violet" />

      {error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !list ? (
        <Skeleton h={72} count={4} />
      ) : list.length === 0 ? (
        <div className="k-card">
          <EmptyState icon={PlayCircle} title={t.videos.empty} text={t.videos.emptyText} />
        </div>
      ) : (
        <div className="k-card divide-y" style={{ borderColor: C.limeLine }}>
          {list.map((v, i) => (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => play(v)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && play(v)}
              className="k-pop-in k-press k-row-hover flex items-center gap-3 px-4 py-3.5 flex-wrap sm:flex-nowrap cursor-pointer transition-colors"
              style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}
            >
              <IconTile icon={PlayCircle} hue="violet" size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold truncate" style={{ color: C.text }}>{v.title}</div>
                <div className="text-[13px] font-bold mt-0.5" style={{ color: C.muted }}>{fmtDate(v.created_at, lang)}</div>
              </div>
              {v.duration_sec > 0 && <Pill hue="muted" className="tabular-nums">{fmtDuration(v.duration_sec)}</Pill>}
            </div>
          ))}
        </div>
      )}

      {playing && (
        <Modal title={playing.video.title} onClose={() => setPlaying(null)}>
          {/* presigned GET живёт ограниченное время — плеер открываем сразу */}
          <video className="w-full rounded-xl bg-black max-h-[60vh]" src={playing.streamUrl} controls autoPlay />
        </Modal>
      )}
    </>
  );
}
