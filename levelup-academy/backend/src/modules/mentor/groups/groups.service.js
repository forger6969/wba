import { requireMentorGroup } from '../shared/groupAccess.js';
import * as repo from './groups.repository.js';

/** Список моих групп (дашборд + селекторы attendance/homework/tests/coins). */
export async function myGroups(mentorId) {
  const rows = await repo.listMentorGroups(mentorId);
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    subject: g.subject,
    monthlyPrice: Number(g.monthly_price),
    schedule: g.schedule,
    room: g.room,
    isArchived: g.is_archived,
    students: Number(g.students),
  }));
}

/** Состав своей группы; чужая группа → 404 (K-AUTH §2). */
export async function groupRoster(mentorId, groupId) {
  await requireMentorGroup(mentorId, groupId);
  const rows = await repo.groupRoster(groupId);
  return rows.map((s) => ({
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    status: s.status,
    coinBalance: s.coin_balance,
    coinsToday: s.coins_today ?? 0,
    parentId: s.parent_id ?? null,
    joinedAt: s.joined_at,
  }));
}
