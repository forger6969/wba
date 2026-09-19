import { z } from 'zod';

// month — обязателен: branch-manager.service.js:expenses() бросает 422 без
// него. Раньше его не было в схеме — Zod молча вырезал query.month ДО
// сервиса (unknown keys stripped by default), и страница падала на каждый
// month-переключатель (Karis, баг 08.08.2026, репорт "Xatolik yuz berdi").
export const listExpensesQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM'),
  page: z.string().optional(),
  limit: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  category: z.string().optional(),
});

export const listIncomeQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM'),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// Тот же баг, что у listExpensesQuery: сервис читает query.months (число из
// переключателя «3 oy / 6 oy»), а схема знала только про старое query.range —
// months молча вырезался, фильтр не работал (см. комментарий в reports()).
export const listReportsQuery = z.object({
  range: z.enum(['3m', '6m', '12m']).optional(),
  months: z.string().optional(),
});