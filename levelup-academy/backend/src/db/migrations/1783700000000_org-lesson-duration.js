/**
 * Lesson duration — org-wide setting managed by the Super Admin
 * (e.g. 80 = 1h 20m). When an Admin creates/edits a group they pick the
 * days + a start time; the backend computes each lesson's end time from
 * start_time + this duration.
 */

export const up = (pgm) => {
  pgm.sql(`
ALTER TABLE organizations
  ADD COLUMN lesson_duration_min SMALLINT NOT NULL DEFAULT 60 CHECK (lesson_duration_min > 0);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
ALTER TABLE organizations DROP COLUMN IF EXISTS lesson_duration_min;
  `);
};
