import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './main.service.js';
import { siteAnalytics as siteAnalyticsService } from '../analytics/analytics.service.js';

export const onboardPartner = asyncHandler(async (req, res) => {
  const result = await service.onboardPartner(req.body);
  await audit(req, {
    action: 'partner.onboarded',
    orgId: result.organization.id,
    entityType: 'organization',
    entityId: result.organization.id,
    entityLabel: result.organization.name,
    // tempPassword СОЗНАТЕЛЬНО не пишем — журнал читаемый, паролю в нём не место
    after: { name: result.organization.name, domain: result.organization.domain, ceoEmail: result.ceo.email },
  });
  res.status(201).json(result);
});

export const listPartners = asyncHandler(async (_req, res) => {
  res.json({ partners: await service.listPartners() });
});

export const dashboard = asyncHandler(async (_req, res) => {
  res.json(await service.platformDashboard());
});

export const revenue = asyncHandler(async (_req, res) => {
  res.json(await service.platformRevenue());
});

export const getPricing = asyncHandler(async (_req, res) => {
  res.json({ pricing: await service.getPricing() });
});

export const updatePricing = asyncHandler(async (req, res) => {
  res.json({ pricing: await service.updatePricing(req.body) });
});

// --- управление партнёром ---
export const setPartnerStatus = asyncHandler(async (req, res) => {
  const partner = await service.setPartnerStatus(req.params.id, req.body.status, req.body.reason, auditBase(req));
  res.json({ partner });
});

// --- каталог платных фич ---
export const listAddonPrices = asyncHandler(async (_req, res) => {
  res.json({ features: await service.listAddonPrices() });
});

export const createAddonFeature = asyncHandler(async (req, res) => {
  const feature = await service.createAddonFeature(req.body, req.user.id);
  await audit(req, { action: 'platform.feature_created', entityType: 'addon_feature', entityId: feature.id, entityLabel: feature.label, after: feature });
  res.status(201).json({ feature });
});

export const updateAddonFeature = asyncHandler(async (req, res) => {
  const feature = await service.updateAddonFeature(req.params.key, req.body);
  await audit(req, { action: 'platform.feature_updated', entityType: 'addon_feature', entityLabel: req.params.key, after: feature });
  res.json({ feature });
});

export const deactivateAddonFeature = asyncHandler(async (req, res) => {
  const feature = await service.deactivateAddonFeature(req.params.key);
  await audit(req, { action: 'platform.feature_deactivated', entityType: 'addon_feature', entityLabel: req.params.key, before: feature });
  res.json({ feature });
});

// --- фичи партнёра ---
export const getPartnerFeatures = asyncHandler(async (req, res) => {
  res.json(await service.getPartnerFeatures(req.params.id));
});

export const setPartnerFeature = asyncHandler(async (req, res) => {
  const flag = await service.setFeatureFlag(req.params.id, req.params.key, req.body.enabled, req.user.id);
  await audit(req, {
    action: req.body.enabled ? 'partner.feature_enabled' : 'partner.feature_disabled',
    orgId: req.params.id,
    entityType: 'feature_flag',
    entityLabel: req.params.key,
    after: { featureKey: req.params.key, enabled: req.body.enabled },
  });
  res.json({ flag });
});

// --- биллинг партнёра ---
export const recordPayment = asyncHandler(async (req, res) => {
  const payment = await service.recordPayment(req.params.id, req.body, req.user.id, auditBase(req));
  res.status(201).json({ payment });
});

export const grantBonus = asyncHandler(async (req, res) => {
  const result = await service.grantBonus(req.params.id, req.body.months, req.user.id, req.body.note, auditBase(req));
  res.json(result);
});

export const listOrgLedger = asyncHandler(async (req, res) => {
  res.json({ ledger: await service.listOrgLedger(req.params.id) });
});

// --- собственные расходы платформы ---
export const listExpenses = asyncHandler(async (_req, res) => {
  res.json({ expenses: await service.listExpenses() });
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(req.body, req.user.id, auditBase(req));
  res.status(201).json({ expense });
});

export const videoStorageCosts = asyncHandler(async (_req, res) => {
  res.json(await service.videoStorageCosts());
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await service.deleteExpense(req.params.id, req.body?.reason ?? null, auditBase(req));
  res.json(expense);
});

export const finance = asyncHandler(async (_req, res) => {
  res.json(await service.platformFinance());
});

// --- заявки CEO на подключение/отключение фичи ---
export const listFeatureRequests = asyncHandler(async (req, res) => {
  res.json({ requests: await service.listFeatureRequests(req.query.status) });
});

export const decideFeatureRequest = asyncHandler(async (req, res) => {
  const request = await service.decideFeatureRequest(req.params.id, req.body.decision, req.user.id);
  await audit(req, {
    action: `partner.feature_request_${req.body.decision}`,
    orgId: request.organization_id,
    entityType: 'feature_request',
    entityId: request.id,
    entityLabel: request.feature_key,
    after: { decision: req.body.decision, featureKey: request.feature_key },
  });
  res.json({ request });
});

// --- заявки с лендинга ---
export const submitLead = asyncHandler(async (req, res) => {
  // публичный endpoint — наружу только id
  res.status(201).json(await service.submitLead(req.body));
});

