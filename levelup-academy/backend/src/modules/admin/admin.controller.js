import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './admin.service.js';
import * as announcementService from '../super/super.service.js';
import { improveAnnouncement as improveAnnouncementText } from '../super/announcement-ai.service.js';
import { buildObjectKey, getUploadUrl } from '../../config/s3.js';

// authorize('admin') жёстко проставляет req.scope = { organizationId, branchId } из токена
const branchId = (req) => req.scope.branchId;
const orgId = (req) => req.scope.organizationId;

// ---------- дашборд ----------
export const dashboard = asyncHandler(async (req, res) => {
  res.json(await service.dashboard(branchId(req)));
});

// ---------- настройки (длительность урока из организации, для формы группы) ----------
export const settings = asyncHandler(async (req, res) => {
  res.json(await service.getSettings(branchId(req)));
});

// ---------- расходы ----------
export const createExpense = asyncHandler(async (req, res) => {
  res.status(201).json({ expense: await service.createExpense(req.scope, req.user.id, req.body) });
});

export const listExpenses = asyncHandler(async (req, res) => {
  res.json(await service.listExpenses(branchId(req), req.query));
});

export const updateExpense = asyncHandler(async (req, res) => {
  res.json({ expense: await service.updateExpense(branchId(req), req.params.id, req.body) });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await service.deleteExpense(branchId(req), req.params.id);
  res.status(204).end();
});

// ---------- студенты ----------
export const createStudent = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createStudent(req.scope, req.body));
});

export const listStudents = asyncHandler(async (req, res) => {
  res.json(await service.listStudents(branchId(req), req.query));
});

export const studentDetail = asyncHandler(async (req, res) => {
  res.json({ student: await service.studentDetail(branchId(req), req.params.id) });
});

export const updateStudent = asyncHandler(async (req, res) => {
  res.json({ student: await service.updateStudent(branchId(req), req.params.id, req.body) });
});

export const freezeStudent = asyncHandler(async (req, res) => {
  res.json({
    student: await service.setStudentFrozen(
      branchId(req),
      req.params.id,
      req.body.frozen,
      req.body.reason,
    ),
  });
});

export const regenerateStudentPassword = asyncHandler(async (req, res) => {
  res.json(await service.regenerateStudentPassword(branchId(req), req.params.id));
});

export const getStudentCredentials = asyncHandler(async (req, res) => {
  res.json(await service.getStudentCredentials(branchId(req), req.params.id));
});

export const regenerateParentPassword = asyncHandler(async (req, res) => {
  res.json(await service.regenerateParentPassword(branchId(req), req.params.id));
});

export const getParentCredentials = asyncHandler(async (req, res) => {
  res.json(await service.getParentCredentials(branchId(req), req.params.id));
});

export const createParentQrToken = asyncHandler(async (req, res) => {
  res.json(await service.createParentQrToken(branchId(req), req.params.id));
});

export const regenerateParentQrToken = asyncHandler(async (req, res) => {
  res.json(await service.regenerateParentQrToken(branchId(req), req.params.id));
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await service.deleteStudent(branchId(req), req.params.id, req.body?.reason);
  res.status(204).end();
});

export const studentsStats = asyncHandler(async (req, res) => {
  res.json(await service.studentsStats(branchId(req), req.query.period));
});

// ---------- менторы ----------
export const createMentor = asyncHandler(async (req, res) => {
  res.status(201).json({ mentor: await service.createMentor(req.scope, req.body) });
});

export const listMentors = asyncHandler(async (req, res) => {
  res.json(await service.listMentors(branchId(req)));
});

export const freezeMentor = asyncHandler(async (req, res) => {
  res.json({ mentor: await service.setMentorFrozen(branchId(req), req.params.id, req.body.frozen) });
});

export const updateMentor = asyncHandler(async (req, res) => {
  // req.user.id — кто присвоил грейд, пишется в mentor_profiles.grade_set_by
  res.json({
    mentor: await service.updateMentor(branchId(req), req.params.id, req.body, req.user.id),
  });
});

export const deleteMentor = asyncHandler(async (req, res) => {
  await service.deleteMentor(branchId(req), req.params.id);
  res.status(204).end();
});

// ---------- группы ----------
export const createGroup = asyncHandler(async (req, res) => {
  res.status(201).json({ group: await service.createGroup(branchId(req), req.body) });
});

export const schedule = asyncHandler(async (req, res) => {
  res.json(await service.schedule(branchId(req)));
});

