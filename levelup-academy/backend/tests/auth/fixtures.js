import argon2 from 'argon2';
import { pool } from '../../src/config/db.js';

/**
 * Isolated test data for the K-AUTH integration tests. Three users, each
 * scoped to its own scenario group so refresh-token reuse-detection (which
 * revokes ALL of a user's tokens) never bleeds into an unrelated scenario:
 *   - userMain    — plain login checks + the OTP forgot/reset flow (has email)
 *   - userFrozen  — frozen-account login rejection
 *   - userRefresh — refresh / rotation / reuse-detection / logout
 * Real argon2 hashes are used (unlike other test suites' DUMMY_HASH) because
 * auth.service.login() calls argon2.verify() for real.
 * Created fresh per run, torn down at the end (best-effort, reverse FK order).
 */

export const PASSWORD = 'TestPass123!';

export async function setupFixtures() {
  const ts = Date.now();
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  // access_until: без него orgAccessGate/login считает организацию неоплаченной
  // и блокирует всё (see 1784520000000_backfill-org-access-until.js) — тестовая
  // org должна быть в том же состоянии, что и реально онбордженный партнёр.
  const { rows: [org] } = await pool.query(
    `INSERT INTO organizations (name, status, plan, access_until)
     VALUES ($1, 'active', 'test', CURRENT_DATE + INTERVAL '1 month') RETURNING id`,
    [`Auth Test Org ${ts}`],
  );
  const organizationId = org.id;

  const { rows: [branch] } = await pool.query(
    `INSERT INTO branches (organization_id, name, is_main) VALUES ($1, $2, true) RETURNING id`,
    [organizationId, `Auth Test Branch ${ts}`],
  );
  const branchId = branch.id;

  async function createStaffUser(role, status, firstName, phoneSuffix) {
    const { rows: [u] } = await pool.query(
      `INSERT INTO users (organization_id, branch_id, role, status, first_name, last_name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, 'Test', $6, $7, $8)
       RETURNING id, email`,
      [
        organizationId,
        branchId,
        role,
        status,
        firstName,
        `+998${ts}${phoneSuffix}`,
        `auth.test.${firstName.toLowerCase()}.${ts}@example.test`,
        passwordHash,
      ],
    );
    return u;
  }

  const userMain = await createStaffUser('admin', 'active', 'Main', '01');
  const userFrozen = await createStaffUser('admin', 'frozen', 'Frozen', '02');
  const userRefresh = await createStaffUser('mentor', 'active', 'Refresh', '03');

  return { organizationId, branchId, userMain, userFrozen, userRefresh, ts };
}

export async function teardownFixtures(ctx) {
  if (!ctx) return;
  const { organizationId, branchId, userMain, userFrozen, userRefresh } = ctx;
  const userIds = [userMain.id, userFrozen.id, userRefresh.id];

  const steps = [
    () => pool.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`, [userIds]),
    () => pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]),
    () => pool.query(`DELETE FROM branches WHERE id = $1`, [branchId]),
    () => pool.query(`DELETE FROM organizations WHERE id = $1`, [organizationId]),
  ];

  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      console.error('[teardown] step failed (continuing):', err.message);
    }
  }
}
