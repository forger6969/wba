import { pool, withTransaction } from '../../config/db.js';

const DAY_INDEX = new Map([
  ['sun', 0], ['sunday', 0], ['yak', 0],
  ['mon', 1], ['monday', 1], ['du', 1], ['dush', 1],
  ['tue', 2], ['tuesday', 2], ['se', 2], ['sesh', 2],
  ['wed', 3], ['wednesday', 3], ['chor', 3],
  ['thu', 4], ['thursday', 4], ['pay', 4],
  ['fri', 5], ['friday', 5], ['jum', 5],
  ['sat', 6], ['saturday', 6], ['shan', 6],
]);

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function utcDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function scheduleDays(schedule) {
  return new Set((Array.isArray(schedule) ? schedule : []).map((slot) => {
    const key = String(typeof slot === 'string' ? slot : slot?.day ?? '').trim().toLowerCase();
    return DAY_INDEX.get(key) ?? DAY_INDEX.get(key.slice(0, 3));
  }).filter((day) => day !== undefined));
}

export function calculateProration({ monthlyPrice, schedule, monthDate, fromDate }) {
  const month = utcDate(monthDate);
  const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
  const from = utcDate(fromDate);
  const days = scheduleDays(schedule);
  let lessonsInMonth = 0;
  let billableLessons = 0;
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!days.has(cursor.getUTCDay())) continue;
    lessonsInMonth += 1;
    if (cursor >= from) billableLessons += 1;
  }
  const amount = lessonsInMonth > 0
    ? Math.round((Number(monthlyPrice) * billableLessons / lessonsInMonth) * 100) / 100
    : 0;
  return { amount, lessonsInMonth, billableLessons, monthStart: iso(start), calculationStart: iso(from) };
}

async function createInvoice(client, { studentId, groupId, branchId, startDate, fullMonth = false }) {
  const { rows: [group] } = await client.query(
    `SELECT g.monthly_price, g.schedule, COALESCE(tt.price, g.monthly_price) AS effective_price
       FROM groups g LEFT JOIN training_types tt ON tt.id = g.training_type_id
      WHERE g.id = $1 AND g.branch_id = $2 AND g.deleted_at IS NULL`,
    [groupId, branchId],
  );
  if (!group || Number(group.effective_price) <= 0) return null;

  const joined = utcDate(startDate);
  const monthStart = new Date(Date.UTC(joined.getUTCFullYear(), joined.getUTCMonth(), 1));
  const calculation = calculateProration({
    monthlyPrice: group.effective_price,
    schedule: group.schedule,
    monthDate: monthStart,
    fromDate: fullMonth ? monthStart : joined,
  });
  if (!calculation.lessonsInMonth || !calculation.billableLessons) return null;

  const paymentDate = fullMonth
    ? monthStart
    : new Date(Date.UTC(joined.getUTCFullYear(), joined.getUTCMonth() + 1, 1));
  const dueDate = new Date(Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth(), 5));
  const { rows: [account] } = await client.query(
    `INSERT INTO student_payment_accounts (student_id) VALUES ($1)
     ON CONFLICT (student_id) DO UPDATE SET updated_at = student_payment_accounts.updated_at
     RETURNING balance`, [studentId],
  );
  const credit = Math.min(Number(account.balance), calculation.amount);
  const status = credit >= calculation.amount ? 'paid' : credit > 0 ? 'partially_paid' : 'pending';
  const { rows: [invoice] } = await client.query(
    `INSERT INTO invoices
       (branch_id, student_id, group_id, type, status, total_amount, paid_amount, due_date,
        payment_date, period_month, source, monthly_price, lessons_in_month, billable_lessons, calculation_start)
     VALUES ($1,$2,$3,'full',$4,$5,$6,$7,$8,$9,'auto',$10,$11,$12,$13)
     ON CONFLICT (student_id, group_id, period_month) WHERE source = 'auto' DO NOTHING
     RETURNING *`,
    [branchId, studentId, groupId, status, calculation.amount, credit, iso(dueDate), iso(paymentDate),
      calculation.monthStart, group.effective_price, calculation.lessonsInMonth,
      calculation.billableLessons, calculation.calculationStart],
  );
  if (!invoice) return null;
  if (credit > 0) {
    await client.query(`UPDATE student_payment_accounts SET balance = balance - $2, updated_at = now() WHERE student_id = $1`, [studentId, credit]);
  }
  const debt = calculation.amount - credit;
  await client.query(`UPDATE student_profiles SET total_debt = total_debt + $2, updated_at = now() WHERE user_id = $1`, [studentId, debt]);
  return invoice;
}

