import { pool } from '../../../config/db.js';

/** Defense in depth: даже если training_types.ai_review_enabled ещё true,
 * отключённый Main Admin'ом org-level addon сразу останавливает новые
 * постановки в очередь (см. content.service.js — то же самое на входе у методиста). */
export function isAiReviewEnabledForOrg(orgId, db = pool) {
  return db
    .query(
      `SELECT enabled FROM org_feature_flags WHERE organization_id = $1 AND feature_key = 'ai_review'`,
      [orgId],
    )
    .then((r) => r.rows[0]?.enabled ?? false);
}

/** training_type_id всех активных групп студента, без дублей/null — так студент
    может проходить программу нескольких курсов сразу, если состоит в нескольких группах. */
export async function getTrainingTypeIdsForStudent(studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT DISTINCT g.training_type_id
       FROM group_students gs
       JOIN groups g ON g.id = gs.group_id AND g.deleted_at IS NULL
      WHERE gs.student_id = $1 AND gs.left_at IS NULL AND g.training_type_id IS NOT NULL`,
    [studentId],
  );
  return rows.map((r) => r.training_type_id);
}

/** Темы + уроки методики для списка training_type_id. Прогресс подмешивается в сервисе. */
export async function listTopicsWithLessons(trainingTypeIds, db = pool) {
  if (trainingTypeIds.length === 0) return [];
  const { rows } = await db.query(
    `SELECT t.id AS topic_id, t.training_type_id, t.name AS topic_name, t.description AS topic_description,
            t.video_url AS topic_video_url, t.video_file_key AS topic_video_file_key,
            t.video_duration_sec AS topic_video_duration_sec, t.coin_reward AS topic_coin_reward,
            t.sort_order AS topic_sort_order,
            l.id AS lesson_id, l.title, l.lesson_type, l.description, l.instruction,
            l.coin_reward, l.video_url, l.file_key, l.sort_order AS lesson_sort_order
       FROM topics t
       LEFT JOIN methodology_lessons l ON l.topic_id = t.id AND l.deleted_at IS NULL AND l.is_archived = false
      WHERE t.training_type_id = ANY($1) AND t.deleted_at IS NULL AND t.is_archived = false
      ORDER BY t.sort_order, t.created_at, l.sort_order, l.created_at`,
    [trainingTypeIds],
  );
  return rows;
}

/** Тема (для видео-файла и начисления монет за просмотр) — только если входит
    в допустимые training_type_id студента. */
export async function getTopicForStudent(topicId, trainingTypeIds, db = pool) {
  const { rows: [topic] } = await db.query(
    `SELECT id, video_file_key, coin_reward
       FROM topics
      WHERE id = $1 AND training_type_id = ANY($2) AND deleted_at IS NULL`,
    [topicId, trainingTypeIds],
  );
  return topic ?? null;
}

/** id тем, чьё видео студент уже досмотрел (для честного бейджа при
    перезагрузке страницы — без этого гейт видео сбрасывался бы каждый раз,
    хотя монеты за него уже начислены). */
export async function getWatchedTopicIds(studentId, topicIds, db = pool) {
  if (topicIds.length === 0) return [];
  const { rows } = await db.query(
    `SELECT topic_id FROM topic_video_views WHERE student_id = $1 AND topic_id = ANY($2)`,
    [studentId, topicIds],
  );
  return rows.map((r) => r.topic_id);
}

/** Идемпотентная фиксация просмотра — ON CONFLICT DO NOTHING: если строка уже
    была (студент пересматривает), INSERT ничего не вернёт — монеты не
    задваиваются (та же защита, что у finalizeAiGrade/gradeSubmission). */
export async function markVideoWatched(topicId, studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `INSERT INTO topic_video_views (topic_id, student_id)
     VALUES ($1, $2)
     ON CONFLICT (topic_id, student_id) DO NOTHING
     RETURNING id`,
    [topicId, studentId],
  );
  return !!r; // true — первый просмотр (только что зафиксирован), false — уже было
}

/** Урок — только если его тема входит в допустимые training_type_id студента. */
export async function getLessonForStudent(lessonId, trainingTypeIds, db = pool) {
  const { rows: [lesson] } = await db.query(
    `SELECT l.id, l.title, l.lesson_type, l.description, l.instruction, l.coin_reward,
            l.video_url, l.file_key, t.name AS topic_name, t.training_type_id,
            tt.ai_review_enabled
       FROM methodology_lessons l
       JOIN topics t ON t.id = l.topic_id
       JOIN training_types tt ON tt.id = t.training_type_id
      WHERE l.id = $1 AND t.training_type_id = ANY($2)
        AND l.deleted_at IS NULL AND l.is_archived = false AND t.deleted_at IS NULL`,
    [lessonId, trainingTypeIds],
  );
  return lesson ?? null;
}

export async function getQuestionsNoAnswers(lessonId, db = pool) {
  const { rows } = await db.query(
    `SELECT id, question_type, question_text, option_a, option_b, option_c, option_d, sort_order
       FROM methodology_questions
      WHERE lesson_id = $1
      ORDER BY sort_order, created_at`,
    [lessonId],
  );
  return rows;
}

export async function getQuestionsWithAnswers(lessonId, db = pool) {
  const { rows } = await db.query(
    `SELECT id, question_type, correct_answer, correct_text_answer
       FROM methodology_questions WHERE lesson_id = $1 ORDER BY sort_order, created_at`,
    [lessonId],
  );
  return rows;
}

// ---------- попытки теста урока (тот же приём, что test_results) ----------

export async function getAttempt(lessonId, studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT * FROM methodology_test_attempts WHERE lesson_id = $1 AND student_id = $2`,
    [lessonId, studentId],
  );
  return r ?? null;
}

