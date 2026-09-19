/**
 * Обратная связь по группе (Admin GroupDetail → вкладка «Фикр-мулоҳоза»).
 *
 * Отдельная таблица, а не переиспользование чего-либо: отзыв ученика/ментора о
 * группе — это самостоятельная сущность, которой в схеме ещё не было (в отличие
 * от davomat и ДЗ, где таблицы уже есть и мы их переиспользуем).
 *
 * `type` — кто оставил отзыв: ученик или преподаватель. Имя автора хранится
 * строкой (`author_name`), а не ссылкой на users: отзыв заводит админ от лица
 * человека, которого в системе может не быть аккаунтом, и подпись — свободный
 * текст. `created_by` при этом всегда указывает на реального админа-автора
 * записи для аудита и скоупа по филиалу.
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE feedback_author AS ENUM ('student', 'teacher');

CREATE TABLE group_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    group_id    UUID NOT NULL REFERENCES groups(id),
    type        feedback_author NOT NULL,
    author_name VARCHAR(120),
    content     TEXT NOT NULL,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_by  UUID NOT NULL REFERENCES users(id),
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Список отзывов группы читается по group_id, свежие сверху.
CREATE INDEX idx_group_feedback_group ON group_feedback (group_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS group_feedback;
DROP TYPE IF EXISTS feedback_author;
  `);
};
