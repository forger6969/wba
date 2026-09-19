/**
 * Integration tests for the K-AUTH domain (src/modules/auth/**) against the
 * LIVE Postgres + Redis stack. No HTTP server — service functions are called
 * directly (login/refresh/logout/forgotPassword/resetPassword).
 *
 * Run:  node tests/auth/run.js
 */
import { pool } from '../../src/config/db.js';
import { redis, closeRedis } from '../../src/config/redis.js';

import * as authService from '../../src/modules/auth/auth.service.js';

import { setupFixtures, teardownFixtures, PASSWORD } from './fixtures.js';
import { scenario, printSummary, assert, assertEqual, expectAppError } from './lib/harness.js';

// Mirrors the private key formats in src/modules/auth/auth.service.js — there is
// no exported accessor, so tests peek at the same Redis key shapes directly.
const otpKey = (email) => `auth:otp:${email}`;
const otpCooldownKey = (email) => `auth:otp:cd:${email}`;

async function activeRefreshTokenCount(userId) {
  const { rows: [row] } = await pool.query(
    `SELECT count(*)::int AS n FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
  return row.n;
}

async function main() {
  const ctx = await setupFixtures();
  const { userMain, userFrozen, userRefresh } = ctx;

  // =======================================================================
  // Group 1 — login()
  // =======================================================================
  await scenario(1, 'login with wrong password -> 401', async () => {
    await expectAppError(
      () => authService.login({ login: userMain.email, password: 'not-the-password' }),
      401,
      'invalid login or password',
    );
  });

  await scenario(2, 'login on a frozen account -> 403', async () => {
    await expectAppError(
      () => authService.login({ login: userFrozen.email, password: PASSWORD }),
      403,
      'frozen',
    );
  });

  await scenario(3, 'login with correct credentials -> tokens + public user', async () => {
    const result = await authService.login({ login: userMain.email, password: PASSWORD });
    assertEqual(result.user.id, userMain.id, 'returned user id should match');
    assertEqual(result.user.role, 'admin', 'returned role should match');
    assert(typeof result.accessToken === 'string' && result.accessToken.length > 0, 'accessToken issued');
    assert(typeof result.refreshToken === 'string' && result.refreshToken.length > 0, 'refreshToken issued');
  });

  await scenario(4, 'login with a role not in allowedRoles -> 401 (no info leak)', async () => {
    await expectAppError(
      () => authService.login({ login: userMain.email, password: PASSWORD }, ['mentor']),
      401,
      'invalid login or password',
    );
  });

  // =======================================================================
  // Group 2 — refresh() rotation, reuse-detection, logout (dedicated user:
  // reuse-detection revokes ALL of a user's tokens, so this stays isolated)
  // =======================================================================
  let gen1;
  let gen2;
  await scenario(5, 'refresh rotates: new token pair issued, differs from the old one', async () => {
    gen1 = await authService.login({ login: userRefresh.email, password: PASSWORD });
    gen2 = await authService.refresh(gen1.refreshToken);
    assertEqual(gen2.user.id, userRefresh.id, 'refresh should return the same user');
    // refreshToken is crypto-random (crypto.randomBytes) — guaranteed unique every call.
    // accessToken is a deterministic JWT (same claims + same iat second can collide) —
    // not a meaningful uniqueness check, so only the refresh token is asserted here.
    assert(gen2.refreshToken !== gen1.refreshToken, 'rotation must issue a brand new refresh token');
  });

  await scenario(6, 'replaying the rotated-out (gen1) token -> 401 reuse detected', async () => {
    await expectAppError(
      () => authService.refresh(gen1.refreshToken),
      401,
      'reuse detected',
    );
  });

  await scenario(7, 'reuse-detection revokes the whole family: gen2 is now dead too', async () => {
    assertEqual(await activeRefreshTokenCount(userRefresh.id), 0, 'no active refresh tokens should remain');
    await expectAppError(
      () => authService.refresh(gen2.refreshToken),
      401,
      'reuse detected',
    );
  });

  await scenario(8, 'refresh with a garbage token -> 401 invalid refresh token', async () => {
    await expectAppError(
      () => authService.refresh('this-token-was-never-issued'),
      401,
      'invalid refresh token',
    );
  });

  await scenario(9, 'logout revokes the token; replaying it afterwards -> 401', async () => {
    const fresh = await authService.login({ login: userRefresh.email, password: PASSWORD });
    await authService.logout(fresh.refreshToken);
    assertEqual(await activeRefreshTokenCount(userRefresh.id), 0, 'logout revokes the token');
    await expectAppError(
      () => authService.refresh(fresh.refreshToken),
      401,
    );
  });

  // =======================================================================
  // Group 3 — forgotPassword / resetPassword (OTP)
  // =======================================================================
  await scenario(10, 'forgotPassword on an unknown email -> silent no-op (no enumeration)', async () => {
    const unknownEmail = `nobody.${ctx.ts}@example.test`;
    await authService.forgotPassword(unknownEmail);
    const stored = await redis.get(otpKey(unknownEmail));
    assert(stored === null, 'no OTP should be stored for an unknown email');
  });

  await scenario(11, 'forgotPassword on a known email -> OTP stored in Redis', async () => {
    await authService.forgotPassword(userMain.email);
    const raw = await redis.get(otpKey(userMain.email));
    assert(raw !== null, 'OTP should be stored');
    const { otp, attempts } = JSON.parse(raw);
    assert(/^\d{6}$/.test(otp), 'OTP should be a 6-digit code');
    assertEqual(attempts, 0, 'fresh OTP starts with zero attempts');
  });

  await scenario(12, 'resetPassword with a wrong OTP -> 400, attempts incremented', async () => {
    await expectAppError(
      () => authService.resetPassword({ email: userMain.email, otp: '000000', newPassword: 'Whatever123!' }),
      400,
      'invalid code',
    );
    const { attempts } = JSON.parse(await redis.get(otpKey(userMain.email)));
    assertEqual(attempts, 1, 'a wrong attempt should be counted');
  });

  await scenario(13, 'resetPassword with the correct OTP -> password changed, all sessions revoked', async () => {
    // a live session to prove resetPassword revokes it
    await authService.login({ login: userMain.email, password: PASSWORD });
    assert((await activeRefreshTokenCount(userMain.id)) >= 1, 'sanity: session is active before reset');

    const { otp } = JSON.parse(await redis.get(otpKey(userMain.email)));
    const newPassword = 'NewTestPass456!';
    await authService.resetPassword({ email: userMain.email, otp, newPassword });

    assertEqual(await redis.get(otpKey(userMain.email)), null, 'OTP key must be cleared after a successful reset');
    assertEqual(await activeRefreshTokenCount(userMain.id), 0, 'resetPassword must revoke all existing sessions');

    await expectAppError(
      () => authService.login({ login: userMain.email, password: PASSWORD }),
      401,
      'invalid login or password',
    );
    const relogin = await authService.login({ login: userMain.email, password: newPassword });
    assertEqual(relogin.user.id, userMain.id, 'login with the new password should succeed');
  });

  await scenario(14, 'resetPassword with no OTP requested -> 400 code expired or not requested', async () => {
    const untouchedEmail = `untouched.${ctx.ts}@example.test`;
    await expectAppError(
      () => authService.resetPassword({ email: untouchedEmail, otp: '123456', newPassword: 'Whatever123!' }),
      400,
      'not requested',
    );
  });

  await scenario(15, 'resetPassword exceeding max attempts -> 429, OTP invalidated', async () => {
    // scenario 11 already used up the 60s anti-spam cooldown on this email — clear it
    // so this scenario can request its own fresh OTP instead of waiting it out.
    await redis.del(otpCooldownKey(userMain.email));
    await authService.forgotPassword(userMain.email);
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- attempts must be counted sequentially against the same OTP
      await expectAppError(
        () => authService.resetPassword({ email: userMain.email, otp: '000000', newPassword: 'x' }),
        400,
      );
    }
    await expectAppError(
      () => authService.resetPassword({ email: userMain.email, otp: '000000', newPassword: 'x' }),
      429,
      'too many attempts',
    );
    assertEqual(await redis.get(otpKey(userMain.email)), null, 'OTP must be invalidated after too many attempts');
  });

  const ok = printSummary();

  await teardownFixtures(ctx);
  try {
    await redis.del(otpKey(userMain.email));
  } catch (err) {
    console.error('[teardown] redis cleanup failed (continuing):', err.message);
  }
  await closeRedis();
  await pool.end();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error('FATAL', err);
  process.exit(1);
});
