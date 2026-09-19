import { AppError } from '../../../utils/AppError.js';
import { buildObjectKey, getUploadUrl as getS3UploadUrl } from '../../../config/s3.js';
import { getStudentGroupIds, isStudentInGroup } from '../../../shared/membership.js';
import {
  listHomeworkForStudent,
  getHomeworkById,
  upsertSubmission,
} from '../../homework/homework.repository.js';

export async function listForStudent(studentId) {
  const groupIds = await getStudentGroupIds(studentId);
  return listHomeworkForStudent(studentId, groupIds);
}

async function assertMembership(studentId, homeworkId) {
  const homework = await getHomeworkById(homeworkId);
  if (!homework) throw new AppError(404, 'Homework not found');
  if (homework.is_archived) throw new AppError(409, 'Homework is archived'); // архив = read-only

  const inGroup = await isStudentInGroup(studentId, homework.group_id);
  if (!inGroup) throw new AppError(403, 'Not a member of this group');

  return homework;
}

/** Presigned PUT для загрузки файла решения — до отправки на сервер. */
export async function getUploadUrl(studentId, homeworkId, { filename, contentType }) {
  await assertMembership(studentId, homeworkId);

  const fileKey = buildObjectKey('homework', filename);
  const uploadUrl = await getS3UploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

/** Сдача ДЗ: status = 'late', если сдано после дедлайна. Пересдача после оценки — 409. */
export async function submit(studentId, homeworkId, { fileKey, textAnswer }) {
  const homework = await assertMembership(studentId, homeworkId);

  const status = Date.now() > new Date(homework.deadline).getTime() ? 'late' : 'submitted';
  const submission = await upsertSubmission({ homeworkId, studentId, fileKey, textAnswer, status });
  if (!submission) throw new AppError(409, 'Homework is already graded — resubmission is not allowed');
  return submission;
}
