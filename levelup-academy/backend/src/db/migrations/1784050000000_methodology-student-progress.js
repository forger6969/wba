/**
 * Karis: студент проходит методику (training_types → topics → methodology_lessons)
 * своей группы (groups.training_type_id, см. 1783980000000). Тест урока (`lesson_type
 * = 'test'`) уже есть — methodology_questions. Не хватало только двух вещей на стороне
 * студента: куда писать попытку теста и куда писать сдачу практического урока
 * (`lesson_type = 'practical'`). Обе таблицы — по образцу уже существующих
 * test_results/homework_submissions (тот же idempotency-паттерн: уникальность
 * lesson+student, finished_at/status IS NULL как маркер "ещё не оценено").
 *
 * status переиспользует существующий enum homework_status — семантика та же
 * (assigned/submitted/graded/late), плодить дубль не вижу смысла.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE methodology_test_attempts (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id    UUID NOT NULL REFERENCES methodology_lessons(id),
        student_id   UUID NOT NULL REFERENCES users(id),
        answers      JSONB NOT NULL DEFAULT '[]',
        score        SMALLINT,
        started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at  TIMESTAMPTZ,
        CONSTRAINT uq_methodology_attempt UNIQUE (lesson_id, student_id)
    );
  `);
  pgm.sql(`CREATE INDEX idx_methodology_attempts_student ON methodology_test_attempts (student_id);`);

  pgm.sql(`
    CREATE TABLE methodology_submissions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id    UUID NOT NULL REFERENCES methodology_lessons(id),
        student_id   UUID NOT NULL REFERENCES users(id),
        status       homework_status NOT NULL DEFAULT 'submitted',
        file_key     TEXT,
        text_answer  TEXT,
        score        SMALLINT,
        graded_by    UUID REFERENCES users(id),
        graded_at    TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_methodology_submission UNIQUE (lesson_id, student_id)
    );
  `);
  pgm.sql(`CREATE INDEX idx_methodology_submissions_student ON methodology_submissions (student_id);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS methodology_submissions;`);
  pgm.sql(`DROP TABLE IF EXISTS methodology_test_attempts;`);
};
