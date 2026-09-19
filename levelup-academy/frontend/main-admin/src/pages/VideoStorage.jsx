import { HardDrive, Eye } from 'lucide-react';
import { useVideoStorageCosts } from '../queries.js';
import PageHeader from '../components/PageHeader.jsx';
import { Kpi } from '../components/_ui.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

function formatBytes(n) {
  if (!n) return '—';
  const mb = n / 1_000_000;
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}
function formatDuration(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function formatUsd(n, digits = 4) {
  return `$${Number(n ?? 0).toFixed(digits)}`;
}

export default function VideoStorage() {
  const { data, isLoading, error } = useVideoStorageCosts();
  const items = data?.items || [];
  const totals = data?.totals;

  if (error && error.status !== 401) {
    return <div className="alert alert-error text-sm"><span>{error.message}</span></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Хранение видео"
        subtitle="Темы с видео-файлом на Storj вместо ссылки на YouTube — реальный расход платформы"
      />

      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Kpi
              Icon={HardDrive}
              title="Хранение / мес"
              value={formatUsd(totals?.totalStorageCostUsdPerMonth)}
              unit="по тарифу с наценкой, Storj"
              accent
            />
            <Kpi
              Icon={HardDrive}
              title="Всего размер"
              value={formatBytes(totals?.totalSizeBytes)}
              unit={`${totals?.count ?? 0} тем с файлом`}
              tint={{ bg: '#E0F2FE', fg: '#075985' }}
            />
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-200/60">
            <div className="card-body">
              <h2 className="card-title text-base mb-1">Темы с видео-файлом</h2>
              <p className="text-xs text-base-content/45 mb-3 flex items-center gap-1.5">
                <Eye size={12} /> «За просмотр» — цена ОДНОГО показа видео (трафик), не входит в сумму хранения выше — сколько раз посмотрят, заранее не известно.
              </p>
              {items.length === 0 ? (
                <div className="text-base-content/40 text-sm text-center py-10">Ни один методист ещё не загрузил видео файлом — все темы используют ссылки на YouTube</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Организация</th>
                        <th>Тема</th>
                        <th>Курс</th>
                        <th className="text-right">Размер</th>
                        <th className="text-right">Длительность</th>
                        <th className="text-right">Хранение/мес</th>
                        <th className="text-right">За просмотр</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.topic_id} className="hover">
                          <td className="font-medium">{r.organization_name}</td>
                          <td>{r.topic_name}</td>
                          <td className="text-base-content/50">{r.training_type_name}</td>
                          <td className="text-right tabular-nums">{formatBytes(r.video_size_bytes)}</td>
                          <td className="text-right tabular-nums">{formatDuration(r.video_duration_sec)}</td>
                          <td className="text-right font-semibold tabular-nums">{formatUsd(r.video_storage_cost_usd)}</td>
                          <td className="text-right text-base-content/50 tabular-nums">{formatUsd(r.video_cost_per_view_usd, 6)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold border-t-2 border-base-300">
                        <td colSpan={5} className="text-right text-sm opacity-60">Итого хранение/мес:</td>
                        <td className="text-right text-lime-600 tabular-nums">{formatUsd(totals?.totalStorageCostUsdPerMonth)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
