/**
 * Integration tests for the Student domain (src/modules/student/**) against the
 * LIVE Postgres + Redis + MinIO stack. No HTTP server, no auth — services/
 * controllers are called directly with hand-built req.user objects.
 *
 * Run:  node tests/student/run.js
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/db.js';
import { redis, closeRedis } from '../../src/config/redis.js';
import { notificationQueue } from '../../src/queues/notification.queue.js';

import * as homeService from '../../src/modules/student/home/home.service.js';
import * as shopService from '../../src/modules/student/shop/shop.service.js';
import * as shopCtrl from '../../src/modules/student/shop/shop.controller.js';
import * as homeworkService from '../../src/modules/student/homework/homework.service.js';
import * as testsService from '../../src/modules/student/tests/tests.service.js';
import * as videosService from '../../src/modules/student/videos/videos.service.js';
import { getLeaderboard } from '../../src/modules/leaderboard/leaderboard.service.js';
import { changeCoins, getBalance } from '../../src/modules/coins/coins.service.js';
import { createHomework, gradeSubmission } from '../../src/modules/homework/homework.repository.js';
import { isoWeekKey, monthKey } from '../../src/shared/period.js';

import { setupFixtures, teardownFixtures } from './fixtures.js';
import {
  scenario, printSummary, assert, assertEqual, expectAppError, callController,
} from './lib/harness.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

async function main() {
  const ctx = await setupFixtures();
  const { branchId, mentorId, studentAId, studentBId, studentCId, groupId } = ctx;

  const mentorUser = { id: mentorId, role: 'mentor', branchId };
  const studentAUser = { id: studentAId, role: 'student', branchId };
  const studentBUser = { id: studentBId, role: 'student', branchId };
  const studentCUser = { id: studentCId, role: 'student', branchId };

  // ---------------------------------------------------------------------
  // Fixture data that scenarios below depend on (not itself a scenario)
  // ---------------------------------------------------------------------
  await changeCoins({
    studentId: studentAId, actorId: mentorId, amount: 1000,
    operation: 'system', reason: 'Test setup grant',
  });
  await changeCoins({
    studentId: studentBId, actorId: mentorId, amount: 500,
    operation: 'system', reason: 'Test setup grant',
  });
  // studentC intentionally kept at 0 balance (insufficient-funds scenario)

  const now = Date.now();

  const hwFutureSubmit = await createHomework({
    branchId, groupId, createdBy: mentorId, title: 'HW Future Submit',
    maxScore: 100, coinReward: 0, deadline: new Date(now + 3 * HOUR),
  });
  const hwUpcoming = await createHomework({
    branchId, groupId, createdBy: mentorId, title: 'HW Upcoming',
    maxScore: 100, coinReward: 0, deadline: new Date(now + 2 * DAY),
  });
  const hwGraded = await createHomework({
    branchId, groupId, createdBy: mentorId, title: 'HW Graded (future deadline)',
    maxScore: 100, coinReward: 0, deadline: new Date(now + 5 * DAY),
  });
  const hwPast = await createHomework({
    branchId, groupId, createdBy: mentorId, title: 'HW Past Deadline',
    maxScore: 100, coinReward: 0, deadline: new Date(now - 1 * HOUR),
  });

  // pre-submit + grade hwGraded so home dashboard's "graded excluded" filter has something to exclude
  const gradedSubmission = await homeworkService.submit(studentAId, hwGraded.id, { textAnswer: 'answer' });
  await gradeSubmission({ submissionId: gradedSubmission.id, score: 90, gradedBy: mentorId });

  const test1Questions = [
    { q: 'Q1', options: ['a', 'b', 'c'], correct: 1 },
    { q: 'Q2', options: ['x', 'y'], correct: 0 },
  ];
  const { rows: [test1] } = await pool.query(
    `INSERT INTO tests (branch_id, group_id, created_by, title, questions, duration_min, starts_at, ends_at, coin_reward)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) RETURNING *`,
    [branchId, groupId, mentorId, 'Test 1 (passable)', JSON.stringify(test1Questions), 10, null, new Date(now + 1 * DAY), 60],
  );
  const { rows: [test2NotOpen] } = await pool.query(
    `INSERT INTO tests (branch_id, group_id, created_by, title, questions, duration_min, starts_at, ends_at, coin_reward)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) RETURNING *`,
    [branchId, groupId, mentorId, 'Test 2 (not open yet)', JSON.stringify(test1Questions), 10, new Date(now + 1 * DAY), null, 0],
  );
  const { rows: [test3Closed] } = await pool.query(
    `INSERT INTO tests (branch_id, group_id, created_by, title, questions, duration_min, starts_at, ends_at, coin_reward)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) RETURNING *`,
    [branchId, groupId, mentorId, 'Test 3 (closed)', JSON.stringify(test1Questions), 10, null, new Date(now - 1 * HOUR), 0],
  );
  const { rows: [test4Timer] } = await pool.query(
    `INSERT INTO tests (branch_id, group_id, created_by, title, questions, duration_min, starts_at, ends_at, coin_reward)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) RETURNING *`,
    [branchId, groupId, mentorId, 'Test 4 (timer expires)', JSON.stringify(test1Questions), 5, null, new Date(now + 1 * DAY), 60],
  );

  const item2 = await shopService.createItem(branchId, { name: 'Concurrent Item', coinPrice: 50, stock: 1 });
  const item3 = await shopService.createItem(branchId, { name: 'Expensive Item', coinPrice: 200, stock: 5 });

  const { rows: [video1] } = await pool.query(
    `INSERT INTO videos (branch_id, group_id, uploaded_by, title, video_key)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [branchId, groupId, mentorId, 'Lesson 1', `videos/${randomUUID()}/lesson1.mp4`],
  );

  let item1 = null; // created during scenario 2 (via controller, admin role guard)

  // =======================================================================
  // 1. Home dashboard
  // =======================================================================
  await scenario(1, 'Home dashboard: coins/debt/rank/groups/upcomingHomework', async () => {
    const data = await homeService.getDashboard(studentAUser);

    assertEqual(data.coins, 1000, 'coins should match profile balance');
    assertEqual(Number(data.totalDebt), 0, 'totalDebt should be 0 by default');
    assert(data.rank && typeof data.rank.rank === 'number', 'rank.rank should be numeric');
    assertEqual(data.rank.rank, 1, 'studentA should be rank 1 (1000 > studentB 500)');

    assertEqual(data.groups.length, 1, 'should return exactly the seeded group');
    assertEqual(data.groups[0].id, groupId, 'group id should match seeded group');
    assert(data.groups[0].mentorName.includes('Mentor'), 'mentorName should be populated');

    const upcomingIds = data.upcomingHomework.map((h) => h.id);
    assert(upcomingIds.includes(hwFutureSubmit.id), 'future homework should appear in upcoming list');
    assert(upcomingIds.includes(hwUpcoming.id), 'future homework should appear in upcoming list');
    assert(!upcomingIds.includes(hwGraded.id), 'graded homework must be excluded even with future deadline');
    assert(!upcomingIds.includes(hwPast.id), 'past-deadline homework must be excluded');

    // sorted ascending by deadline
    const idx1 = upcomingIds.indexOf(hwFutureSubmit.id);
    const idx2 = upcomingIds.indexOf(hwUpcoming.id);
    assert(idx1 < idx2, 'upcomingHomework should be sorted ascending by deadline');
  });

  // =======================================================================
  // 2. Shop admin role guard
  // =======================================================================
  await scenario(2, 'Shop: admin/mentor creates item; student create -> 403', async () => {
    const { rows: [{ count: before }] } = await pool.query(
      `SELECT count(*)::int FROM shop_items WHERE branch_id = $1`, [branchId],
    );

    const req = { user: mentorUser, body: { name: 'Item1', coinPrice: 100, stock: 2 } };
    const res = await callController(shopCtrl.createItem, req);
    assertEqual(res.statusCode, 201, 'mentor create should return 201');
    assert(res.body.success && res.body.data.id, 'response should include created item');
    item1 = res.body.data;

    const studentReq = { user: studentAUser, body: { name: 'Hack Item', coinPrice: 1, stock: 1 } };
    await expectAppError(() => callController(shopCtrl.createItem, studentReq), 403);

    const { rows: [{ count: after }] } = await pool.query(
      `SELECT count(*)::int FROM shop_items WHERE branch_id = $1`, [branchId],
    );
    assertEqual(after, before + 1, 'only the mentor create should have inserted a row (student 403 must not insert)');
  });

  // =======================================================================
  // 3. List items
  // =======================================================================
  await scenario(3, 'Shop: list active in-stock items for branch', async () => {
    const items = await shopService.listItems(branchId);
    const ids = items.map((i) => i.id);
    assert(ids.includes(item1.id), 'item1 should be listed');
    assert(ids.includes(item2.id), 'item2 should be listed');
    assert(ids.includes(item3.id), 'item3 should be listed');
    assert(items.every((i) => i.stock > 0), 'all listed items should have stock > 0');
  });

  // =======================================================================
  // 4. Purchase with sufficient balance
  // =======================================================================
  await scenario(4, 'Shop: purchase with sufficient balance decrements stock/balance, creates order+history', async () => {
    const balanceBefore = await getBalance(studentAId);
    const weekKeyBefore = await redis.zscore(`lb:branch:${branchId}:week:${isoWeekKey()}`, studentAId);

    const order = await shopService.purchaseItem({ itemId: item1.id, studentId: studentAId, branchId });
    assert(order && order.id, 'purchase should return the created order');
    assertEqual(order.coin_price, 100, 'order should snapshot the item price');

    const balanceAfter = await getBalance(studentAId);
    assertEqual(balanceAfter, balanceBefore - 100, 'balance should decrease by coinPrice');

    const { rows: [itemRow] } = await pool.query(`SELECT stock FROM shop_items WHERE id = $1`, [item1.id]);
    assertEqual(itemRow.stock, 1, 'stock should decrement by 1 (2 -> 1)');

    const { rows: [orderRow] } = await pool.query(`SELECT * FROM shop_orders WHERE id = $1`, [order.id]);
    assert(orderRow, 'shop_orders row should exist');
    assertEqual(orderRow.coin_price, 100, 'shop_orders should snapshot price');

    const { rows: historyRows } = await pool.query(
      `SELECT * FROM coin_history WHERE student_id = $1 AND ref_type = 'shop_order' AND ref_id = $2`,
      [studentAId, item1.id],
    );
    assertEqual(historyRows.length, 1, 'a coin_history row should be created for the purchase');
    assertEqual(historyRows[0].operation, 'purchase', 'operation should be "purchase"');
    assertEqual(historyRows[0].amount, -100, 'amount should be negative');

    // leaderboard must NOT move on a purchase (negative amounts never touch the ZSET)
    const weekKeyAfter = await redis.zscore(`lb:branch:${branchId}:week:${isoWeekKey()}`, studentAId);
    assertEqual(Number(weekKeyAfter), Number(weekKeyBefore), 'leaderboard score must be unchanged after a purchase');
  });

  // =======================================================================
  // 5. Purchase with insufficient balance -> rollback
  // =======================================================================
  await scenario(5, 'Shop: purchase with insufficient balance -> 422, nothing changes (rollback)', async () => {
    const balanceBefore = await getBalance(studentCId); // 0
    const { rows: [{ stock: stockBefore }] } = await pool.query(`SELECT stock FROM shop_items WHERE id = $1`, [item3.id]);
    const { rows: [{ count: ordersBefore }] } = await pool.query(
      `SELECT count(*)::int FROM shop_orders WHERE item_id = $1`, [item3.id],
    );

    await expectAppError(
      () => shopService.purchaseItem({ itemId: item3.id, studentId: studentCId, branchId }),
      422,
    );

    const balanceAfter = await getBalance(studentCId);
    assertEqual(balanceAfter, balanceBefore, 'balance must be unchanged');

    const { rows: [{ stock: stockAfter }] } = await pool.query(`SELECT stock FROM shop_items WHERE id = $1`, [item3.id]);
    assertEqual(stockAfter, stockBefore, 'stock must be unchanged');

    const { rows: [{ count: ordersAfter }] } = await pool.query(
      `SELECT count(*)::int FROM shop_orders WHERE item_id = $1`, [item3.id],
    );
    assertEqual(ordersAfter, ordersBefore, 'no order row should be created (full rollback)');
  });

  // =======================================================================
  // 6. Stock exhaustion + concurrency
  // =======================================================================
  await scenario(6, 'Shop: stock hits 0 -> next purchase 409; concurrent purchases serialize to exactly one winner', async () => {
    // item1 currently has stock=1 (after scenario 4) — buy the last unit, then try one more
    const order2 = await shopService.purchaseItem({ itemId: item1.id, studentId: studentBId, branchId });
    assert(order2 && order2.id, 'second purchase should succeed and bring stock to 0');

    const { rows: [{ stock: stockZero }] } = await pool.query(`SELECT stock FROM shop_items WHERE id = $1`, [item1.id]);
    assertEqual(stockZero, 0, 'stock should now be 0');

    await expectAppError(
      () => shopService.purchaseItem({ itemId: item1.id, studentId: studentCId, branchId }),
      409,
      'unavailable',
    );

    // bonus: concurrent purchases on item2 (stock=1) — exactly one must succeed
    const [resultA, resultB] = await Promise.allSettled([
      shopService.purchaseItem({ itemId: item2.id, studentId: studentAId, branchId }),
      shopService.purchaseItem({ itemId: item2.id, studentId: studentBId, branchId }),
    ]);

    const fulfilled = [resultA, resultB].filter((r) => r.status === 'fulfilled');
    const rejected = [resultA, resultB].filter((r) => r.status === 'rejected');
    assertEqual(fulfilled.length, 1, 'exactly one concurrent purchase should succeed');
    assertEqual(rejected.length, 1, 'exactly one concurrent purchase should fail');
    assertEqual(rejected[0].reason.statusCode, 409, 'the loser should get 409 out of stock');

    const { rows: [{ stock: item2StockAfter }] } = await pool.query(`SELECT stock FROM shop_items WHERE id = $1`, [item2.id]);
    assertEqual(item2StockAfter, 0, 'item2 stock should be 0 after the race');
  });

  // =======================================================================
  // 7. Order history
  // =======================================================================
  await scenario(7, 'Shop: student order history lists their orders', async () => {
    const orders = await shopService.listOrders(studentAId);
    assert(orders.some((o) => o.item_id === item1.id), 'studentA order history should include the item1 purchase');
    assert(orders.every((o) => o.item_name), 'orders should be joined with item name');
  });

  // =======================================================================
  // 9. Homework upload-url + membership guard
  // =======================================================================
  await scenario(9, 'Homework: upload-url returns presigned PUT + fileKey; non-member -> 403', async () => {
    const data = await homeworkService.getUploadUrl(studentAId, hwFutureSubmit.id, {
      filename: 'solution.pdf', contentType: 'application/pdf',
    });
    assert(/^https?:\/\//.test(data.uploadUrl), 'uploadUrl should be an http(s) url');
    assert(data.fileKey.startsWith('homework/'), 'fileKey should have the homework/ prefix');

    await expectAppError(
      () => homeworkService.getUploadUrl(studentCId, hwFutureSubmit.id, {
        filename: 'x.pdf', contentType: 'application/pdf',
      }),
      403,
    );
  });

  // =======================================================================
  // 10. Submit homework (submitted vs late)
  // =======================================================================
  await scenario(10, 'Homework: submit -> "submitted" before deadline, "late" after deadline', async () => {
    const subFuture = await homeworkService.submit(studentAId, hwFutureSubmit.id, { textAnswer: 'on time' });
    assertEqual(subFuture.status, 'submitted', 'submission before deadline should be "submitted"');

    const subPast = await homeworkService.submit(studentAId, hwPast.id, { textAnswer: 'oops late' });
    assertEqual(subPast.status, 'late', 'submission after deadline should be "late"');
  });

  // =======================================================================
  // 8. List my homework (statuses reflect submissions above)
  // =======================================================================
  await scenario(8, 'Homework: list my homework includes group homework with my submission status', async () => {
    const list = await homeworkService.listForStudent(studentAId);
    const byId = Object.fromEntries(list.map((h) => [h.id, h]));

    assert(byId[hwFutureSubmit.id], 'hwFutureSubmit should be listed');
    assertEqual(byId[hwFutureSubmit.id].submission_status, 'submitted', 'hwFutureSubmit status should be submitted');

    assert(byId[hwPast.id], 'hwPast should be listed');
    assertEqual(byId[hwPast.id].submission_status, 'late', 'hwPast status should be late');

    assert(byId[hwGraded.id], 'hwGraded should be listed');
    assertEqual(byId[hwGraded.id].submission_status, 'graded', 'hwGraded status should be graded');
    assertEqual(byId[hwGraded.id].score, 90, 'hwGraded score should be 90');

    assert(byId[hwUpcoming.id], 'hwUpcoming should be listed');
    assertEqual(byId[hwUpcoming.id].submission_status, null, 'hwUpcoming has no submission yet');
  });

  // =======================================================================
  // 11. List tests — correct stripped
  // =======================================================================
  await scenario(11, 'Tests: list my tests strips `correct` from every question', async () => {
    const list = await testsService.listForStudent(studentAId);
    assert(list.length > 0, 'studentA should have tests listed');
    for (const t of list) {
      for (const q of t.questions) {
        assert(!('correct' in q), `question should not expose "correct" (test ${t.id})`);
      }
    }
  });

  // =======================================================================
  // 12. Get test to take — sanitized + window checks
  // =======================================================================
  await scenario(12, 'Tests: get test to take is sanitized; not-open and closed windows rejected', async () => {
    const t = await testsService.getTestToTake(studentAId, test1.id);
    for (const q of t.questions) assert(!('correct' in q), 'correct must be stripped');

    await expectAppError(() => testsService.getTestToTake(studentAId, test2NotOpen.id), 409, 'not open');
    await expectAppError(() => testsService.getTestToTake(studentAId, test3Closed.id), 409, 'closed');
  });

  // =======================================================================
  // 13. Start attempt + double-start conflict
  // =======================================================================
  await scenario(13, 'Tests: start attempt creates test_results row; double-start -> 409', async () => {
    const attempt = await testsService.startAttempt(studentAId, test1.id);
    assert(attempt.startedAt, 'startAttempt should return startedAt');

    const { rows: [row] } = await pool.query(
      `SELECT * FROM test_results WHERE test_id = $1 AND student_id = $2`, [test1.id, studentAId],
    );
    assert(row && row.started_at, 'test_results row should exist with started_at');

    await expectAppError(() => testsService.startAttempt(studentAId, test1.id), 409, 'already started');
  });

  // =======================================================================
  // 14. Submit within window -> score + coin reward; double-submit conflict
  // =======================================================================
  await scenario(14, 'Tests: submit in-window computes score, awards coins on pass; re-submit -> 409', async () => {
    const balanceBefore = await getBalance(studentAId);

    const result = await testsService.submitAttempt(studentAId, test1.id, [1, 0]); // both correct
    assertEqual(result.score, 100, 'score should be round(2/2*100) = 100');

    const balanceAfter = await getBalance(studentAId);
    assertEqual(balanceAfter, balanceBefore + 60, 'coin_reward (60) should be credited on pass');

    const { rows: historyRows } = await pool.query(
      `SELECT * FROM coin_history WHERE student_id = $1 AND ref_type = 'test' AND ref_id = $2`,
      [studentAId, test1.id],
    );
    assertEqual(historyRows.length, 1, 'a coin_history row should record the test reward');
    assertEqual(historyRows[0].operation, 'reward', 'operation should be "reward"');
    assertEqual(historyRows[0].amount, 60, 'amount should equal coin_reward');

    await expectAppError(() => testsService.submitAttempt(studentAId, test1.id, [1, 0]), 409, 'already submitted');
  });

  // =======================================================================
  // 15. Submit after the timer -> 409, no coins
  // =======================================================================
  await scenario(15, 'Tests: submit after the timer expires -> 409 time is up, no coins awarded', async () => {
    await testsService.startAttempt(studentBId, test4Timer.id);
    // simulate elapsed time: back-date started_at beyond duration_min (5 min)
    await pool.query(
      `UPDATE test_results SET started_at = now() - interval '1 hour' WHERE test_id = $1 AND student_id = $2`,
      [test4Timer.id, studentBId],
    );

    const balanceBefore = await getBalance(studentBId);
    await expectAppError(() => testsService.submitAttempt(studentBId, test4Timer.id, [1, 0]), 409, 'time is up');
    const balanceAfter = await getBalance(studentBId);
    assertEqual(balanceAfter, balanceBefore, 'balance must be unchanged when time is up');

    const { rows: historyRows } = await pool.query(
      `SELECT * FROM coin_history WHERE student_id = $1 AND ref_type = 'test' AND ref_id = $2`,
      [studentBId, test4Timer.id],
    );
    assertEqual(historyRows.length, 0, 'no coin_history row should be created when time is up');
  });

  // =======================================================================
  // 16. Videos
  // =======================================================================
  await scenario(16, 'Videos: list for my groups; stream-url presigned GET; non-member -> 403', async () => {
    const list = await videosService.listForStudent(studentAId);
    assert(list.some((v) => v.id === video1.id), 'video1 should be listed for studentA');

    const stream = await videosService.getStreamUrl(studentAId, video1.id);
    assert(/^https?:\/\//.test(stream.streamUrl), 'streamUrl should be an http(s) url');

    await expectAppError(() => videosService.getStreamUrl(studentCId, video1.id), 403);
  });

  // =======================================================================
  // 17. Leaderboard
  // =======================================================================
  await scenario(17, 'Leaderboard: week & month reflect coin totals; "me" has numeric rank', async () => {
    for (const period of ['week', 'month']) {
      const board = await getLeaderboard(branchId, period, { limit: 20, studentId: studentAId });
      assertEqual(board.period, period, 'period echoed back');

      const meA = board.me;
      assert(typeof meA.rank === 'number', `me.rank should be numeric (${period})`);
      assertEqual(meA.rank, 1, `studentA should rank 1st (${period})`);
      assertEqual(meA.coins, 1060, `studentA total should be 1000 (grant) + 60 (test reward) = 1060 (${period})`);

      const topEntry = board.top.find((r) => r.studentId === studentAId);
      assert(topEntry, `studentA should appear in the top list (${period})`);
      assertEqual(topEntry.coins, 1060, `top-list coins should match (${period})`);

      const boardB = await getLeaderboard(branchId, period, { limit: 20, studentId: studentBId });
      assertEqual(boardB.me.coins, 500, `studentB coins should stay at the initial grant, purchases don't move it (${period})`);
    }
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
