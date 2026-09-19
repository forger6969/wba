/**
 * Поднять лимит branch_manager на филиал с 1 до 2.
 *
 * Раньше check_one_branch_manager_per_branch() (см.
 * 1784310000000_deferred-branch-manager-constraint.js) блокировал ЛЮБОЙ
 * перевод менеджера в уже занятый филиал через обычный updateBranchManager —
 * единственным обходом был сложный reassignBranchManagers (атомарный своп
 * ≥2 назначений), для которого на фронте нет UI. На практике почти все
 * филиалы уже с менеджером, поэтому обычный перевод падал 409 почти всегда.
 *
 * Функция и DEFERRABLE INITIALLY DEFERRED остаются как есть (нужны и для
 * обычных UPDATE, и для reassign-транзакции) — меняется только сама
 * проверка: COUNT(*) >= 2 вместо EXISTS (т.е. «уже есть хоть один»).
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`
    CREATE OR REPLACE FUNCTION check_one_branch_manager_per_branch() RETURNS trigger AS $$
    BEGIN
      IF NEW.role = 'branch_manager' AND NEW.deleted_at IS NULL AND NEW.branch_id IS NOT NULL THEN
        IF (
          SELECT COUNT(*) FROM users
           WHERE branch_id = NEW.branch_id
             AND role = 'branch_manager'
             AND deleted_at IS NULL
             AND id <> NEW.id
        ) >= 2 THEN
          RAISE EXCEPTION 'branch_manager_duplicate: branch % already has 2 managers', NEW.branch_id
            USING ERRCODE = '23505';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

export const down = (pgm) => {
  pgm.noTransaction();
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
};
