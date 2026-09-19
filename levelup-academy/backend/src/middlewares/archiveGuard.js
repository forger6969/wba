import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// белый список archivable-таблиц — имя интерполируется в SQL только отсюда
const ARCHIVABLE = new Set([
  'groups', 'users', 'invoices', 'homework', 'tests', 'shop_items', 'videos',
  'branches', 'organizations',
]);

/**
 * Блокирует ЛЮБУЮ мутацию сущности с is_archived = true → 403.
 * GET проходит всегда (архив read-only, не невидимый).
 *
 *   1) прямая мутация:      router.put('/:id', archiveGuard('groups'), ctrl.update)
 *   2) мутация дочерней:    router.post('/:groupId/homework', archiveGuard('groups', 'groupId'), ...)
 */
export function archiveGuard(table, idParam = 'id') {
  if (!ARCHIVABLE.has(table)) {
    throw new Error(`archiveGuard: table "${table}" is not registered as archivable`);
  }

  return async (req, _res, next) => {
    if (!MUTATING_METHODS.has(req.method)) return next();

    const entityId = req.params[idParam];
    if (!entityId) return next();

    try {
      const { rows } = await pool.query(
        `SELECT is_archived FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
        [entityId],
      );

      if (rows.length === 0) return next(new AppError(404, 'Entity not found'));
      if (rows[0].is_archived) {
        return next(new AppError(403, 'Entity is archived and read-only'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
