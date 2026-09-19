/**
 * Integration tests for src/modules/mentor/** against the LIVE Postgres/Redis
 * infra. Services are called directly (no HTTP, no auth middleware — K-AUTH
 * is not built yet). Run with: node tests/mentor/run.js
 */
import { pool, withTransaction } from '../../src/config/db.js';
import { redis, closeRedis } from '../../src/config/redis.js';
import { notificationQueue } from '../../src/queues/notification.queue.js';
import { isoWeekKey, monthKey } from '../../src/shared/period.js';

import * as attendanceService from '../../src/modules/mentor/attendance/attendance.service.js';
import { markAttendanceBodySchema } from '../../src/modules/mentor/attendance/attendance.schemas.js';

import * as homeworkService from '../../src/modules/mentor/homework/homework.service.js';
import * as homeworkRepo from '../../src/modules/homework/homework.repository.js';

import * as testsService from '../../src/modules/mentor/tests/tests.service.js';
import { createTestBodySchema } from '../../src/modules/mentor/tests/tests.schemas.js';

import * as salaryService from '../../src/modules/mentor/salary/salary.service.js';

import { setupFixtures, teardownFixtures } from './fixtures.js';

// ---------- tiny test harness ----------
const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err });
    console.log(`  FAIL  ${name}`);
    console.log(`        -> ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'Assertion failed');
}

/** Runs fn(), expects it to reject with an AppError of the given statusCode. */
async function expectAppError(fn, expectedStatus, label = '') {
  let thrown = null;
  try {
    await fn();
  } catch (err) {
    thrown = err;
  }
  if (!thrown) throw new Error(`${label} expected to throw (status ${expectedStatus}) but resolved successfully`);
  if (thrown.statusCode !== expectedStatus) {
    throw new Error(
      `${label} expected statusCode ${expectedStatus}, got ${thrown.statusCode ?? 'non-AppError'} (${thrown.message})`,
    );
  }
}

async function getCoinBalance(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT coin_balance FROM student_profiles WHERE user_id = $1`,
    [studentId],
  );
  return row.coin_balance;
}

