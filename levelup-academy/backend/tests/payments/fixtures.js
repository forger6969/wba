import { pool } from '../../src/config/db.js';

/**
 * Isolated test data for the K-PAY (admin/payments) integration tests.
 * One branch, one admin (actor), three students — each owns one scenario
 * group (ad-hoc, payInvoice progression, refund/void) so their debt totals
 * never interfere with each other. A second (otherwise empty) branch exists
 * only for the branch-scope isolation checks.
 * Created fresh per run, torn down at the end (best-effort, reverse FK order).
 */

const DUMMY_HASH = 'not-a-real-hash-test-fixture-only';

export async function setupFixtures() {
  const ts = Date.now();

  const { rows: [org] } = await pool.query(
    `INSERT INTO organizations (name, status, plan, access_until)
     VALUES ($1, 'active', 'test', CURRENT_DATE + INTERVAL '1 month') RETURNING id`,
    [`Payments Test Org ${ts}`],
  );
  const organizationId = org.id;

  const { rows: [branch] } = await pool.query(
    `INSERT INTO branches (organization_id, name, is_main) VALUES ($1, $2, true) RETURNING id`,
    [organizationId, `Payments Test Branch ${ts}`],
  );
  const branchId = branch.id;

  const { rows: [otherBranch] } = await pool.query(
    `INSERT INTO branches (organization_id, name, is_main) VALUES ($1, $2, false) RETURNING id`,
    [organizationId, `Payments Test Other Branch ${ts}`],
  );
  const otherBranchId = otherBranch.id;

  async function createUser(role, firstName, lastName, phoneSuffix) {
    const { rows: [u] } = await pool.query(
      `INSERT INTO users (organization_id, branch_id, role, first_name, last_name, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [organizationId, branchId, role, firstName, lastName, `+998${ts}${phoneSuffix}`, DUMMY_HASH],
    );
    return u.id;
  }

  const adminId = await createUser('admin', 'Test', 'Admin', '01');
  const studentA = await createUser('student', 'AdHoc', 'Student', '02'); // ad-hoc payments
  const studentB = await createUser('student', 'Invoice', 'Student', '03'); // payInvoice progression
  const studentC = await createUser('student', 'Refund', 'Student', '04'); // refund/void

  for (const studentId of [studentA, studentB, studentC]) {
    // eslint-disable-next-line no-await-in-loop -- sequential fixture setup, order doesn't matter here
    await pool.query(
      `INSERT INTO student_profiles (user_id, branch_id, total_debt) VALUES ($1, $2, 0)`,
      [studentId, branchId],
    );
  }

  return { organizationId, branchId, otherBranchId, adminId, studentA, studentB, studentC, ts };
}

/** Inserts a pending manual invoice and grows the student's total_debt to match (mirrors how such invoices arise in real flows). */
export async function insertPendingInvoice(ctx, studentId, { totalAmount, dueDate = null }) {
  const { rows: [invoice] } = await pool.query(
    `INSERT INTO invoices (branch_id, student_id, type, status, total_amount, paid_amount, due_date, created_by, source)
     VALUES ($1, $2, 'full', 'pending', $3, 0, $4, $5, 'manual')
     RETURNING id`,
    [ctx.branchId, studentId, totalAmount, dueDate, ctx.adminId],
  );
  await pool.query(
    `UPDATE student_profiles SET total_debt = total_debt + $2 WHERE user_id = $1`,
    [studentId, totalAmount],
  );
  return invoice.id;
}

export async function getStudentDebt(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT total_debt FROM student_profiles WHERE user_id = $1`,
    [studentId],
  );
  return Number(row.total_debt);
}

export async function teardownFixtures(ctx) {
  if (!ctx) return;
  const { organizationId, branchId, otherBranchId, adminId, studentA, studentB, studentC } = ctx;
  const studentIds = [studentA, studentB, studentC];
  const branchIds = [branchId, otherBranchId];

  const steps = [
    () => pool.query(
      `DELETE FROM transactions WHERE invoice_id IN (SELECT id FROM invoices WHERE branch_id = ANY($1::uuid[]))`,
      [branchIds],
    ),
    () => pool.query(`DELETE FROM invoices WHERE branch_id = ANY($1::uuid[])`, [branchIds]),
    () => pool.query(`DELETE FROM student_profiles WHERE user_id = ANY($1::uuid[])`, [studentIds]),
    () => pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[adminId, ...studentIds]]),
    () => pool.query(`DELETE FROM branches WHERE id = ANY($1::uuid[])`, [branchIds]),
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
