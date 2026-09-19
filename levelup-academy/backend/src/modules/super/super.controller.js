import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './super.service.js';
import { improveAnnouncement as improveAnnouncementText } from './announcement-ai.service.js';
import { buildObjectKey, getUploadUrl } from '../../config/s3.js';
import * as shopService from '../admin/shop/shop-admin.service.js';

// req.scope.organizationId проставляет authorize('ceo') — своя организация
const orgId = (req) => req.scope.organizationId;

/**
 * Записать событие в аудит из контекста запроса (актор/ip/user-agent). Fire-and-
 * forget: recordAudit сам глотает ошибки, ответ не должен зависеть от аудита.
 */
function audit(req, { action, entityType, entityId, entityLabel, meta }) {
  return service.recordAudit({
    orgId: orgId(req),
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action,
    entityType,
    entityId,
    entityLabel,
    meta,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

export const dashboard = asyncHandler(async (req, res) => {
  res.json(await service.dashboard(orgId(req)));
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(orgId(req), req.user.id, req.body);
  audit(req, {
    action: 'expense.created',
    entityType: 'expense',
    entityId: expense.id,
    entityLabel: expense.category,
    meta: { branchId: req.body.branchId, amount: expense.amount },
  });
  res.status(201).json({ expense });
});

export const listExpenses = asyncHandler(async (req, res) => {
  res.json(await service.listExpenses(orgId(req), req.query));
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await service.updateExpense(orgId(req), req.params.id, req.body);
  audit(req, { action: 'expense.updated', entityType: 'expense', entityId: expense.id, entityLabel: expense.category });
  res.json({ expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await service.deleteExpense(orgId(req), req.params.id);
  audit(req, { action: 'expense.deleted', entityType: 'expense', entityId: req.params.id });
  res.status(204).end();
});

// --- организация (профиль партнёра, Settings) ---
export const getOrganization = asyncHandler(async (req, res) => {
  res.json({ organization: await service.getOrganization(orgId(req)) });
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const organization = await service.updateOrganization(orgId(req), req.body);
  await audit(req, {
    action: 'organization.update',
    entityType: 'organization',
    entityId: organization.id,
    entityLabel: organization.name,
    meta: { fields: Object.keys(req.body) },
  });
  res.json({ organization });
});

// --- студенты организации (Super Students) ---
export const listStudents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const search = req.query.search?.trim() || null;
  const frozen =
    req.query.frozen === 'true' ? true : req.query.frozen === 'false' ? false : undefined;
  res.json(await service.listStudents(orgId(req), { search, frozen, page, limit }));
});

export const studentsStats = asyncHandler(async (req, res) => {
  res.json(await service.studentsStats(orgId(req), req.query.period, req.query.branchId));
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const result = await service.deleteStudent(orgId(req), req.params.id);
  await audit(req, { action: 'student.delete', entityType: 'student', entityId: req.params.id });
  res.json(result);
});

export const studentDetail = asyncHandler(async (req, res) => {
  res.json({ student: await service.studentDetail(orgId(req), req.params.id) });
});

// --- группы организации (Super Groups) ---
export const listGroups = asyncHandler(async (req, res) => {
  res.json(await service.listGroups(orgId(req)));
});

export const groupDetail = asyncHandler(async (req, res) => {
  res.json({ group: await service.groupDetail(orgId(req), req.params.id) });
});
export const archiveGroup = asyncHandler(async (req, res) => {
  const group = await service.setGroupArchived(orgId(req), req.params.id, true);
  await audit(req, { action: 'group.archive', entityType: 'group', entityId: group.id });
  res.json({ group });
});
export const unarchiveGroup = asyncHandler(async (req, res) => {
  const group = await service.setGroupArchived(orgId(req), req.params.id, false);
  await audit(req, { action: 'group.unarchive', entityType: 'group', entityId: group.id });
  res.json({ group });
});
export const deleteGroup = asyncHandler(async (req, res) => {
  const result = await service.deleteGroup(orgId(req), req.params.id);
  await audit(req, { action: 'group.delete', entityType: 'group', entityId: req.params.id });
  res.json(result);
});

// --- посещаемость (Super Attendance) ---
export const attendance = asyncHandler(async (req, res) => {
  const groupId = req.query.groupId?.trim() || null;
  const date = req.query.date?.trim() || null;
  res.json(await service.attendance(orgId(req), { groupId, date }));
});

// --- объявления организации ---
export const listAnnouncements = asyncHandler(async (req, res) => {
  res.json(await service.listAnnouncements(orgId(req)));
});
export const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await service.createAnnouncement(orgId(req), req.user.id, req.body);
  await audit(req, {
    action: 'announcement.create',
    entityType: 'announcement',
    entityId: announcement.id,
    entityLabel: announcement.title,
    meta: { targetType: announcement.targetType, recipientCount: announcement.recipientCount },
  });
  res.status(201).json({ announcement });
});
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const result = await service.deleteAnnouncement(orgId(req), req.params.id);
  await audit(req, { action: 'announcement.delete', entityType: 'announcement', entityId: req.params.id });
  res.json(result);
});

