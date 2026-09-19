import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import attendanceRoutes from './attendance/attendance.routes.js';
import homeworkRoutes from './homework/homework.routes.js';
import testsRoutes from './tests/tests.routes.js';
import salaryRoutes from './salary/salary.routes.js';
import coinsRoutes from './coins/coins.routes.js';
import groupsRoutes from './groups/groups.routes.js';
import studentsRoutes from './students/students.routes.js';

/**
 * Агрегатор mentor-домена (AB-MENTOR). Подключается основным приложением
 * (app.js), например: app.use('/api/mentor', mentorRoutes).
 *
 * Доступ: mentor + admin (salary upsert/approve — только admin, роль
 * дополнительно проверяется в salary.service). Скоуп org/branch — authorize.
 */
const router = Router();

router.use(authenticate, orgAccessGate, authorize('mentor', 'admin'));

router.use('/attendance', attendanceRoutes);
router.use('/homework', homeworkRoutes);
router.use('/tests', testsRoutes);
router.use('/salary', salaryRoutes);
router.use('/coins', coinsRoutes);
router.use('/groups', groupsRoutes);
router.use('/students', studentsRoutes);

export default router;
