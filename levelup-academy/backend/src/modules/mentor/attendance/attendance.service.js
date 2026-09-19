import { requireMentorGroup } from '../shared/groupAccess.js';
import { emitTo } from '../../../sockets/io.js';
import { attendanceRoom } from '../../../sockets/attendance.js';
import { AppError } from '../../../utils/AppError.js';
import { sendToGroupParentChat } from '../../telegram/groupNotify.js';
import { logger } from '../../../config/logger.js';
import * as repo from './attendance.repository.js';

const STATUS_LABEL = {
  present: '✅ keldi',
  late: '⏰ kechikdi',
  absent: '❌ kelmadi',
  excused: '📄 sababli',
};

/* Ментор отмечает журнал только за сегодняшний урок: ни вчерашний, ни
   завтрашний. Проверка живёт ЗДЕСЬ, а не в контроллере, потому что этот сервис
   — единственная общая точка REST-эндпоинта и сокет-события `attendance:mark`;
   поставь её выше по стеку, и второй транспорт прошёл бы мимо.

   Дата считается по ташкентскому времени, а не по UTC. С полуночи до пяти утра
   по местному UTC всё ещё «вчера», и ментор вечерней группы получал бы отказ
   на собственном уроке. */
const TZ = 'Asia/Tashkent';

function todayLocal() {
  // en-CA даёт ровно YYYY-MM-DD — тот же формат, в котором приходит lessonDate
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function assertToday(lessonDate) {
  const today = todayLocal();
  if (lessonDate === today) return;
  throw new AppError(
    422,
    lessonDate > today
      ? 'Kelajakdagi dars uchun davomat belgilab bo\'lmaydi'
      : 'O\'tgan kunlar davomatini o\'zgartirib bo\'lmaydi',
  );
}

/** Проставить/обновить davomat группы на дату урока — только свой ментор. */
export async function markAttendance({ mentorId, groupId, lessonDate, records }) {
  assertToday(lessonDate);
  const group = await requireMentorGroup(mentorId, groupId);
  const saved = await repo.upsertMany({
    branchId: group.branch_id,
    groupId,
    markedBy: mentorId,
    lessonDate,
    records,
  });

  // Live-обновление подписчикам журнала группы. Транспорт вторичен: если сокет-
  // сервер не поднят (воркер), emitTo молча пропускает — отметка уже сохранена.
  emitTo(attendanceRoom(groupId), 'attendance:updated', {
    groupId,
    lessonDate,
    markedBy: mentorId,
    records: saved,
  });

  // Уведомление группе родителей — ОТЛОЖЕННОЕ (см. scheduleParentNotify ниже):
  // журнал автосохраняется на каждый клик (UI без кнопки «Сохранить», см.
  // MP-ATTEND), поэтому markAttendance зовётся много раз за один урок — слать
  // сообщение на каждый вызов означало бы десяток сообщений родителям за урок.
  scheduleParentNotify({ groupId, groupName: group.name, lessonDate, schedule: group.schedule });

  return saved;
}

/* Дебаунс «отправить один раз, когда отметки за урок перестали меняться» —
 * простой in-memory таймер (не Redis/очередь): процесс web-сервиса живёт
 * постоянно между запросами, а слать нужно ОДНО сообщение с ИТОГОВЫМ
 * состоянием на дату урока, а не после каждого отдельного клика ментора.
 * Ограничение: не переживает рестарт процесса (задержанный таймер пропадёт) —
 * приемлемо для V1, отметка в БД от этого не страдает, только уведомление. */
const NOTIFY_DEBOUNCE_MS = 3 * 60 * 1000;
const pendingNotifyTimers = new Map();

function scheduleParentNotify({ groupId, groupName, lessonDate, schedule }) {
  const key = `${groupId}:${lessonDate}`;
  clearTimeout(pendingNotifyTimers.get(key));

  const localDay = new Date(`${lessonDate}T12:00:00+05:00`).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }).toLowerCase();
  const lesson = (Array.isArray(schedule) ? schedule : []).find((s) => String(s.day).slice(0, 3).toLowerCase() === localDay);
  const endAt = lesson?.end ? new Date(`${lessonDate}T${lesson.end}:00+05:00`).getTime() : 0;
  const delay = Math.max(NOTIFY_DEBOUNCE_MS, endAt - Date.now());
  const timer = setTimeout(() => {
    pendingNotifyTimers.delete(key);
    notifyParentGroup({ groupId, groupName, lessonDate }).catch(
      (err) => logger.error({ err, groupId, lessonDate }, 'attendance: parent group notify failed'),
    );
  }, delay);
  timer.unref?.(); // не держит процесс живым ради самого таймера

  pendingNotifyTimers.set(key, timer);
}

async function notifyParentGroup({ groupId, groupName, lessonDate }) {
  const records = await repo.findByGroupAndDate(groupId, lessonDate);
  if (records.length === 0) return;

  const lines = records
    .map((r) => `${STATUS_LABEL[r.status] ?? r.status} — ${r.first_name} ${r.last_name}`.trim())
    .join('\n');

  const text = `<b>📋 Davomat — ${groupName}</b>\n${lessonDate}\n\n${lines}`;
  await sendToGroupParentChat(groupId, text);
}

/** Чтение davomat группы: точная дата либо диапазон дат. */
export async function getGroupAttendance({ mentorId, groupId, date, from, to }) {
  await requireMentorGroup(mentorId, groupId);
  if (date) return repo.findByGroupAndDate(groupId, date);
  return repo.findByGroupAndRange(groupId, from, to);
}
