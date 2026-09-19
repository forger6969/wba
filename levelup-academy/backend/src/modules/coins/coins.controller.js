import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../../utils/pagination.js';
import * as coinsService from './coins.service.js';

/** GET /api/coins/me — баланс + история коинов текущего студента. */
export const getMyCoins = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { page, limit, offset } = parsePagination(req.query);

  const [balance, history] = await Promise.all([
    coinsService.getBalance(studentId),
    coinsService.getStudentHistory(studentId, { page, limit, offset }),
  ]);

  res.json({
    success: true,
    data: {
      balance,
      history: history.items,
      meta: buildPageMeta(history.total, page, limit),
    },
  });
});
