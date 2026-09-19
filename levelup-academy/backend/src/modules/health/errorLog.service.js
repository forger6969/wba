import { AppError } from '../../utils/AppError.js';
import * as repo from './errorLog.repository.js';

export async function listErrors(query) {
  const rows = await repo.listErrors(query);
  const total = rows[0]?.total_count ?? 0;
  const items = rows.map(({ total_count, ...r }) => ({
    id: r.id,
    kind: r.kind,
    message: r.message,
    stack: r.stack,
    route: r.route,
    statusCode: r.status_code,
    occurrenceCount: r.occurrence_count,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    resolvedAt: r.resolved_at,
  }));
  return { items, total };
}

export async function resolveError(id) {
  const row = await repo.resolveError(id);
  if (!row) throw new AppError(404, 'Запись не найдена');
  return row;
}

export const countRecentUnresolved = repo.countRecentUnresolved;
