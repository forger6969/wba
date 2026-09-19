import { AppError } from '../utils/AppError.js';
import { isFeatureEnabledForOrg } from '../shared/orgFeatures.js';

/**
 * Гейт на целый роут-поддерево (напр. /shop) по org_feature_flags — не только
 * прячем в sidebar, но и реально блокируем запрос, если Main Admin выключил
 * фичу партнёру (Karis, 13.08.2026: "otish iloji bolmasin", не только
 * невидимость в UI). `main_admin` (organizationId=null) пропускается —
 * платформа не привязана к фиче партнёра.
 */
export function requireOrgFeature(featureKey) {
  return async function featureGate(req, _res, next) {
    const orgId = req.user?.organizationId;
    if (!orgId) return next();

    try {
      const enabled = await isFeatureEnabledForOrg(orgId, featureKey);
      if (!enabled) {
        return next(new AppError(403, `Feature "${featureKey}" is not enabled for your organization`, { featureKey }));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
