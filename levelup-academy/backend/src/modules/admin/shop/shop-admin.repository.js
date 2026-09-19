import { pool } from '../../../config/db.js';

/** Все товары филиала для управления (без фильтра по остатку/архиву — в отличие от student-стороны). */
export async function findItemsByBranch(branchId) {
  const { rows } = await pool.query(
    `SELECT id, name, image_key, coin_price, stock, is_archived, created_at,
            catalog_item_id, (catalog_item_id IS NOT NULL) AS is_global
       FROM shop_items
      WHERE branch_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [branchId],
  );
  return rows;
}

/** Каталог всей организации (CEO) — опционально сузить одним филиалом. */
export async function findItemsByOrg(organizationId, branchId = null) {
  const params = [organizationId];
  let filter = '';
  if (branchId) {
    params.push(branchId);
    filter = `AND i.branch_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT i.id, i.branch_id, i.name, i.image_key, i.coin_price, i.stock, i.is_archived, i.created_at,
            b.name AS branch_name
       FROM shop_items i
       JOIN branches b ON b.id = i.branch_id
      WHERE b.organization_id = $1 AND i.deleted_at IS NULL ${filter}
      ORDER BY i.created_at DESC`,
    params,
  );
  return rows;
}

export async function findCatalogByOrg(organizationId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.image_key, c.coin_price, c.is_archived, c.created_at,
            count(i.id)::int AS branch_count, COALESCE(sum(i.stock), 0)::int AS total_stock
       FROM shop_catalog_items c
       LEFT JOIN shop_items i ON i.catalog_item_id = c.id AND i.deleted_at IS NULL
      WHERE c.organization_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
    [organizationId],
  );
  return rows;
}

export async function createCatalogForAllBranches(organizationId, body, client) {
  const { rows: [catalog] } = await client.query(
    `INSERT INTO shop_catalog_items (organization_id, name, image_key, coin_price)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, image_key, coin_price, is_archived, created_at`,
    [organizationId, body.name, body.imageKey ?? null, body.coinPrice],
  );
  await client.query(
    `INSERT INTO shop_items (branch_id, catalog_item_id, name, image_key, coin_price, stock)
     SELECT b.id, $2, $3, $4, $5, 0
       FROM branches b
      WHERE b.organization_id = $1 AND b.deleted_at IS NULL`,
    [organizationId, catalog.id, body.name, body.imageKey ?? null, body.coinPrice],
  );
  return catalog;
}

export async function updateCatalogForOrg(organizationId, catalogId, patch, client) {
  const sets = [];
  const values = [];
  let n = 1;
  if (patch.name !== undefined) { sets.push(`name = $${n++}`); values.push(patch.name); }
  if (patch.imageKey !== undefined) { sets.push(`image_key = $${n++}`); values.push(patch.imageKey); }
  if (patch.coinPrice !== undefined) { sets.push(`coin_price = $${n++}`); values.push(patch.coinPrice); }
  sets.push('updated_at = now()');
  values.push(catalogId, organizationId);
  const { rows: [catalog] } = await client.query(
    `UPDATE shop_catalog_items SET ${sets.join(', ')}
      WHERE id = $${n} AND organization_id = $${n + 1}
      RETURNING id, name, image_key, coin_price, is_archived, created_at`, values,
  );
  if (!catalog) return null;
  await client.query(
    `UPDATE shop_items SET name = $2, image_key = $3, coin_price = $4
      WHERE catalog_item_id = $1 AND deleted_at IS NULL`,
    [catalog.id, catalog.name, catalog.image_key, catalog.coin_price],
  );
  return catalog;
}

export async function archiveCatalogForOrg(organizationId, catalogId, archived, client) {
  const { rows: [catalog] } = await client.query(
    `UPDATE shop_catalog_items SET is_archived = $3, updated_at = now()
      WHERE id = $1 AND organization_id = $2
      RETURNING id, name, image_key, coin_price, is_archived, created_at`,
    [catalogId, organizationId, archived],
  );
  if (!catalog) return null;
  await client.query(
    `UPDATE shop_items SET is_archived = $2 WHERE catalog_item_id = $1 AND deleted_at IS NULL`,
    [catalogId, archived],
  );
  return catalog;
}

export async function addCatalogToBranch(organizationId, branchId, client = pool) {
  await client.query(
    `INSERT INTO shop_items (branch_id, catalog_item_id, name, image_key, coin_price, stock, is_archived)
     SELECT $2, c.id, c.name, c.image_key, c.coin_price, 0, c.is_archived
       FROM shop_catalog_items c
      WHERE c.organization_id = $1
     ON CONFLICT (branch_id, catalog_item_id) WHERE catalog_item_id IS NOT NULL AND deleted_at IS NULL DO NOTHING`,
    [organizationId, branchId],
  );
}

export async function syncCatalogForBranch(branchId, client = pool) {
  await client.query(
    `INSERT INTO shop_items (branch_id, catalog_item_id, name, image_key, coin_price, stock, is_archived)
     SELECT b.id, c.id, c.name, c.image_key, c.coin_price, 0, c.is_archived
       FROM branches b
       JOIN shop_catalog_items c ON c.organization_id = b.organization_id
      WHERE b.id = $1 AND b.deleted_at IS NULL
     ON CONFLICT (branch_id, catalog_item_id) WHERE catalog_item_id IS NOT NULL AND deleted_at IS NULL DO NOTHING`,
    [branchId],
  );
}

/** branch_id + organization_id товара — чтобы CEO мог проверить владение перед правкой. */
export async function findItemBranchOrg(itemId) {
  const { rows: [row] } = await pool.query(
    `SELECT i.id, i.branch_id, b.organization_id
       FROM shop_items i
       JOIN branches b ON b.id = i.branch_id
      WHERE i.id = $1 AND i.deleted_at IS NULL`,
    [itemId],
  );
  return row ?? null;
}

export async function findBranchInOrg(branchId, organizationId) {
  const { rows: [row] } = await pool.query(
    `SELECT id FROM branches WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [branchId, organizationId],
  );
  return row ?? null;
}

