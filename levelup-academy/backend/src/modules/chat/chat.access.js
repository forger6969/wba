import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Доступ к личной переписке «сотрудник ↔ родитель».
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ МОДЕЛЬ, А НЕ СТАРАЯ `parent:<parentId>`
 * ------------------------------------------------------
 * Старая комната была ОДНА на родителя: в неё join'ился любой staff, и все
 * сотрудники видели переписку друг друга с этим родителем. Плюс проверялась
 * только роль — ни филиал, ни организация, из-за чего сотрудник одного
 * учебного центра мог читать чужой чат, зная UUID родителя (нарушение
 * мульти-аренды, см. CLAUDE.md).
 *
 * Здесь комната — ПАРА: `dm:<staffId>:<parentId>`. Участников ровно двое,
 * третьего быть не может: доставка идёт не через join, а адресно в личные
 * комнаты обоих (`user:<id>`), поэтому «подписаться на чужой диалог» нечем.
 * Требование заказчика — админ не видит переписку ментора с родителем вообще.
 *
 * Право на диалог = наличие реальной связи в данных, а не роль сама по себе:
 *   mentor     — родитель имеет ребёнка в группе ЭТОГО ментора;
 *   admin      — ребёнок учится в филиале админа;
 *   ceo        — ребёнок учится в одном из филиалов его организации.
 * main_admin исключён: платформенный владелец не переписывается с родителями
 * партнёров.
 *
 * Проверка вызывается и при отправке, и при чтении истории, поэтому потеря
 * связи (ментор больше не ведёт группу) закрывает и доступ к старой переписке.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID-ли это — проверяем до похода в БД, иначе Postgres упадёт на приведении типа. */
export function isUuid(value) {
  return UUID_RE.test(String(value ?? ''));
}

/** Роли, которым вообще разрешена личная переписка с родителем. */
export const DM_STAFF_ROLES = new Set(['mentor', 'admin', 'ceo', 'employee']);

/** Ключ комнаты личного диалога. Порядок фиксирован: staff, затем parent. */
export function dmRoom(staffId, parentId) {
  return `dm:${staffId}:${parentId}`;
}

/** Личная комната пользователя — адрес доставки live-событий. */
export function userRoom(userId) {
  return `user:${userId}`;
}

/** Разбор `dm:<staffId>:<parentId>`; null, если ключ не подходит по форме. */
export function parseDmRoom(roomKey) {
  const parts = String(roomKey ?? '').split(':');
  if (parts.length !== 3 || parts[0] !== 'dm') return null;
  const [, staffId, parentId] = parts;
  if (!UUID_RE.test(staffId) || !UUID_RE.test(parentId)) return null;
  return { staffId, parentId };
}

/**
 * Есть ли у сотрудника право переписываться с этим родителем.
 * Возвращает boolean — бросает только на неожиданных ошибках БД.
 */
export async function canStaffChatParent(user, parentId, db = pool) {
  if (!user || !DM_STAFF_ROLES.has(user.role)) return false;
  if (!UUID_RE.test(String(parentId ?? ''))) return false;

  if (user.role === 'mentor') {
    const { rows } = await db.query(
      `SELECT 1
         FROM student_profiles sp
         JOIN group_students gs ON gs.student_id = sp.user_id AND gs.left_at IS NULL
         JOIN groups g         ON g.id = gs.group_id AND g.deleted_at IS NULL
        WHERE sp.parent_id = $1
          AND g.mentor_id = $2
        LIMIT 1`,
      [parentId, user.id],
    );
    return rows.length > 0;
  }

  if (user.role === 'admin') {
    if (!user.branchId) return false;
    const { rows } = await db.query(
      `SELECT 1
         FROM student_profiles sp
        WHERE sp.parent_id = $1
          AND sp.branch_id = $2
        LIMIT 1`,
      [parentId, user.branchId],
    );
    return rows.length > 0;
  }

  // ceo — любой филиал своей организации
  if (!user.organizationId) return false;
  const { rows } = await db.query(
    `SELECT 1
       FROM student_profiles sp
       JOIN branches b ON b.id = sp.branch_id AND b.deleted_at IS NULL
      WHERE sp.parent_id = $1
        AND b.organization_id = $2
      LIMIT 1`,
    [parentId, user.organizationId],
  );
  return rows.length > 0;
}

