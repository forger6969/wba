/**
 * Karis: Shop-админка — Branch Manager должен уметь отменить заказ с возвратом
 * коинов (студент передумал / товара физически не оказалось) и отметить выдачу.
 * До этой миграции у shop_orders вообще не было статуса — покупка была
 * необратимой записью. status по умолчанию 'pending' для всех старых заказов
 * (они уже были выданы физически до введения этого поля, но ретроактивно это
 * неизвестно — 'pending' безопаснее 'fulfilled': не даёт случайно решить, что
 * уже нечего отменять).
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE shop_orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled'));`);
  pgm.sql(`ALTER TABLE shop_orders ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
  pgm.sql(`ALTER TABLE shop_orders ADD COLUMN cancelled_by UUID REFERENCES users(id);`);
  pgm.sql(`CREATE INDEX idx_shop_orders_branch_status ON shop_orders (branch_id, status);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_shop_orders_branch_status;`);
  pgm.sql(`ALTER TABLE shop_orders DROP COLUMN IF EXISTS cancelled_by;`);
  pgm.sql(`ALTER TABLE shop_orders DROP COLUMN IF EXISTS updated_at;`);
  pgm.sql(`ALTER TABLE shop_orders DROP COLUMN IF EXISTS status;`);
};
