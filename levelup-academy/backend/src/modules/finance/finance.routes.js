import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import {
  createOrgExpenseSchema,
  listOrgExpensesSchema,
  updateOrgExpenseSchema,
  idParam,
  statsQuery,
} from '../super/super.schemas.js';
import { listIncomeSchema, listSalariesSchema } from './finance.schemas.js';
import * as superCtrl from '../super/super.controller.js';
import * as ctrl from './finance.controller.js';

/**
 * FINANCE MANAGER — вся организация насквозь (доход/расход/зарплаты), но
 * только финансы: ни филиалов, ни админов, ни студентов не видит и не
 * трогает. Karis 22.08.2026.
 *
 * Намеренно отдельный роутер/модуль, а не "authorize('finance_manager')"
 * добавлен в блок super.routes.js: там ОДИН authorize('ceo') на весь роутер
 * (филиалы, админы, студенты, объявления, аудит и т.д.) — расширять его
 * означало бы открыть Finance Manager'у всё это заодно. Контроллеры и
 * сервисный слой те же самые (super.controller.js/super.service.js) —
 * дублировать логику незачем, только точка входа/права другие.
 */
const router = Router();

router.use(authenticate, orgAccessGate, authorize('finance_manager', 'ceo'));

router.get('/dashboard', superCtrl.dashboard);
router.get('/stats', validate({ query: statsQuery }), superCtrl.stats);

router.post('/expenses', validate({ body: createOrgExpenseSchema }), superCtrl.createExpense);
router.get('/expenses', validate({ query: listOrgExpensesSchema }), superCtrl.listExpenses);
router.patch('/expenses/:id', validate({ params: idParam, body: updateOrgExpenseSchema }), superCtrl.updateExpense);
router.delete('/expenses/:id', validate({ params: idParam }), superCtrl.deleteExpense);

// Только для селекторов на страницах — id/name/isMain, без прав их менять.
router.get('/branches', ctrl.listBranches);

// Детализация поступлений (transactions, status='completed') — источник "Доходов".
router.get('/income', validate({ query: listIncomeSchema }), ctrl.listIncome);

// Ведомость зарплат (mentor_salaries) — сейчас только менторы, таблица может быть пустой.
router.get('/salaries', validate({ query: listSalariesSchema }), ctrl.listSalaries);

export default router;