export const listLeads = asyncHandler(async (req, res) => {
  res.json({ leads: await service.listLeads(req.query.status) });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await service.updateLead(req.params.id, req.body);
  await audit(req, { action: 'platform.lead_updated', entityType: 'lead', entityId: lead.id, entityLabel: lead.center_name || lead.name, after: req.body });
  res.json({ lead });
});

// --- объявления платформы ---
export const listAnnouncements = asyncHandler(async (_req, res) => {
  res.json(await service.listAnnouncements());
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const result = await service.createAnnouncement(req.user.id, req.body);
  await audit(req, { action: 'platform.announcement_created', entityType: 'announcement', entityId: result.announcement?.id, entityLabel: req.body.title, after: { title: req.body.title, targetType: req.body.targetType } });
  res.status(201).json(result);
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const result = await service.deleteAnnouncement(req.params.id);
  await audit(req, { action: 'platform.announcement_deleted', entityType: 'announcement', entityId: req.params.id, entityLabel: result?.title, before: result });
  res.json(result);
});

// --- профиль ---
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ profile: await service.getProfile(req.user.id) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await service.updateProfile(req.user.id, req.body);
  await audit(req, { action: 'platform.profile_updated', entityType: 'main_admin', entityId: req.user.id, entityLabel: `${profile.firstName} ${profile.lastName}`, after: req.body });
  res.json({ profile });
});

// дисциплина сотрудников — зона CEO (/api/super/penalties), не платформы

// ---------- Audit Log платформы (Karis 25.08.2026) ----------

/**
 * До этого в модуле main НЕ БЫЛО ни одной записи в журнал: заморозка партнёра,
 * ручной платёж, бонусные месяцы, переключение платных фич — всё уходило без
 * следа, потому что audit_log требовал organization_id NOT NULL, а Main Admin
 * вне организаций (миграция 1787100000000 это сняла).
 *
 * orgId передаём, когда действие касается конкретного партнёра — тогда запись
 * видна и в разрезе организации; для чисто платформенных действий он null.
 * Не await'им: журнал — побочный эффект, ответ пользователю его не ждёт
 * (сам recordPlatformAudit ошибку глотает и логирует).
 */
function audit(req, { action, orgId, entityType, entityId, entityLabel, before, after, reason, meta }) {
  return service.recordPlatformAudit({
    orgId: orgId ?? null,
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action,
    entityType,
    entityId,
    entityLabel,
    before,
    after,
    reason,
    meta,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

function auditBase(req) {
  return { actorId: req.user?.id, actorRole: req.user?.role, ip: req.ip, userAgent: req.headers['user-agent'] };
}

/** GET /api/main/audit?scope=&action=&organizationId=&limit=&offset= */
export const listAudit = asyncHandler(async (req, res) => {
  res.json(await service.listPlatformAudit(req.query));
});

/** GET /api/main/action-center — что требует вмешательства прямо сейчас. */
export const actionCenter = asyncHandler(async (_req, res) => {
  res.json(await service.actionCenter());
});

/**
 * GET /api/main/site-analytics?days=28 — аналитика сайта levelup-academy.uz.
 *
 * Живёт в модуле analytics (Search Console + GA4), а не здесь: к партнёрам и
 * биллингу это отношения не имеет, но смотрит на неё тот же Main Admin, и
 * авторизация уже стоит на всём /api/main.
 */
export const siteAnalytics = asyncHandler(async (req, res) => {
  res.json(await siteAnalyticsService(req.query.days));
});

// ---------- Модерация чата (Karis 26.08.2026) ----------

export const listBannedWords = asyncHandler(async (_req, res) => {
  res.json({ words: await service.listBannedWords() });
});

export const addBannedWords = asyncHandler(async (req, res) => {
  const words = await service.addBannedWords(req.body.words, req.user.id);
  await audit(req, {
    action: 'chat.banned_words_added',
    entityType: 'banned_word',
    entityLabel: words.map((w) => w.word).join(', '),
    after: { words: words.map((w) => w.word) },
  });
  res.status(201).json({ words });
});

export const setBannedWordActive = asyncHandler(async (req, res) => {
  const word = await service.setBannedWordActive(req.params.id, req.body.isActive);
  await audit(req, {
    action: req.body.isActive ? 'chat.banned_word_enabled' : 'chat.banned_word_disabled',
    entityType: 'banned_word',
    entityId: word.id,
    entityLabel: word.word,
  });
  res.json({ word });
});

export const setBannedWordAutoMask = asyncHandler(async (req, res) => {
  const word = await service.setBannedWordAutoMask(req.params.id, req.body.autoMask);
  await audit(req, {
    action: req.body.autoMask ? 'chat.banned_word_automask_enabled' : 'chat.banned_word_automask_disabled',
    entityType: 'banned_word',
    entityId: word.id,
    entityLabel: word.word,
  });
  res.json({ word });
});

export const deleteBannedWord = asyncHandler(async (req, res) => {
  const word = await service.deleteBannedWord(req.params.id);
  await audit(req, {
    action: 'chat.banned_word_deleted',
    entityType: 'banned_word',
    entityId: word.id,
    entityLabel: word.word,
    before: word,
  });
  res.json({ word });
});

export const listFlaggedMessages = asyncHandler(async (req, res) => {
  res.json(await service.listFlaggedMessages(req.query));
});
