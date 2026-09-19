/**
 * Swap the plain unique index for a DEFERRABLE constraint trigger so a batch
 * reassignment of branch managers across already-occupied branches can commit
 * atomically. A plain unique index (or a unique constraint built on top of
 * one) checks on every statement and can't be made deferrable when it's
 * partial (WHERE role = 'branch_manager') — Postgres refuses ADD CONSTRAINT
 * ... UNIQUE USING INDEX for partial indexes. A constraint trigger has no
 * such restriction and INITIALLY DEFERRED means the check only runs at
 * COMMIT, so intermediate duplicate states inside one transaction are fine
 * as long as the final state is valid.
 *
 * RAISE ... USING ERRCODE = '23505' keeps the error code identical to the
 * index violation it replaces, so existing `err.code === '23505'` handlers
 * in super.service.js keep working unchanged.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX IF EXISTS uq_one_branch_manager_per_branch;`);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION check_one_branch_manager_per_branch() RETURNS trigger AS $$
    BEGIN
      IF NEW.role = 'branch_manager' AND NEW.deleted_at IS NULL AND NEW.branch_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM users
           WHERE branch_id = NEW.branch_id
             AND role = 'branch_manager'
             AND deleted_at IS NULL
             AND id <> NEW.id
        ) THEN
          RAISE EXCEPTION 'branch_manager_duplicate: branch % already has a manager', NEW.branch_id
            USING ERRCODE = '23505';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_one_branch_manager_per_branch ON users;`);
  pgm.sql(`
    CREATE CONSTRAINT TRIGGER trg_one_branch_manager_per_branch
      AFTER INSERT OR UPDATE ON users
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION check_one_branch_manager_per_branch();
  `);
};

export const down = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`DROP TRIGGER IF EXISTS trg_one_branch_manager_per_branch ON users;`);
  pgm.sql(`DROP FUNCTION IF EXISTS check_one_branch_manager_per_branch();`);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_one_branch_manager_per_branch
    ON users (branch_id)
    WHERE role = 'branch_manager' AND deleted_at IS NULL;
  `);
};