export function createProratedInvoice({ studentId, groupId, branchId, joinedAt = new Date() }) {
  return withTransaction((client) => createInvoice(client, { studentId, groupId, branchId, startDate: joinedAt }));
}

export async function chargeCurrentMonth() {
  const { rows } = await pool.query(
    `SELECT gs.student_id, g.id AS group_id, g.branch_id
       FROM group_students gs JOIN groups g ON g.id = gs.group_id JOIN users u ON u.id = gs.student_id
      WHERE gs.left_at IS NULL AND g.deleted_at IS NULL AND g.is_archived = false
        AND u.deleted_at IS NULL AND u.status = 'active'`,
  );
  const today = new Date();
  const created = [];
  for (const row of rows) {
    // One transaction per student keeps credit allocation and debt updates race-safe.
    // eslint-disable-next-line no-await-in-loop
    const invoice = await withTransaction((client) => createInvoice(client, {
      studentId: row.student_id, groupId: row.group_id, branchId: row.branch_id, startDate: today, fullMonth: true,
    }));
    if (invoice) created.push(invoice);
  }
  return created;
}

export async function ensureCurrentInvoicesForStudent(studentId, client = pool) {
  // Students may have joined before prorated billing was introduced. Ensure a
  // current-period invoice exists before showing 0 to the student or parent.
  const { rows: memberships } = await client.query(
    `SELECT gs.joined_at, g.id AS group_id, g.branch_id
       FROM group_students gs
       JOIN groups g ON g.id = gs.group_id
      WHERE gs.student_id = $1 AND gs.left_at IS NULL
        AND g.deleted_at IS NULL AND g.is_archived = false
        AND NOT EXISTS (
          SELECT 1 FROM invoices i
           WHERE i.student_id = gs.student_id AND i.group_id = gs.group_id
             AND i.period_month = date_trunc('month', CURRENT_DATE)::date
             AND i.source = 'auto' AND i.deleted_at IS NULL
        )`,
    [studentId],
  );
  const today = new Date();
  const currentMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  for (const membership of memberships) {
    const joinedAt = new Date(membership.joined_at);
    const joinedThisMonth = joinedAt.getUTCFullYear() === today.getUTCFullYear()
      && joinedAt.getUTCMonth() === today.getUTCMonth();
    // Use a separate transaction because callers normally pass the pool. The
    // partial unique index makes simultaneous parent/student loads idempotent.
    // eslint-disable-next-line no-await-in-loop
    await withTransaction((billingClient) => createInvoice(billingClient, {
      studentId,
      groupId: membership.group_id,
      branchId: membership.branch_id,
      startDate: joinedThisMonth ? joinedAt : currentMonthStart,
      fullMonth: !joinedThisMonth,
    }));
  }
}

export async function getPaymentSummary(studentId, client = pool) {
  await ensureCurrentInvoicesForStudent(studentId, client);

  const { rows: [row] } = await client.query(
    `SELECT COALESCE(a.balance, 0) AS balance,
            i.id, i.status, i.total_amount, i.paid_amount, i.payment_date, i.due_date,
            i.monthly_price, i.lessons_in_month, i.billable_lessons, i.calculation_start,
            g.name AS group_name
       FROM users u
       LEFT JOIN student_payment_accounts a ON a.student_id = u.id
       LEFT JOIN LATERAL (
         SELECT * FROM invoices x WHERE x.student_id = u.id AND x.deleted_at IS NULL
          AND x.status IN ('pending','partially_paid','overdue') ORDER BY x.payment_date DESC NULLS LAST, x.created_at DESC LIMIT 1
       ) i ON true
       LEFT JOIN groups g ON g.id = i.group_id
      WHERE u.id = $1`, [studentId],
  );
  return {
    balance: Number(row?.balance ?? 0),
    currentInvoice: row?.id ? {
      id: row.id, status: row.status, totalAmount: Number(row.total_amount), paidAmount: Number(row.paid_amount),
      remainingAmount: Number(row.total_amount) - Number(row.paid_amount), paymentDate: row.payment_date,
      dueDate: row.due_date, monthlyPrice: Number(row.monthly_price), lessonsInMonth: row.lessons_in_month,
      billableLessons: row.billable_lessons, calculationStart: row.calculation_start, groupName: row.group_name,
    } : null,
  };
}
