export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee'`);
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(120)`);
};

export const down = () => {};
