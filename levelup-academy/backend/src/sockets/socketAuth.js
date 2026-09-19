import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * JWT-аутентификация handshake.
 * Формат payload { sub, role, orgId, branchId } подписывается в auth.service (зона Karis) —
 * при изменении формата токена синхронизировать это место.
 */
export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    socket.user = {
      id: payload.sub,
      role: payload.role,
      organizationId: payload.orgId ?? null,
      branchId: payload.branchId ?? null,
    };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
