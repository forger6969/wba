/**
 * Aqlli tahlil (AI-review практических уроков, спека Abdulloh 08.08.2026,
 * согласовано с Karis 07.08 в plan-режиме). Обслуживает Student-панель
 * (frontend/member/src/student), которую строит XOB — см. FeedbackDemo.jsx.
 *
 * review_status — свой TEXT, не homework_status: значения другие по смыслу
 * (pending/processing/done/failed/skipped), не про "сдано/оценено", а про
 * состояние асинхронной AI-обработки одной сдачи.
 * ai_review_enabled — per-training_type флаг: включается методистом только
 * для курсов, где практика — реальный код (HTML/CSS/JS), не для React и
 * прочих курсов с большим числом файлов (см. п.3 спеки).
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE methodology_submissions
      ADD COLUMN review JSONB,
      ADD COLUMN review_source TEXT,
      ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN review_attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN reviewed_at TIMESTAMPTZ;
  `);
  pgm.sql(`ALTER TABLE training_types ADD COLUMN ai_review_enabled BOOLEAN NOT NULL DEFAULT false;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE training_types DROP COLUMN IF EXISTS ai_review_enabled;`);
  pgm.sql(`
    ALTER TABLE methodology_submissions
      DROP COLUMN IF EXISTS review,
      DROP COLUMN IF EXISTS review_source,
      DROP COLUMN IF EXISTS review_status,
      DROP COLUMN IF EXISTS review_attempts,
      DROP COLUMN IF EXISTS reviewed_at;
  `);
};
