import { pool } from '../../config/db.js';

/**
 * Реальная активность в продукте, не на сайте (Karis 26.08.2026, пункт #7).
 *
 * Аналитика сайта (SiteAnalytics.jsx) — про лендинг: приходят ли новые
 * посетители. Она ничего не говорит о том, работает ли партнёр, который уже
 * зашёл внутрь: платит, но ученики реально сдают тесты, или платит по
 * инерции, а кабинетом никто не пользуется несколько недель.
 *
 * Считаем ДВЕ параллельные системы заданий, обе живые: старую (tests/
 * homework → test_results/homework_submissions) и новую тематическую
 * (methodology_test_attempts/methodology_submissions, video→тест→ДЗ,
 * добавлена 22.08.2026) — плюс посещаемость и просмотры видео. Любое из них
 * считается «событием активности», иначе партнёр на новой системе выглядел
 * бы неактивным только из-за того, что мы считаем не ту таблицу.
 */

const WINDOWS = [7, 30];

export async function productActivity(days = 7) {
  const window = WINDOWS.includes(Number(days)) ? Number(days) : 7;

  const { rows } = await pool.query(
    `SELECT o.id, o.name,
            (SELECT count(*)::int FROM users u
               WHERE u.organization_id = o.id AND u.role = 'student'
                 AND u.status = 'active' AND u.deleted_at IS NULL) AS total_students,
            (SELECT count(*)::int FROM users u
               WHERE u.organization_id = o.id AND u.role = 'student'
                 AND u.status = 'active' AND u.deleted_at IS NULL
                 AND u.last_login_at > now() - ($1 || ' days')::interval) AS active_students,
            (SELECT count(*)::int FROM test_results tr JOIN users u ON u.id = tr.student_id
               WHERE u.organization_id = o.id AND tr.started_at > now() - ($1 || ' days')::interval) AS tests,
            (SELECT count(*)::int FROM methodology_test_attempts a JOIN users u ON u.id = a.student_id
               WHERE u.organization_id = o.id AND a.started_at > now() - ($1 || ' days')::interval) AS topic_tests,
            (SELECT count(*)::int FROM homework_submissions hs JOIN users u ON u.id = hs.student_id
               WHERE u.organization_id = o.id AND hs.submitted_at > now() - ($1 || ' days')::interval) AS homework,
            (SELECT count(*)::int FROM methodology_submissions ms JOIN users u ON u.id = ms.student_id
               WHERE u.organization_id = o.id AND ms.submitted_at > now() - ($1 || ' days')::interval) AS topic_homework,
            (SELECT count(*)::int FROM attendance att JOIN users u ON u.id = att.student_id
               WHERE u.organization_id = o.id AND att.created_at > now() - ($1 || ' days')::interval) AS attendance_marks,
            (SELECT count(*)::int FROM topic_video_views v JOIN users u ON u.id = v.student_id
               WHERE u.organization_id = o.id AND v.watched_at > now() - ($1 || ' days')::interval) AS video_views
       FROM organizations o
      WHERE o.deleted_at IS NULL
      ORDER BY o.name`,
    [window],
  );

  const items = rows.map((r) => {
    const events = r.tests + r.topic_tests + r.homework + r.topic_homework + r.attendance_marks + r.video_views;
    return {
      organizationId: r.id,
      organizationName: r.name,
      totalStudents: r.total_students,
      activeStudents: r.active_students,
      activeShare: r.total_students > 0 ? r.active_students / r.total_students : null,
      events,
      breakdown: {
        tests: r.tests + r.topic_tests,
        homework: r.homework + r.topic_homework,
        attendance: r.attendance_marks,
        videoViews: r.video_views,
      },
    };
  });

  // тише всех — первыми: ради них страница и существует
  items.sort((a, b) => a.events - b.events);
  return { windowDays: window, items };
}
