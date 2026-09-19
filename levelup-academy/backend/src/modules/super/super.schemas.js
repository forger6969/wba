import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Invalid email');

// :id в пути
export const idParam = z.object({ id: z.string().uuid('Invalid id') });

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email,
  branchId: z.string().uuid('Invalid branchId'),
  jobTitle: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
});

export const createOrgMentorSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email,
  branchId: z.string().uuid('Invalid branchId'),
  phone: z.string().trim().max(30).optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  branchId: z.string().uuid('Invalid branchId').optional(),
  jobTitle: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  monthlySalary: z.coerce.number().min(0).max(1_000_000_000_000).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

// CEO создаёт расход на уровне организации, поэтому филиал указывается
// явно и затем проверяется по organization_id в service.
export const createOrgExpenseSchema = z.object({
  // null = expense for the whole learning center, UUID = one concrete branch
  branchId: z.string().uuid('Invalid branchId').nullable(),
  category: z.string().trim().min(1).max(60),
  amount: z.coerce.number().positive().max(9_999_999_999),
  spentAt: z.coerce.date().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listOrgExpensesSchema = z.object({
  // omitted = all scopes, "organization" = only center-wide expenses
  branchId: z.union([z.string().uuid('Invalid branchId'), z.literal('organization')]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const updateOrgExpenseSchema = z
  .object({
    category: z.string().trim().min(1).max(60),
    amount: z.coerce.number().positive().max(9_999_999_999),
    spentAt: z.coerce.date(),
    note: z.string().trim().max(1000),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

// цена абонемента методики — та же граница, что и у monthlyPrice группы в admin.schemas.js
export const setTrainingTypePriceSchema = z.object({
  price: z.coerce.number().nonnegative().max(9_999_999_999),
  // лимит группы для этой методики — решает только CEO (не admin/branch_manager при создании группы)
  maxStudents: z.coerce.number().int().positive().max(500).optional(),
});

export const setTrainingTypeArchivedSchema = z.object({
  archived: z.boolean(),
});

// редактирование организации (Settings) — частичное; domain может быть пустым => null
const orgDomainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;
export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2, 'Too short').max(160),
    domain: z
      .union([
        z.string().trim().toLowerCase().regex(orgDomainRegex, 'Invalid domain'),
        z.literal(''),
        z.null(),
      ])
      .transform((v) => (v ? v : null)),
    // длительность урока (минуты) — применяется ко всем группам организации
    lessonDurationMin: z.coerce.number().int().min(10, 'Min 10 min').max(600, 'Max 600 min'),
    /* Сколько коинов ментор вправе выдать одному ученику за месяц. Бюджет
       группы = это число × её размер; 0 = раздача коинов запрещена. Потолок
       здесь только чтобы отсечь опечатку вида «1000000». */
    coinsPerStudent: z.coerce.number().int().min(0, 'Cannot be negative').max(1000, 'Max 1000'),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

// редактирование филиала — частичное (хотя бы одно поле)
export const updateBranchSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().max(500),
    // пустая строка разрешена и означает «телефона нет». Без неё правка
    // филиала без телефона всегда падала с 422: форма шлёт '', а regex
    // его не принимает — отредактировать такой филиал было невозможно.
    phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone').or(z.literal('')),
    // nullable: null — это «убрать точку с карты». Без него отметку можно было
    // только поставить и поменять, но не снять: отсутствующее поле схема
    // трактует как «не трогать».
    lat: z.coerce.number().min(-90).max(90).nullable(),
    lng: z.coerce.number().min(-180).max(180).nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' })
  .refine(
    (o) => (o.lat === undefined) === (o.lng === undefined),
    { message: 'Координаты меняются только парой', path: ['lat'] },
  )
  .refine(
    (o) => o.lat === undefined || (o.lat === null) === (o.lng === null),
    { message: 'Либо обе координаты, либо ни одной', path: ['lat'] },
  );

// Оклад — просто метаданные карточки сотрудника, не участвует ни в каком
// автоматическом расчёте (см. discipline: % от оклада там пока тоже вручную).
const monthlySalaryField = z.coerce.number().min(0, 'Не может быть отрицательным').max(1_000_000_000_000).nullable();

// редактирование админа — частичное (email/пароль тут не меняем)
export const updateAdminSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    branchId: z.string().uuid('Invalid branchId'),
    phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone'),
    monthlySalary: monthlySalaryField,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

// заморозка / разморозка админа
export const freezeSchema = z.object({ frozen: z.boolean() });

export const updateMentorGradeSchema = z.object({
  grade: z.enum(['junior', 'middle', 'senior']).nullable(),
});

export const updateMentorBranchSchema = z.object({
  branchId: z.string().uuid('Invalid branchId'),
});

// CEO создаёт филиал в своей организации
export const createBranchSchema = z.object({
  name: z.string().trim().min(2, 'Too short').max(120),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone').or(z.literal('')).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
}).refine((b) => (b.lat === undefined) === (b.lng === undefined), {
  message: 'Координаты нужны обе сразу',
  path: ['lat'],
});

// CEO создаёт админа и назначает в свой филиал.
// Логин (email) задаёт CEO; пароль генерируется автоматически и
// показывается один раз — так же, как Main Admin заводит CEO.
export const createAdminSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email,
  branchId: z.string().uuid('Invalid branchId'),
  phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone').or(z.literal('')).optional(),
});

// ---------- методисты (без branchId — на уровне организации) ----------

export const createMethodistSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email,
  phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone').or(z.literal('')).optional(),
});

export const updateMethodistSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone'),
    monthlySalary: monthlySalaryField,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const freezeMethodistSchema = z.object({ frozen: z.boolean() });

// ---------- объявления организации ----------

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
  targetType: z.enum(['all-staff', 'all-admins', 'all-mentors', 'all-parents', 'all-students', 'all-families']),
  branchId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  imageKey: z.string().max(600).nullable().optional(),
});

