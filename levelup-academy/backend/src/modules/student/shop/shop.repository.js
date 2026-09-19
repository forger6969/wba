import { pool } from '../../../config/db.js';

/** Активные товары с наличием на складе для филиала студента. */
export async function findActiveItemsByBranch(branchId) {
  await pool.query(
    `INSERT INTO shop_items (branch_id, catalog_item_id, name, image_key, coin_price, stock, is_archived)
     SELECT b.id, c.id, c.name, c.image_key, c.coin_price, 0, c.is_archived
       FROM branches b
       JOIN shop_catalog_items c ON c.organization_id = b.organization_id
      WHERE b.id = $1 AND b.deleted_at IS NULL
     ON CONFLICT (branch_id, catalog_item_id) WHERE catalog_item_id IS NOT NULL AND deleted_at IS NULL DO NOTHING`,
    [branchId],
  );
  const { rows } = await pool.query(
    `SELECT id, name, image_key, coin_price, stock
       FROM shop_items
      WHERE branch_id = $1 AND deleted_at IS NULL AND is_archived = false AND stock > 0
      ORDER BY coin_price ASC`,
    [branchId],
  );
  return rows;
}

/** Блокирует строку товара (SELECT ... FOR UPDATE) — вызывается внутри транзакции. */
export async function lockItem(itemId, client) {
  const { rows: [item] } = await client.query(
    `SELECT id, branch_id, name, coin_price, stock, is_archived
       FROM shop_items
      WHERE id = $1 AND deleted_at IS NULL
      FOR UPDATE`,
    [itemId],
  );
  return item ?? null;
}

export async function decrementStock(itemId, client) {
  await client.query(`UPDATE shop_items SET stock = stock - 1 WHERE id = $1`, [itemId]);
}

export async function insertOrder({ branchId, itemId, studentId, coinPrice }, client) {
  const { rows: [order] } = await client.query(
    `INSERT INTO shop_orders (branch_id, item_id, student_id, coin_price)
     VALUES ($1, $2, $3, $4)
     RETURNING id, branch_id, item_id, student_id, coin_price, created_at`,
    [branchId, itemId, studentId, coinPrice],
  );
  return order;
}

/** История покупок студента с названием товара. */
export async function findOrdersByStudent(studentId) {
  const { rows } = await pool.query(
    `SELECT o.id, o.item_id, o.coin_price, o.created_at, i.name AS item_name, i.image_key
       FROM shop_orders o
       JOIN shop_items i ON i.id = o.item_id
      WHERE o.student_id = $1
      ORDER BY o.created_at DESC`,
    [studentId],
  );
  return rows;
}

export async function createItem({ branchId, name, imageKey, coinPrice, stock }) {
  const { rows: [item] } = await pool.query(
    `INSERT INTO shop_items (branch_id, name, image_key, coin_price, stock)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, branch_id, name, image_key, coin_price, stock, is_archived, created_at`,
    [branchId, name, imageKey ?? null, coinPrice, stock],
  );
  return item;
}

/** Частичное обновление товара — только переданные поля, строго в своём филиале. */
export async function updateItem(itemId, branchId, patch) {
  const fields = [];
  const values = [];
  let i = 1;

  if (patch.name !== undefined) { fields.push(`name = $${i++}`); values.push(patch.name); }
  if (patch.imageKey !== undefined) { fields.push(`image_key = $${i++}`); values.push(patch.imageKey); }
  if (patch.coinPrice !== undefined) { fields.push(`coin_price = $${i++}`); values.push(patch.coinPrice); }
  if (patch.stock !== undefined) { fields.push(`stock = $${i++}`); values.push(patch.stock); }

  values.push(itemId, branchId);
  const { rows: [item] } = await pool.query(
    `UPDATE shop_items SET ${fields.join(', ')}
      WHERE id = $${i} AND branch_id = $${i + 1} AND deleted_at IS NULL
      RETURNING id, branch_id, name, image_key, coin_price, stock, is_archived, created_at`,
    values,
  );
  return item ?? null;
}
