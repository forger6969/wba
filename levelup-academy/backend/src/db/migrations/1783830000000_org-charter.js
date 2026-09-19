/**
 * org_charters — «устав» организации: свободный текст правил, который пишет
 * Super Admin. Один устав на организацию (upsert). Виден ВСЕМ сотрудникам
 * (admin / mentor / methodist) в их панелях.
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TABLE org_charters (
    organization_id  UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL DEFAULT 'Устав',
    content          TEXT NOT NULL DEFAULT '',
    updated_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS org_charters;`);
};