export const improveAnnouncementSchema = z.object({
  title: z.string().trim().max(200).default(''),
  body: z.string().trim().max(4000).default(''),
  targetType: z.enum(['all-staff', 'all-admins', 'all-mentors', 'all-parents', 'all-students', 'all-families']),
  branchId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime(),
  details: z.object({
    eventDateTime: z.string().max(80).optional().default(''),
    location: z.string().max(300).optional().default(''),
    mapUrl: z.string().max(500).optional().default(''),
    contact: z.string().max(200).optional().default(''),
    extra: z.string().max(1000).optional().default(''),
  }).optional().default({}),
});

// ---------- статистика: период ----------

export const statsQuery = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).optional(),
  branchId: z.string().uuid().optional(),
});

export const createBranchManagerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email,
  branchId: z.string().uuid('Invalid branchId'),
  phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone').or(z.literal('')).optional(),
});

// редактирование Branch Manager — частичное (хотя бы одно поле)
// branchId позволяет переместить в другой филиал (должен быть из своей орг)
export const updateBranchManagerSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    branchId: z.string().uuid('Invalid branchId'),
    phone: z.string().trim().regex(/^\+?\d{7,20}$/, 'Invalid phone').or(z.literal('')).optional(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

// заморозка / разморозка Branch Manager
export const freezeBranchManagerSchema = z.object({ frozen: z.boolean() });

// перестановка нескольких Branch Manager'ов между филиалами одной атомарной
// операцией — на случай, когда все участвующие филиалы уже заняты и обычный
// updateBranchManagerSchema (перенос по одному) упрётся в занятый филиал
export const reassignBranchManagersSchema = z.object({
  assignments: z
    .array(
      z.object({
        id: z.string().uuid('Invalid id'),
        branchId: z.string().uuid('Invalid branchId'),
      }),
    )
    .min(2, 'Need at least 2 assignments to reassign')
    .refine((arr) => new Set(arr.map((a) => a.id)).size === arr.length, {
      message: 'Duplicate branch manager id in assignments',
    })
    .refine((arr) => new Set(arr.map((a) => a.branchId)).size === arr.length, {
      message: 'Duplicate target branchId in assignments',
    }),
});

// ---------- shop-каталог (CEO заводит товары/цену/фото — филиал только пополняет остаток) ----------
export const createShopItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  imageKey: z.string().trim().max(512).optional(),
  coinPrice: z.coerce.number().int().positive(),
});

export const updateShopItemSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    imageKey: z.string().trim().max(512),
    coinPrice: z.coerce.number().int().positive(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const setShopItemArchivedSchema = z.object({
  archived: z.boolean(),
});

export const listShopItemsQuery = z.object({});

// CEO не переключает фичи сам — только просит Main Admin подключить/отключить.
export const createFeatureRequestSchema = z.object({
  featureKey: z.string().trim().min(1).max(60),
  type: z.enum(['add', 'remove']),
  note: z.string().trim().max(500).optional(),
});
