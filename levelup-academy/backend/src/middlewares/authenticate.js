import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Проверяет Bearer access-токен и кладёт пользователя в req.user.
 * Payload токена: { sub, role, orgId, branchId } — тот же формат читает socketAuth.
 * Middleware stateless (без запроса в БД): access живёт 15 мин, заморозка/бан
 * подхватываются при следующем refresh.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      organizationId: payload.orgId ?? null,
      branchId: payload.branchId ?? null,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
