import { AppError } from '../../../utils/AppError.js';
import * as repo from './group-stats.repository.js';

/**
 * Сводка по группе со сравнением учеников между собой.
 *
 * Считается на сервере: у каждого ученика три показателя, и собирать их на
 * клиенте значило бы дёргать submissions по каждому заданию для каждого
 * ученика — при 14 учениках и 8 домашках это больше сотни запросов.
 */

/** Диапазоны успеваемости. Границы те же, что красят числа в интерфейсе. */
const BANDS = [
  { key: 'weak', label: '0–59%', from: 0, to: 59 },
  { key: 'mid', label: '60–79%', from: 60, to: 79 },
  { key: 'good', label: '80–89%', from: 80, to: 89 },
  { key: 'top', label: '90–100%', from: 90, to: 100 },
];

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : null);

/**
 * Сводный балл ученика — среднее по тем показателям, которые вообще есть.
 * Именно «которые есть»: у новичка без единого теста балл не должен падать
 * из-за того, что тестов ему ещё не давали.
 */
function overallOf({ attendanceRate, homeworkRate, homeworkAvg, testAvg }) {
  const parts = [attendanceRate, homeworkRate, homeworkAvg, testAvg].filter(
    (v) => v !== null && v !== undefined,
  );
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((s, v) => s + v, 0) / parts.length);
}

export async function getGroupStats(groupId, mentorId) {
  const group = await repo.findGroupForMentor(groupId, mentorId);
  // Чужая группа неотличима от несуществующей.
  if (!group) throw new AppError(404, 'Group not found');

  const [students, attRows, hwRows, testRows] = await Promise.all([
    repo.roster(groupId),
    repo.attendancePerStudent(groupId),
    repo.homeworkPerStudent(groupId),
    repo.testsPerStudent(groupId),
  ]);

  const attBy = new Map(attRows.map((r) => [r.student_id, r]));
  const hwBy = new Map(hwRows.map((r) => [r.student_id, r]));
  const testBy = new Map(testRows.map((r) => [r.student_id, r]));

  const rows = students.map((s) => {
    const att = attBy.get(s.id);
    const hw = hwBy.get(s.id);
    const tst = testBy.get(s.id);

    const item = {
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      status: s.status,
      coinBalance: s.coin_balance,
      attendanceRate: att ? pct(att.attended, att.total) : null,
      lessons: att?.total ?? 0,
      homeworkDone: hw?.done ?? 0,
      homeworkTotal: hw?.total ?? 0,
      homeworkRate: hw ? pct(hw.done, hw.total) : null,
      homeworkAvg: hw?.avg_percent ?? null,
      testsTaken: tst?.taken ?? 0,
      testsTotal: tst?.total ?? 0,
      testAvg: tst?.avg_percent ?? null,
    };
    return { ...item, overall: overallOf(item) };
  });

  // Рейтинг по сводному баллу; ученики без данных уходят в конец — их не за
  // что ранжировать, но и прятать из списка группы нельзя.
  const ranked = [...rows].sort((a, b) => {
    if (a.overall === null) return 1;
    if (b.overall === null) return -1;
    return b.overall - a.overall;
  });

  const scored = ranked.filter((r) => r.overall !== null);

  const distribution = BANDS.map((b) => {
    const count = scored.filter((r) => r.overall >= b.from && r.overall <= b.to).length;
    return { ...b, count, percent: pct(count, scored.length) ?? 0 };
  });

  const avgOf = (key) => {
    const vals = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };

  return {
    group: { id: group.id, name: group.name, subject: group.subject },
    summary: {
      students: rows.length,
      attendanceRate: avgOf('attendanceRate'),
      homeworkRate: avgOf('homeworkRate'),
      homeworkAvg: avgOf('homeworkAvg'),
      testAvg: avgOf('testAvg'),
      overall: avgOf('overall'),
    },
    distribution,
    students: ranked,
  };
}
