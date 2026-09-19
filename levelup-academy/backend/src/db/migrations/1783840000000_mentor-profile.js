/**
 * mentor_profiles — профессиональная карточка ментора: о себе, навыки, грейд.
 *
 * Почему отдельная таблица, а не колонки в `users`:
 *  - поля осмысленны только для роли mentor; в users они были бы NULL у всех
 *    студентов, родителей и админов, то есть у подавляющего большинства строк;
 *  - `users` читается на КАЖДОМ запросе (authenticate), раздувать её тремя
 *    колонками ради одной роли невыгодно;
 *  - карточка ментора будет расти (образование, сертификаты, опыт) — здесь это
 *    добавление колонки в редко читаемую таблицу, а не в горячую.
 *
 * Грейд ментор себе не ставит: PATCH /api/users/me его не принимает (см.
 * users.schemas.js), пишет только админ через PATCH /api/admin/mentors/:id.
 * Поэтому рядом хранится, кто и когда его присвоил — поле, которое сам
 * владелец менять не может, должно быть прослеживаемым.
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE mentor_grade AS ENUM ('junior', 'middle', 'senior');

CREATE TABLE mentor_profiles (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio           TEXT,
    skills        TEXT[] NOT NULL DEFAULT '{}',
    grade         mentor_grade,                       -- NULL = ещё не присвоен
    grade_set_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    grade_set_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_mentor_bio_len CHECK (bio IS NULL OR length(bio) <= 1000),
    -- потолок на список навыков: без него один клиент способен положить
    -- в строку мегабайт тегов
    CONSTRAINT chk_mentor_skills_len CHECK (
      array_length(skills, 1) IS NULL OR array_length(skills, 1) <= 20
    )
);

CREATE INDEX idx_mentor_profiles_grade ON mentor_profiles (grade);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS mentor_profiles;
DROP TYPE IF EXISTS mentor_grade;
  `);
};
