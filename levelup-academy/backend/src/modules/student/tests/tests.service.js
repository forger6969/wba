import { AppError } from '../../../utils/AppError.js';
import { getStudentGroupIds, isStudentInGroup } from '../../../shared/membership.js';
import { changeCoins } from '../../coins/coins.service.js';
import {
  listTestsForStudent,
  getTestById,
  insertAttempt,
  finalizeAttempt,
  getResult,
} from '../../tests/tests.repository.js';

// Порог сдачи теста для начисления коинов (assumption — в спецификации не задан отдельно).
const PASS_SCORE_THRESHOLD = 50;

/** Вырезает `correct` из вопросов перед отдачей клиенту. */
function sanitizeQuestions(questions) {
  return (questions ?? []).map(({ q, options }) => ({ q, options }));
}

export async function listForStudent(studentId) {
  const groupIds = await getStudentGroupIds(studentId);
  const tests = await listTestsForStudent(studentId, groupIds);
  return tests.map((t) => ({ ...t, questions: sanitizeQuestions(t.questions) }));
}

async function getTestOr404(testId) {
  const test = await getTestById(testId);
  if (!test) throw new AppError(404, 'Test not found');
  if (test.is_archived) throw new AppError(409, 'Test is archived'); // архив = read-only
  return test;
}

async function assertMembership(studentId, test) {
  const inGroup = await isStudentInGroup(studentId, test.group_id);
  if (!inGroup) throw new AppError(403, 'Not a member of this group');
}

function assertWindowOpen(test) {
  const now = Date.now();
  if (test.starts_at && now < new Date(test.starts_at).getTime()) {
    throw new AppError(409, 'Test is not open yet');
  }
  if (test.ends_at && now > new Date(test.ends_at).getTime()) {
    throw new AppError(409, 'Test is closed');
  }
}

/** Санитизированный тест для прохождения — проверяет членство и окно доступности. */
export async function getTestToTake(studentId, testId) {
  const test = await getTestOr404(testId);
  await assertMembership(studentId, test);
  assertWindowOpen(test);

  return { ...test, questions: sanitizeQuestions(test.questions) };
}

/** Старт попытки — фиксирует started_at, отдаёт клиенту данные для таймера. */
export async function startAttempt(studentId, testId) {
  const test = await getTestOr404(testId);
  await assertMembership(studentId, test);
  assertWindowOpen(test);

  const attempt = await insertAttempt({ testId, studentId });
  if (!attempt) throw new AppError(409, 'Attempt already started');

  const startedAt = attempt.started_at;
  const durationEndsAt = new Date(startedAt.getTime() + test.duration_min * 60_000);
  const endsAt =
    test.ends_at && new Date(test.ends_at) < durationEndsAt ? new Date(test.ends_at) : durationEndsAt;

  return { startedAt, durationMin: test.duration_min, endsAt };
}

/** Сдача теста: проверка таймера сервером, подсчёт балла, награда при score >= 50. */
export async function submitAttempt(studentId, testId, answers) {
  const test = await getTestOr404(testId);
  await assertMembership(studentId, test);

  const attempt = await getResult(testId, studentId);
  if (!attempt) throw new AppError(409, 'Attempt not started');
  if (attempt.finished_at) throw new AppError(409, 'Already submitted');

  const now = Date.now();
  const timerDeadline = attempt.started_at.getTime() + test.duration_min * 60_000;
  const windowClosed = test.ends_at && now > new Date(test.ends_at).getTime();
  if (now > timerDeadline || windowClosed) {
    throw new AppError(409, 'Time is up');
  }

  const questions = test.questions ?? [];
  const correctCount = questions.reduce(
    (acc, question, idx) => acc + (answers[idx] === question.correct ? 1 : 0),
    0,
  );
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const finalized = await finalizeAttempt({ testId, studentId, answers, score });
  if (!finalized) throw new AppError(409, 'Already submitted');

  if (score >= PASS_SCORE_THRESHOLD && test.coin_reward > 0) {
    await changeCoins({
      studentId,
      actorId: studentId,
      amount: test.coin_reward,
      operation: 'reward',
      reason: 'Test passed',
      refType: 'test',
      refId: testId,
    });
  }

  return { score };
}
