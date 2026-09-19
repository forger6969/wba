import { pool } from '../../src/config/db.js';

/**
 * Isolated test data for the parent-domain integration tests.
 * Two parents each with one child (the second child belongs to `otherParent`
 * and is used for the ownership-guard 403 checks). One child has attendance,
 * a graded homework and a finished test so the overview has content.
 * Created fresh per run, torn down at the end (best-effort, reverse FK order).
 */

const DUMMY_HASH = 'not-a-real-hash-test-fixture-only';

export async function setupFixtures() {
  const ts = Date.now();

  const { rows: [org] } = await pool.query(
    `INSERT INTO organizations (name, status, plan, access_until)
     VALUES ($1, 'active', 'test', CURRENT_DATE + INTERVAL '1 month') RETURNING id`,
    [`Parent Test Org ${ts}`],
  );
  const organizationId = org.id;

  const { rows: [branch] } = await pool.query(
    `INSERT INTO branches (organization_id, name, is_main) VALUES ($1, $2, true) RETURNING id`,
    [organizationId, `Parent Test Branch ${ts}`],
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

  const parentId = await createUser('parent', 'Papa', 'Test', '01');
  const otherParentId = await createUser('parent', 'Other', 'Parent', '02');
  const mentorId = await createUser('mentor', 'Test', 'Mentor', '03');

  const childId = await createUser('student', 'Kid', 'Test', '11');        // belongs to parentId
  const outsiderChildId = await createUser('student', 'Stranger', 'Kid', '12'); // belongs to otherParentId

  await pool.query(
    `INSERT INTO student_profiles (user_id, branch_id, parent_id, total_debt)
     VALUES ($1, $2, $3, $4)`,
    [childId, branchId, parentId, 150000],
  );
  await pool.query(
    `INSERT INTO student_profiles (user_id, branch_id, parent_id)
     VALUES ($1, $2, $3)`,
    [outsiderChildId, branchId, otherParentId],
  );

  const { rows: [group] } = await pool.query(
    `INSERT INTO groups (branch_id, mentor_id, name, subject, monthly_price)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [branchId, mentorId, `Parent Test Group ${ts}`, 'Testing', 500000],
  );
  const groupId = group.id;

  await pool.query(
    `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
    [groupId, childId],
  );

  // Attendance: 2 present, 1 absent, 1 late (all within the 30-day window)
  const attendance = [
    ['present', 1],
    ['present', 2],
    ['absent', 3],
    ['late', 4],
  ];
  for (const [status, daysAgo] of attendance) {
    await pool.query(
      `INSERT INTO attendance (branch_id, group_id, student_id, lesson_date, status, marked_by)
       VALUES ($1, $2, $3, CURRENT_DATE - $4::int, $5, $6)`,
      [branchId, groupId, childId, daysAgo, status, mentorId],
    );
  }

  // A graded homework
  const { rows: [hw] } = await pool.query(
    `INSERT INTO homework (branch_id, group_id, created_by, title, max_score, coin_reward, deadline)
     VALUES ($1, $2, $3, 'Graded HW', 100, 0, now() + interval '5 days') RETURNING id`,
    [branchId, groupId, mentorId],
  );
  await pool.query(
    `INSERT INTO homework_submissions (homework_id, student_id, status, text_answer, score, graded_by, graded_at)
     VALUES ($1, $2, 'graded', 'answer', 88, $3, now())`,
    [hw.id, childId, mentorId],
  );

  // A finished test
  const questions = [
    { q: 'Q1', options: ['a', 'b'], correct: 0 },
    { q: 'Q2', options: ['x', 'y'], correct: 1 },
  ];
  const { rows: [test] } = await pool.query(
    `INSERT INTO tests (branch_id, group_id, created_by, title, questions, duration_min, coin_reward)
     VALUES ($1, $2, $3, 'Finished Test', $4::jsonb, 10, 0) RETURNING id`,
    [branchId, groupId, mentorId, JSON.stringify(questions)],
  );
  await pool.query(
    `INSERT INTO test_results (test_id, student_id, answers, score, finished_at)
     VALUES ($1, $2, '[0,1]'::jsonb, 100, now())`,
    [test.id, childId],
  );

  // A paid invoice with a completed transaction (-> payment-received notification)
  const { rows: [paidInvoice] } = await pool.query(
    `INSERT INTO invoices (branch_id, student_id, group_id, status, total_amount, paid_amount, due_date, created_by)
     VALUES ($1, $2, $3, 'paid', 500000, 500000, CURRENT_DATE, $4) RETURNING id`,
    [branchId, childId, groupId, mentorId],
  );
  const { rows: [transaction] } = await pool.query(
    `INSERT INTO transactions (branch_id, invoice_id, method, status, amount, processed_by)
     VALUES ($1, $2, 'cash', 'completed', 500000, $3) RETURNING id`,
    [branchId, paidInvoice.id, mentorId],
  );

  // An overdue invoice (-> overdue notification)
  const { rows: [overdueInvoice] } = await pool.query(
    `INSERT INTO invoices (branch_id, student_id, group_id, status, total_amount, paid_amount, due_date, created_by)
     VALUES ($1, $2, $3, 'overdue', 300000, 0, CURRENT_DATE - 10, $4) RETURNING id`,
    [branchId, childId, groupId, mentorId],
  );

  return {
    organizationId, branchId,
    parentId, otherParentId, mentorId,
    childId, outsiderChildId, groupId, hwId: hw.id, testId: test.id,
    paidInvoiceId: paidInvoice.id, transactionId: transaction.id, overdueInvoiceId: overdueInvoice.id,
    ts,
  };
}

export async function teardownFixtures(ctx) {
  if (!ctx) return;
  const { organizationId, branchId, groupId, hwId, testId,
    parentId, otherParentId, mentorId, childId, outsiderChildId,
    paidInvoiceId, transactionId, overdueInvoiceId } = ctx;
  const userIds = [parentId, otherParentId, mentorId, childId, outsiderChildId];
  const childIds = [childId, outsiderChildId];

  const steps = [
    () => pool.query(`DELETE FROM test_results WHERE test_id = $1`, [testId]),
    () => pool.query(`DELETE FROM tests WHERE id = $1`, [testId]),
    () => pool.query(`DELETE FROM homework_submissions WHERE homework_id = $1`, [hwId]),
    () => pool.query(`DELETE FROM homework WHERE id = $1`, [hwId]),
    () => pool.query(`DELETE FROM transactions WHERE id = $1`, [transactionId]),
    () => pool.query(`DELETE FROM invoices WHERE id = ANY($1::uuid[])`, [[paidInvoiceId, overdueInvoiceId]]),
    () => pool.query(`DELETE FROM attendance WHERE group_id = $1`, [groupId]),
    () => pool.query(`DELETE FROM coin_history WHERE branch_id = $1`, [branchId]),
    () => pool.query(`DELETE FROM group_students WHERE group_id = $1`, [groupId]),
    () => pool.query(`DELETE FROM groups WHERE id = $1`, [groupId]),
    () => pool.query(`DELETE FROM student_profiles WHERE user_id = ANY($1::uuid[])`, [childIds]),
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
