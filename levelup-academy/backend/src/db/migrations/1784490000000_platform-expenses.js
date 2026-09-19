/**
 * Собственные расходы платформы (домен, хостинг Render/Neon/Storj и т.п.) —
 * НЕ расходы партнёра/филиала (те уже есть в `expenses`, с organization_id).
 * Намеренно без organization_id, чтобы структурно нельзя было перепутать
 * два разных вида расходов.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE platform_expenses (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label        VARCHAR(160) NOT NULL,
        amount       INTEGER NOT NULL,
        category     VARCHAR(60),
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_by   UUID NOT NULL REFERENCES users(id),
        deleted_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_platform_expenses_date ON platform_expenses (expense_date DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS platform_expenses;`);
};
