/**
 * Напоминания организации (Super Admin → страница «Напоминания», история).
 *
 * Своей очереди/логики отправки не заводит — лог пишется реактивно из
 * BullMQ QueueEvents ('notifications' queue) слушателем в
 * modules/super/reminders/reminders.listener.js, когда воркер (Bilol,
 * notification.worker.js) обрабатывает job'ы payment.due / payment.due_soon /
 * debt.overdue, которые кладут в очередь billing/dueSoon/overdue-воркеры
 * (Karis, K-PAY). Слушатель — самостоятельный подписчик на общую очередь,
 * не правит чужие файлы воркеров.
 *
 * student_name/parent_name денормализованы (как в audit_log) — аккаунт могут
 * потом удалить/заморозить, а в истории напоминаний должно остаться, кому
 * что отправлялось. payload хранит исходные данные job'а (studentId/amount/
 * dueDate/daysLeft) — нужны для POST /resend (повторная постановка в очередь
 * с теми же данными).
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    branch_id       UUID REFERENCES branches(id),
    student_id      UUID REFERENCES users(id),
    student_name    TEXT NOT NULL,
    parent_name     TEXT,
    kind            VARCHAR(30) NOT NULL,
    payload         JSONB NOT NULL,
    message         TEXT NOT NULL,
    status          reminder_status NOT NULL DEFAULT 'pending',
    error           TEXT,
    job_id          TEXT NOT NULL,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_reminders_job UNIQUE (job_id)
);

CREATE INDEX idx_reminders_org ON reminders (organization_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS reminders;
DROP TYPE IF EXISTS reminder_status;
  `);
};
