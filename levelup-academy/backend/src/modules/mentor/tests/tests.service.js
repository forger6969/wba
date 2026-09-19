import { AppError } from '../../../utils/AppError.js';
import * as sharedTestsRepo from '../../tests/tests.repository.js';
import * as mentorTestsRepo from './tests.repository.js';
import { requireMentorGroup } from '../shared/groupAccess.js';

/** Создать тест/экзамен для своей группы. */
export async function createTestForGroup({ mentorId, groupId, payload }) {
  const group = await requireMentorGroup(mentorId, groupId);
  return sharedTestsRepo.createTest({
    branchId: group.branch_id,
    groupId,
    createdBy: mentorId,
    ...payload,
  });
}

/** Тесты группы (с полным набором ответов, включая correct — только для ментора). */
export async function listTestsForGroup({ mentorId, groupId }) {
  await requireMentorGroup(mentorId, groupId);
  return sharedTestsRepo.listTestsForGroup(groupId);
}

/** Результаты студентов по тесту. */
export async function listResults({ mentorId, testId }) {
  const test = await sharedTestsRepo.getTestById(testId);
  if (!test) throw new AppError(404, 'Test not found');
  await requireMentorGroup(mentorId, test.group_id);
  return mentorTestsRepo.listResultsForTest(testId);
}
