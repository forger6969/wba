/**
 * Объявления платформы (Main Admin → страница «Анонсы»).
 *
 * Отличие от `org_announcements` (Super Admin): там объявление живёт ВНУТРИ одной
 * организации и адресовано её сотрудникам/родителям. Здесь отправитель — владелец
 * платформы, а аудитория — сами партнёры: либо все организации, либо их владельцы
 * (Super Admin'ы). Поэтому `organization_id` тут нет, а enum аудитории свой —
 * переиспользовать `announcement_target` нельзя, значения не пересекаются.
 *
 * Доставка: получатели — сотрудники (Super Admin'ы), у них нет привязки к Telegram-боту
 * (`telegram_accounts` заполняется только для student/parent). Поэтому объявление
 * хранится как внутренняя запись и показывается в панели, в очередь уведомлений
 * не уходит — иначе воркер молча отбросил бы задание, не найдя chat_id.
 *
 * read_count не заполняется — пометок «прочитано» в системе нет (та же причина,
 * что и в org_announcements). API отдаёт 0.
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE platform_announcement_target AS ENUM ('all-partners', 'all-superadmins');

CREATE TABLE platform_announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    target_type     platform_announcement_target NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_announcements_created ON platform_announcements (created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS platform_announcements;
DROP TYPE IF EXISTS platform_announcement_target;
  `);
};
