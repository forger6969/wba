import { pool } from '../../../config/db.js';

export async function listRoomsByBranch(branchId) {
  const { rows } = await pool.query(
    `SELECT id, branch_id, name, capacity, created_at
       FROM rooms
      WHERE branch_id = $1 AND deleted_at IS NULL
      ORDER BY name`,
    [branchId],
  );
  return rows;
}

export async function findRoomInBranch(roomId, branchId) {
  const { rows: [row] } = await pool.query(
    `SELECT id, branch_id, name, capacity, created_at
       FROM rooms
      WHERE id = $1 AND branch_id = $2 AND deleted_at IS NULL`,
    [roomId, branchId],
  );
  return row ?? null;
}

export async function insertRoom({ branchId, name, capacity }) {
  const { rows: [row] } = await pool.query(
    `INSERT INTO rooms (branch_id, name, capacity)
     VALUES ($1, $2, $3)
     RETURNING id, branch_id, name, capacity, created_at`,
    [branchId, name, capacity ?? null],
  );
  return row;
}

export async function updateRoom(roomId, branchId, patch) {
  const fields = [];
  const values = [];
  let i = 1;
  if (patch.name !== undefined) { fields.push(`name = $${i++}`); values.push(patch.name); }
  if (patch.capacity !== undefined) { fields.push(`capacity = $${i++}`); values.push(patch.capacity); }
  values.push(roomId, branchId);
  const { rows: [row] } = await pool.query(
    `UPDATE rooms SET ${fields.join(', ')}, updated_at = now()
      WHERE id = $${i} AND branch_id = $${i + 1} AND deleted_at IS NULL
      RETURNING id, branch_id, name, capacity, created_at`,
    values,
  );
  return row ?? null;
}

export async function softDeleteRoom(roomId, branchId) {
  const { rows: [row] } = await pool.query(
    `UPDATE rooms SET deleted_at = now() WHERE id = $1 AND branch_id = $2 AND deleted_at IS NULL RETURNING id`,
    [roomId, branchId],
  );
  return row ?? null;
}

/** Активные (неархивные) группы, занимающие кабинет — блокирует удаление, как у ментора. */
export async function countActiveGroupsInRoom(roomId) {
  const { rows: [row] } = await pool.query(
    `SELECT count(*)::int AS n FROM groups WHERE room_id = $1 AND deleted_at IS NULL AND is_archived = false`,
    [roomId],
  );
  return row.n;
}
