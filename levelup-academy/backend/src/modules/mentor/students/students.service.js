import { AppError } from '../../../utils/AppError.js';
import * as repo from './students.repository.js';

/**
 * Сводка по ученику для ментора.
 *
 * Считается на сервере одним походом, а не собирается на клиенте: домашки и
 * тесты лежат по одной строке на задание, и на фронте это вылилось бы в запрос
 * submissions/results на каждое из них — три десятка round-trip'ов ради одной
 * карточки.
 */

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : null);

/** Что случилось с домашкой: сдал вовремя, сдал поздно, не сдал вовсе. */
function homeworkState(row) {
  if (!row.status) {
    // записи о сдаче нет — либо ещё срок не вышел, либо просрочил
    return new Date(row.deadline) < new Date() ? 'missed' : 'pending';
  }
  if (row.status === 'graded') return 'graded';
  if (row.status === 'late') return 'late';
  return 'submitted';
}

export async function getStudentStats(studentId, mentorId) {
  const student = await repo.findStudentForMentor(studentId, mentorId);
  // Чужой ученик неотличим от несуществующего: подбирая id, ментор не должен
  // понимать, есть такой в системе или нет.
  if (!student) throw new AppError(404, 'Student not found');

  const [
    groups, attRows, recentAtt, hwRows, testRows, coins, coinLog,
    attMonths, hwMonths, testMonths, hwDoneMonths,
  ] = await Promise.all([
    repo.listStudentGroups(studentId, mentorId),
    repo.attendanceSummary(studentId, mentorId),
    repo.recentAttendance(studentId, mentorId),
    repo.homeworkBreakdown(studentId, mentorId),
    repo.testsBreakdown(studentId, mentorId),
    repo.coinsSummary(studentId),
    repo.recentCoins(studentId),
    repo.attendanceByMonth(studentId, mentorId),
    repo.homeworkByMonth(studentId, mentorId),
    repo.testsByMonth(studentId, mentorId),
    repo.homeworkDoneByMonth(studentId, mentorId),
  ]);

  // ---- посещаемость ----
  const att = { present: 0, absent: 0, late: 0, excused: 0 };
  attRows.forEach((r) => { att[r.status] = r.count; });
  const attTotal = att.present + att.absent + att.late + att.excused;

  // ---- домашние задания ----
  const homework = hwRows.map((h) => ({
    id: h.id,
    title: h.title,
    groupName: h.group_name,
    deadline: h.deadline,
    maxScore: h.max_score,
    coinReward: h.coin_reward,
    state: homeworkState(h),
    score: h.score ?? null,
    submittedAt: h.submitted_at ?? null,
  }));
  const graded = homework.filter((h) => h.score !== null);
  const done = homework.filter((h) => h.state !== 'missed' && h.state !== 'pending');
  const avgHwPercent = graded.length
    ? Math.round(
      graded.reduce((s, h) => s + (h.score / (h.maxScore || 100)) * 100, 0) / graded.length,
    )
    : null;

  // ---- тесты ----
  const tests = testRows.map((t) => ({
    id: t.id,
    title: t.title,
    groupName: t.group_name,
    maxScore: t.max_score,
    score: t.score ?? null,
    percent: t.finished_at ? pct(t.score ?? 0, t.max_score) : null,
    finishedAt: t.finished_at ?? null,
  }));
  const takenTests = tests.filter((t) => t.finishedAt);
  const avgTestPercent = takenTests.length
    ? Math.round(takenTests.reduce((s, t) => s + (t.percent ?? 0), 0) / takenTests.length)
    : null;

  /* ---- динамика ----
     Собираем непрерывный ряд из шести месяцев, а не только из тех, где есть
     данные: пропуск месяца на графике должен читаться как провал, а не
     схлопываться, будто его не было. Отсутствие данных — null, и линия в этой
     точке рвётся, что честнее нуля (ноль означал бы «ноль процентов»). */
  const months = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() - 5);
  for (let i = 0; i < 6; i += 1) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    const att = attMonths.find((r) => r.month === key);
    const hw = hwMonths.find((r) => r.month === key);
    const tst = testMonths.find((r) => r.month === key);
    const hwDone = hwDoneMonths.find((r) => r.month === key);
    months.push({
      month: key,
      attendanceRate: att ? pct(att.attended, att.total) : null,
      homeworkRate: hwDone ? pct(hwDone.done, hwDone.total) : null,
      homeworkAvg: hw ? hw.avg_percent : null,
      testAvg: tst ? tst.avg_percent : null,
      lessons: att ? att.total : 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    trend: months,
    student: {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      phone: student.phone,
      email: student.email,
      status: student.status,
      loginCode: student.login_code,
      coinBalance: student.coin_balance,
      joinedAt: student.created_at,
    },
    groups: groups.map((g) => ({
      id: g.id, name: g.name, subject: g.subject, joinedAt: g.joined_at,
    })),
    attendance: {
      ...att,
      total: attTotal,
      // «был» считаем и опоздания: человек на занятии присутствовал
      rate: pct(att.present + att.late, attTotal),
    },
    recentAttendance: recentAtt.map((a) => ({
      date: a.lesson_date, status: a.status, groupName: a.group_name,
    })),
    homework: {
      total: homework.length,
      done: done.length,
      missed: homework.filter((h) => h.state === 'missed').length,
      pending: homework.filter((h) => h.state === 'pending').length,
      graded: graded.length,
      avgPercent: avgHwPercent,
      completionRate: pct(done.length, homework.length),
      items: homework,
    },
    tests: {
      total: tests.length,
      taken: takenTests.length,
      avgPercent: avgTestPercent,
      items: tests,
    },
    coins: {
      balance: student.coin_balance,
      earned: coins.earned,
      spent: coins.spent,
      recent: coinLog.map((c) => ({
        id: c.id, amount: c.amount, reason: c.reason,
        refType: c.ref_type, createdAt: c.created_at,
      })),
    },
  };
}
