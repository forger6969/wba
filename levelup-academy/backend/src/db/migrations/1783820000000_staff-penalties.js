/**
 * staff_penalties — дисциплина сотрудников (admin / mentor / methodist).
 *
 *  - shtraf: денежная сумма + причина. БЕЗ автосписания из зарплаты
 *            (даже у менторов — сумма чисто информативная).
 *  - qora:   «чёрная метка» = увольнение. При выдаче пользователю ставится
 *            status='fired' (блок входа). Super Admin может вернуть (reactivate).
 *
 * Права выдачи (проверяются в сервисах, не в БД):
 *  - super_admin -> admin, mentor, methodist   (shtraf и qora)
 *  - admin       -> mentor, methodist           (shtraf)
 *  - admin       -> mentor                       (qora — только ментор)
 *  - main_admin  -> НИЧЕГО
 */
export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE penalty_type AS ENUM ('shtraf', 'qora');

CREATE TABLE staff_penalties (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
    target_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_role      user_role NOT NULL,
    issued_by        UUID NOT NULL REFERENCES users(id),
    issuer_role      user_role NOT NULL,
    type             penalty_type NOT NULL,
    amount           NUMERIC(12, 2),          -- только для shtraf, в сумах; NULL для qora
    reason           TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_penalty_amount CHECK (
      (type = 'shtraf' AND amount IS NOT NULL AND amount >= 0)
      OR (type = 'qora' AND amount IS NULL)
    )
);

CREATE INDEX idx_staff_penalties_org    ON staff_penalties (organization_id, created_at DESC);
CREATE INDEX idx_staff_penalties_target ON staff_penalties (target_user_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS staff_penalties;
DROP TYPE IF EXISTS penalty_type;
  `);
};
