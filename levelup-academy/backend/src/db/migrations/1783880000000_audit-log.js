/**
 * Аудит-лог организации (Super Admin → страница «Аудит»).
 *
 * Пишется на важные мутации внутри организации (создание/правка/заморозка
 * филиалов, админов, методистов, удаление студентов/групп, рассылки, смена
 * настроек организации). Только на чтение для Super Admin — записи не
 * удаляются и не редактируются.
 *
 * actor_name/actor_role денормализованы: аккаунт актора могут потом удалить
 * (soft-delete), но в аудите должно остаться, КТО совершил действие.
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    actor_id        UUID REFERENCES users(id),
    actor_name      TEXT,
    actor_role      user_role,
    action          VARCHAR(80) NOT NULL,
    entity_type     VARCHAR(60),
    entity_id       UUID,
    entity_label    TEXT,
    success         BOOLEAN NOT NULL DEFAULT true,
    ip              VARCHAR(60),
    user_agent      TEXT,
    meta            JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org ON audit_log (organization_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS audit_log;
  `);
};
