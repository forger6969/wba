import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './trials.controller.js';
import { createTrialSchema, updateTrialSchema, listTrialsQuery, trialIdParam } from './trials.schemas.js';

/** Probniy darslar (trial lessons) — admin + ceo (egasi/superadmin) yuritadi. */
const router = Router();
router.use(authenticate, orgAccessGate, authorize('admin', 'branch_manager', 'ceo'));

router.get('/', validate({ query: listTrialsQuery }), ctrl.list);
router.post('/', validate({ body: createTrialSchema }), ctrl.create);
router.patch('/:id', validate({ params: trialIdParam, body: updateTrialSchema }), ctrl.update);
router.delete('/:id', validate({ params: trialIdParam }), ctrl.remove);

export default router;
