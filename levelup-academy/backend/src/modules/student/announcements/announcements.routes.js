import { Router } from 'express';
import { pool } from '../../../config/db.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { getDownloadUrl } from '../../../config/s3.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.body, a.created_at, a.expires_at, a.image_url, a.image_key, a.branch_id,
            b.name AS branch_name,
            concat_ws(' ', s.first_name, s.last_name) AS sender_name,
            s.role AS sender_role
       FROM org_announcements a
       LEFT JOIN users s ON s.id = a.sender_id
       LEFT JOIN branches b ON b.id = a.branch_id
      WHERE a.organization_id = $1
        AND a.deleted_at IS NULL
        AND a.target_type IN ('all-students', 'all-families')
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND (a.branch_id IS NULL OR a.branch_id = $2)
      ORDER BY a.created_at DESC`,
    [req.scope.organizationId, req.scope.branchId],
  );
  res.json({ announcements: await Promise.all(rows.map(async (row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    imageUrl: row.image_key ? await getDownloadUrl(row.image_key, 3600).catch(() => null) : row.image_url,
    branchId: row.branch_id,
    branchName: row.branch_name,
    senderName: row.sender_name,
    senderRole: row.sender_role,
  }))) });
}));

export default router;