/** То же, но бросает 403. Существование родителя не раскрываем — один и тот же ответ. */
export async function assertStaffCanChatParent(user, parentId, db = pool) {
  if (!(await canStaffChatParent(user, parentId, db))) {
    throw new AppError(403, 'No access to this conversation');
  }
}

/**
 * Может ли сотрудник писать САМОМУ УЧЕНИКУ.
 *
 * Связь та же, что и с родителем, только на шаг короче: ментор — свои группы,
 * админ — свой филиал, суперадмин — своя организация. Модель комнаты не
 * меняется: `dm:<staffId>:<peerId>` — пара, где вторым может быть и родитель,
 * и ученик; доставка так же адресная, третьей стороны в диалоге не бывает.
 */
export async function canStaffChatStudent(user, studentId, db = pool) {
  if (!user || !DM_STAFF_ROLES.has(user.role)) return false;
  if (!UUID_RE.test(String(studentId ?? ''))) return false;

  if (user.role === 'mentor') {
    const { rows } = await db.query(
      `SELECT 1
         FROM group_students gs
         JOIN groups g ON g.id = gs.group_id AND g.deleted_at IS NULL
        WHERE gs.student_id = $1 AND gs.left_at IS NULL AND g.mentor_id = $2
        LIMIT 1`,
      [studentId, user.id],
    );
    return rows.length > 0;
  }

  // Решение 2026-07-21 запрещало админу писать напрямую ученику (только
  // родителю) — код ниже это уже не отражает (админ разрешён по филиалу) и
  // явно отдаёт его в listMyThreads (запрос пользователя 21.08.2026:
  // "chat fa admin ni ham qoshish kerak"). Оставлен только реальный список
  // разрешённых ролей, без противоречащего коду комментария.
  if (!['mentor', 'admin'].includes(user.role)) return false;

  if (user.role === 'admin') {
    if (!user.branchId) return false;
    const { rows } = await db.query(
      `SELECT 1 FROM student_profiles
        WHERE user_id = $1 AND branch_id = $2 LIMIT 1`,
      [studentId, user.branchId],
    );
    return rows.length > 0;
  }

  if (!user.organizationId) return false;
  const { rows } = await db.query(
    `SELECT 1
       FROM student_profiles sp
       JOIN branches b ON b.id = sp.branch_id AND b.deleted_at IS NULL
      WHERE sp.user_id = $1 AND b.organization_id = $2
      LIMIT 1`,
    [studentId, user.organizationId],
  );
  return rows.length > 0;
}