export const listTrainingTypes = asyncHandler(async (req, res) => {
  res.json({ trainingTypes: await service.listTrainingTypes(branchId(req)) });
});

export const studentAttendance = asyncHandler(async (req, res) => {
  res.json(await service.studentAttendance(branchId(req), req.params.id, req.query));
});

export const createStudentQrToken = asyncHandler(async (req, res) => {
  res.json(await service.createStudentQrToken(branchId(req), req.params.id));
});

export const regenerateStudentQrToken = asyncHandler(async (req, res) => {
  res.json(await service.regenerateStudentQrToken(branchId(req), req.params.id));
});

export const studentTelegramStatus = asyncHandler(async (req, res) => {
  res.json(await service.studentTelegramStatus(branchId(req), req.params.id));
});

export const sendStudentTelegramMessage = asyncHandler(async (req, res) => {
  await service.sendStudentTelegramMessage(branchId(req), req.params.id, req.body);
  res.json({ success: true });
});

export const listGroups = asyncHandler(async (req, res) => {
  res.json(await service.listGroups(branchId(req), req.query));
});

export const groupDetail = asyncHandler(async (req, res) => {
  res.json({ group: await service.groupDetail(branchId(req), req.params.id) });
});

export const groupTelegramStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.groupTelegramStatus(branchId(req), req.params.id) });
});
export const createGroupTelegramBindToken = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.createGroupTelegramBindToken(branchId(req), req.params.id) });
});
export const unlinkGroupTelegram = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.unlinkGroupTelegram(branchId(req), req.params.id) });
});

export const groupCredentials = asyncHandler(async (req, res) => {
  res.json(await service.groupCredentials(branchId(req), req.params.id));
});

export const updateGroup = asyncHandler(async (req, res) => {
  res.json({ group: await service.updateGroup(branchId(req), req.params.id, req.body) });
});

export const archiveGroup = asyncHandler(async (req, res) => {
  res.json({ group: await service.setGroupArchived(branchId(req), req.params.id, true) });
});

export const unarchiveGroup = asyncHandler(async (req, res) => {
  res.json({ group: await service.setGroupArchived(branchId(req), req.params.id, false) });
});

export const addGroupStudent = asyncHandler(async (req, res) => {
  res.status(201).json(
    await service.addGroupStudent(branchId(req), req.params.id, req.body.studentId),
  );
});

export const removeGroupStudent = asyncHandler(async (req, res) => {
  await service.removeGroupStudent(branchId(req), req.params.id, req.params.studentId);
  res.status(204).end();
});

// ---------- рабочее пространство группы: davomat / ДЗ / фикр ----------
export const groupAttendance = asyncHandler(async (req, res) => {
  res.json(await service.getGroupAttendance(branchId(req), req.params.id, req.query.date));
});

export const markGroupAttendance = asyncHandler(async (req, res) => {
  res.json(await service.markGroupAttendance(branchId(req), req.params.id, req.user.id, req.body));
});

export const groupHomework = asyncHandler(async (req, res) => {
  res.json(await service.listGroupHomework(branchId(req), req.params.id));
});

export const createGroupHomework = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createGroupHomework(branchId(req), req.params.id, req.user.id, req.body));
});

export const groupFeedback = asyncHandler(async (req, res) => {
  res.json(await service.listGroupFeedback(branchId(req), req.params.id));
});

export const createGroupFeedback = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createGroupFeedback(branchId(req), req.params.id, req.user.id, req.body));
});

// ---------- объявления ----------
export const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await announcementService.createAnnouncement(orgId(req), req.user.id, {
    ...req.body,
    branchId: branchId(req),
  });
  res.status(201).json({ announcement });
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  res.json(await announcementService.listAnnouncements(orgId(req), branchId(req)));
});
export const improveAnnouncement = asyncHandler(async (req, res) => {
  res.json({ suggestion: await improveAnnouncementText(orgId(req), { ...req.body, branchId: branchId(req) }) });
});
export const announcementImageUploadUrl = asyncHandler(async (req, res) => {
  const filename = String(req.query.filename || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
  const contentType = String(req.query.contentType || '');
  if (!contentType.startsWith('image/')) return res.status(422).json({ message: 'Only image files are allowed' });
  const imageKey = buildObjectKey(`announcements/${orgId(req)}`, filename);
  res.json({ uploadUrl: await getUploadUrl(imageKey, contentType), imageKey });
});
