import { pool } from '../../../config/db.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { AppError } from '../../../utils/AppError.js';
import { getLeaderboard, getGroupLeaderboard } from '../../leaderboard/leaderboard.service.js';

/**
 * GET /leaderboard?period=week|month&groupId=... — без groupId топ филиала,
 * с groupId — топ своей группы (403, если студент в неё не входит).
 */
export const getMyLeaderboard = asyncHandler(async (req, res) => {
  const { period, groupId } = req.query;

  if (groupId) {
    const { rows: [membership] } = await pool.query(
      `SELECT 1 FROM group_students WHERE group_id = $1 AND student_id = $2 AND left_at IS NULL`,
      [groupId, req.user.id],
    );
    if (!membership) throw new AppError(403, 'Not a member of this group');

    const data = await getGroupLeaderboard(groupId, period, { limit: 20, studentId: req.user.id });
    return res.json({ success: true, data });
  }

  const data = await getLeaderboard(req.user.branchId, period, { limit: 20, studentId: req.user.id });
  res.json({ success: true, data });
});
