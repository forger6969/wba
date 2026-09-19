/**
 * Add 'branch_manager' role to user_role enum.
 * Branch Manager — reads his own branch dashboard, income, expenses,
 * reports and branch info. No CRUD over students/groups/mentors.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branch_manager'`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TYPE user_role RENAME TO user_role_old;
    CREATE TYPE user_role AS ENUM ('main_admin','superadmin','admin','mentor','parent','student','methodist');
    ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
    DROP TYPE user_role_old;`);
};