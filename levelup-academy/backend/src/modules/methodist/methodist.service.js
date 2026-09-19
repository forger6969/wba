import { AppError } from '../../utils/AppError.js';
import * as repo from './methodist.repository.js';

// ==================== ТЕСТЫ ====================

export async function createTest(orgId, userId, payload) {
  const test = await repo.createTest({
    branchId: payload.branchId,
    createdBy: userId,
    title: payload.title,
    description: payload.description,
    questions: payload.questions,
    durationMin: payload.durationMin,
    coinReward: payload.coinReward,
  });
  return test;
}

export async function listTests(orgId) {
  return repo.listTestsByOrg(orgId);
}

export async function getTest(testId) {
  const test = await repo.getTestById(testId);
  if (!test) throw new AppError(404, 'Test not found');
  return test;
}

export async function updateTest(testId, userId, payload) {
  const test = await repo.updateTest(testId, userId, payload);
  if (!test) throw new AppError(404, 'Test not found or you are not the author');
  return test;
}

export async function archiveTest(testId, userId) {
  const result = await repo.archiveTest(testId, userId);
  if (!result) throw new AppError(404, 'Test not found or you are not the author');
  return { id: testId, archived: true };
}

// ==================== ДОМАШНИЕ ЗАДАНИЯ ====================

export async function createHomework(orgId, userId, payload) {
  const hw = await repo.createHomework({
    branchId: payload.branchId,
    createdBy: userId,
    title: payload.title,
    description: payload.description,
    maxScore: payload.maxScore,
    coinReward: payload.coinReward,
    deadline: payload.deadline,
  });
  return hw;
}

export async function listHomework(orgId) {
  return repo.listHomeworkByOrg(orgId);
}

export async function updateHomework(homeworkId, userId, payload) {
  const hw = await repo.updateHomework(homeworkId, userId, payload);
  if (!hw) throw new AppError(404, 'Homework not found or you are not the author');
  return hw;
}

export async function archiveHomework(homeworkId, userId) {
  const result = await repo.archiveHomework(homeworkId, userId);
  if (!result) throw new AppError(404, 'Homework not found or you are not the author');
  return { id: homeworkId, archived: true };
}

// ==================== АНАЛИТИКА ====================

export async function getStudents(orgId) {
  return repo.listStudentsWithGroups(orgId);
}

export async function getGroups(orgId) {
  return repo.listGroupsByOrg(orgId);
}

export async function getDifficultyReport(orgId) {
  const [testStats, hwStats] = await Promise.all([
    repo.testDifficultyStats(orgId),
    repo.homeworkStats(orgId),
  ]);
  return { tests: testStats, homework: hwStats };
}
