import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

/**
 * Доводит req.scope.branchId до конкретного филиала для ролей, которым
 * authorize() оставляет org-wide скоуп (сейчас это ceo).
 *
 * Зачем: весь /api/admin написан под одного администратора филиала и везде
 * фильтрует `branch_id = $1` (см. admin.service.js). С `branchId = null`
 * запросы не падают — они молча возвращают пустоту, что выглядит как
 * «данные пропали», а не как ошибка доступа. Поэтому филиал доводится здесь,
 * до контроллеров, а не проверяется в каждом из них.
 *
 * Правила:
 *   - branchId уже есть (admin/branch_manager — из токена) — не трогаем;
 *   - ceo передал ?branchId= — ПРОВЕРЯЕМ, что филиал его организации.
 *     authorize() кладёт query-параметр в скоуп как есть, без проверки, и без
 *     этой строки ceo дотянулся бы до чужой организации по угаданному uuid;
 *   - ceo ничего не передал, в организации один филиал — подставляем его
 *     (случай WBA: филиал ровно один, выбирать не из чего);
 *   - филиалов несколько — требуем явный выбор, а не угадываем.
 */
export async function resolveBranchScope(req, _res, next) {
  const { scope, user } = req;
  if (!scope || scope.branchId) {
    // branchId уже задан — остаётся проверить, что ceo не подставил чужой
    if (scope?.branchId && user?.role === 'ceo') {
      try {
        const { rows: [branch] } = await pool.query(
          `SELECT id FROM branches
            WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
          [scope.branchId, scope.organizationId],
        );
        if (!branch) return next(new AppError(404, 'Branch not found'));
      } catch (err) {
        return next(err);
      }
    }
    return next();
  }

  if (!scope.organizationId) return next(); // main_admin — не org-scoped

  try {
    const { rows } = await pool.query(
      `SELECT id FROM branches
        WHERE organization_id = $1 AND deleted_at IS NULL
        ORDER BY created_at
        LIMIT 2`,
      [scope.organizationId],
    );

    if (rows.length === 0) throw new AppError(422, 'Tashkilotda filial yo\'q');
    if (rows.length > 1) throw new AppError(422, 'Filialni tanlang (?branchId=)');

    scope.branchId = rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}
