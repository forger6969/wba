import { pool } from '../../src/config/db.js';

/**
 * Isolated test data for the mentor-domain integration tests.
 * Everything is created fresh per run (unique phones via Date.now()) and
 * torn down at the end (best-effort, reverse FK order).
 */

const DUMMY_HASH = 'not-a-real-hash-test-fixture-only';

export async function setupFixtures() {
  const ts = Date.now();

  const { rows: [org] } = await pool.query(
    `INSERT INTO organizations (name, status, plan, access_until)
     VALUES ($1, 'active', 'test', CURRENT_DATE + INTERVAL '1 month') RETURNING id`,
    [`Mentor Test Org ${ts}`],
  );
  const organizationId = org.id;

  const { rows: [branch] } = await pool.query(
    `INSERT INTO branches (organization_id, name, is_main) VALUES ($1, $2, true) RETURNING id`,
    [organizationId, `Mentor Test Branch ${ts}`],
  );
  const branchId = branch.id;

  async function createUser(role, firstName, lastName, phoneSuffix) {
    const { rows: [u] } = await pool.query(
      `INSERT INTO users (organization_id, branch_id, role, first_name, last_name, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [organizationId, branchId, role, firstName, lastName, `+998${ts}${phoneSuffix}`, DUMMY_HASH],
    );
    return u.id;
  }

  const mentorId = await createUser('mentor', 'Test', 'Mentor', '01');
  const otherMentorId = await createUser('mentor', 'Other', 'Mentor', '02');
  const adminId = await createUser('admin', 'Test', 'Admin', '03');

  const studentIds = [];
  for (let i = 0; i < 3; i++) {
    const sid = await createUser('student', `Student${i + 1}`, 'Test', `1${i}`);
    studentIds.push(sid);
    await pool.query(
      `INSERT INTO student_profiles (user_id, branch_id) VALUES ($1, $2)`,
      [sid, branchId],
    );
  }

  const { rows: [group] } = await pool.query(
    `INSERT INTO groups (branch_id, mentor_id, name, subject, monthly_price)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [branchId, mentorId, `Mentor Test Group ${ts}`, 'Testing', 500000],
  );
  const groupId = group.id;

  for (const sid of studentIds) {
    await pool.query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
      [groupId, sid],
    );
  }

  return {
    organizationId,
    branchId,
    mentorId,
    otherMentorId,
    adminId,
    studentIds,
    groupId,
    ts,
  };
}

export async function teardownFixtures(ctx) {
  if (!ctx) return;
  const { organizationId, branchId, groupId, studentIds, mentorId, otherMentorId, adminId } = ctx;

  const steps = [
    () => pool.query(`DELETE FROM test_results WHERE test_id IN (SELECT id FROM tests WHERE group_id = $1)`, [groupId]),
    () => pool.query(`DELETE FROM tests WHERE group_id = $1`, [groupId]),
    () => pool.query(`DELETE FROM homework_submissions WHERE homework_id IN (SELECT id FROM homework WHERE group_id = $1)`, [groupId]),
    () => pool.query(`DELETE FROM homework WHERE group_id = $1`, [groupId]),
    () => pool.query(`DELETE FROM attendance WHERE group_id = $1`, [groupId]),
    () => pool.query(`DELETE FROM mentor_salaries WHERE branch_id = $1`, [branchId]),
    () => pool.query(`DELETE FROM coin_history WHERE branch_id = $1`, [branchId]),
    () => pool.query(`DELETE FROM group_students WHERE group_id = $1`, [groupId]),
    () => pool.query(`DELETE FROM groups WHERE id = $1`, [groupId]),
    () => pool.query(`DELETE FROM student_profiles WHERE user_id = ANY($1::uuid[])`, [studentIds]),
    () => pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[...studentIds, mentorId, otherMentorId, adminId]]),
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
