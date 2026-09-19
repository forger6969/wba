/**
 * Karis 22.08.2026: Finance Manager (frontend/staff/src/pages/finance/) видит
 * ВСЮ организацию насквозь (как CEO/methodist), не один филиал — но
 * chk_users_branch_scope до этой миграции требовал branch_id у любой роли,
 * кроме main_admin/superadmin/methodist. Добавляем finance_manager в тот же
 * список исключений — тот же приём, что и для methodist
 * (1783572100000_fix-methodist-constraint.js).
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_branch_scope;
    ALTER TABLE users ADD CONSTRAINT chk_users_branch_scope
      CHECK (role IN ('main_admin', 'seo', 'methodist', 'finance_manager') OR branch_id IS NOT NULL);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_branch_scope;
    ALTER TABLE users ADD CONSTRAINT chk_users_branch_scope
      CHECK (role IN ('main_admin', 'seo', 'methodist') OR branch_id IS NOT NULL);
  `);
};
