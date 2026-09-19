import { pool } from '../../config/db.js';

/** Видео по группам студента, без архивных. */
export async function listForGroups(groupIds) {
  if (groupIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT id, group_id, title, duration_sec, created_at
       FROM videos
      WHERE group_id = ANY($1) AND deleted_at IS NULL AND is_archived = false
      ORDER BY created_at DESC`,
    [groupIds],
  );
  return rows;
}

export async function getById(videoId) {
  const { rows: [video] } = await pool.query(
    `SELECT id, group_id, title, video_key, duration_sec
       FROM videos
      WHERE id = $1 AND deleted_at IS NULL AND is_archived = false`,
    [videoId],
  );
  return video ?? null;
}

/** Видео группы для ментора — свои и чужие ролью не различаются, только групповая принадлежность. */
export async function listForGroup(groupId) {
  const { rows } = await pool.query(
    `SELECT id, group_id, title, duration_sec, is_archived, created_at
       FROM videos
      WHERE group_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [groupId],
  );
  return rows;
}

export async function createVideo({ branchId, groupId, uploadedBy, title, videoKey, durationSec }) {
  const { rows: [video] } = await pool.query(
    `INSERT INTO videos (branch_id, group_id, uploaded_by, title, video_key, duration_sec)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, group_id, title, duration_sec, is_archived, created_at`,
    [branchId, groupId, uploadedBy, title, videoKey, durationSec ?? null],
  );
  return video;
}
