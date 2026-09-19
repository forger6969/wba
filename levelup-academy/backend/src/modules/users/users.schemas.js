import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(['main_admin', 'ceo', 'admin', 'mentor', 'methodist', 'parent', 'student']).optional(),
  status: z.enum(['active', 'frozen', 'graduated', 'dropped']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const directoryQuerySchema = z.object({
  role: z.enum([
    'main_admin', 'ceo', 'admin', 'branch_manager', 'finance_manager',
    'mentor', 'methodist', 'parent', 'student',
  ]).optional(),
  status: z.enum(['active', 'frozen', 'graduated', 'dropped', 'fired']).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

/**
 * Собственный профиль.
 *
 * `bio` и `skills` — карточка ментора (таблица mentor_profiles); у остальных
 * ролей сервис их просто игнорирует.
 *
 * `grade` в списке НЕТ намеренно: ментор не присваивает себе уровень. Zod по
 * умолчанию срезает неизвестные ключи, поэтому подложить его в тело запроса
 * бесполезно — до SQL он не доедет. Грейд ставит админ через
 * PATCH /api/admin/mentors/:id.
 */
export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    email: z.string().email().max(160).optional(),
    avatarKey: z.string().max(512).optional(),
    bio: z.string().max(1000).optional(),
    skills: z
      .array(z.string().trim().min(1, 'Empty skill').max(40))
      .max(20, 'Too many skills')
      // повторы — почти всегда опечатка в UI, а не намерение
      .refine((a) => new Set(a.map((s) => s.toLowerCase())).size === a.length, {
        message: 'Duplicate skills',
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
