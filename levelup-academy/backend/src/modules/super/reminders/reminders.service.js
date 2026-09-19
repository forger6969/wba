import { AppError } from '../../../utils/AppError.js';
import { notificationQueue } from '../../../queues/notification.queue.js';
import * as repo from './reminders.repository.js';

function mapRow(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    parentName: r.parent_name ?? '—',
    message: r.message,
    status: r.status,
    error: r.error,
    sentAt: r.sent_at,
    createdAt: r.created_at,
  };
}

export async function listReminders(orgId) {
  const rows = await repo.listByOrg(orgId);
  const items = rows.map(mapRow);
  return { items, reminders: items, total: items.length };
}

/**
 * Повторная постановка того же job'а в очередь с тем же payload. История не
 * переписывается — старая (failed) строка остаётся как есть, новая попытка
 * появится отдельной строкой, когда слушатель увидит её completed/failed.
 *
 * Payload — снимок долга на момент первой отправки. Если с тех пор студент
 * оплатил счёт, слепой resend уйдёт с устаревшей суммой и напугает родителя,
 * который уже заплатил — поэтому сверяем с актуальным total_debt перед тем,
 * как ставить job в очередь заново.
 */
export async function resendReminder(orgId, id) {
  const row = await repo.getById(orgId, id);
  if (!row) throw new AppError(404, 'Reminder not found');

  const debt = await repo.getStudentDebt(row.student_id ?? row.payload?.studentId);
  if (debt !== null && debt <= 0) {
    throw new AppError(409, 'У студента больше нет задолженности — напоминание уже неактуально');
  }

  await notificationQueue.add(row.kind, row.payload);
  return { id: row.id, requeued: true };
}

export async function deleteReminder(orgId, id) {
  const row = await repo.deleteById(orgId, id);
  if (!row) throw new AppError(404, 'Reminder not found');
  return { id: row.id };
}
