import { AppError } from '../../utils/AppError.js';
import { withTransaction } from '../../config/db.js';
import * as repo from './discipline.repository.js';

/**
 * Матрица прав выдачи (кто → кому, по типу). sariq/qizil (предупреждения) —
 * некритичные записи без последствий для входа, в отличие от qora, которую
 * admin может выдать только ментору.
 *   ceo         → admin, mentor, methodist   (sariq, qizil, qora)
 *   admin       → mentor, methodist          (sariq, qizil)
 *   admin       → mentor                       (qora — только ментор)
 *   main_admin  → НИЧЕГО
 */
const CAN_ISSUE = {
  ceo: {
    sariq: ['admin', 'mentor', 'methodist'],
    qizil: ['admin', 'mentor', 'methodist'],
    qora: ['admin', 'mentor', 'methodist'],
  },
  admin: {
    sariq: ['mentor', 'methodist'],
    qizil: ['mentor', 'methodist'],
    qora: ['mentor'],
  },
};

function assertCanIssue(issuerRole, targetRole, type) {
  const allowed = CAN_ISSUE[issuerRole]?.[type];
  if (!allowed || !allowed.includes(targetRole)) {
    throw new AppError(403, `Роль ${issuerRole} не может выдать «${type}» роли ${targetRole}`);
  }
}

/**
 * Выдать штраф/qora. issuer = { id, role, branchId }, scope = { organizationId }.
 * qora атомарно пишет запись и ставит целевому status='fired'.
 */
export async function issuePenalty(issuer, scope, body) {
  const orgId = scope.organizationId;
  const target = await repo.findStaffInOrg(body.targetUserId, orgId);
  if (!target) throw new AppError(404, 'Сотрудник не найден в вашей организации');
  if (target.id === issuer.id) throw new AppError(400, 'Нельзя выдать штраф самому себе');

  assertCanIssue(issuer.role, target.role, body.type);

  // Admin может трогать только ментора своего филиала (методист — на уровне организации).
  if (issuer.role === 'admin' && target.role === 'mentor') {
    if (!issuer.branchId || target.branch_id !== issuer.branchId) {
      throw new AppError(403, 'Ментор не из вашего филиала');
    }
  }

  if (target.status === 'fired') throw new AppError(409, 'Сотрудник уже уволен');

  const record = {
    organizationId: orgId,
    branchId: target.branch_id,
    targetUserId: target.id,
    targetRole: target.role,
    issuedBy: issuer.id,
    issuerRole: issuer.role,
    type: body.type,
    // необязательный довесок — сумма не привязана к типу
    amount: body.amount ?? null,
    reason: body.reason,
  };

  if (body.type === 'qora') {
    return withTransaction(async (client) => {
      const penalty = await repo.insertPenalty(record, client);
      await repo.setUserStatus(target.id, orgId, 'fired', client);
      return { penalty, fired: true };
    });
  }

  const penalty = await repo.insertPenalty(record);
  return { penalty, fired: false };
}

/** Список штрафов: super — вся организация; admin — только выданные им. */
export async function listPenalties(issuer, scope, query = {}) {
  const filter = { organizationId: scope.organizationId, targetUserId: query.targetUserId, type: query.type };
  if (issuer.role === 'admin') filter.issuedBy = issuer.id;
  return repo.listPenalties(filter);
}

/** Свои штрафы (панель сотрудника). */
export function myPenalties(userId) {
  return repo.listPenaltiesForUser(userId);
}

/** Вернуть уволенного (снять fired → active). Только CEO (guard в роуте). */
export async function reactivateStaff(orgId, targetUserId) {
  const target = await repo.findStaffInOrg(targetUserId, orgId);
  if (!target) throw new AppError(404, 'Сотрудник не найден в вашей организации');
  if (target.status !== 'fired') throw new AppError(409, 'Сотрудник не уволен');
  return repo.setUserStatus(targetUserId, orgId, 'active');
}

/**
 * Каталог правил (qoyda) — «нарушение → уровень», настраивается один раз и
 * используется как справочник при выдаче взыскания. Ручной процесс: правило
 * само по себе ничего не выдаёт и не считает пороги.
 */
export async function listRules(orgId) {
  return repo.listRules(orgId);
}

export async function createRule(orgId, createdBy, { type, amount, description }) {
  return repo.insertRule({
    orgId,
    type,
    // необязательный довесок — сумма не привязана к типу
    amount: amount ?? null,
    description,
    createdBy,
  });
}

export async function deleteRule(orgId, id) {
  const row = await repo.deleteRule(id, orgId);
  if (!row) throw new AppError(404, 'Правило не найдено в вашей организации');
  return { id: row.id };
}