export async function setItemArchived(itemId, branchId, archived) {
  const { rows: [row] } = await pool.query(
    `UPDATE shop_items SET is_archived = $3
      WHERE id = $1 AND branch_id = $2 AND deleted_at IS NULL
      RETURNING id, branch_id, name, image_key, coin_price, stock, is_archived, created_at`,
    [itemId, branchId, archived],
  );
  return row ?? null;
}

/** Возврат на склад при отмене заказа — зеркало student/shop/shop.repository.js decrementStock. */
export async function incrementStock(itemId, client) {
  await client.query(`UPDATE shop_items SET stock = stock + 1 WHERE id = $1`, [itemId]);
}

export async function listOrdersByBranch(branchId, { status, limit, offset }) {
  const params = [branchId];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `AND o.status = $${params.length}`;
  }
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await pool.query(
    `SELECT o.id, o.item_id, o.student_id, o.coin_price, o.status, o.created_at, o.updated_at,
            i.name AS item_name, s.first_name AS student_first, s.last_name AS student_last
       FROM shop_orders o
       JOIN shop_items i ON i.id = o.item_id
       JOIN users s ON s.id = o.student_id
      WHERE o.branch_id = $1 ${statusFilter}
      ORDER BY o.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );
  return rows;
}

export async function countOrdersByBranch(branchId, { status }) {
  const params = [branchId];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `AND status = $${params.length}`;
  }
  const { rows: [row] } = await pool.query(
    `SELECT count(*)::int AS n FROM shop_orders WHERE branch_id = $1 ${statusFilter}`,
    params,
  );
  return row.n;
}

export async function lockOrderInBranch(orderId, branchId, client) {
  const { rows: [row] } = await client.query(
    `SELECT id, branch_id, item_id, student_id, coin_price, status
       FROM shop_orders
      WHERE id = $1 AND branch_id = $2
      FOR UPDATE`,
    [orderId, branchId],
  );
  return row ?? null;
}

export async function setOrderStatus(orderId, status, cancelledBy, client) {
  const { rows: [row] } = await client.query(
    `UPDATE shop_orders
        SET status = $2::varchar, updated_at = now(),
            cancelled_by = CASE WHEN $2::varchar = 'cancelled' THEN $3::uuid ELSE cancelled_by END
      WHERE id = $1
      RETURNING id, branch_id, item_id, student_id, coin_price, status, created_at, updated_at`,
    [orderId, status, cancelledBy],
  );
  return row;
}
