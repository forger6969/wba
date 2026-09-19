/**
 * K-PAY billing: differentiate system-generated monthly charges from
 * manually recorded payments, and prevent double-billing the same
 * student/group/month.
 *
 *   source = 'auto'   — created by the monthly billing worker (unpaid charge)
 *   source = 'manual' — created by an admin recording a payment (K-ADMIN)
 *
 * created_by becomes nullable because auto-generated invoices have no
 * human actor.
 */

export const up = (pgm) => {
  pgm.sql(`
ALTER TABLE invoices
  ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto'));

ALTER TABLE invoices ALTER COLUMN created_by DROP NOT NULL;

CREATE UNIQUE INDEX uq_invoices_auto_charge
  ON invoices (student_id, group_id, period_month)
  WHERE source = 'auto';
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS uq_invoices_auto_charge;
ALTER TABLE invoices ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE invoices DROP COLUMN IF EXISTS source;
  `);
};
