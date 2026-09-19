import { pool } from '../../../config/db.js';

/**
 * Mentor-специфичный data-layer поверх ОБЩИХ таблиц tests/test_results.
 * Не путать с src/modules/tests/tests.repository.js (shared, не редактируется) —
 * там только контракт questions/answers и CRUD попыток. Здесь — то, что нужно
 * только ментору: результаты по тесту с именами студентов.
 */

/** Результаты теста: все студенты, завершившие попытку (или ещё нет — score = NULL). */
export async function listResultsForTest(testId) {
  const { rows } = await pool.query(
    `SELECT r.id, r.student_id, r.score, r.started_at, r.finished_at,
            u.first_name, u.last_name
       FROM test_results r
       JOIN users u ON u.id = r.student_id
      WHERE r.test_id = $1
      ORDER BY r.finished_at DESC NULLS FIRST, u.last_name, u.first_name`,
    [testId],
  );
  return rows;
}