/** Уникальность lesson_id+student_id → повторный старт словит conflict (null). */
export async function insertAttempt(lessonId, studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `INSERT INTO methodology_test_attempts (lesson_id, student_id, started_at)
     VALUES ($1, $2, now())
     ON CONFLICT (lesson_id, student_id) DO NOTHING
     RETURNING *`,
    [lessonId, studentId],
  );
  return r ?? null;
}

export async function finalizeAttempt(lessonId, studentId, answers, score, db = pool) {
  const { rows: [r] } = await db.query(
    `UPDATE methodology_test_attempts
        SET answers = $3::jsonb, score = $4, finished_at = now()
      WHERE lesson_id = $1 AND student_id = $2 AND finished_at IS NULL
      RETURNING *`,
    [lessonId, studentId, JSON.stringify(answers), score],
  );
  return r ?? null;
}

// ---------- сдача практического урока (тот же приём, что homework_submissions) ----------

export async function getSubmission(lessonId, studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT * FROM methodology_submissions WHERE lesson_id = $1 AND student_id = $2`,
    [lessonId, studentId],
  );
  return r ?? null;
}

/** WHERE status <> 'graded' — не даём затереть уже оценённую сдачу повторной отправкой. */
export async function upsertSubmission({ lessonId, studentId, fileKey, textAnswer }, db = pool) {
  const { rows: [r] } = await db.query(
    `INSERT INTO methodology_submissions (lesson_id, student_id, file_key, text_answer, status, submitted_at)
     VALUES ($1, $2, $3, $4, 'submitted', now())
     ON CONFLICT (lesson_id, student_id) DO UPDATE
        SET file_key = EXCLUDED.file_key, text_answer = EXCLUDED.text_answer,
            status = 'submitted', submitted_at = now()
      WHERE methodology_submissions.status <> 'graded'
     RETURNING *`,
    [lessonId, studentId, fileKey ?? null, textAnswer ?? null],
  );
  return r ?? null;
}

export async function getStudentNameAndLanguage(studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT first_name, last_name, preferred_language FROM users WHERE id = $1`,
    [studentId],
  );
  return r ? { name: `${r.first_name} ${r.last_name}`.trim(), language: r.preferred_language } : null;
}

// ---------- Aqlli tahlil (AI-review): читает/пишет worker'ом, не HTTP-слоем ----------

/** description/instruction — то самое задание методиста ("Описание задачи"), без
 * которого AI разбирал код "вообще", а не "выполнил ли ученик ИМЕННО ЭТО задание"
 * (запрос пользователя 10.08.2026). file_key — вложение САМОГО УРОКА (методист мог
 * приложить, например, макет/спеку), отдельно от file_key ученика в submission. */
