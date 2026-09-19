import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');
const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'excused']);

export const groupIdParamSchema = z.object({
  groupId: z.string().uuid(),
});

export const markAttendanceBodySchema = z.object({
  lessonDate: dateSchema,
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: attendanceStatusEnum,
        comment: z.string().max(500).optional(),
      }),
    )
    .min(1, 'At least one attendance record is required')
    // дубль studentId в одном батче ломает единый INSERT ... ON CONFLICT
    // ("cannot affect row a second time") → ловим на границе как 422
    .refine((records) => new Set(records.map((r) => r.studentId)).size === records.length, {
      message: 'Duplicate studentId in records',
    }),
});

export const listAttendanceQuerySchema = z
  .object({
    date: dateSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine((v) => Boolean(v.date) || Boolean(v.from && v.to), {
    message: 'Provide either "date" or both "from" and "to"',
  });
