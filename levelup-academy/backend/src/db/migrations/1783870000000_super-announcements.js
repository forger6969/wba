/**
 * Объявления организации (Super Admin → страница «Анонсы»).
 *
 * Super Admin рассылает объявление аудитории внутри своей организации
 * (сотрудники / администраторы / менторы / родители / студенты). Доставку
 * родителям/студентам выполняет очередь уведомлений (Telegram-бот) — здесь
 * храним само объявление и число адресатов, посчитанное в момент отправки.
 *
 * read_count пока не заполняется (пометки «прочитано» в системе ещё нет) —
 * колонки под неё не заводим, число читателей выводится как 0 на уровне API.
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE announcement_target AS ENUM
    ('all-staff', 'all-admins', 'all-mentors', 'all-parents', 'all-students');

CREATE TABLE org_announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    sender_id       UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    target_type     announcement_target NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_announcements_org ON org_announcements (organization_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS org_announcements;
DROP TYPE IF EXISTS announcement_target;
  `);
};
