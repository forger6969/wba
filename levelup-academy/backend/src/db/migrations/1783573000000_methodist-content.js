/**
 * Methodist Content — типы обучения, темы, уроки (тесты + практика).
 *
 * Иерархия:
 *   training_type (Тип обучения: "Backend", "Frontend")
 *     └── topic (Тема: "React Hooks", "Python Loops")
 *           ├── lesson_type = 'test'     → methodology_questions (A/B/C/D)
 *           └── lesson_type = 'practical' → description + methodology_questions (мини-тест)
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE training_types (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        created_by      UUID NOT NULL REFERENCES users(id),
        name            VARCHAR(160) NOT NULL,
        description     TEXT,
        icon            VARCHAR(60),
        sort_order      SMALLINT NOT NULL DEFAULT 0,
        is_archived     BOOLEAN NOT NULL DEFAULT false,
        deleted_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_training_types_org ON training_types (organization_id) WHERE deleted_at IS NULL;

    CREATE TABLE topics (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        training_type_id UUID NOT NULL REFERENCES training_types(id) ON DELETE CASCADE,
        created_by      UUID NOT NULL REFERENCES users(id),
        name            VARCHAR(200) NOT NULL,
        description     TEXT,
        video_url       TEXT,
        sort_order      SMALLINT NOT NULL DEFAULT 0,
        is_archived     BOOLEAN NOT NULL DEFAULT false,
        deleted_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_topics_type ON topics (training_type_id) WHERE deleted_at IS NULL;

    -- Урок внутри темы: test (тест A/B/C/D) или practical (практическое задание)
    CREATE TYPE lesson_type AS ENUM ('test', 'practical');

    CREATE TABLE methodology_lessons (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        created_by      UUID NOT NULL REFERENCES users(id),
        title           VARCHAR(200) NOT NULL,
        lesson_type     lesson_type NOT NULL,
        description     TEXT,                  -- для practical: описание задания
        instruction     TEXT,                  -- краткое объяснение темы
        coin_reward     SMALLINT NOT NULL DEFAULT 0,
        sort_order      SMALLINT NOT NULL DEFAULT 0,
        is_archived     BOOLEAN NOT NULL DEFAULT false,
        deleted_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_lessons_topic ON methodology_lessons (topic_id) WHERE deleted_at IS NULL;

    -- Вопросы для тестов и практических заданий (A/B/C/D)
    CREATE TABLE methodology_questions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id       UUID NOT NULL REFERENCES methodology_lessons(id) ON DELETE CASCADE,
        question_text   TEXT NOT NULL,
        option_a        VARCHAR(300) NOT NULL,
        option_b        VARCHAR(300) NOT NULL,
        option_c        VARCHAR(300) NOT NULL,
        option_d        VARCHAR(300) NOT NULL,
        correct_answer  CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
        sort_order      SMALLINT NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_questions_lesson ON methodology_questions (lesson_id, sort_order);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS methodology_questions CASCADE;
    DROP TABLE IF EXISTS methodology_lessons CASCADE;
    DROP TYPE IF EXISTS lesson_type;
    DROP TABLE IF EXISTS topics CASCADE;
    DROP TABLE IF EXISTS training_types CASCADE;
  `);
};