/** Staff chat matrix inside one branch. */
export async function canStaffChatStaff(user, peerId, db = pool) {
  if (!user || !DM_STAFF_ROLES.has(user.role) || !user.branchId || !isUuid(peerId)) return false;
  const allowed = {
    mentor: ['admin', 'employee'],
    admin: ['mentor'],
    employee: ['mentor'],
  }[user.role] ?? [];
  if (allowed.length === 0) return false;
  const { rows } = await db.query(
    `SELECT 1 FROM users
      WHERE id = $1 AND role = ANY($2::user_role[]) AND branch_id = $3
        AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [peerId, allowed, user.branchId],
  );
  return rows.length > 0;
}

/**
 * Собеседник может быть родителем ИЛИ учеником — проверяем оба варианта.
 * Вызывающему не нужно заранее знать, кто перед ним: снаружи это просто
 * «человек, которому пишут».
 */
export async function canStaffChatPeer(user, peerId, db = pool) {
  if (await canStaffChatStaff(user, peerId, db)) return true;
  if (await canStaffChatParent(user, peerId, db)) return true;
  return canStaffChatStudent(user, peerId, db);
}

export async function assertStaffCanChatPeer(user, peerId, db = pool) {
  if (!(await canStaffChatPeer(user, peerId, db))) {
    throw new AppError(403, 'No access to this conversation');
  }
}

/**
 * Доступ к комнате `dm:*` — для REST-истории.
 * Участник обязан быть одной из двух сторон; сотруднику вдобавок нужна живая
 * связь с родителем (иначе бывший ментор читал бы переписку вечно).
 */
export async function assertDmAccess(user, roomKey, db = pool) {
  const parsed = parseDmRoom(roomKey);
  if (!parsed) throw new AppError(400, 'Invalid room key');

  const { staffId, parentId: peerId } = parsed;

  // Вторая сторона — родитель или ученик; и тот и другой читают свою переписку.
  if (user.role === 'parent' || user.role === 'student') {
    if (user.id !== peerId) throw new AppError(403, 'No access to this room');
    return parsed;
  }

  if (user.id === peerId && await canStaffChatStaff(user, staffId, db)) return parsed;
  if (user.id !== staffId) throw new AppError(403, 'No access to this room');
  await assertStaffCanChatPeer(user, peerId, db);
  return parsed;
}

/** Staff peers allowed by the same branch-scoped matrix as canStaffChatStaff. */
export async function listStaffPeerContacts(user, db = pool) {
  if (!DM_STAFF_ROLES.has(user.role) || !user.branchId) return [];
  const peerRoles = {
    mentor: ['admin', 'employee'],
    admin: ['mentor'],
    employee: ['mentor'],
  }[user.role] ?? [];
  if (peerRoles.length === 0) return [];
  const { rows } = await db.query(
    `WITH peers AS (
       SELECT id, first_name, last_name, avatar_key, role AS staff_role,
              CASE WHEN $3::text = 'mentor' THEN 'dm:' || id::text || ':' || $1::text
                   ELSE 'dm:' || $1::text || ':' || id::text END AS room_key
         FROM users
        WHERE role = ANY($2::user_role[]) AND branch_id = $4 AND status = 'active' AND deleted_at IS NULL
     ), last_msg AS (
       SELECT DISTINCT ON (room_key) room_key, body, created_at
         FROM chat_messages WHERE deleted_at IS NULL ORDER BY room_key, created_at DESC
     ), unread AS (
       SELECT room_key, count(*)::int unread_count FROM chat_messages
        WHERE deleted_at IS NULL AND read_at IS NULL AND sender_id <> $1::uuid GROUP BY room_key
     )
     SELECT p.*, lm.body AS last_message, lm.created_at AS last_message_at,
            COALESCE(un.unread_count, 0) AS unread_count
       FROM peers p LEFT JOIN last_msg lm ON lm.room_key = p.room_key
       LEFT JOIN unread un ON un.room_key = p.room_key
      ORDER BY lm.created_at DESC NULLS LAST, p.first_name`,
    [user.id, peerRoles, user.role, user.branchId],
  );
  return rows;
}

/**
 * Список собеседников сотрудника — родители, с которыми он вправе переписываться,
 * с последним сообщением и числом непрочитанных. Скоуп полностью повторяет
 * canStaffChatParent, поэтому лишних людей в списке не появится.
 */
/**
 * Ученики, которым сотрудник вправе писать напрямую.
 *
 * Отдельным запросом, а не через UNION с родителями: у них разный смысл полей
 * (у родителя показываем детей, у ученика — группу), и склеенный запрос
 * пришлось бы разбирать по типу прямо в SELECT. Списки сшиваются в сервисе.
 */
export async function listStaffStudentContacts(user, db = pool) {
  if (!DM_STAFF_ROLES.has(user.role)) return [];

  let scopeJoin;
  let scopeWhere;
  let scopeParam;

  if (user.role === 'mentor') {
    scopeJoin = `JOIN group_students gs ON gs.student_id = sp.user_id AND gs.left_at IS NULL
                 JOIN groups g         ON g.id = gs.group_id AND g.deleted_at IS NULL`;
    scopeWhere = 'g.mentor_id = $2';
    scopeParam = user.id;
  } else if (user.role === 'admin') {
    if (!user.branchId) return [];
    scopeJoin = '';
    scopeWhere = 'sp.branch_id = $2';
    scopeParam = user.branchId;
  } else {
    if (!user.organizationId) return [];
    scopeJoin = 'JOIN branches b ON b.id = sp.branch_id AND b.deleted_at IS NULL';
    scopeWhere = 'b.organization_id = $2';
    scopeParam = user.organizationId;
  }

  const { rows } = await db.query(
    `WITH visible_students AS (
        SELECT DISTINCT sp.user_id AS student_id
          FROM student_profiles sp
          ${scopeJoin}
         WHERE ${scopeWhere}
     ),
     last_msg AS (
        SELECT DISTINCT ON (m.room_key)
               m.room_key, m.body, m.created_at
          FROM chat_messages m
         WHERE m.deleted_at IS NULL
           AND m.room_key LIKE 'dm:' || $1::text || ':%'
         ORDER BY m.room_key, m.created_at DESC
     ),
     unread AS (
        SELECT m.room_key, count(*)::int AS unread_count
          FROM chat_messages m
         WHERE m.deleted_at IS NULL
           AND m.read_at IS NULL
           AND m.sender_id <> $1::uuid
           AND m.room_key LIKE 'dm:' || $1::text || ':%'
         GROUP BY m.room_key
     )
     SELECT s.student_id                                AS id,
            u.first_name,
            u.last_name,
            u.avatar_key,
            ('dm:' || $1::text || ':' || s.student_id)  AS room_key,
            lm.body                                     AS last_message,
            lm.created_at                               AS last_message_at,
            COALESCE(un.unread_count, 0)                AS unread_count
       FROM visible_students s
       JOIN users u ON u.id = s.student_id AND u.deleted_at IS NULL
       LEFT JOIN last_msg lm ON lm.room_key = 'dm:' || $1::text || ':' || s.student_id
       LEFT JOIN unread  un ON un.room_key = 'dm:' || $1::text || ':' || s.student_id
      ORDER BY lm.created_at DESC NULLS LAST, u.first_name`,
    [user.id, scopeParam],
  );

  return rows;
}

export async function listStaffContacts(user, db = pool) {
  if (!DM_STAFF_ROLES.has(user.role)) return [];

  // Условие связи родитель→сотрудник, своё на каждую роль.
  let scopeJoin;
  let scopeWhere;
  let scopeParam;

  if (user.role === 'mentor') {
    scopeJoin = `JOIN group_students gs ON gs.student_id = sp.user_id AND gs.left_at IS NULL
                 JOIN groups g         ON g.id = gs.group_id AND g.deleted_at IS NULL`;
    scopeWhere = 'g.mentor_id = $2';
    scopeParam = user.id;
  } else if (user.role === 'admin') {
    if (!user.branchId) return [];
    scopeJoin = '';
    scopeWhere = 'sp.branch_id = $2';
    scopeParam = user.branchId;
  } else {
    if (!user.organizationId) return [];
    scopeJoin = 'JOIN branches b ON b.id = sp.branch_id AND b.deleted_at IS NULL';
    scopeWhere = 'b.organization_id = $2';
    scopeParam = user.organizationId;
  }

  const { rows } = await db.query(
    `WITH visible_parents AS (
        SELECT DISTINCT sp.parent_id AS parent_id
          FROM student_profiles sp
          ${scopeJoin}
         WHERE sp.parent_id IS NOT NULL
           AND ${scopeWhere}
     ),
     children AS (
        SELECT sp.parent_id,
               string_agg(cu.first_name || ' ' || cu.last_name, ', '
                          ORDER BY cu.first_name) AS child_names
          FROM student_profiles sp
          JOIN users cu ON cu.id = sp.user_id AND cu.deleted_at IS NULL
         WHERE sp.parent_id IN (SELECT parent_id FROM visible_parents)
         GROUP BY sp.parent_id
     ),
     -- Диалоги этого сотрудника — все комнаты с префиксом dm:<его id>:
     -- ($1 — UUID, спецсимволов LIKE в нём быть не может.)
     last_msg AS (
        SELECT DISTINCT ON (m.room_key)
               m.room_key, m.body, m.created_at, m.sender_id
          FROM chat_messages m
         WHERE m.deleted_at IS NULL
           AND m.room_key LIKE 'dm:' || $1::text || ':%'
         ORDER BY m.room_key, m.created_at DESC
     ),
     unread AS (
        SELECT m.room_key, count(*)::int AS unread_count
          FROM chat_messages m
         WHERE m.deleted_at IS NULL
           AND m.read_at IS NULL
           -- $1::uuid обязателен. Выше тот же параметр используется как
           -- $1::text (склейка room_key), Postgres выводит его тип из первого
           -- употребления и получает text — а sender_id это uuid. Без явного
           -- приведения запрос падает на «operator does not exist: uuid <> text»
           -- и весь список собеседников отвечает 500.
           AND m.sender_id <> $1::uuid
           AND m.room_key LIKE 'dm:' || $1::text || ':%'
         GROUP BY m.room_key
     )
     SELECT p.parent_id                                AS id,
            u.first_name,
            u.last_name,
            u.avatar_key,
            c.child_names,
            ('dm:' || $1::text || ':' || p.parent_id)  AS room_key,
            lm.body                                    AS last_message,
            lm.created_at                              AS last_message_at,
            COALESCE(un.unread_count, 0)               AS unread_count
       FROM visible_parents p
       JOIN users u ON u.id = p.parent_id AND u.deleted_at IS NULL
       LEFT JOIN children c ON c.parent_id = p.parent_id
       LEFT JOIN last_msg lm ON lm.room_key = 'dm:' || $1::text || ':' || p.parent_id
       LEFT JOIN unread  un ON un.room_key = 'dm:' || $1::text || ':' || p.parent_id
      ORDER BY lm.created_at DESC NULLS LAST, u.first_name`,
    [user.id, scopeParam],
  );

  return rows;
}

/**
 * Доступные диалоги родителя/студента: действующие наставники активных групп
 * + админ(ы) филиала — тот же принцип, что уже соблюдался в обратную сторону
 * (listStaffContacts/listStaffStudentContacts у сотрудника всегда строго по
 * текущей группе/филиалу, без истории), просто в две ветки вместо одной,
 * зеркаля canStaffChatStudent/canStaffChatParent (там admin по филиалу —
 * тоже отдельная, разрешённая ветка, не только у mentor).
 *
 * Раньше сюда же подмешивались "прежние" собеседники — любой, с кем в
 * chat_messages уже была переписка, даже если ментор сменился/группа
 * закрылась. Список показывал контакт, а sendDirectMessage (та же проверка
 * canStaffChatPeer, что и здесь) реально отправлять ему запрещал — родитель/
 * ученик видел рабочую кнопку и получал "You may not message this person"
 * (запрос пользователя 21.08.2026: "student faqat oz o'qituvchisiga
 * yozolsin... har student oz ustoziga"). История сообщений при этом никуда
 * не делась — она читается по room_key напрямую (GET /chat/:roomKey/messages),
 * этот список только про то, КОМУ можно написать сейчас.
 */
export async function listMyThreads(user, db = pool) {
  if (user.role !== 'parent' && user.role !== 'student') return [];

  const { rows } = await db.query(
    `WITH eligible_mentors AS (
        SELECT DISTINCT g.mentor_id AS staff_id
          FROM student_profiles sp
          JOIN group_students gs ON gs.student_id = sp.user_id AND gs.left_at IS NULL
          JOIN groups g ON g.id = gs.group_id AND g.deleted_at IS NULL
         WHERE ($2::text = 'parent' AND sp.parent_id = $1::uuid)
            OR ($2::text = 'student' AND sp.user_id = $1::uuid)
     ),
     eligible_admins AS (
        SELECT DISTINCT au.id AS staff_id
          FROM student_profiles sp
          JOIN users au ON au.branch_id = sp.branch_id AND au.role = 'admin'
                        AND au.deleted_at IS NULL AND au.status = 'active'
         WHERE ($2::text = 'parent' AND sp.parent_id = $1::uuid)
            OR ($2::text = 'student' AND sp.user_id = $1::uuid)
     ),
     visible_staff AS (
        SELECT staff_id FROM eligible_mentors
        UNION
        SELECT staff_id FROM eligible_admins
     ),
     last_msg AS (
        SELECT DISTINCT ON (m.room_key)
               m.room_key, m.body, m.created_at
          FROM chat_messages m
         WHERE m.deleted_at IS NULL
           AND m.room_key LIKE 'dm:%:' || $1::text
         ORDER BY m.room_key, m.created_at DESC
     ),
     unread AS (
        SELECT m.room_key, count(*)::int AS unread_count
          FROM chat_messages m
         WHERE m.deleted_at IS NULL
           AND m.read_at IS NULL
           AND m.sender_id <> $1::uuid
           AND m.room_key LIKE 'dm:%:' || $1::text
         GROUP BY m.room_key
     )
     SELECT vs.staff_id AS id,
            u.first_name,
            u.last_name,
            u.avatar_key,
            u.role                        AS staff_role,
            ('dm:' || vs.staff_id::text || ':' || $1::text) AS room_key,
            lm.body                       AS last_message,
            lm.created_at                 AS last_message_at,
            COALESCE(un.unread_count, 0)  AS unread_count
       FROM visible_staff vs
       JOIN users u ON u.id = vs.staff_id AND u.deleted_at IS NULL AND u.status = 'active'
       LEFT JOIN last_msg lm ON lm.room_key = 'dm:' || vs.staff_id::text || ':' || $1::text
       LEFT JOIN unread un ON un.room_key = 'dm:' || vs.staff_id::text || ':' || $1::text
      ORDER BY lm.created_at DESC`,
    [user.id, user.role],
  );

  return rows;
}