async function main() {
  console.log('Setting up isolated fixtures...');
  const ctx = await setupFixtures();
  const { branchId, mentorId, otherMentorId, adminId, studentIds, groupId } = ctx;
  const [s1, s2, s3] = studentIds;

  console.log(`  org=${ctx.organizationId} branch=${branchId} group=${groupId}`);
  console.log(`  mentor=${mentorId} otherMentor=${otherMentorId} admin=${adminId}`);
  console.log(`  students=${studentIds.join(',')}\n`);

  /* Дата обязана быть сегодняшней: markAttendance пускает только текущий день
     (assertToday в attendance.service.js). Раньше здесь стояло '2026-06-01',
     и после появления этого правила три теста падали на 422 — проверялся не
     тот путь, который они описывают.

     Считаем ровно так же, как сервис: по Ташкенту, а не по UTC. С полуночи до
     пяти утра по местному UTC всё ещё вчера, и прогон в это время снова
     разошёлся бы с сервисом. */
  const lessonDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const weekKey = `lb:branch:${branchId}:week:${isoWeekKey()}`;
  const monthKeyStr = `lb:branch:${branchId}:month:${monthKey()}`;

  try {
    // ============ ATTENDANCE ============
    console.log('-- Attendance --');

    await test('1. Bulk-mark mixed statuses -> rows exist with correct statuses', async () => {
      const rows = await attendanceService.markAttendance({
        mentorId,
        groupId,
        lessonDate,
        records: [
          { studentId: s1, status: 'present' },
          { studentId: s2, status: 'absent' },
          { studentId: s3, status: 'late', comment: 'Traffic' },
        ],
      });
      assert(rows.length === 3, `expected 3 rows, got ${rows.length}`);

      const { rows: dbRows } = await pool.query(
        `SELECT student_id, status FROM attendance WHERE group_id = $1 AND lesson_date = $2`,
        [groupId, lessonDate],
      );
      const byStudent = Object.fromEntries(dbRows.map((r) => [r.student_id, r.status]));
      assert(byStudent[s1] === 'present', 's1 should be present');
      assert(byStudent[s2] === 'absent', 's2 should be absent');
      assert(byStudent[s3] === 'late', 's3 should be late');
    });

    await test('2. Re-mark same group+date -> UPSERT updates in place', async () => {
      const rows = await attendanceService.markAttendance({
        mentorId,
        groupId,
        lessonDate,
        records: [
          { studentId: s1, status: 'excused', comment: 'Sick note' },
          { studentId: s2, status: 'present' },
          { studentId: s3, status: 'present' },
        ],
      });
      assert(rows.length === 3, `expected 3 rows returned, got ${rows.length}`);

      const { rows: countRows } = await pool.query(
        `SELECT count(*)::int AS n FROM attendance WHERE group_id = $1 AND lesson_date = $2`,
        [groupId, lessonDate],
      );
      assert(countRows[0].n === 3, `row count should stay 3 (upsert), got ${countRows[0].n}`);

      const { rows: dbRows } = await pool.query(
        `SELECT student_id, status FROM attendance WHERE group_id = $1 AND lesson_date = $2`,
        [groupId, lessonDate],
      );
      const byStudent = Object.fromEntries(dbRows.map((r) => [r.student_id, r.status]));
      assert(byStudent[s1] === 'excused', `s1 should now be excused, got ${byStudent[s1]}`);
      assert(byStudent[s2] === 'present', `s2 should now be present, got ${byStudent[s2]}`);
      assert(byStudent[s3] === 'present', `s3 should now be present, got ${byStudent[s3]}`);
    });

    await test('3. A different mentor marking your group -> AppError 404 (no existence leak)', async () => {
      await expectAppError(
        () => attendanceService.markAttendance({
          mentorId: otherMentorId,
          groupId,
          lessonDate,
          records: [{ studentId: s1, status: 'present' }],
        }),
        404,
        'markAttendance by other mentor',
      );
    });

    /* Само правило «только сегодня» до сих пор не было покрыто ничем — именно
       из-за этого его появление тихо уронило три теста выше, а не один
       выделенный. Проверяем обе границы: вчера и завтра. */
    await test('3b. Marking a past or future lesson -> 422', async () => {
      const shift = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
      };

      for (const [when, date] of [['past', shift(-1)], ['future', shift(1)]]) {
        await expectAppError(
          () => attendanceService.markAttendance({
            mentorId,
            groupId,
            lessonDate: date,
            records: [{ studentId: s1, status: 'present' }],
          }),
          422,
          `markAttendance in the ${when}`,
        );
      }
    });

    await test('4. Invalid attendance status rejected by zod schema', async () => {
      const parsed = markAttendanceBodySchema.safeParse({
        lessonDate,
        records: [{ studentId: s1, status: 'sick' }],
      });
      assert(!parsed.success, 'schema should reject unknown status "sick"');
    });

    // ============ HOMEWORK + GRADING ============
    console.log('\n-- Homework + grading (coins path) --');

    let homework;
    await test('5a. Create homework for own group -> row created', async () => {
      homework = await homeworkService.createHomeworkForGroup({
        mentorId,
        groupId,
        payload: {
          title: 'Homework 1',
          maxScore: 100,
          coinReward: 15,
          deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        },
      });
      assert(homework?.id, 'homework should have an id');
      assert(Number(homework.coin_reward) === 15, `coin_reward should be 15, got ${homework.coin_reward}`);
    });

    await test('5b. Create homework for a group you do not own -> 404 (no existence leak)', async () => {
      await expectAppError(
        () => homeworkService.createHomeworkForGroup({
          mentorId: otherMentorId,
          groupId,
          payload: { title: 'Intruder HW', maxScore: 100, coinReward: 5, deadline: new Date() },
        }),
        404,
        'createHomeworkForGroup by other mentor',
      );
    });

    let submission;

    await test('6. Grade submission -> graded, coins credited, history + leaderboard updated', async () => {
      const balanceBefore = await getCoinBalance(s1);
      assert(balanceBefore === 0, `expected fresh student balance 0, got ${balanceBefore}`);

      const scoreBefore = await redis.zscore(weekKey, s1);
      assert(scoreBefore === null, `expected no prior leaderboard entry for s1, got ${scoreBefore}`);

      submission = await homeworkRepo.upsertSubmission({
        homeworkId: homework.id,
        studentId: s1,
        fileKey: null,
        textAnswer: 'my answer',
        status: 'submitted',
      });
      assert(submission.status === 'submitted', 'submission should start as submitted');

      const graded = await homeworkService.gradeSubmission({
        mentorId,
        submissionId: submission.id,
        score: 80,
      });
      assert(graded.status === 'graded', `expected graded, got ${graded.status}`);
      assert(graded.score === 80, `expected score 80, got ${graded.score}`);

      const balanceAfter = await getCoinBalance(s1);
      assert(balanceAfter === 15, `expected balance 15 (0+coin_reward), got ${balanceAfter}`);

      const { rows: historyRows } = await pool.query(
        `SELECT * FROM coin_history WHERE student_id = $1 AND ref_type = 'homework' AND ref_id = $2`,
        [s1, homework.id],
      );
      assert(historyRows.length === 1, `expected 1 coin_history row, got ${historyRows.length}`);
      assert(historyRows[0].operation === 'reward', `expected operation reward, got ${historyRows[0].operation}`);
      assert(Number(historyRows[0].amount) === 15, `expected amount 15, got ${historyRows[0].amount}`);

      const weekScore = await redis.zscore(weekKey, s1);
      const monthScore = await redis.zscore(monthKeyStr, s1);
      assert(Number(weekScore) === 15, `expected week leaderboard +15, got ${weekScore}`);
      assert(Number(monthScore) === 15, `expected month leaderboard +15, got ${monthScore}`);
    });

    await test('7. Idempotency: re-grading same submission -> 409, no double reward', async () => {
      await expectAppError(
        () => homeworkService.gradeSubmission({ mentorId, submissionId: submission.id, score: 50 }),
        409,
        're-grade already-graded submission',
      );
      const balanceAfter = await getCoinBalance(s1);
      assert(balanceAfter === 15, `balance must stay 15 after re-grade attempt, got ${balanceAfter}`);

      const { rows: historyRows } = await pool.query(
        `SELECT count(*)::int AS n FROM coin_history WHERE student_id = $1 AND ref_type = 'homework' AND ref_id = $2`,
        [s1, homework.id],
      );
      assert(historyRows[0].n === 1, `expected still only 1 coin_history row, got ${historyRows[0].n}`);
    });

    await test('8. Score out of range -> 422, submission stays ungraded, no coins', async () => {
      const homework2 = await homeworkService.createHomeworkForGroup({
        mentorId,
        groupId,
        payload: { title: 'Homework 2', maxScore: 50, coinReward: 10, deadline: new Date() },
      });
      const submission2 = await homeworkRepo.upsertSubmission({
        homeworkId: homework2.id,
        studentId: s2,
        status: 'submitted',
      });

      await expectAppError(
        () => homeworkService.gradeSubmission({ mentorId, submissionId: submission2.id, score: 999 }),
        422,
        'grade with score > max_score',
      );

      const { rows: [subRow] } = await pool.query(
        `SELECT status, score FROM homework_submissions WHERE id = $1`,
        [submission2.id],
      );
      assert(subRow.status === 'submitted', `submission2 should remain submitted, got ${subRow.status}`);
      assert(subRow.score === null, `submission2 score should stay null, got ${subRow.score}`);

      const s2Balance = await getCoinBalance(s2);
      assert(s2Balance === 0, `s2 balance should stay 0, got ${s2Balance}`);
    });

    // ============ TESTS ============
    console.log('\n-- Tests --');

    let createdTest;
    await test('9a. Create a valid test -> row created', async () => {
      createdTest = await testsService.createTestForGroup({
        mentorId,
        groupId,
        payload: {
          title: 'Quiz 1',
          questions: [
            { q: '2+2?', options: ['3', '4', '5'], correct: 1 },
            { q: 'Capital of France?', options: ['Berlin', 'Paris'], correct: 1 },
          ],
          durationMin: 30,
          coinReward: 5,
        },
      });
      assert(createdTest?.id, 'test should have an id');
      assert(Array.isArray(createdTest.questions), 'questions should be an array (jsonb)');
      assert(createdTest.questions.length === 2, 'expected 2 questions stored');
    });

    await test('9b. correct index out of options range -> rejected by zod schema', async () => {
      const parsed = createTestBodySchema.safeParse({
        title: 'Bad test',
        questions: [{ q: 'X?', options: ['a', 'b'], correct: 5 }],
        durationMin: 10,
      });
      assert(!parsed.success, 'schema should reject out-of-range correct index');
    });

    await test('10. Test results: empty initially, then appears after insert', async () => {
      const empty = await testsService.listResults({ mentorId, testId: createdTest.id });
      assert(Array.isArray(empty) && empty.length === 0, `expected empty results, got ${empty.length}`);

      await pool.query(
        `INSERT INTO test_results (test_id, student_id, answers, score, started_at, finished_at)
         VALUES ($1, $2, $3::jsonb, $4, now(), now())`,
        [createdTest.id, s3, JSON.stringify([1, 1]), 90],
      );

      const afterInsert = await testsService.listResults({ mentorId, testId: createdTest.id });
      assert(afterInsert.length === 1, `expected 1 result, got ${afterInsert.length}`);
      assert(afterInsert[0].score === 90, `expected score 90, got ${afterInsert[0].score}`);
      assert(afterInsert[0].first_name === 'Student3', `expected student name Student3, got ${afterInsert[0].first_name}`);
    });

    // ============ SALARY ============
    console.log('\n-- Salary --');

    const now = new Date();
    const monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const periodMonth = `${monthStr}-01`;
    const adminRequester = { id: adminId, role: 'admin', branchId, organizationId: ctx.organizationId };
    const mentorRequester = { id: mentorId, role: 'mentor', branchId };

    await test('11. Salary suggestion computes groupRevenue = monthlyPrice * activeStudents', async () => {
      const suggestion = await salaryService.getSalarySuggestion({ requester: mentorRequester, mentorId, month: monthStr });
      const g = suggestion.groups.find((x) => x.groupId === groupId);
      assert(g, 'group should appear in suggestion');
      assert(g.activeStudents === 3, `expected 3 active students, got ${g.activeStudents}`);
      assert(g.monthlyPrice === 500000, `expected monthlyPrice 500000, got ${g.monthlyPrice}`);
      assert(g.groupRevenue === 1500000, `expected groupRevenue 1500000, got ${g.groupRevenue}`);
    });

    let salaryRow;
    await test('12a. Upsert salary as admin -> total_amount = base + bonus', async () => {
      salaryRow = await salaryService.upsertSalary({
        requester: adminRequester,
        mentorId,
        periodMonth,
        baseAmount: 1000000,
        bonusAmount: 200000,
        note: 'integration test',
      });
      assert(Number(salaryRow.total_amount) === 1200000, `expected total_amount 1200000, got ${salaryRow.total_amount}`);
      assert(salaryRow.status === 'draft', `expected initial status draft, got ${salaryRow.status}`);
    });

    await test('12b. Upsert salary as mentor -> 403', async () => {
      await expectAppError(
        () => salaryService.upsertSalary({
          requester: mentorRequester,
          mentorId,
          periodMonth,
          baseAmount: 1,
          bonusAmount: 0,
        }),
        403,
        'upsertSalary as mentor',
      );
    });

    await test('13. Status transition draft -> approved -> paid sets paid_at; mentor sees own record', async () => {
      const approved = await salaryService.updateStatus({ requester: adminRequester, id: salaryRow.id, status: 'approved' });
      assert(approved.status === 'approved', `expected approved, got ${approved.status}`);
      assert(approved.paid_at === null, `paid_at should still be null after approve, got ${approved.paid_at}`);

      const paid = await salaryService.updateStatus({ requester: adminRequester, id: salaryRow.id, status: 'paid' });
      assert(paid.status === 'paid', `expected paid, got ${paid.status}`);
      assert(paid.paid_at !== null, 'paid_at should be set after paid transition');

      const list = await salaryService.getMentorSalaries({ requester: mentorRequester, mentorId, year: now.getUTCFullYear() });
      assert(list.some((r) => r.id === salaryRow.id), 'mentor should see own salary record in list');
    });
  } finally {
    console.log('\nCleaning up Redis leaderboard keys...');
    try {
      await redis.del(weekKey, monthKeyStr);
    } catch (err) {
      console.error('  Redis cleanup failed (continuing):', err.message);
    }

    console.log('Cleaning up fixtures...');
    await teardownFixtures(ctx);
  }

  // ---------- report ----------
  console.log('\n=========================================');
  console.log('MENTOR DOMAIN TEST RESULTS');
  console.log('=========================================');
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
  }
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log('=========================================');
  console.log(`MENTOR TESTS: ${passed} passed, ${failed} failed`);
  console.log('=========================================');

  return failed;
}

main()
  .then(async (failed) => {
    await notificationQueue.close().catch(() => {});
    await closeRedis().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(async (err) => {
    console.error('FATAL — test runner crashed:', err);
    await notificationQueue.close().catch(() => {});
    await closeRedis().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(1);
  });
