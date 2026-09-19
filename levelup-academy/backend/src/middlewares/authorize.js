import { AppError } from '../utils/AppError.js';

/**
 * RBAC + двухуровневый скоуп (organization → branch).
 *   router.post('/branches', authenticate, authorize('ceo'), ...)
 *
 * req.scope ПРИНУДИТЕЛЬНО подставляется по роли (клиентские org/branch ниже
 * своего уровня игнорируются):
 *   - main_admin → { organizationId: null, branchId: null } — вся платформа;
 *   - ceo → своя организация, branchId можно сузить через ?branchId=;
 *   - остальные  → жёстко свой organizationId + branchId из токена.
 *
 * Вызов без ролей (`authorize()`) — только аутентификация + скоуп, без RBAC.
 */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    const { user } = req;
    if (!user) return next(new AppError(401, 'Authentication required'));

    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }

    if (user.role === 'main_admin') {
      req.scope = { organizationId: null, branchId: null };
    } else if (user.role === 'ceo') {
      req.scope = { organizationId: user.organizationId, branchId: req.query.branchId ?? null };
    } else if (user.role === 'methodist') {
      // Методист видит ВСЕ филиалы своей организации, но не имеет доступа к финансам
      req.scope = { organizationId: user.organizationId, branchId: null };
    } else if (user.role === 'finance_manager') {
      // Finance Manager — вся организация насквозь (как CEO), но узкие права:
      // только финансовые роуты (см. super.routes.js — допущен точечно, не
      // блоком authorize('ceo')). branchId можно сузить через ?branchId=,
      // как у CEO — фронт (Income/Expenses/Salaries) уже умеет фильтровать
      // по одному филиалу или показывать все разом.
      req.scope = { organizationId: user.organizationId, branchId: req.query.branchId ?? null };
    } else {
      req.scope = { organizationId: user.organizationId, branchId: user.branchId };
    }

    next();
  };
}