export async function getSubmissionById(id, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT s.id, s.lesson_id, s.student_id, s.file_key, s.text_answer, s.review_attempts,
            l.title AS lesson_title, l.description AS lesson_description,
            l.instruction AS lesson_instruction, l.file_key AS lesson_file_key,
            l.coin_reward AS lesson_coin_reward,
            u.preferred_language AS student_language
       FROM methodology_submissions s
       JOIN methodology_lessons l ON l.id = s.lesson_id
       JOIN users u ON u.id = s.student_id
      WHERE s.id = $1`,
    [id],
  );
  return r ?? null;
}

/** attempts — читается воркером перед вызовом (getSubmissionById), сюда просто новое значение.
 * score (methodology_submissions.score, для topicStats/рейтинга) обновляется ТОЛЬКО когда
 * AI реально прочитал код/текст (review.score от Groq) — при 'tests'/'unreadable'/'failed'
 * оценка не выдумывается (п.6 спеки: "92% отлично" при непрочитанном коде запрещено). */
export async function saveReview(id, { review, reviewSource, reviewStatus, reviewAttempts }, db = pool) {
  const score = (reviewSource === 'code' || reviewSource === 'text') ? review?.score ?? null : null;
  await db.query(
    `UPDATE methodology_submissions
        SET review = $2::jsonb, review_source = $3, review_status = $4,
            review_attempts = $5, reviewed_at = now(),
            score = COALESCE($6, score)
      WHERE id = $1`,
    [id, review ? JSON.stringify(review) : null, reviewSource, reviewStatus, reviewAttempts, score],
  );
}

/**
 * Закрывает сдачу как оценённую ИИ — score уже в БД (saveReview выше), тут
 * только смена статуса, чтобы percent/лидерборд её увидели. graded_by
 * остаётся NULL (колонка nullable) — оценил не человек, coin_history сам
 * несёт причину "AI". WHERE status <> 'graded' — та же идемпотентная защита
 * от гонки/повторного запуска воркера, что у mentor/homework grading —
 * если сдача уже закрыта, вернёт null и монеты повторно не начислятся.
 */
export async function finalizeAiGrade({ submissionId, score }, db = pool) {
  const { rows: [r] } = await db.query(
    `UPDATE methodology_submissions
        SET status = 'graded', graded_at = now(), score = $2
      WHERE id = $1 AND status <> 'graded'
      RETURNING id, lesson_id, student_id, score`,
    [submissionId, score],
  );
  return r ?? null;
}

/** Последняя готовая (done) AI-оценка студента — для GET /student/home. */
export async function getLatestReview(studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT s.review, s.review_source, s.review_status, s.reviewed_at, l.title AS lesson_title
       FROM methodology_submissions s
       JOIN methodology_lessons l ON l.id = s.lesson_id
      WHERE s.student_id = $1 AND s.review_status = 'done'
      ORDER BY s.reviewed_at DESC
      LIMIT 1`,
    [studentId],
  );
  return r ?? null;
}

/** % по теме = средний результат уроков этой темы (тест — score попытки,
 * практика — score AI-review, если есть). Без AI, 0 доп. стоимости —
 * системная картина "где ученик слабее", а не разбор одной сдачи. */
export async function getTopicStats(studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT t.id AS topic_id, t.name AS topic_name,
            ROUND(AVG(scored.score))::int AS pct,
            COUNT(scored.score)::int AS graded_count
       FROM topics t
       JOIN methodology_lessons l ON l.topic_id = t.id AND l.deleted_at IS NULL
       JOIN (
         SELECT lesson_id, score FROM methodology_test_attempts
          WHERE student_id = $1 AND finished_at IS NOT NULL
          UNION ALL
         SELECT lesson_id, score FROM methodology_submissions
          WHERE student_id = $1 AND score IS NOT NULL
       ) scored ON scored.lesson_id = l.id
      WHERE t.deleted_at IS NULL
      GROUP BY t.id, t.name
      ORDER BY pct ASC`,
    [studentId],
  );
  return rows;
}

// ---------- прогресс для списка уроков одним батчем (без N+1) ----------

export async function getAttemptsForLessons(studentId, lessonIds, db = pool) {
  if (lessonIds.length === 0) return [];
  const { rows } = await db.query(
    `SELECT lesson_id, score, finished_at FROM methodology_test_attempts
      WHERE student_id = $1 AND lesson_id = ANY($2)`,
    [studentId, lessonIds],
  );
  return rows;
}

export async function getSubmissionsForLessons(studentId, lessonIds, db = pool) {
  if (lessonIds.length === 0) return [];
  const { rows } = await db.query(
    `SELECT lesson_id, status, score FROM methodology_submissions
      WHERE student_id = $1 AND lesson_id = ANY($2)`,
    [studentId, lessonIds],
  );
  return rows;
}
