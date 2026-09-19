import { getBalance } from '../../coins/coins.service.js';
import { getLeaderboard } from '../../leaderboard/leaderboard.service.js';
import { listHomeworkForStudent } from '../../homework/homework.repository.js';
import { getStudentGroupIds } from '../../../shared/membership.js';
import { getTopicStats, getLatestReview } from '../lessons/lessons.repository.js';
import { isFeatureEnabledForOrg } from '../../../shared/orgFeatures.js';
import * as homeRepo from './home.repository.js';
import { getPaymentSummary } from '../../billing/billing.service.js';

const UPCOMING_HOMEWORK_LIMIT = 5;

/**
 * Серия посещений из `attendance`. День считается "посещённым" только если ВСЕ
 * записи на эту дату — 'present' (студент бывает в нескольких группах с занятиями
 * в один день — один прогул в этот день ломает день целиком). Серия — по датам
 * подряд в списке посещений, не по календарным дням (пропущенных лекций в
 * расписании не было — считаем только даты, где занятие реально было).
 */
function computeAttendanceStreaks(history) {
  const byDate = new Map();
  for (const { lessonDate, status } of history) {
    const key = new Date(lessonDate).toISOString().slice(0, 10);
    const wasPresent = status === 'present';
    byDate.set(key, byDate.has(key) ? byDate.get(key) && wasPresent : wasPresent);
  }

  const days = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let longestStreak = 0;
  let running = 0;
  for (const [, present] of days) {
    running = present ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
  }

  return { streak: running, longestStreak };
}

/** methodology_submissions.review (Groq responseSchema) -> контракт
 * FeedbackDemo.jsx у XOB: score/praise/growth_area/tips/summary как есть,
 * + source/status/lessonTitle сверху для UI (badge "макет"/дата и т.п.). */
function shapeReview(row) {
  if (!row) return null;
  return {
    ...row.review,
    source: row.review_source,
    status: row.review_status,
    lessonTitle: row.lesson_title,
    reviewedAt: row.reviewed_at,
  };
}

/**
 * Дашборд студента: баланс коинов, долг, недельный рейтинг, группы,
 * ближайшие невыполненные ДЗ (топ-5 по дедлайну), статистика по темам методики
 * (topicStats — где ученик системно слабее/сильнее) и последний AI-разбор
 * практической сдачи (review, Aqlli tahlil).
 */
export async function getDashboard(user) {
  const studentId = user.id;
  const groupIds = await getStudentGroupIds(studentId);

  const [coins, totalDebt, payment, leaderboard, groups, homeworkList, topicStats, latestReview, attendanceHistory, preferredLanguage, shopEnabled, tgEnabled] =
    await Promise.all([
      getBalance(studentId),
      homeRepo.getTotalDebt(studentId),
      getPaymentSummary(studentId),
      getLeaderboard(user.branchId, 'week', { limit: 20, studentId }),
      homeRepo.getGroupsForStudent(studentId),
      listHomeworkForStudent(studentId, groupIds),
      getTopicStats(studentId),
      getLatestReview(studentId),
      homeRepo.getAttendanceHistory(studentId),
      homeRepo.getPreferredLanguage(studentId),
      isFeatureEnabledForOrg(user.organizationId, 'shop'),
      isFeatureEnabledForOrg(user.organizationId, 'telegram_integration'),
    ]);
  const { streak, longestStreak } = computeAttendanceStreaks(attendanceHistory);

  const now = Date.now();
  const upcomingHomework = homeworkList
    .filter((h) => h.deadline && new Date(h.deadline).getTime() > now && h.submission_status !== 'graded')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, UPCOMING_HOMEWORK_LIMIT);

  return {
    coins,
    totalDebt,
    payment,
    rank: leaderboard.me,
    groups,
    upcomingHomework,
    topicStats: topicStats.map((t) => ({ topicId: t.topic_id, name: t.topic_name, pct: t.pct })),
    review: shapeReview(latestReview),
    streak,
    longestStreak,
    preferredLanguage,
    orgFeatures: { shop: shopEnabled, telegramIntegration: tgEnabled },
  };
}

/** XOB (12.08): язык кабинета жил только в localStorage фронта — теперь пишем
 * и на бэкенд, чтобы AI-review/уведомления/тг-бот тоже могли его использовать. */
export async function setPreferredLanguage(studentId, language) {
  await homeRepo.setPreferredLanguage(studentId, language);
  return { preferredLanguage: language };
}
