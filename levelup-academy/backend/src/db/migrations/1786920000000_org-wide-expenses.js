/** Allow CEO to record an expense for the whole organization, not one branch. */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE expenses ALTER COLUMN branch_id DROP NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM expenses WHERE branch_id IS NULL;
    ALTER TABLE expenses ALTER COLUMN branch_id SET NOT NULL;
  `);
};
