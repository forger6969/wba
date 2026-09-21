import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const STATUS = ['scheduled', 'attended', 'enrolled', 'thinking', 'rejected'];

export const createTrialSchema = z.object({
  studentName: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(32).optional(),
  subject: z.string().trim().max(120).optional(),
  trialDate: dateStr.optional(),
  mentorId: z.string().uuid().optional(),
  status: z.enum(STATUS).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateTrialSchema = z.object({
  studentName: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().max(32).optional(),
  subject: z.string().trim().max(120).optional(),
  trialDate: dateStr.optional(),
  mentorId: z.string().uuid().optional(),
  status: z.enum(STATUS).optional(),
  reason: z.string().max(2000).optional(),
  followUpDate: dateStr.optional(),
  notes: z.string().max(2000).optional(),
});

export const listTrialsQuery = z.object({ status: z.enum(STATUS).optional() });
export const trialIdParam = z.object({ id: z.string().uuid() });
