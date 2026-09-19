import { AppError } from '../../../utils/AppError.js';
import { getLeaderboard } from '../../leaderboard/leaderboard.service.js';
import * as repo from './overview.repository.js';
import { getPaymentSummary } from '../../billing/billing.service.js';

const ATTENDANCE_WINDOW_DAYS = 30;
const RECENT_LIMIT = 5;

/**
 * Guard принадлежности: ребёнок должен быть привязан к этому родителю
 * (student_profiles.parent_id). Возвращает карточку ребёнка или бросает 403 —
 * родитель не должен даже знать, существует ли чужой ребёнок.
 */
async function assertParentOwnsChild(parentId, childId) {
  const child = await repo.getChild(parentId, childId);
  if (!child) throw new AppError(403, 'Child does not belong to this parent');
  return child;
}

/** Список детей родителя (краткие карточки для экрана выбора). */
export async function listChildren(parentId) {
  return repo.getChildrenForParent(parentId);
}

/** FE-PARENT-PAGINATION: постраничная история посещаемости одного ребёнка. */
export async function getChildAttendance(parentId, childId, page, limit) {
  await assertParentOwnsChild(parentId, childId);
  return repo.getAttendancePage(childId, page, limit);
}

/** FE-PARENT-PAGINATION: постраничные оценки (ДЗ или тесты) одного ребёнка. */
export async function getChildGrades(parentId, childId, type, page, limit) {
  await assertParentOwnsChild(parentId, childId);
  return repo.getGradesPage(childId, type, page, limit);
}

export async function getChildGroupRating(parentId, childId) {
  await assertParentOwnsChild(parentId, childId);
  return repo.getGroupRating(childId);
}

export async function getHomeworkDetail(parentId, homeworkId) {
  const detail = await repo.getHomeworkDetailForParent(parentId, homeworkId);
  if (!detail) throw new AppError(403, 'Homework result does not belong to this parent');
  return detail;
}

export async function getTestDetail(parentId, testId) {
  const row = await repo.getTestDetailForParent(parentId, testId);
  if (!row) throw new AppError(403, 'Test result does not belong to this parent');

  const questions = Array.isArray(row.questions) ? row.questions : [];
  const answers = Array.isArray(row.answers) ? row.answers : [];
  const mappedAnswers = questions.map((question, index) => {
    const selected = answers[index];
    const correct = question.correct;
    return {
      question: question.q,
      studentAnswer: question.options?.[selected] ?? 'Нет ответа',
      correctAnswer: question.options?.[correct] ?? '—',
      isCorrect: selected === correct,
    };
  });
  const correctAnswers = mappedAnswers.filter((answer) => answer.isCorrect);
  const wrongAnswers = mappedAnswers.filter((answer) => !answer.isCorrect);

  return {
    id: row.id,
    title: row.title,
    groupName: row.group_name,
    durationMin: row.duration_min,
    score: correctAnswers.length,
    maxScore: questions.length,
    finishedAt: row.finished_at,
    totalQuestions: questions.length,
    correctCount: correctAnswers.length,
    wrongCount: wrongAnswers.length,
    correctAnswers,
    wrongAnswers,
  };
}

/**
 * Полный обзор одного ребёнка: коины, долг, недельный рейтинг, группы,
 * посещаемость (сводка за 30 дней + последние отметки) и оценки (ДЗ + тесты).
 */
export async function getChildOverview(parentId, childId) {
  const child = await assertParentOwnsChild(parentId, childId);

  const [leaderboard, groups, attendanceSummary, recentAttendance, homeworkGrades, testResults, payment] =
    await Promise.all([
      getLeaderboard(child.branchId, 'week', { limit: 20, studentId: childId }),
      repo.getGroups(childId),
      repo.getAttendanceSummary(childId, ATTENDANCE_WINDOW_DAYS),
      repo.getRecentAttendance(childId, RECENT_LIMIT),
      repo.getRecentHomeworkGrades(childId, RECENT_LIMIT),
      repo.getRecentTestResults(childId, RECENT_LIMIT),
      getPaymentSummary(childId),
    ]);

  return {
    child: {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      avatarKey: child.avatarKey,
      frozen: child.frozen,
    },
    coins: child.coins,
    totalDebt: child.totalDebt,
    currentInvoice: payment.currentInvoice,
    paymentBalance: payment.balance,
    rank: leaderboard.me,
    groups,
    attendance: {
      windowDays: ATTENDANCE_WINDOW_DAYS,
      summary: attendanceSummary,
      recent: recentAttendance,
    },
    grades: {
      homework: homeworkGrades,
      tests: testResults,
    },
  };
}
