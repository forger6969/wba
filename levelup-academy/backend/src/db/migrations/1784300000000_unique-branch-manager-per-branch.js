/**
 * Add unique constraint: 1 branch_manager per branch.
 * Enforced at DB level via partial unique index.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_one_branch_manager_per_branch
    ON users (branch_id)
    WHERE role = 'branch_manager' AND deleted_at IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX IF EXISTS uq_one_branch_manager_per_branch;`);
};