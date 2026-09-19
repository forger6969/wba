/**
 * Karis 21.08.2026: видео темы теперь тоже может давать монеты (столько же
 * методист задаёт, сколько уже есть у теста/дз урока — та же колонка-паттерн,
 * что methodology_lessons.coin_reward). Начисление — только один раз на
 * студента (иначе можно фармить монеты, пересматривая видео) — для этого
 * topic_video_views: UNIQUE(topic_id, student_id), сам факт строки = уже
 * начислено, идемпотентный INSERT ... ON CONFLICT DO NOTHING в репозитории.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE topics ADD COLUMN coin_reward SMALLINT NOT NULL DEFAULT 0;`);

  pgm.sql(`
    CREATE TABLE topic_video_views (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id   UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES users(id),
        watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_topic_video_view UNIQUE (topic_id, student_id)
    );
  `);
  pgm.sql(`CREATE INDEX idx_topic_video_views_student ON topic_video_views (student_id);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS topic_video_views;`);
  pgm.sql(`ALTER TABLE topics DROP COLUMN IF EXISTS coin_reward;`);
};
