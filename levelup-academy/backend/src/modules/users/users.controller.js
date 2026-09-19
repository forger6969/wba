import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../../utils/pagination.js';
import { AppError } from '../../utils/AppError.js';
import { isFeatureEnabledForOrg } from '../../shared/orgFeatures.js';
import * as usersService from './users.service.js';

/**
 * GET /api/users/me — текущий пользователь + `orgFeatures` (Karis, 13.08.2026):
 * staff-фронт (admin/ceo/branch-manager/mentor/methodist) дёргает этот
 * эндпоинт на каждую загрузку — удобная точка, чтобы прятать Shop/Telegram
 * в sidebar, не заводя отдельный роут. Только свой профиль — чужие через
 * GET /:id этого не получают.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getById(req.user.id);
  const orgId = req.user.organizationId;
  const [shop, telegramIntegration] = orgId
    ? await Promise.all([
        isFeatureEnabledForOrg(orgId, 'shop'),
        isFeatureEnabledForOrg(orgId, 'telegram_integration'),
      ])
    : [false, false];
  res.json({ success: true, data: { ...user, orgFeatures: { shop, telegramIntegration } } });
});

/** PATCH /api/users/me — обновить свой профиль (роль решает, доступна ли карточка ментора). */
export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateOwnProfile(req.user.id, req.user.role, req.body);
  res.json({ success: true, data: user });
});

/**
 * GET /api/users/:id — карточка пользователя строго в своём скоупе:
 * main_admin — вся платформа; ceo — своя организация;
 * остальные — свой филиал. Чужой скоуп неотличим от несуществующего (404).
 */
export const getUser = asyncHandler(async (req, res) => {
  const user = await usersService.getById(req.params.id);

  const requester = req.user;
  if (requester.role !== 'main_admin') {
    const inScope = requester.role === 'ceo'
      ? user.organization_id === requester.organizationId
      : user.branch_id === requester.branchId;
    if (!inScope) throw new AppError(404, 'User not found');
  }

  res.json({ success: true, data: user });
});

/** GET /api/users — список пользователей своего филиала. */
export const listUsers = asyncHandler(async (req, res) => {
  const { role, status } = req.query;
  const { page, limit, offset } = parsePagination(req.query);
  const branchId = req.user.branchId;
  if (!branchId) throw new AppError(400, 'Branch scope required');

  const result = await usersService.listBranchUsers({ branchId, role, status, page, limit, offset });
  res.json({
    success: true,
    data: result.items,
    meta: buildPageMeta(result.total, page, limit),
  });
});

/** GET /api/users/directory — единая role-aware база людей и клиентов. */
export const listDirectory = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;
  const { page, limit, offset } = parsePagination(req.query);
  const result = await usersService.listDirectory({
    requester: req.user, role, status, search, page, limit, offset,
  });
  res.json({
    success: true,
    data: result.items,
    meta: { ...buildPageMeta(result.total, page, limit), ...result.capabilities },
  });
});
