/**
 * Fix chk_users_branch_scope to include 'methodist' role.
 * Методисты находятся на уровне организации (без branch_id),
 * поэтому constraint должен разрешать NULL branch_id для methodist.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_branch_scope;
    ALTER TABLE users ADD CONSTRAINT chk_users_branch_scope
      CHECK (role IN ('main_admin', 'superadmin', 'methodist') OR branch_id IS NOT NULL);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_branch_scope;
    ALTER TABLE users ADD CONSTRAINT chk_users_branch_scope
      CHECK (role IN ('main_admin', 'superadmin') OR branch_id IS NOT NULL);
  `);
};