// --- аудит-лог ---
export const listAudit = asyncHandler(async (req, res) => {
  res.json(await service.listAudit(orgId(req)));
});

// --- статистика / отчёты ---
export const stats = asyncHandler(async (req, res) => {
  res.json(await service.stats(orgId(req), req.query.period, req.query.branchId));
});

// --- филиалы ---
export const createBranch = asyncHandler(async (req, res) => {
  const branch = await service.createBranch(orgId(req), req.body);
  await audit(req, {
    action: 'branch.create',
    entityType: 'branch',
    entityId: branch.id,
    entityLabel: branch.name,
  });
  res.status(201).json({ branch });
});

export const listBranches = asyncHandler(async (req, res) => {
  res.json({ branches: await service.listBranches(orgId(req)) });
});

export const branchDetail = asyncHandler(async (req, res) => {
  res.json({ branch: await service.branchDetail(orgId(req), req.params.id) });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await service.updateBranch(orgId(req), req.params.id, req.body);
  await audit(req, {
    action: 'branch.update',
    entityType: 'branch',
    entityId: branch.id,
    entityLabel: branch.name,
    meta: { fields: Object.keys(req.body) },
  });
  res.json({ branch });
});

export const archiveBranch = asyncHandler(async (req, res) => {
  const branch = await service.setBranchArchived(orgId(req), req.params.id, true);
  await audit(req, { action: 'branch.archive', entityType: 'branch', entityId: branch.id, entityLabel: branch.name });
  res.json({ branch });
});

export const unarchiveBranch = asyncHandler(async (req, res) => {
  const branch = await service.setBranchArchived(orgId(req), req.params.id, false);
  await audit(req, { action: 'branch.unarchive', entityType: 'branch', entityId: branch.id, entityLabel: branch.name });
  res.json({ branch });
});

// --- админы ---
export const createAdmin = asyncHandler(async (req, res) => {
  const admin = await service.createAdmin(orgId(req), req.body);
  await audit(req, {
    action: 'admin.create',
    entityType: 'admin',
    entityId: admin.id,
    entityLabel: `${admin.firstName} ${admin.lastName}`,
  });
  res.status(201).json({ admin });
});

