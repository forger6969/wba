import * as repo from './notifications.repository.js';

// На событие берём с запасом сверх FEED_LIMIT — после слияния разных источников
// и сортировки по дате отсекаем лишнее, но событие не должно "потеряться" только
// потому что другой источник (напр. посещаемость) многочисленнее.
const SOURCE_LIMIT = 20;
const FEED_LIMIT = 30;

function fmtSum(n) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

function studentName(r) {
  return `${r.first_name} ${r.last_name}`.trim();
}

function mapHomeworkGrade(r) {
  return {
    id: `hw:${r.id}`,
    type: 'grade',
    title: 'Новая оценка',
    body: `${studentName(r)} получил ${r.score}/${r.max_score} по «${r.title}»`,
    createdAt: r.created_at,
    read: false,
  };
}

function mapTestGrade(r) {
  return {
    id: `test:${r.id}`,
    type: 'grade',
    title: 'Тест пройден',
    body: `${studentName(r)} прошёл тест «${r.title}»: ${r.score}%`,
    createdAt: r.created_at,
    read: false,
  };
}

const ATTENDANCE_LABEL = { absent: 'пропустил', late: 'опоздал на' };

function mapAttendance(r) {
  return {
    id: `att:${r.id}`,
    type: 'attendance',
    title: r.status === 'late' ? 'Опоздание' : 'Пропуск занятия',
    body: `${studentName(r)} ${ATTENDANCE_LABEL[r.status]} занятие по ${r.group_name}`,
    createdAt: r.created_at,
    read: false,
  };
}

function mapPaymentReceived(r) {
  return {
    id: `pay:${r.id}`,
    type: 'payment',
    title: 'Оплата принята',
    body: `${studentName(r)}: оплачено ${fmtSum(r.amount)} сум`,
    createdAt: r.created_at,
    read: false,
  };
}

function mapOverdueInvoice(r) {
  return {
    id: `overdue:${r.id}`,
    type: 'payment',
    title: 'Просроченный платёж',
    body: `${studentName(r)}: просрочен платёж на ${fmtSum(r.amount_due)} сум`,
    createdAt: r.created_at,
    read: false,
  };
}

/**
 * Лента уведомлений родителя. Своей таблицы нет — события синтезируются
 * на чтение из уже существующих данных (оценки/посещаемость/платежи),
 * отфильтрованных по детям этого родителя, и сортируются по дате.
 * `read` всегда false — отметки прочтения фронт пока не запрашивает
 * (Notifications.jsx не вызывает mark-as-read).
 *
 * FE-PARENT-PAGINATION: лента — не таблица, а слияние 5 источников, поэтому
 * обычный OFFSET не работает (он был бы неверным после слияния и сортировки).
 * Вместо этого — курсор `before` (createdAt последнего элемента предыдущей
 * страницы): каждый источник запрашивается заново с фильтром `< before`,
 * снова сливается и сортируется. nextCursor возвращается, только если
 * страница вышла полной (FEED_LIMIT) — иначе дальше грузить нечего.
 */
export async function listForParent(parentId, before = null) {
  const childIds = await repo.getChildIdsForParent(parentId);
  if (childIds.length === 0) return { items: [], nextCursor: null };

  const [homework, tests, attendance, paymentsReceived, overdueInvoices] = await Promise.all([
    repo.getHomeworkGradeEvents(childIds, SOURCE_LIMIT, before),
    repo.getTestGradeEvents(childIds, SOURCE_LIMIT, before),
    repo.getAttendanceEvents(childIds, SOURCE_LIMIT, before),
    repo.getPaymentReceivedEvents(childIds, SOURCE_LIMIT, before),
    repo.getOverdueInvoiceEvents(childIds, SOURCE_LIMIT, before),
  ]);

  const items = [
    ...homework.map(mapHomeworkGrade),
    ...tests.map(mapTestGrade),
    ...attendance.map(mapAttendance),
    ...paymentsReceived.map(mapPaymentReceived),
    ...overdueInvoices.map(mapOverdueInvoice),
  ];

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const page = items.slice(0, FEED_LIMIT);
  const nextCursor = page.length === FEED_LIMIT ? page[page.length - 1].createdAt : null;
  return { items: page, nextCursor };
}
