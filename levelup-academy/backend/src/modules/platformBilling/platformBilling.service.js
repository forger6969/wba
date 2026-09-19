import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { tierForUsers, computeBill } from '../../config/plans.js';
import * as repo from './platformBilling.repository.js';

/** 'YYYY-MM' → последний день месяца, тем же способом, что main.service.js
 *  использует для access_until (единая логика "конец периода" на платформе). */
function endOfPeriod(periodCovered) {
  const [year, month] = periodCovered.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0));
}

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function decorate(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    periodCovered: row.period_covered,
    tierId: row.tier_id,
    usersCount: row.users_count,
    amount: row.amount,
    paidAmount: row.effective_paid_amount ?? row.paid_amount,
    status: row.effective_status ?? row.status,
    dueDate: row.due_date,
    issuedAt: row.issued_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
  };
}

/**
 * Счёт для org+период по СЕГОДНЯШНЕМУ снимку тарифа — вызывается и массовой
 * генерацией, и на лету, когда платёж приходит за период, для которого счёт
 * ещё не создавали (например, оплата вперёд). ON CONFLICT DO NOTHING в
 * репозитории делает это идемпотентным — двойного счёта не будет, даже если
 * вызвать дважды почти одновременно.
 */
async function ensureInvoice(organizationId, periodCovered, client = pool) {
  const existing = await repo.findInvoice(organizationId, periodCovered, client);
  if (existing) return existing;

  const [org] = await client
    .query(
      `SELECT id,
              (SELECT count(*) FROM users u WHERE u.organization_id = $1 AND u.role = 'student' AND u.status = 'active' AND u.deleted_at IS NULL) +
              (SELECT count(*) FROM users u WHERE u.organization_id = $1 AND u.role = 'parent' AND u.status = 'active' AND u.deleted_at IS NULL) +
              (SELECT count(*) FROM users u WHERE u.organization_id = $1 AND u.role IN ('ceo','admin','mentor','methodist','branch_manager') AND u.status = 'active' AND u.deleted_at IS NULL) AS total_users
         FROM organizations WHERE id = $1`,
      [organizationId],
    )
    .then((r) => r.rows);
  if (!org) throw new AppError(404, 'Partner not found');

  const tier = tierForUsers(Number(org.total_users));
  const amount = computeBill({ users: Number(org.total_users) });
  if (amount <= 0) return null; // Free-тариф — выставлять нечего

  return repo.insertInvoice(
    {
      organizationId,
      periodCovered,
      tierId: tier.id,
      usersCount: Number(org.total_users),
      amount,
      dueDate: endOfPeriod(periodCovered).toISOString().slice(0, 10),
    },
    client,
  );
}

/**
 * Массовая генерация за период (по умолчанию — текущий месяц). Тариф —
 * СНИМОК на момент вызова, дальше не пересчитывается (см. комментарий в
 * миграции). Free-тариф (amount=0) пропускается — выставлять нулевой счёт
 * не имеет смысла. Идемпотентно: повторный вызов за тот же период не
 * создаёт дублей (UNIQUE(organization_id, period_covered)).
 */
export async function generateInvoices(periodCovered = currentPeriod()) {
  const orgs = await repo.orgTierSnapshot();
  const created = [];
  for (const org of orgs) {
    const dueDate = endOfPeriod(periodCovered);
    // Prepaid/bonus access already covers this billing period. Creating a new
    // receivable here would show a debt for service the partner already owns.
    if (org.access_until && new Date(org.access_until) >= dueDate) continue;
    const tier = tierForUsers(Number(org.total_users));
    const amount = computeBill({ users: Number(org.total_users) });
    if (amount <= 0) continue;
    // eslint-disable-next-line no-await-in-loop
    const invoice = await repo.insertInvoice({
      organizationId: org.id,
      periodCovered,
      tierId: tier.id,
      usersCount: Number(org.total_users),
      amount,
      dueDate: dueDate.toISOString().slice(0, 10),
    });
    if (invoice) created.push(invoice);
  }
  return created;
}

export async function listInvoices(query) {
  const rows = await repo.listInvoices(query);
  const total = rows[0]?.total_count ?? 0;
  return { items: rows.map(decorate), total };
}

export async function getOrgDebt() {
  const rows = await repo.debtByOrg();
  return rows.map((r) => ({
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    debt: r.debt,
    overdueCount: r.overdue_count,
    oldestOverdueDueDate: r.oldest_overdue_due_date,
  }));
}

export async function cancelInvoice(id, reason) {
  const row = await repo.cancelInvoice(id, reason);
  if (!row) throw new AppError(409, 'Счёт уже оплачен или не найден — отменить нельзя');
  return decorate({ ...row, effective_status: row.status });
}

/**
 * Связывает ручную фиксацию оплаты (main.service.js → recordPayment) со
 * счётом за тот же период: находит счёт (или создаёт по снимку — оплата
 * вперёд, до генерации), увеличивает paid_amount, помечает исходную запись
 * платежа invoice_id'ом. ВСЕГДА вызывается внутри уже открытой транзакции
 * recordPayment — client обязателен, чтобы платёж и счёт менялись атомарно.
 */
export async function linkPaymentToInvoice({ organizationId, periodCovered, amount, paymentId }, client) {
  if (!periodCovered) return null; // бонусные месяцы приходят без periodCovered — их не к чему привязывать
  const invoice = await ensureInvoice(organizationId, periodCovered, client);
  if (!invoice) return null; // Free-тариф — счёта нет и не будет
  const updated = await repo.applyPayment(invoice.id, amount, client);
  await client.query(`UPDATE platform_org_payments SET invoice_id = $2 WHERE id = $1`, [paymentId, invoice.id]);
  return updated;
}

export { currentPeriod };
