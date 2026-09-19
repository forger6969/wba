import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import overviewRoutes from './overview/overview.routes.js';
import notificationsRoutes from './notifications/notifications.routes.js';

/** Агрегатор parent-домена — монтируется в app.js. */
const router = Router();

router.use(authenticate, orgAccessGate, authorize('parent'));

router.use('/', overviewRoutes);
router.use('/', notificationsRoutes);

export default router;
