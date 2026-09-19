import { pool } from '../../config/db.js';

/** Включён ли партнёру платный AI-review (Main Admin решает — org_feature_flags). */
export function isAiReviewEnabledForOrg(orgId, db = pool) {
  return db
    .query(
      `SELECT enabled FROM org_feature_flags WHERE organization_id = $1 AND feature_key = 'ai_review'`,
      [orgId],
    )
    .then((r) => r.rows[0]?.enabled ?? false);
}

// ==================== ТИПЫ ОБУЧЕНИЯ ====================
export function insertTrainingType({ orgId, createdBy, name, description, icon, aiReviewEnabled }, db = pool) {
  return db
    .query(
      `INSERT INTO training_types (organization_id, created_by, name, description, icon, ai_review_enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, icon, sort_order, ai_review_enabled, created_at`,
      [orgId, createdBy, name, description ?? null, icon ?? null, aiReviewEnabled ?? false],
    )
    .then((r) => r.rows[0]);
}

export function listTrainingTypes(orgId, db = pool) {
  return db
    .query(
      `SELECT tt.id, tt.name, tt.description, tt.icon, tt.sort_order, tt.ai_review_enabled, tt.created_at,
              (SELECT count(*)::int FROM topics t WHERE t.training_type_id = tt.id AND t.deleted_at IS NULL) AS topics_count
         FROM training_types tt
        WHERE tt.organization_id = $1 AND tt.deleted_at IS NULL
        ORDER BY tt.sort_order ASC, tt.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function findTrainingType(id, orgId, db = pool) {
  return db
    .query(
      `SELECT id FROM training_types
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function updateTrainingType(id, orgId, fields, db = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['name', 'name'],
    ['description', 'description'],
    ['icon', 'icon'],
    ['aiReviewEnabled', 'ai_review_enabled'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return null;
  vals.push(id, orgId);
  return db
    .query(
      `UPDATE training_types SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND organization_id = $${i} AND deleted_at IS NULL
        RETURNING id, name, description, icon, sort_order, ai_review_enabled`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function archiveTrainingType(id, orgId, db = pool) {
  return db.query(
    `UPDATE training_types SET is_archived = true, updated_at = now()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, orgId],
  );
}

// ==================== ТЕМЫ ====================
export function insertTopic({ trainingTypeId, createdBy, name, description, videoUrl, coinReward }, db = pool) {
  return db
    .query(
      `INSERT INTO topics (training_type_id, created_by, name, description, video_url, coin_reward)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, video_url, coin_reward, sort_order, created_at`,
      [trainingTypeId, createdBy, name, description ?? null, videoUrl ?? null, coinReward ?? 0],
    )
    .then((r) => r.rows[0]);
}

export function listTopics(trainingTypeId, db = pool) {
  return db
    .query(
      // video_storage_cost_usd/video_cost_per_view_usd намеренно НЕ выбираются —
      // методисту (сотруднику партнёра) себестоимость нашей инфраструктуры не
      // показывается нигде на бэке, см. src/config/pricing.js.
      `SELECT t.id, t.name, t.description, t.video_url, t.coin_reward,
              t.video_file_key, t.video_size_bytes, t.video_duration_sec,
              t.sort_order, t.created_at,
              (SELECT count(*)::int FROM methodology_lessons l WHERE l.topic_id = t.id AND l.deleted_at IS NULL) AS lessons_count
         FROM topics t
        WHERE t.training_type_id = $1 AND t.deleted_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC`,
      [trainingTypeId],
    )
    .then((r) => r.rows);
}

export function findTopicInOrg(topicId, orgId, db = pool) {
  return db
    .query(
      `SELECT t.id, t.training_type_id
         FROM topics t
         JOIN training_types tt ON tt.id = t.training_type_id
        WHERE t.id = $1 AND tt.organization_id = $2
          AND t.deleted_at IS NULL AND tt.deleted_at IS NULL`,
      [topicId, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function updateTopic(id, orgId, fields, db = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['name', 'name'],
    ['description', 'description'],
    ['videoUrl', 'video_url'],
    ['coinReward', 'coin_reward'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key] === '' ? null : fields[key]);
    }
  }
  if (cols.length === 0) return null;
  // Ссылка и файл взаимоисключающие — если задаётся непустой videoUrl,
  // одновременно чистим файловые поля (иначе плеер не поймёт, что показывать).
  if (fields.videoUrl !== undefined && fields.videoUrl) {
    cols.push('video_file_key = NULL', 'video_size_bytes = NULL', 'video_duration_sec = NULL');
    cols.push('video_storage_cost_usd = NULL', 'video_cost_per_view_usd = NULL');
  }
  vals.push(id, orgId);
  return db
    .query(
      `UPDATE topics SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND training_type_id IN (
          SELECT id FROM training_types WHERE organization_id = $${i}
        ) AND deleted_at IS NULL
        RETURNING id, name, description, video_url, coin_reward, video_file_key, video_size_bytes, video_duration_sec, sort_order`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/**
 * Регистрирует файловое видео после успешной загрузки на Storj — вызывается
 * ПОСЛЕ presigned PUT, sizeBytes/costs уже посчитаны в сервисе по реальному
 * размеру с самого Storj. Чистит video_url (взаимоисключающе с файлом).
 * RETURNING намеренно без video_storage_cost_usd/video_cost_per_view_usd —
 * этот ответ уходит методисту, себестоимость ему не показываем.
 */
export function setTopicVideoFile(id, orgId, { fileKey, sizeBytes, durationSec, storageCostUsdPerMonth, costPerViewUsd }, db = pool) {
  return db
    .query(
      `UPDATE topics
          SET video_url = NULL, video_file_key = $1, video_size_bytes = $2, video_duration_sec = $3,
              video_storage_cost_usd = $4, video_cost_per_view_usd = $5, updated_at = now()
        WHERE id = $6 AND training_type_id IN (
          SELECT id FROM training_types WHERE organization_id = $7
        ) AND deleted_at IS NULL
        RETURNING id, name, description, video_url, video_file_key, video_size_bytes, video_duration_sec, sort_order`,
      [fileKey, sizeBytes, durationSec ?? null, storageCostUsdPerMonth, costPerViewUsd, id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function clearTopicVideoFile(id, orgId, db = pool) {
  return db
    .query(
      `UPDATE topics
          SET video_file_key = NULL, video_size_bytes = NULL, video_duration_sec = NULL,
              video_storage_cost_usd = NULL, video_cost_per_view_usd = NULL, updated_at = now()
        WHERE id = $1 AND training_type_id IN (
          SELECT id FROM training_types WHERE organization_id = $2
        ) AND deleted_at IS NULL
        RETURNING id, name, description, video_url, video_file_key, sort_order`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function archiveTopic(id, orgId, db = pool) {
  return db.query(
    `UPDATE topics SET is_archived = true, updated_at = now()
      WHERE id = $1 AND training_type_id IN (
        SELECT id FROM training_types WHERE organization_id = $2
      ) AND deleted_at IS NULL`,
    [id, orgId],
  );
}

// ==================== УРОКИ ====================
export function insertLesson({ topicId, createdBy, title, lessonType, description, instruction, coinReward, videoUrl, fileKey }, db = pool) {
  return db
    .query(
      `INSERT INTO methodology_lessons (topic_id, created_by, title, lesson_type, description, instruction, coin_reward, video_url, file_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, lesson_type, description, instruction, coin_reward, video_url, file_key, sort_order, created_at`,
      [topicId, createdBy, title, lessonType, description ?? null, instruction ?? null, coinReward ?? 0, videoUrl || null, fileKey || null],
    )
    .then((r) => r.rows[0]);
}

export function listLessons(topicId, db = pool) {
  return db
    .query(
      `SELECT l.id, l.title, l.lesson_type, l.description, l.instruction, l.coin_reward, l.video_url, l.file_key, l.sort_order, l.created_at,
              (SELECT count(*)::int FROM methodology_questions q WHERE q.lesson_id = l.id) AS questions_count
         FROM methodology_lessons l
        WHERE l.topic_id = $1 AND l.deleted_at IS NULL
        ORDER BY l.sort_order ASC, l.created_at DESC`,
      [topicId],
    )
    .then((r) => r.rows);
}

export function findLessonInOrg(lessonId, orgId, db = pool) {
  return db
    .query(
      `SELECT l.*
         FROM methodology_lessons l
         JOIN topics t ON t.id = l.topic_id
         JOIN training_types tt ON tt.id = t.training_type_id
        WHERE l.id = $1 AND tt.organization_id = $2
          AND l.deleted_at IS NULL AND t.deleted_at IS NULL AND tt.deleted_at IS NULL`,
      [lessonId, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findLessonWithQuestions(lessonId, orgId, db = pool) {
  return db
    .query(
      `SELECT l.id, l.title, l.lesson_type, l.description, l.instruction, l.coin_reward, l.video_url, l.file_key, l.sort_order, l.created_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', q.id,
                    'questionType', q.question_type,
                    'questionText', q.question_text,
                    'optionA', q.option_a,
                    'optionB', q.option_b,
                    'optionC', q.option_c,
                    'optionD', q.option_d,
                    'correctAnswer', q.correct_answer,
                    'correctTextAnswer', q.correct_text_answer,
                    'sortOrder', q.sort_order
                  )
                  ORDER BY q.sort_order, q.created_at
                ) FILTER (WHERE q.id IS NOT NULL),
                '[]'
              ) AS questions
         FROM methodology_lessons l
         JOIN topics t ON t.id = l.topic_id
         JOIN training_types tt ON tt.id = t.training_type_id
         LEFT JOIN methodology_questions q ON q.lesson_id = l.id
        WHERE l.id = $1 AND tt.organization_id = $2
          AND l.deleted_at IS NULL AND t.deleted_at IS NULL AND tt.deleted_at IS NULL
        GROUP BY l.id`,
      [lessonId, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function updateLesson(id, orgId, fields, db = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['title', 'title'],
    ['description', 'description'],
    ['instruction', 'instruction'],
    ['coinReward', 'coin_reward'],
    ['videoUrl', 'video_url'],
    ['fileKey', 'file_key'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key] === '' ? null : fields[key]);
    }
  }
  if (cols.length === 0) return null;
  vals.push(id, orgId);
  return db
    .query(
      `UPDATE methodology_lessons SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND topic_id IN (
          SELECT t.id FROM topics t
          JOIN training_types tt ON tt.id = t.training_type_id
          WHERE tt.organization_id = $${i}
        ) AND deleted_at IS NULL
        RETURNING id, title, lesson_type, description, instruction, coin_reward, video_url, file_key, sort_order`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function archiveLesson(id, orgId, db = pool) {
  return db.query(
    `UPDATE methodology_lessons SET is_archived = true, updated_at = now()
      WHERE id = $1 AND topic_id IN (
        SELECT t.id FROM topics t
        JOIN training_types tt ON tt.id = t.training_type_id
        WHERE tt.organization_id = $2
      ) AND deleted_at IS NULL`,
    [id, orgId],
  );
}

// ==================== ВОПРОСЫ ====================
/** Урок принадлежит организации? — для проверки перед созданием вопроса
 * (раньше createQuestion вообще не проверял lessonId, IDOR). */
export function findLessonInOrgById(lessonId, orgId, db = pool) {
  return db
    .query(
      `SELECT l.id
         FROM methodology_lessons l
         JOIN topics t ON t.id = l.topic_id
         JOIN training_types tt ON tt.id = t.training_type_id
        WHERE l.id = $1 AND tt.organization_id = $2
          AND l.deleted_at IS NULL AND t.deleted_at IS NULL AND tt.deleted_at IS NULL`,
      [lessonId, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Вопрос принадлежит организации (через урок→тему→тип обучения)? —
 * для update/delete, тот же IDOR-пробел. */
export function findQuestionInOrg(id, orgId, db = pool) {
  return db
    .query(
      `SELECT q.id, q.lesson_id
         FROM methodology_questions q
         JOIN methodology_lessons l ON l.id = q.lesson_id
         JOIN topics t ON t.id = l.topic_id
         JOIN training_types tt ON tt.id = t.training_type_id
        WHERE q.id = $1 AND tt.organization_id = $2
          AND l.deleted_at IS NULL AND t.deleted_at IS NULL AND tt.deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

function questionRow(q) {
  const isChoice = q.questionType === 'choice';
  return [
    q.lessonId,
    q.questionType,
    q.questionText,
    isChoice ? q.optionA : null,
    isChoice ? q.optionB : null,
    isChoice ? q.optionC : null,
    isChoice ? q.optionD : null,
    isChoice ? q.correctAnswer : null,
    isChoice ? null : q.correctTextAnswer,
  ];
}

export function insertQuestion(payload, db = pool) {
  return db
    .query(
      `INSERT INTO methodology_questions
         (lesson_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, correct_text_answer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      questionRow(payload),
    )
    .then((r) => r.rows[0]);
}

export function insertQuestionsBatch(questions, db = pool) {
  if (questions.length === 0) return Promise.resolve([]);
  const values = [];
  const params = [];
  let i = 1;
  for (const q of questions) {
    values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7}, $${i + 8})`);
    params.push(...questionRow(q));
    i += 9;
  }
  return db
    .query(
      `INSERT INTO methodology_questions
         (lesson_id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, correct_text_answer)
       VALUES ${values.join(', ')}
       RETURNING *`,
      params,
    )
    .then((r) => r.rows);
}

export function listQuestions(lessonId, db = pool) {
  return db
    .query(
      `SELECT id, question_type, question_text, option_a, option_b, option_c, option_d, correct_answer, correct_text_answer, sort_order
         FROM methodology_questions
        WHERE lesson_id = $1
        ORDER BY sort_order, created_at`,
      [lessonId],
    )
    .then((r) => r.rows);
}

/** Полная замена (не partial-патч) — фронт всегда шлёт весь вопрос, включая
 * возможную смену questionType, поэтому старые option/correct-поля чистятся
 * явно, а не остаются "осиротевшими" от прежнего формата. */
export function updateQuestion(id, fields, db = pool) {
  const [, questionType, questionText, optionA, optionB, optionC, optionD, correctAnswer, correctTextAnswer] =
    questionRow({ ...fields, lessonId: null });
  return db
    .query(
      `UPDATE methodology_questions
          SET question_type = $2, question_text = $3,
              option_a = $4, option_b = $5, option_c = $6, option_d = $7,
              correct_answer = $8, correct_text_answer = $9
        WHERE id = $1
        RETURNING *`,
      [id, questionType, questionText, optionA, optionB, optionC, optionD, correctAnswer, correctTextAnswer],
    )
    .then((r) => r.rows[0] ?? null);
}

export function deleteQuestion(id, db = pool) {
  return db.query(`DELETE FROM methodology_questions WHERE id = $1`, [id]);
}