export const listAdmins = asyncHandler(async (req, res) => {
  res.json({ admins: await service.listAdmins(orgId(req)) });
});
export const improveAnnouncement = asyncHandler(async (req, res) => {
  res.json({ suggestion: await improveAnnouncementText(orgId(req), req.body) });
});
export const announcementImageUploadUrl = asyncHandler(async (req, res) => {
  const filename = String(req.query.filename || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
  const contentType = String(req.query.contentType || '');
  if (!contentType.startsWith('image/')) return res.status(422).json({ message: 'Only image files are allowed' });
  const imageKey = buildObjectKey(`announcements/${orgId(req)}`, filename);
  res.json({ uploadUrl: await getUploadUrl(imageKey, contentType), imageKey });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await service.createEmployee(orgId(req), req.body);
  await audit(req, { action: 'employee.create', entityType: 'employee', entityId: employee.id, entityLabel: `${employee.firstName} ${employee.lastName}` });
  res.status(201).json({ employee });
});

export const listEmployees = asyncHandler(async (req, res) => {
  res.json({ employees: await service.listEmployees(orgId(req)) });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await service.updateEmployee(orgId(req), req.params.id, req.body);
  await audit(req, { action: 'employee.update', entityType: 'employee', entityId: employee.id, entityLabel: `${employee.firstName} ${employee.lastName}` });
  res.json({ employee });
});

export const freezeEmployee = asyncHandler(async (req, res) => {
  const employee = await service.setEmployeeFrozen(orgId(req), req.params.id, req.body.frozen);
  await audit(req, { action: req.body.frozen ? 'employee.freeze' : 'employee.unfreeze', entityType: 'employee', entityId: employee.id });
  res.json({ employee });
});

export const resetEmployeePassword = asyncHandler(async (req, res) => {
  const employee = await service.resetEmployeePassword(orgId(req), req.params.id);
  await audit(req, { action: 'employee.reset_password', entityType: 'employee', entityId: employee.id });
  res.json({ employee });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await service.updateAdmin(orgId(req), req.params.id, req.body);
  await audit(req, {
    action: 'admin.update',
    entityType: 'admin',
    entityId: admin.id,
    entityLabel: `${admin.firstName} ${admin.lastName}`,
    meta: { fields: Object.keys(req.body) },
  });
  res.json({ admin });
});

export const freezeAdmin = asyncHandler(async (req, res) => {
  const admin = await service.setAdminFrozen(orgId(req), req.params.id, req.body.frozen);
  await audit(req, {
    action: req.body.frozen ? 'admin.freeze' : 'admin.unfreeze',
    entityType: 'admin',
    entityId: admin.id,
    entityLabel: `${admin.firstName} ${admin.lastName}`,
  });
  res.json({ admin });
});

export const resetAdminPassword = asyncHandler(async (req, res) => {
  const admin = await service.resetAdminPassword(orgId(req), req.params.id);
  await audit(req, {
    action: 'admin.reset_password',
    entityType: 'admin',
    entityId: admin.id,
    entityLabel: `${admin.firstName} ${admin.lastName}`,
  });
  res.json({ admin });
});

// --- методисты ---
export const createMethodist = asyncHandler(async (req, res) => {
  const methodist = await service.createMethodist(orgId(req), req.body);
  await audit(req, {
    action: 'methodist.create',
    entityType: 'methodist',
    entityId: methodist.id,
    entityLabel: `${methodist.firstName} ${methodist.lastName}`,
  });
  res.status(201).json({ methodist });
});

export const listMethodists = asyncHandler(async (req, res) => {
  res.json({ methodists: await service.listMethodists(orgId(req)) });
});

// --- менторы (только чтение — заводит их Admin филиала) ---
export const listMentors = asyncHandler(async (req, res) => {
  res.json({ mentors: await service.listMentors(orgId(req)) });
});

export const createMentor = asyncHandler(async (req, res) => {
  const mentor = await service.createMentor(orgId(req), req.body);
  await audit(req, { action: 'mentor.create', entityType: 'mentor', entityId: mentor.id, entityLabel: `${mentor.firstName} ${mentor.lastName}` });
  res.status(201).json({ mentor });
});

export const updateMentorGrade = asyncHandler(async (req, res) => {
  const mentor = await service.updateMentorGrade(orgId(req), req.params.id, req.body.grade, req.user.id);
  await audit(req, { action: 'mentor.grade_update', entityType: 'mentor', entityId: mentor.id, meta: { grade: mentor.grade } });
  res.json({ mentor });
});

export const updateMentorBranch = asyncHandler(async (req, res) => {
  const result = await service.updateMentorBranch(orgId(req), req.params.id, req.body.branchId);
  await audit(req, { action: 'mentor.branch.change', entityType: 'mentor', entityId: req.params.id, meta: result });
  res.json({ mentor: result });
});

export const updateMethodist = asyncHandler(async (req, res) => {
  const methodist = await service.updateMethodist(orgId(req), req.params.id, req.body);
  await audit(req, {
    action: 'methodist.update',
    entityType: 'methodist',
    entityId: methodist.id,
    entityLabel: `${methodist.firstName} ${methodist.lastName}`,
    meta: { fields: Object.keys(req.body) },
  });
  res.json({ methodist });
});

export const freezeMethodist = asyncHandler(async (req, res) => {
  const methodist = await service.setMethodistFrozen(orgId(req), req.params.id, req.body.frozen);
  await audit(req, {
    action: req.body.frozen ? 'methodist.freeze' : 'methodist.unfreeze',
    entityType: 'methodist',
    entityId: methodist.id,
    entityLabel: `${methodist.firstName} ${methodist.lastName}`,
  });
  res.json({ methodist });
});

export const resetMethodistPassword = asyncHandler(async (req, res) => {
  const methodist = await service.resetMethodistPassword(orgId(req), req.params.id);
  await audit(req, {
    action: 'methodist.reset_password',
    entityType: 'methodist',
    entityId: methodist.id,
    entityLabel: `${methodist.firstName} ${methodist.lastName}`,
  });
  res.json({ methodist });
});

// --- branch managers ---

export const createBranchManager = asyncHandler(async (req, res) => {
  const manager = await service.createBranchManager(orgId(req), req.body);
  await audit(req, {
    action: 'branch_manager.create',
    entityType: 'branch_manager',
    entityId: manager.id,
    entityLabel: `${manager.firstName} ${manager.lastName}`,
  });
  res.status(201).json({ manager });
});

export const listBranchManagers = asyncHandler(async (req, res) => {
  res.json({ managers: await service.listBranchManagers(orgId(req)) });
});

export const resetBranchManagerPassword = asyncHandler(async (req, res) => {
  const manager = await service.resetBranchManagerPassword(orgId(req), req.params.id);
  await audit(req, {
    action: 'branch_manager.reset_password',
    entityType: 'branch_manager',
    entityId: manager.id,
    entityLabel: `${manager.firstName} ${manager.lastName}`,
  });
  res.json({ manager });
});

export const updateBranchManager = asyncHandler(async (req, res) => {
  const manager = await service.updateBranchManager(orgId(req), req.params.id, req.body);
  await audit(req, {
    action: 'branch_manager.update',
    entityType: 'branch_manager',
    entityId: manager.id,
    entityLabel: `${manager.firstName} ${manager.lastName}`,
    meta: { fields: Object.keys(req.body) },
  });
  res.json({ manager });
});

export const reassignBranchManagers = asyncHandler(async (req, res) => {
  const managers = await service.reassignBranchManagers(orgId(req), req.body.assignments);
  await audit(req, {
    action: 'branch_manager.reassign',
    entityType: 'branch_manager',
    meta: { assignments: req.body.assignments },
  });
  res.json({ managers });
});

export const freezeBranchManager = asyncHandler(async (req, res) => {
  const manager = await service.setBranchManagerFrozen(orgId(req), req.params.id, req.body.frozen);
  await audit(req, {
    action: req.body.frozen ? 'branch_manager.freeze' : 'branch_manager.unfreeze',
    entityType: 'branch_manager',
    entityId: manager.id,
    entityLabel: `${manager.firstName} ${manager.lastName}`,
  });
  res.json({ manager });
});

export const deleteBranchManager = asyncHandler(async (req, res) => {
  const result = await service.deleteBranchManager(orgId(req), req.params.id);
  await audit(req, {
    action: 'branch_manager.delete',
    entityType: 'branch_manager',
    entityId: result.id,
  });
  res.json(result);
});

// --- методики / цена абонемента ---
export const listTrainingTypes = asyncHandler(async (req, res) => {
  res.json({ trainingTypes: await service.listTrainingTypes(orgId(req)) });
});

export const setTrainingTypePrice = asyncHandler(async (req, res) => {
  const trainingType = await service.setTrainingTypePrice(orgId(req), req.params.id, req.body.price, req.body.maxStudents);
  await audit(req, {
    action: 'training_type.set_price',
    entityType: 'training_type',
    entityId: trainingType.id,
    entityLabel: trainingType.name,
  });
  res.json({ trainingType });
});

export const setTrainingTypeArchived = asyncHandler(async (req, res) => {
  const trainingType = await service.setTrainingTypeArchived(orgId(req), req.params.id, req.body.archived);
  await audit(req, {
    action: req.body.archived ? 'training_type.archive' : 'training_type.unarchive',
    entityType: 'training_type',
    entityId: trainingType.id,
    entityLabel: trainingType.name,
  });
  res.json({ trainingType });
});

// ---------- shop-каталог: имя/цена/фото заводит CEO, остаток пополняет филиал (см. admin/shop) ----------

export const listShopItems = asyncHandler(async (req, res) => {
  res.json({ items: await shopService.listItemsForOrg(orgId(req), req.query.branchId) });
});

export const createShopItem = asyncHandler(async (req, res) => {
  const item = await shopService.createItemForOrg(orgId(req), req.body);
  await audit(req, { action: 'shop_item.create', entityType: 'shop_item', entityId: item.id, entityLabel: item.name });
  res.status(201).json({ item });
});

export const updateShopItem = asyncHandler(async (req, res) => {
  const item = await shopService.updateItemForOrg(orgId(req), req.params.id, req.body);
  await audit(req, { action: 'shop_item.update', entityType: 'shop_item', entityId: item.id, entityLabel: item.name });
  res.json({ item });
});

export const setShopItemArchived = asyncHandler(async (req, res) => {
  const item = await shopService.setItemArchivedForOrg(orgId(req), req.params.id, req.body.archived);
  await audit(req, {
    action: req.body.archived ? 'shop_item.archive' : 'shop_item.unarchive',
    entityType: 'shop_item',
    entityId: item.id,
    entityLabel: item.name,
  });
  res.json({ item });
});

// --- анонсы от Main Admin (только чтение — раньше их не было видно вообще) ---
export const listPlatformAnnouncements = asyncHandler(async (req, res) => {
  res.json({ announcements: await service.listPlatformAnnouncements(orgId(req)) });
});

// --- каталог платных фич + свои заявки (CEO не переключает сам, только просит) ---
export const getFeatureCatalog = asyncHandler(async (req, res) => {
  res.json({ catalog: await service.getFeatureCatalog(orgId(req)) });
});

export const createFeatureRequest = asyncHandler(async (req, res) => {
  res.status(201).json({ request: await service.createFeatureRequest(orgId(req), req.body, req.user.id) });
});

export const listOwnFeatureRequests = asyncHandler(async (req, res) => {
  res.json({ requests: await service.listOwnFeatureRequests(orgId(req)) });
});

// --- свой биллинг (read-only): статус доступа + журнал оплат/бонусов/кредитов ---
export const getOwnBilling = asyncHandler(async (req, res) => {
  res.json(await service.getOwnBilling(orgId(req)));
});

export const getOwnLedger = asyncHandler(async (req, res) => {
  res.json({ items: await service.getOwnLedger(orgId(req)) });
});
