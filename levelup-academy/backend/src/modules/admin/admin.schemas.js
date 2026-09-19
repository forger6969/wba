import { z } from 'zod';

// ---------- переиспользуемые примитивы ----------
const phone = z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone');
const name = (min = 1, max = 80) => z.string().trim().min(min).max(max);
// NUMERIC(12,2) — максимум 9 999 999 999.99
const money = z.coerce.number().positive().max(9_999_999_999);
const moneyNonNeg = z.coerce.number().nonnegative().max(9_999_999_999);

export const idParam = z.object({ id: z.string().uuid('Invalid id') });

export const groupStudentParams = z.object({
  id: z.string().uuid('Invalid id'),
  studentId: z.string().uuid('Invalid studentId'),
});

// ---------- расходы ----------
export const createExpenseSchema = z.object({
  category: z.string().trim().min(1).max(60),
  amount: money,
  spentAt: z.coerce.date().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const updateExpenseSchema = z
  .object({
    category: z.string().trim().min(1).max(60),
    amount: money,
    spentAt: z.coerce.date(),
    note: z.string().trim().max(1000),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const listExpensesQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ---------- студенты ----------
// Admin заводит ученика: логин-код + пароль генерятся на бэке.
// Родитель опционален — если заведён, получает свой логин-код+пароль и привязывается.
const gender = z.enum(['male', 'female']);
// профиль-поля виджета «Профиль заполнен» — все опциональны и на create, и на update
const profileFields = {
  gender: gender.optional(),
  address: z.string().trim().max(255).optional(),
  school: z.string().trim().max(120).optional(),
  leadSource: z.string().trim().max(60).optional(),
  hasLaptop: z.boolean().optional(),
  offerSigned: z.boolean().optional(),
};

export const createStudentSchema = z.object({
  firstName: name(),
  lastName: name(),
  phone,
  birthDate: z.coerce.date().optional(),
  groupId: z.string().uuid('Invalid groupId').optional(),
  parent: z
    .object({
      firstName: name(),
      lastName: name(),
      phone,
    })
    .optional(),
  ...profileFields,
});

export const updateStudentSchema = z
  .object({
    firstName: name(),
    lastName: name(),
    phone,
    birthDate: z.coerce.date(),
    ...profileFields,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const freezeStudentSchema = z.object({
  frozen: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const deleteStudentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const studentsStatsQuery = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).optional(),
});

export const listStudentsQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().trim().max(120).optional(),
  groupId: z.string().uuid('Invalid groupId').optional(),
});

// ---------- менторы (Admin заводит в своём филиале, вход по email) ----------
const email = z.string().trim().toLowerCase().email('Invalid email');

// password опционален: форма создания (Mentors.jsx) его не собирает — как и
// у студента/родителя, бэкенд сам генерирует и возвращает пароль (08.08.2026,
// баг Karis: раньше форма молчаливо не слала password вовсе, а он был
// обязателен → 400 без объяснения). Явный password оставлен ради обратной
// совместимости, если кто-то когда-то отправит его сам.
export const createMentorSchema = z.object({
  firstName: name(),
  lastName: name(),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
  phone: phone.optional(),
});

export const freezeMentorSchema = z.object({ frozen: z.boolean() });

/**
 * `grade` — уровень ментора (junior/middle/senior). Живёт именно здесь, а не в
 * профиле самого ментора: себе уровень не присваивают. `null` снимает грейд.
 */
export const updateMentorSchema = z
  .object({
    firstName: name(),
    lastName: name(),
    phone,
  }).strict()
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

// ---------- группы ----------
// Admin выбирает дни недели + время начала; конец урока считает бэкенд
// из длительности урока организации (CEO). См. admin.service.buildSchedule.
const dayEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const daysSchema = z
  .array(dayEnum)
  .min(1, 'Pick at least one day')
  .max(7)
  .refine((a) => new Set(a).size === a.length, 'Duplicate days');
const startTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM');

// trainingTypeId — методика с ценой от CEO; когда указана, backend сам берёт
// subject/monthlyPrice из неё (см. admin.service.createGroup), а не доверяет
// клиенту. subject/monthlyPrice остаются опциональными только ради старых
// групп без методики (см. 1783980000000_training-type-price.js).
export const createGroupSchema = z
  .object({
    name: name(2, 120),
    trainingTypeId: z.string().uuid('Invalid trainingTypeId').optional(),
    subject: name(1, 120).optional(),
    mentorId: z.string().uuid('Invalid mentorId'),
    monthlyPrice: moneyNonNeg.optional(),
    days: daysSchema,
    startTime: startTimeSchema,
    room: z.string().trim().max(60).optional(),
    roomId: z.string().uuid('Invalid roomId').optional(),
  })
  .refine((o) => o.trainingTypeId || (o.subject && o.monthlyPrice !== undefined), {
    message: 'Either trainingTypeId or subject + monthlyPrice is required',
  });

export const updateGroupSchema = z
  .object({
    name: name(2, 120),
    trainingTypeId: z.string().uuid('Invalid trainingTypeId'),
    subject: name(1, 120),
    mentorId: z.string().uuid('Invalid mentorId'),
    monthlyPrice: moneyNonNeg,
    days: daysSchema,
    startTime: startTimeSchema,
    room: z.string().trim().max(60),
    roomId: z.string().uuid('Invalid roomId').nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' })
  // расписание меняется целиком: дни и время начала только вместе
  .refine((o) => (o.days === undefined) === (o.startTime === undefined), {
    message: 'days and startTime must be provided together',
  });

export const addGroupStudentSchema = z.object({
  studentId: z.string().uuid('Invalid studentId'),
});

export const listGroupsQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ---------- рабочее пространство группы (davomat / ДЗ / фикр) ----------
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// davomat: чтение по дате урока
export const groupAttendanceQuery = z.object({ date: isoDate });

export const sendStudentTelegramMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  toParent: z.boolean().optional(),
});

export const studentAttendanceQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// davomat: массовая отметка. status = null → снять отметку (ученик «не отмечен»).
// studentName фронт присылает для оптимистичного UI — на бэке имя берём из users,
// поэтому здесь оно необязательно и игнорируется.
export const markGroupAttendanceSchema = z.object({
  lessonDate: isoDate,
  records: z
    .array(
      z.object({
        studentId: z.string().uuid('Invalid studentId'),
        studentName: z.string().optional(),
        status: z.enum(['present', 'absent', 'late', 'excused']).nullable(),
      }),
    )
    .min(1, 'At least one record is required'),
});

// ДЗ: админ заводит короткое задание (заголовок + описание + срок).
// maxScore/coinReward не задаются из этой формы — берутся дефолты таблицы.
export const createGroupHomeworkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: isoDate.optional(),
});

// фикр-мулоҳоза: отзыв ученика/ментора о группе
export const createGroupFeedbackSchema = z.object({
  type: z.enum(['student', 'teacher']),
  authorName: z.string().trim().max(120).optional(),
  content: z.string().trim().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5),
});

// ---------- объявления ----------
// Без groupId — рассылка всем активным студентам/родителям филиала.
export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
  targetType: z.enum(['all-students', 'all-parents', 'all-families']).default('all-families'),
  expiresAt: z.string().datetime(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  imageKey: z.string().max(600).nullable().optional(),
});
export const improveAnnouncementSchema = z.object({
  title: z.string().trim().max(200).default(''),
  body: z.string().trim().max(4000).default(''),
  targetType: z.enum(['all-students', 'all-parents', 'all-families']).default('all-families'),
  expiresAt: z.string().datetime(),
  details: z.object({
    eventDateTime: z.string().max(80).optional().default(''),
    location: z.string().max(300).optional().default(''),
    mapUrl: z.string().max(500).optional().default(''),
    contact: z.string().max(200).optional().default(''),
    extra: z.string().max(1000).optional().default(''),
  }).optional().default({}),
});
