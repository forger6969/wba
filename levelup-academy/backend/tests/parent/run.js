/**
 * Integration tests for the Parent domain (src/modules/parent/**) against the
 * LIVE Postgres + Redis stack. No HTTP server, no auth — services are called
 * directly with the parent's user id.
 *
 * Run:  node tests/parent/run.js
 */
import { pool } from '../../src/config/db.js';
import { redis, closeRedis } from '../../src/config/redis.js';
import { notificationQueue } from '../../src/queues/notification.queue.js';

import * as overviewService from '../../src/modules/parent/overview/overview.service.js';
import * as notificationsService from '../../src/modules/parent/notifications/notifications.service.js';
import { changeCoins } from '../../src/modules/coins/coins.service.js';
import { isoWeekKey, monthKey } from '../../src/shared/period.js';

import { setupFixtures, teardownFixtures } from './fixtures.js';
import { scenario, printSummary, assert, assertEqual, expectAppError } from './lib/harness.js';

async function main() {
  const ctx = await setupFixtures();
  const { branchId, parentId, otherParentId, mentorId, childId, outsiderChildId, groupId, hwId, testId } = ctx;

  // Give the child some coins so the leaderboard rank is populated.
  await changeCoins({
    studentId: childId, actorId: mentorId, amount: 300,
    operation: 'system', reason: 'Test setup grant',
  });

  // =======================================================================
  // 1. List children — scoped to the parent
  // =======================================================================
  await scenario(1, 'listChildren returns only this parent\'s children', async () => {
    const children = await overviewService.listChildren(parentId);
    assertEqual(children.length, 1, 'parent should see exactly one child');
    assertEqual(children[0].id, childId, 'the listed child should be the parent\'s child');
    assertEqual(children[0].coins, 300, 'child card should carry the coin balance');
    assertEqual(Number(children[0].totalDebt), 150000, 'child card should carry the debt');

    const otherChildren = await overviewService.listChildren(otherParentId);
    assertEqual(otherChildren.length, 1, 'other parent sees exactly their own child');
    assertEqual(otherChildren[0].id, outsiderChildId, 'other parent sees only their child');
  });

  // =======================================================================
  // 2. Child overview — full shape
  // =======================================================================
  await scenario(2, 'getChildOverview returns coins/debt/rank/groups/attendance/grades', async () => {
    const data = await overviewService.getChildOverview(parentId, childId);

    assertEqual(data.child.id, childId, 'overview should be for the requested child');
    assertEqual(data.coins, 300, 'coins should match the balance');
    assertEqual(Number(data.totalDebt), 150000, 'totalDebt should match the profile');
    assert(data.rank && data.rank.rank === 1, 'child should be rank 1 in its branch');

    assertEqual(data.groups.length, 1, 'child should be in exactly one group');
    assertEqual(data.groups[0].id, groupId, 'group id should match');
    assert(data.groups[0].mentorName.includes('Mentor'), 'mentorName should be populated');

    const { summary } = data.attendance;
    assertEqual(summary.present, 2, 'two present records expected');
    assertEqual(summary.absent, 1, 'one absent record expected');
    assertEqual(summary.late, 1, 'one late record expected');
    assertEqual(summary.total, 4, 'four attendance records total');
    assertEqual(data.attendance.recent.length, 4, 'recent attendance should list all four');

    assertEqual(data.grades.homework.length, 1, 'one graded homework expected');
    assertEqual(data.grades.homework[0].score, 88, 'homework score should match');
    assertEqual(data.grades.homework[0].maxScore, 100, 'homework maxScore should match');

    assertEqual(data.grades.tests.length, 1, 'one finished test expected');
    assertEqual(data.grades.tests[0].score, 100, 'test score should match');
    assertEqual(data.grades.tests[0].maxScore, 100, 'test score is stored as percent');
  });

  // =======================================================================
  // 3. Ownership guard — foreign child -> 403
  // =======================================================================
  await scenario(3, 'getChildOverview on another parent\'s child -> 403', async () => {
    await expectAppError(
      () => overviewService.getChildOverview(parentId, outsiderChildId),
      403,
      'does not belong',
    );
  });

  // =======================================================================
  // 4. Ownership guard — unknown child id -> 403 (no existence leak)
  // =======================================================================
  await scenario(4, 'getChildOverview on a non-existent child -> 403', async () => {
    await expectAppError(
      () => overviewService.getChildOverview(parentId, mentorId),
      403,
    );
  });

  await scenario(5, 'group rating and grade details are scoped and fully shaped', async () => {
    const rating = await overviewService.getChildGroupRating(parentId, childId);
    assertEqual(rating.groupId, groupId, 'rating should use the child active group');
    assert(rating.students.some((student) => student.childId === childId), 'rating should contain the child');

    const homework = await overviewService.getHomeworkDetail(parentId, hwId);
    assertEqual(homework.id, hwId, 'homework detail id should match');
    assertEqual(homework.score, 88, 'homework detail score should match');

    const test = await overviewService.getTestDetail(parentId, testId);
    assertEqual(test.id, testId, 'test detail id should match');
    assertEqual(test.totalQuestions, 2, 'test detail should expose question count');
    assertEqual(test.correctCount, 2, 'fixture answers should both be correct');

    await expectAppError(() => overviewService.getHomeworkDetail(otherParentId, hwId), 403);
    await expectAppError(() => overviewService.getTestDetail(otherParentId, testId), 403);
  });

  // =======================================================================
  // 5. Notifications feed — grades/attendance/payments, scoped to own children
  // =======================================================================
  await scenario(6, 'notifications feed merges grade/attendance/payment events, sorted desc, scoped to own children', async () => {
    const { items } = await notificationsService.listForParent(parentId);

    assert(items.length >= 5, `expected at least 5 events, got ${items.length}`);

    const byType = (t) => items.filter((n) => n.type === t);
    assertEqual(byType('grade').length, 2, 'one homework grade + one test grade');
    assertEqual(byType('attendance').length, 2, 'one absent + one late (present is not notification-worthy)');
    assertEqual(byType('payment').length, 2, 'one payment-received + one overdue invoice');

    const hwEvent = items.find((n) => n.id.startsWith('hw:'));
    assert(hwEvent && hwEvent.body.includes('88/100'), 'homework event should mention the score');

    const testEvent = items.find((n) => n.id.startsWith('test:'));
    assert(testEvent && testEvent.body.includes('100%'), 'test event should mention the percent score');

    const lateEvent = items.find((n) => n.id.startsWith('att:') && n.title === 'Опоздание');
    assert(lateEvent, 'a late-attendance event should be present');

    const paidEvent = items.find((n) => n.id.startsWith('pay:'));
    assert(paidEvent && paidEvent.body.includes('500') && paidEvent.body.includes('сум'), 'payment event should mention the amount');

    const overdueEvent = items.find((n) => n.id.startsWith('overdue:'));
    assert(overdueEvent && overdueEvent.body.includes('300'), 'overdue event should mention the outstanding amount');

    assert(items.every((n) => n.read === false), 'read is always false — no mark-as-read exists yet');

    const dates = items.map((n) => new Date(n.createdAt).getTime());
    const sorted = [...dates].sort((a, b) => b - a);
    assertEqual(JSON.stringify(dates), JSON.stringify(sorted), 'feed should be sorted by createdAt desc');

    const { items: otherItems } = await notificationsService.listForParent(otherParentId);
    assert(
      otherItems.every((n) => !n.body.includes('Kid Test')),
      'other parent\'s feed should never mention this parent\'s child',
    );
  });

  const ok = printSummary();

  await teardownFixtures(ctx);
  try {
    await redis.del(`lb:branch:${branchId}:week:${isoWeekKey()}`, `lb:branch:${branchId}:month:${monthKey()}`);
  } catch (err) {
    console.error('[teardown] redis cleanup failed (continuing):', err.message);
  }
  await notificationQueue.close();
  await closeRedis();
  await pool.end();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error('FATAL', err);
  process.exit(1);
});
