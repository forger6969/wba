import { Navigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMentorGroups } from '../../queries.js';
import { EmptyState } from './_ui.jsx';

/**
 * `/groups` у ментора — не экран, а развилка.
 *
 * Раньше здесь был отдельный список групп; теперь список живёт в сайдбаре и
 * дублировать его страницей незачем. Заходя по прямой ссылке, ментор должен
 * оказаться в работе — открываем первую группу.
 */
export default function MentorGroupsIndex() {
  const { t } = useTranslation();
  const { data, isLoading } = useMentorGroups();
  const { search } = useLocation();
  const groups = data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card bg-base-100">
        <EmptyState
          icon={BookOpen}
          title={t('mentor.noGroupsTitle')}
          hint={t('mentor.noGroupsHint')}
        />
      </div>
    );
  }

  // `search` тащим дальше: со старого `/tests` сюда приходит `?tab=testlar`,
  // и потерять его здесь значило бы всё равно высадить ментора на журнал.
  return <Navigate to={`/groups/${groups[0].id}${search}`} replace />;
}
