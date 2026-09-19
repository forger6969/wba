export const up = (pgm) => {
  pgm.sql(`ALTER TYPE announcement_target ADD VALUE IF NOT EXISTS 'all-families'`);
};

// PostgreSQL enum values are intentionally retained on rollback.
export const down = () => {};
