import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, Users, ClipboardCheck, FileText, CalendarCheck, PlayCircle } from 'lucide-react';
import { useProductActivity } from '../queries.js';
import PageHeader from '../components/PageHeader.jsx';
import { Panel, EmptyState, FilterPills } from '../components/_ui.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';

/**
 * Реальная активность в продукте, не на сайте (Karis 26.08.2026, пункт #7).
 *
 * «Аналитика сайта» — про лендинг: приходят ли новые посетители. Здесь —
 * про тех, кто УЖЕ внутри: сдают ли ученики тесты и ДЗ, отмечается ли
 * посещаемость, или партнёр платит по инерции, а кабинетом никто не
 * пользуется неделями. Считает обе системы заданий (старую и новую
 * тематическую, добавленную 22.08.2026) вместе.
 *
 * Отсортировано от самых тихих к самым активным — ради тихих и делалось.
 */

const PERIODS = [
  { key: 7, label: '7 дней' },
  { key: 30, label: '30 дней' },
];

function BreakdownPill({ icon: Icon, value, label }) {
  if (value === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-base-content/55 bg-base-200/60 rounded-md px-2 py-1">
      <Icon size={11} /> {value} {label}
    </span>
  );
}

function ActivityRow({ item }) {
  const sharePct = item.activeShare == null ? null : Math.round(item.activeShare * 100);
  const quiet = item.events === 0;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="min-w-[180px]">
        <Link to={`/organizations/${item.organizationId}`} className="font-semibold text-sm hover:underline flex items-center gap-1.5">
          <Building2 size={13} className="text-base-content/40" /> {item.organizationName}
        </Link>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-base-content/45">
          <Users size={11} />
          {item.totalStudents === 0
            ? 'нет учеников'
            : `${item.activeStudents}/${item.totalStudents} заходили (${sharePct}%)`}
        </div>
      </div>

      <div className="flex-1 min-w-[220px]">
        <div className={`text-lg font-extrabold tabular-nums ${quiet ? 'text-error' : ''}`}>
          {item.events} {quiet ? '— тишина' : 'событий'}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <BreakdownPill icon={ClipboardCheck} value={item.breakdown.tests} label="тестов" />
          <BreakdownPill icon={FileText} value={item.breakdown.homework} label="ДЗ" />
          <BreakdownPill icon={CalendarCheck} value={item.breakdown.attendance} label="отметок" />
          <BreakdownPill icon={PlayCircle} value={item.breakdown.videoViews} label="просмотров" />
        </div>
      </div>
    </div>
  );
}

export default function ProductActivity() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useProductActivity(days);
  const items = data?.items ?? [];
  const quietCount = items.filter((i) => i.events === 0 && i.totalStudents > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Активность в продукте"
        subtitle="Тесты, ДЗ, посещаемость, видео — не сайт. Отличает «работает» от «платит по инерции»"
      >
        <FilterPills options={PERIODS} value={days} onChange={setDays} />
      </PageHeader>

      {!isLoading && quietCount > 0 && (
        <div className="alert bg-error/10 border border-error/25 text-sm">
          <Activity size={16} className="text-error shrink-0" />
          <span className="text-base-content/70">
            {quietCount} {quietCount === 1 ? 'партнёр с учениками' : 'партнёра с учениками'} без единого события за {days} дн.
          </span>
        </div>
      )}

      <Panel bodyClass="p-0">
        {isLoading ? (
          <div className="p-5"><SkeletonList rows={4} /></div>
        ) : !items.length ? (
          <div className="p-6">
            <EmptyState icon={Activity} title="Партнёров пока нет" />
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {items.map((item) => <ActivityRow key={item.organizationId} item={item} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}
