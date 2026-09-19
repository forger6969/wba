import { asyncHandler } from '../../utils/asyncHandler.js';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';
import * as service from './auth.service.js';
import { resolveUserByQrToken } from './qr-login.service.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../config/logger.js';
import * as authRepo from './auth.repository.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

// group-scoped cookie name — main/staff/member больше не делят одну cookie.
// На localhost cookie не различает порт (только домен), поэтому сессия одной
// панели раньше "утекала" в другую при общем /api/auth/refresh. В проде у
// панелей разные домены, там cookie и так была бы изолирована.
const cookieNameFor = (group) => `refresh_token_${group}`;

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
});

/** Читаем cookie по имени вручную (cookie-parser в проект не тянем). */
function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

const readRefreshCookie = (req) => readCookie(req, REFRESH_COOKIE);

// три раздельных входа — каждый пускает только свою группу ролей (безопасность):
//   main   → main_admin (владелец платформы)
//   staff  → admin, ceo, mentor (сотрудники, вход по email)
//   member → student, parent (вход по логин-коду)
const ROLE_GROUPS = {
  main: ['main_admin'],
  staff: ['admin', 'ceo', 'mentor', 'methodist', 'branch_manager', 'finance_manager', 'employee'],
  member: ['student', 'parent'],
};

// Каждый логин ставит ДВЕ cookie: старую общую (REFRESH_COOKIE — на неё всё ещё
// смотрят уже задеплоенные фронты через /refresh и /logout, обратная совместимость)
// и новую group-scoped (на неё переведены /main|staff|member/refresh и /logout ниже).
function makeLogin(allowedRoles, group) {
  return asyncHandler(async (req, res) => {
    const audit = (user, success) => authRepo.insertLoginAudit({
      user,
      login: req.body?.login,
      success,
      group,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }).catch((err) => logger.warn({ err }, 'Login audit write failed'));

    try {
      const { user, accessToken, refreshToken } = await service.login(req.body, allowedRoles);
      await audit(user, true);
      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
      res.cookie(cookieNameFor(group), refreshToken, refreshCookieOptions());
      res.json({ user, accessToken });
    } catch (err) {
      // Record only authentication rejections. Infrastructure/validation errors
      // are not login attempts and would only add noise to the security feed.
      if (err?.statusCode === 401 || err?.statusCode === 403) await audit(null, false);
      throw err;
    }
  });
}

export const loginMain = makeLogin(ROLE_GROUPS.main, 'main');
export const loginStaff = makeLogin(ROLE_GROUPS.staff, 'staff');
export const loginMember = makeLogin(ROLE_GROUPS.member, 'member');

/**
 * Вход студента по QR — токен постоянный (users.qr_token), выдаёт admin через
 * POST /admin/students/:id/qr-token. Тот же QR читается сколько угодно раз;
 * логин через loginByUserId — тот же путь, что и у входа через Telegram
 * (identity уже доказана не паролем).
 */
export const qrLoginMember = asyncHandler(async (req, res) => {
  const userId = await resolveUserByQrToken(req.body.token);
  if (!userId) throw new AppError(401, 'Invalid QR code');
  const { user, accessToken, refreshToken } = await service.loginByUserId(userId, ROLE_GROUPS.member);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.cookie(cookieNameFor('member'), refreshToken, refreshCookieOptions());
  res.json({ user, accessToken });
});

// вход через Google (Firebase) — по группам ролей, как обычный логин.
// доступен main_admin И staff (admin/ceo/mentor). Один Firebase-проект на всех.
// member (student/parent) — без Google (нет email, вход по логин-коду).
function makeGoogleLogin(allowedRoles, group) {
  return asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await service.googleLogin({
      idToken: req.body?.idToken,
      allowedRoles,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    res.cookie(cookieNameFor(group), refreshToken, refreshCookieOptions());
    res.json({ user, accessToken });
  });
}

export const loginMainGoogle = makeGoogleLogin(ROLE_GROUPS.main, 'main');
export const loginStaffGoogle = makeGoogleLogin(ROLE_GROUPS.staff, 'staff');

export const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await service.refresh(readRefreshCookie(req));
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.json({ user, accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await service.logout(readRefreshCookie(req));
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  res.status(204).end();
});

// group-scoped refresh/logout — читают СВОЮ cookie, не общую. Так сессия одной
// панели физически не может подхватиться другой, даже на одном localhost.
function makeRefresh(allowedRoles, group) {
  return asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await service.refresh(
      readCookie(req, cookieNameFor(group)),
      allowedRoles,
    );
    res.cookie(cookieNameFor(group), refreshToken, refreshCookieOptions());
    res.json({ user, accessToken });
  });
}

function makeLogout(group) {
  return asyncHandler(async (req, res) => {
    await service.logout(readCookie(req, cookieNameFor(group)));
    res.clearCookie(cookieNameFor(group), { path: REFRESH_COOKIE_PATH });
    res.status(204).end();
  });
}

export const refreshMain = makeRefresh(ROLE_GROUPS.main, 'main');
export const refreshStaff = makeRefresh(ROLE_GROUPS.staff, 'staff');
export const refreshMember = makeRefresh(ROLE_GROUPS.member, 'member');

export const logoutMain = makeLogout('main');
export const logoutStaff = makeLogout('staff');
export const logoutMember = makeLogout('member');

export const forgotPassword = asyncHandler(async (req, res) => {
  await service.forgotPassword(req.body.email);
  // одинаковый ответ независимо от существования аккаунта
  res.json({ message: 'If the account exists, a reset code has been sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.body);
  res.json({ message: 'Password updated, please log in again' });
});
