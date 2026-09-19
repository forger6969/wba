/**
 * Lesson media — methodist lessons can carry an external video link
 * (video_url, e.g. YouTube) and an uploaded practical-task attachment
 * stored in S3 (file_key). The attachment is uploaded via a presigned
 * PUT url (GET /api/methodist/lessons/:id/upload-url) and the returned
 * key is saved back with PATCH /api/methodist/lessons/:id { fileKey }.
 */

export const up = (pgm) => {
  pgm.sql(`
ALTER TABLE methodology_lessons
  ADD COLUMN video_url TEXT,
  ADD COLUMN file_key  TEXT;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
ALTER TABLE methodology_lessons
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS file_key;
  `);
};
