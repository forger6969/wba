import { pool } from '../../config/db.js';

// ---------- цены платформы (синглтон id=1) ----------

const mapPricing = (row) =>
  row && {
    baseFirstBranch: Number(row.base_first_branch),
    perExtraBranch: Number(row.per_extra_branch),
    perStudent: Number(row.per_student),
    currency: row.currency,
    updatedAt: row.updated_at,
  };

export function getPricing(client = pool) {
  return client
    .query(`SELECT * FROM platform_pricing WHERE id = 1`)
    .then((r) => mapPricing(r.rows[0]));
}

/** Частичное обновление: меняем только переданные поля (все — в сумах). */
export function updatePricing(fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['baseFirstBranch', 'base_first_branch'],
    ['perExtraBranch', 'per_extra_branch'],
    ['perStudent', 'per_student'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return getPricing(client);
  return client
    .query(
      `UPDATE platform_pricing SET ${cols.join(', ')}, updated_at = now()
        WHERE id = 1 RETURNING *`,
      vals,
    )
    .then((r) => mapPricing(r.rows[0]));
}

export function findOrgByDomain(domain, client = pool) {
  return client
    .query(`SELECT id FROM organizations WHERE domain = $1 AND deleted_at IS NULL`, [domain])
    .then((r) => r.rows[0] ?? null);
}

/** access_until сразу на месяц вперёд — партнёр может пользоваться с онбординга,
 * не блокируется до того, как Main Admin отдельным шагом зафиксирует первую
 * (обычно про-рейтед) оплату. Та же логика, что и бэкофилл для старых
 * организаций (см. миграцию 1784520000000) — без неё любая свежая org
 * блокировалась бы сразу же (access_until IS NULL = "ни разу не платил"). */
export function insertOrganization({ name, domain, plan = null }, client = pool) {
  return client
    .query(
      `INSERT INTO organizations (name, plan, domain, status, access_until)
       VALUES ($1, $2, $3, 'active', CURRENT_DATE + INTERVAL '1 month')
       RETURNING id, name, plan, domain, status, access_until, created_at`,
      [name, plan, domain ?? null],
    )
    .then((r) => r.rows[0]);
}

export function insertCeo(
  { orgId, firstName, lastName, email, phone, passwordHash },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO users (organization_id, role, first_name, last_name, email, phone, password_hash)
       VALUES ($1, 'ceo', $2, $3, $4, $5, $6)
       RETURNING id, role, organization_id, first_name, last_name, email`,
      [orgId, firstName, lastName, email, phone ?? null, passwordHash],
    )
    .then((r) => r.rows[0]);
}

export function setOrgOwner(orgId, userId, client = pool) {
  return client.query(
    `UPDATE organizations SET owner_user_id = $1, updated_at = now() WHERE id = $2`,
    [userId, orgId],
  );
}

/**
 * Список партнёров с числом филиалов и студентов.
 *
 * Здесь СОЗНАТЕЛЬНО нет выручки и расходов партнёра. Раньше запрос тянул
 * SUM(transactions.amount) и SUM(expenses.amount) по всем филиалам организации,
 * то есть оборот и траты чужого бизнеса, и отдавал их наружу в /main/dashboard
 * и /main/revenue. В интерфейсе эти числа не показывались, но лежали в ответе —
 * владелец платформы мог открыть devtools и посмотреть, сколько зарабатывает
 * каждый учебный центр.
 *
 * Нам как платформе нужно ровно одно денежное число — сколько партнёр должен
 * НАМ, а оно считается из числа активных учеников (computeBill), а не из его
 * оборота. Поэтому количество студентов остаётся, деньги партнёра — нет.
 */
/** Только 'active' — замороженный/выпустившийся/отчисленный студент не должен
 * раздувать биллинг-счётчик (тот же фильтр, что уже стоит в super.repository.js
 * для собственного дашборда CEO — раньше здесь его не было, и из-за этого
 * счётчик Main Admin расходился с тем, что видит сам партнёр). */
export function listPartners(client = pool) {
  return client
    .query(
      `SELECT o.id, o.name, o.plan, o.domain, o.status, o.access_until, o.created_at,
              (SELECT count(*) FROM branches b
                 WHERE b.organization_id = o.id AND b.deleted_at IS NULL) AS branches,
              (SELECT count(*) FROM users u
                 WHERE u.organization_id = o.id AND u.role = 'student'
                   AND u.status = 'active' AND u.deleted_at IS NULL) AS students,
              (SELECT count(*) FROM users u
                 WHERE u.organization_id = o.id AND u.role = 'parent'
                   AND u.status = 'active' AND u.deleted_at IS NULL) AS parents,
              (SELECT count(*) FROM users u
                 WHERE u.organization_id = o.id
                   AND u.role IN ('ceo', 'admin', 'mentor', 'methodist', 'branch_manager')
                   AND u.status = 'active' AND u.deleted_at IS NULL) AS staff
         FROM organizations o
        WHERE o.deleted_at IS NULL
        ORDER BY o.created_at DESC`,
    )
    .then((r) => r.rows);
}

// ---------- каталог платных фич (Main Admin ведёт сам) ----------

export function listAddonPrices(client = pool) {
  return client
    .query(`SELECT * FROM platform_addon_prices ORDER BY created_at ASC`)
    .then((r) => r.rows);
}

// feature_key используется как URL-сегмент (PATCH /api/main/addon-prices/:key) и как
// строковый идентификатор в коде-гейтах — держим строго ASCII, транслитерируя кириллицу.
const CYRILLIC_TO_LATIN = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

function slugify(label) {
  const transliterated = label
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('');
  return transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

export async function insertAddonPrice({ label, price, createdBy }, client = pool) {
  const base = slugify(label) || 'feature';
  let key = base;
  let suffix = 1;
  // на случай совпадения слага у похожих названий — просто добавляем счётчик
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await client.query(`SELECT 1 FROM platform_addon_prices WHERE feature_key = $1`, [key]);
    if (exists.rowCount === 0) break;
    key = `${base}-${++suffix}`;
  }
  return client
    .query(
      `INSERT INTO platform_addon_prices (feature_key, label, price, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [key, label, price, createdBy],
    )
    .then((r) => r.rows[0]);
}

export function updateAddonPrice(key, { label, price }, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  if (label !== undefined) { cols.push(`label = $${i++}`); vals.push(label); }
  if (price !== undefined) { cols.push(`price = $${i++}`); vals.push(price); }
  cols.push(`updated_at = now()`);
  vals.push(key);
  return client
    .query(
      `UPDATE platform_addon_prices SET ${cols.join(', ')} WHERE feature_key = $${i} RETURNING *`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function deactivateAddonPrice(key, client = pool) {
  return client
    .query(
      `UPDATE platform_addon_prices SET is_active = false, updated_at = now()
        WHERE feature_key = $1 RETURNING *`,
      [key],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findAddonPrice(key, client = pool) {
  return client
    .query(`SELECT * FROM platform_addon_prices WHERE feature_key = $1`, [key])
    .then((r) => r.rows[0] ?? null);
}

// ---------- фичи, включённые партнёру (org_feature_flags) ----------

export function getOrgFeatureFlags(orgId, client = pool) {
  return client
    .query(`SELECT * FROM org_feature_flags WHERE organization_id = $1`, [orgId])
    .then((r) => r.rows);
}

/** Все флаги сразу по всем партнёрам — для listPartners()'s join без N+1. */
export function getAllOrgFeatureFlags(client = pool) {
  return client.query(`SELECT * FROM org_feature_flags WHERE enabled = true`).then((r) => r.rows);
}

export function upsertOrgFeatureFlag(orgId, key, enabled, actorId, client = pool) {
  return client
    .query(
      `INSERT INTO org_feature_flags (organization_id, feature_key, enabled, enabled_at, updated_by)
       VALUES ($1, $2, $3, CASE WHEN $3 THEN now() ELSE NULL END, $4)
       ON CONFLICT (organization_id, feature_key)
       DO UPDATE SET enabled = $3,
                     enabled_at = CASE WHEN $3 THEN now() ELSE org_feature_flags.enabled_at END,
                     updated_by = $4, updated_at = now()
       RETURNING *`,
      [orgId, key, enabled, actorId],
    )
    .then((r) => r.rows[0]);
}

export function getOrgFeatureFlag(orgId, key, client = pool) {
  return client
    .query(
      `SELECT * FROM org_feature_flags WHERE organization_id = $1 AND feature_key = $2`,
      [orgId, key],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- журнал платёж/бонус/кредит (platform_org_payments) ----------

export function insertOrgPayment(
  { orgId, type, amount = 0, method = null, periodCovered = null, monthsGranted = null, featureKey = null, note = null, createdBy },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO platform_org_payments
         (organization_id, type, amount, method, period_covered, months_granted, feature_key, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orgId, type, amount, method, periodCovered, monthsGranted, featureKey, note, createdBy],
    )
    .then((r) => r.rows[0]);
}

export function listOrgPayments(orgId, client = pool) {
  return client
    .query(
      `SELECT * FROM platform_org_payments WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function extendAccessUntil(orgId, months, client = pool) {
  return client
    .query(
      `UPDATE organizations
          SET access_until = (GREATEST(access_until, CURRENT_DATE) + ($2 || ' months')::interval)::date,
              updated_at = now()
        WHERE id = $1
        RETURNING access_until`,
      [orgId, months],
    )
    .then((r) => r.rows[0]?.access_until ?? null);
}

// ---------- собственные расходы платформы ----------

export function insertExpense({ label, amount, category, expenseDate, createdBy }, client = pool) {
  return client
    .query(
      `INSERT INTO platform_expenses (label, amount, category, expense_date, created_by)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5)
       RETURNING *`,
      [label, amount, category ?? null, expenseDate ?? null, createdBy],
    )
    .then((r) => r.rows[0]);
}

export function listExpenses(client = pool) {
  return client
    .query(
      `SELECT * FROM platform_expenses WHERE deleted_at IS NULL ORDER BY expense_date DESC, created_at DESC`,
    )
    .then((r) => r.rows);
}

export function softDeleteExpense(id, client = pool) {
  return client
    .query(
      // RETURNING полей, а не только id: журнал должен показывать, ЧТО удалили
      // (при RETURNING id в audit_log попадал пустой before, поймано 25.08.2026)
      `UPDATE platform_expenses SET deleted_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, label, amount, category, expense_date`,
      [id],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Помесячная выручка (только type='payment' — реальные деньги, не бонусы/кредиты)
 * и расходы платформы за последние 12 месяцев, для тренда + баланса. */
export function monthlyRevenueTrend(client = pool) {
  return client
    .query(
      `SELECT to_char(created_at, 'YYYY-MM') AS month, SUM(amount)::int AS revenue
         FROM platform_org_payments
        WHERE type = 'payment' AND created_at >= now() - interval '12 months'
        GROUP BY month ORDER BY month`,
    )
    .then((r) => r.rows);
}

export function monthlyExpenseTrend(client = pool) {
  return client
    .query(
      `SELECT to_char(expense_date, 'YYYY-MM') AS month, SUM(amount)::int AS expense
         FROM platform_expenses
        WHERE deleted_at IS NULL AND expense_date >= now() - interval '12 months'
        GROUP BY month ORDER BY month`,
    )
    .then((r) => r.rows);
}

export function totalRevenue(client = pool) {
  return client
    .query(`SELECT COALESCE(SUM(amount), 0)::int AS total FROM platform_org_payments WHERE type = 'payment'`)
    .then((r) => r.rows[0].total);
}

export function totalExpenses(client = pool) {
  return client
    .query(`SELECT COALESCE(SUM(amount), 0)::int AS total FROM platform_expenses WHERE deleted_at IS NULL`)
    .then((r) => r.rows[0].total);
}

export function setAccessUntil(orgId, date, client = pool) {
  return client
    .query(
      `UPDATE organizations SET access_until = $2, updated_at = now() WHERE id = $1 RETURNING access_until`,
      [orgId, date],
    )
    .then((r) => r.rows[0]?.access_until ?? null);
}

// ---------- заявки CEO на подключение/отключение фичи ----------

export function listFeatureRequests(status, client = pool) {
  const where = status ? 'WHERE fr.status = $1' : '';
  const params = status ? [status] : [];
  return client
    .query(
      `SELECT fr.*, o.name AS organization_name, ap.label AS feature_label,
              (u.first_name || ' ' || u.last_name) AS requested_by_name
         FROM platform_feature_requests fr
         JOIN organizations o ON o.id = fr.organization_id
         LEFT JOIN platform_addon_prices ap ON ap.feature_key = fr.feature_key
         LEFT JOIN users u ON u.id = fr.requested_by
         ${where}
        ORDER BY fr.created_at DESC`,
      params,
    )
    .then((r) => r.rows);
}

export function findFeatureRequest(id, client = pool) {
  return client
    .query(`SELECT * FROM platform_feature_requests WHERE id = $1`, [id])
    .then((r) => r.rows[0] ?? null);
}

export function reviewFeatureRequest(id, status, reviewedBy, client = pool) {
  return client
    .query(
      `UPDATE platform_feature_requests
          SET status = $2, reviewed_by = $3, reviewed_at = now()
        WHERE id = $1 AND status = 'pending'
        RETURNING *`,
      [id, status, reviewedBy],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findOrgById(id, client = pool) {
  return client
    .query(
      `SELECT id, name, status, access_until FROM organizations WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )
    .then((r) => r.rows[0] ?? null);
}

export function setOrgStatus(id, status, client = pool) {
  return client
    .query(
      `UPDATE organizations SET status = $2, updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, name, status`,
      [id, status],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- заявки с лендинга (leads) ----------

const LEAD_COLS = 'id, name, phone, center_name, center_size, message, status, notes, organization_id, created_at';

export function insertLead({ name, phone, centerName, centerSize, message }, client = pool) {
  return client
    .query(
      `INSERT INTO leads (name, phone, center_name, center_size, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${LEAD_COLS}`,
      [name, phone, centerName ?? '', centerSize ?? null, message ?? null],
    )
    .then((r) => r.rows[0]);
}

/** Список заявок; опционально фильтр по статусу. */
export function listLeads(status, client = pool) {
  const where = status ? 'WHERE status = $1' : '';
  const params = status ? [status] : [];
  return client
    .query(`SELECT ${LEAD_COLS} FROM leads ${where} ORDER BY created_at DESC`, params)
    .then((r) => r.rows);
}

export function findLead(id, client = pool) {
  return client
    .query(`SELECT ${LEAD_COLS} FROM leads WHERE id = $1`, [id])
    .then((r) => r.rows[0] ?? null);
}

export function updateLead(id, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['status', 'status'],
    ['notes', 'notes'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return findLead(id, client);
  vals.push(id);
  return client
    .query(
      `UPDATE leads SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i} RETURNING ${LEAD_COLS}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/** Пометить заявку онбордингом: status=onboarded + привязка к организации. */
export function markLeadOnboarded(id, orgId, client = pool) {
  return client.query(
    `UPDATE leads SET status = 'onboarded', organization_id = $2, updated_at = now()
      WHERE id = $1`,
    [id, orgId],
  );
}

// ---------- объявления платформы (Main Admin → «Анонсы») ----------

/**
 * Сколько адресатов у объявления на момент отправки.
 * `all-partners` — активные организации (адресат = центр как таковой),
 * `all-ceo` — активные владельцы организаций (адресат = человек),
 * `specific` — явный список organizationIds (длина массива).
 * Считаем в момент создания и сохраняем: список меняется, а «кому отправили»
 * должно остаться историческим фактом.
 */
export function countAnnouncementRecipients(targetType, organizationIds, client = pool) {
  if (targetType === 'specific') return Promise.resolve(organizationIds?.length ?? 0);
  if (targetType === 'all-ceo') {
    return client
      .query(
        `SELECT count(*)::int AS n FROM users
          WHERE role = 'ceo' AND status = 'active' AND deleted_at IS NULL`,
      )
      .then((r) => r.rows[0].n);
  }
  return client
    .query(
      `SELECT count(*)::int AS n FROM organizations
        WHERE status = 'active' AND deleted_at IS NULL`,
    )
    .then((r) => r.rows[0].n);
}

export async function insertAnnouncement(
  { senderId, title, body, targetType, recipientCount, organizationIds },
  client = pool,
) {
  const row = await client
    .query(
      `INSERT INTO platform_announcements
         (sender_id, title, body, target_type, recipient_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, body, target_type, recipient_count, created_at`,
      [senderId, title, body, targetType, recipientCount],
    )
    .then((r) => r.rows[0]);

  if (targetType === 'specific' && organizationIds?.length) {
    const values = organizationIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await client.query(
      `INSERT INTO platform_announcement_recipients (announcement_id, organization_id)
       VALUES ${values}`,
      [row.id, ...organizationIds],
    );
  }

  return row;
}

export function listAnnouncements(client = pool) {
  return client
    .query(
      `SELECT a.id, a.title, a.body, a.target_type, a.recipient_count, a.created_at,
              (s.first_name || ' ' || s.last_name) AS sender_name
         FROM platform_announcements a
         LEFT JOIN users s ON s.id = a.sender_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.created_at DESC`,
    )
    .then((r) => r.rows);
}

export function softDeleteAnnouncement(id, client = pool) {
  return client
    .query(
      `UPDATE platform_announcements SET deleted_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
      [id],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- профиль main_admin ----------

const PROFILE_COLS = 'id, first_name, last_name, email, phone, role';

export function findUserById(id, client = pool) {
  return client
    .query(`SELECT ${PROFILE_COLS} FROM users WHERE id = $1 AND deleted_at IS NULL`, [id])
    .then((r) => r.rows[0] ?? null);
}

/**
 * Занят ли email/телефон кем-то другим.
 * В БД на это стоят `uq_users_email` (частичный, среди живых) и `uq_users_phone`.
 * Проверяем заранее, чтобы отдать понятную 409, а не сырую ошибку уникальности.
 */
export function emailTakenByOther(email, userId, client = pool) {
  return client
    .query(
      `SELECT 1 FROM users
        WHERE lower(email) = lower($1) AND id <> $2 AND deleted_at IS NULL
        LIMIT 1`,
      [email, userId],
    )
    .then((r) => r.rowCount > 0);
}

export function phoneTakenByOther(phone, userId, client = pool) {
  return client
    .query(`SELECT 1 FROM users WHERE phone = $1 AND id <> $2 LIMIT 1`, [phone, userId])
    .then((r) => r.rowCount > 0);
}

/** Частичное обновление профиля: только переданные поля. */
export function updateProfile(id, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['email', 'email'],
    ['phone', 'phone'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return findUserById(id, client);
  vals.push(id);
  return client
    .query(
      `UPDATE users SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i} AND deleted_at IS NULL
        RETURNING ${PROFILE_COLS}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/* Запросы по staff_penalties отсюда убраны: платформа не читает дисциплину
 * сотрудников партнёров. Эти данные принадлежат организации и доступны её
 * CEO через /api/super/penalties. */

/**
 * Karis 21.08.2026: темы с видео-файлом (методист загрузил вместо ссылки
 * на YouTube) и их расчётная стоимость (src/config/pricing.js) — платформа
 * платит Storj за хранение и трафик, партнёру эта цифра не показывается
 * нигде (см. content.repository.js методиста — там этих колонок нет
 * в SELECT вообще).
 */
export function listVideoStorageCosts(client = pool) {
  return client
    .query(
      `SELECT t.id AS topic_id, t.name AS topic_name, tt.name AS training_type_name,
              o.id AS organization_id, o.name AS organization_name,
              t.video_size_bytes, t.video_duration_sec,
              t.video_storage_cost_usd, t.video_cost_per_view_usd, t.created_at
         FROM topics t
         JOIN training_types tt ON tt.id = t.training_type_id
         JOIN organizations o ON o.id = tt.organization_id
        WHERE t.video_file_key IS NOT NULL AND t.deleted_at IS NULL
        ORDER BY t.video_storage_cost_usd DESC NULLS LAST`,
    )
    .then((r) => r.rows);
}

// ---------- Audit Log платформы (Karis 25.08.2026) ----------

/**
 * Запись действия Main Admin. organization_id = NULL — действие уровня
 * платформы; если действие касается конкретного партнёра, кладём его id,
 * чтобы запись была видна и в разрезе организации.
 *
 * actor_name берётся из users по actor_id, если не передан явно — тот же
 * приём, что в super-модуле: аккаунт могут удалить, а в журнале имя
 * обязано остаться.
 */
export function insertPlatformAudit(entry, client = pool) {
  const {
    orgId = null, actorId, actorName = null, actorRole, action,
    entityType = null, entityId = null, entityLabel = null,
    success = true, ip = null, userAgent = null,
    before = null, after = null, reason = null, meta = null,
  } = entry;
  return client
    .query(
      `INSERT INTO audit_log
         (organization_id, actor_id, actor_name, actor_role, action,
          entity_type, entity_id, entity_label, success, ip, user_agent,
          before_data, after_data, reason, meta)
       VALUES ($1, $2,
               COALESCE($3, (SELECT first_name || ' ' || last_name FROM users WHERE id = $2)),
               $4, $5, $6, $7, $8, $9, $10, $11,
               $12::jsonb, $13::jsonb, $14, $15::jsonb)
       RETURNING id`,
      [
        orgId, actorId ?? null, actorName, actorRole ?? null, action,
        entityType, entityId, entityLabel, success, ip, userAgent,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        reason,
        meta ? JSON.stringify(meta) : null,
      ],
    )
    .then((r) => r.rows[0]);
}

/**
 * Лента журнала для Main Admin. По умолчанию — только платформенные записи
 * (organization_id IS NULL): действия партнёров живут в своей панели у CEO
 * и здесь только зашумляли бы ленту. `scope='all'` показывает всё вместе.
 *
 * Пагинация обязательна: журнал растёт бесконечно, а на фронте Main Admin
 * пагинации нигде нет — здесь она появляется впервые (см. main.routes.js).
 */
export function listPlatformAudit(
  { scope = 'platform', action = null, actorId = null, organizationId = null, search = null, limit = 50, offset = 0 },
  client = pool,
) {
  const conds = [];
  const vals = [];
  let i = 1;

  if (scope === 'platform') conds.push('a.organization_id IS NULL');
  else if (scope === 'org') conds.push('a.organization_id IS NOT NULL');
  if (scope === 'platform') conds.push(`a.action NOT LIKE 'auth.%'`);
  else if (scope === 'security') conds.push(`a.action LIKE 'auth.%'`);

  if (action) { conds.push(`a.action = $${i++}`); vals.push(action); }
  if (actorId) { conds.push(`a.actor_id = $${i++}`); vals.push(actorId); }
  if (organizationId) { conds.push(`a.organization_id = $${i++}`); vals.push(organizationId); }
  if (search) {
    conds.push(`(a.actor_name ILIKE $${i} OR a.entity_label ILIKE $${i} OR o.name ILIKE $${i} OR a.action ILIKE $${i})`);
    vals.push(`%${search}%`); i += 1;
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  vals.push(limit, offset);

  return client
    .query(
      `SELECT a.id, a.organization_id, o.name AS organization_name,
              a.actor_id, a.actor_name, a.actor_role, a.action,
              a.entity_type, a.entity_id, a.entity_label, a.success,
              a.ip, a.user_agent, a.before_data, a.after_data, a.reason, a.meta,
              a.created_at,
              count(*) OVER()::int AS total_count
         FROM audit_log a
         LEFT JOIN organizations o ON o.id = a.organization_id
         ${where}
        ORDER BY a.created_at DESC
        LIMIT $${i++} OFFSET $${i}`,
      vals,
    )
    .then((r) => r.rows);
}

/** Список различных action — для выпадающего фильтра на фронте. */
export function listAuditActions(scope = 'platform', client = pool) {
  const cond = scope === 'platform' ? `WHERE organization_id IS NULL AND action NOT LIKE 'auth.%'`
    : scope === 'org' ? 'WHERE organization_id IS NOT NULL'
      : scope === 'security' ? `WHERE action LIKE 'auth.%'` : '';
  return client
    .query(`SELECT DISTINCT action FROM audit_log ${cond} ORDER BY action`)
    .then((r) => r.rows.map((x) => x.action));
}

// ---------- Action Center (Karis 25.08.2026) ----------

/**
 * Сырые сигналы для центра проблем. Namеренно НЕ считаем здесь severity и не
 * решаем, заблокирован ли партнёр: правило блокировки живёт в
 * shared/orgAccess.js (isOrgAccessBlocked) и должно быть ОДНО на весь проект —
 * иначе предупреждение в панели и реальная блокировка на входе разъедутся.
 * Отдаём факты, решение принимает сервис.
 *
 * last_login_at берём из refresh_tokens: отдельного поля «последний вход» в
 * схеме нет (проверено), а каждая выдача refresh-токена — это факт входа.
 * Приблизительно, но честно, и не требует новой инфраструктуры.
 */
export function actionCenterOrgSignals(client = pool) {
  return client
    .query(
      `SELECT o.id, o.name, o.status, o.access_until,
              (SELECT max(u.last_login_at) FROM users u WHERE u.organization_id = o.id) AS last_login_at,
              (SELECT count(*)::int
                 FROM users u
                WHERE u.organization_id = o.id AND u.role = 'student'
                  AND u.status = 'active' AND u.deleted_at IS NULL) AS students,
              (SELECT max(p.period_covered) FROM platform_org_payments p
                WHERE p.organization_id = o.id AND p.type = 'payment') AS last_paid_period,
              o.created_at
         FROM organizations o
        WHERE o.deleted_at IS NULL
        ORDER BY o.name`,
    )
    .then((r) => r.rows);
}

/** Необработанные заявки с лендинга + возраст самой старой. */
export function actionCenterLeads(client = pool) {
  return client
    .query(
      `SELECT id, center_name, name, phone, created_at,
              EXTRACT(DAY FROM now() - created_at)::int AS age_days
         FROM leads
        WHERE status = 'new'
        ORDER BY created_at ASC`,
    )
    .then((r) => r.rows);
}

/** Заявки партнёров на фичи, ожидающие решения Main Admin. */
export function actionCenterFeatureRequests(client = pool) {
  return client
    .query(
      `SELECT fr.id, fr.feature_key, fr.type, fr.created_at,
              EXTRACT(DAY FROM now() - fr.created_at)::int AS age_days,
              o.id AS organization_id, o.name AS organization_name
         FROM platform_feature_requests fr
         JOIN organizations o ON o.id = fr.organization_id
        WHERE fr.status = 'pending' AND o.deleted_at IS NULL
        ORDER BY fr.created_at ASC`,
    )
    .then((r) => r.rows);
}

// ---------- Модерация чата (Karis 26.08.2026) ----------

/** Полный список слов — для экрана управления (активные и выключенные вместе). */
export function listBannedWords(client = pool) {
  return client
    .query(
      `SELECT bw.id, bw.word, bw.is_active, bw.auto_mask, bw.created_at,
              u.first_name || ' ' || u.last_name AS created_by_name
         FROM platform_banned_words bw
         LEFT JOIN users u ON u.id = bw.created_by
        ORDER BY bw.created_at DESC`,
    )
    .then((r) => r.rows);
}

/**
 * Массовое добавление. ON CONFLICT переактивирует уже существующее слово
 * вместо ошибки — если слово когда-то выключили, а потом добавили заново
 * тем же текстом, это должно просто включить его обратно, а не звать 409.
 */
export function addBannedWords(words, createdBy, client = pool) {
  return client
    .query(
      `INSERT INTO platform_banned_words (word, created_by)
       SELECT DISTINCT trim(w), $2::uuid FROM unnest($1::text[]) AS w
       WHERE trim(w) <> ''
       ON CONFLICT (lower(word)) DO UPDATE SET is_active = true
       RETURNING id, word, is_active, created_at`,
      [words, createdBy],
    )
    .then((r) => r.rows);
}

export function setBannedWordActive(id, isActive, client = pool) {
  return client
    .query(
      `UPDATE platform_banned_words SET is_active = $2 WHERE id = $1
       RETURNING id, word, is_active`,
      [id, isActive],
    )
    .then((r) => r.rows[0]);
}

/**
 * Отдельная ручка, а не общий PATCH с обоими полями сразу: is_active уже
 * протестирован живьём как самостоятельный поток, лишний риск его задеть
 * ради общего эндпоинта не оправдан (Karis 26.08.2026).
 */
export function setBannedWordAutoMask(id, autoMask, client = pool) {
  return client
    .query(
      `UPDATE platform_banned_words SET auto_mask = $2 WHERE id = $1
       RETURNING id, word, is_active, auto_mask`,
      [id, autoMask],
    )
    .then((r) => r.rows[0]);
}

export function deleteBannedWord(id, client = pool) {
  return client
    .query(`DELETE FROM platform_banned_words WHERE id = $1 RETURNING id, word`, [id])
    .then((r) => r.rows[0]);
}

/**
 * Сообщения, сработавшие на список слов — единственный кусок переписки,
 * который видит Main Admin. Обычные сообщения сюда не попадают: WHERE
 * жёстко фильтрует по flagged_word IS NOT NULL, это не общий чат-браузер.
 */
export function listFlaggedMessages({ limit = 50, offset = 0 } = {}, client = pool) {
  return client
    .query(
      `SELECT m.id, m.chat_type, m.room_key, m.body, m.flagged_word, m.created_at,
              u.id AS sender_id, u.first_name AS sender_first_name, u.last_name AS sender_last_name,
              u.role AS sender_role,
              b.id AS branch_id, b.name AS branch_name,
              o.id AS organization_id, o.name AS organization_name,
              count(*) OVER()::int AS total_count
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN branches b ON b.id = m.branch_id
         LEFT JOIN organizations o ON o.id = u.organization_id
        WHERE m.flagged_word IS NOT NULL AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
    .then((r) => r.rows);
}

/** Сколько сообщений сработало на список слов за последние сутки — для
 *  Центра контроля. Скользящее окно, а не «непрочитанные»: у сообщений чата
 *  нет и не должно быть отдельного статуса «просмотрено» ради одного
 *  счётчика — через сутки без нового срабатывания сигнал сам угасает. */
export function countRecentFlaggedMessages(client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS count
         FROM chat_messages
        WHERE flagged_word IS NOT NULL AND deleted_at IS NULL
          AND created_at > now() - interval '24 hours'`,
    )
    .then((r) => r.rows[0].count);
}

/**
 * Признак подбора пароля — N и более неудачных попыток входа под одним
 * логином за короткое окно. Группируем по actor_name (введённая строка
 * логина/телефона), не по IP: это то, что реально можно предупредить —
 * "твой аккаунт X сейчас подбирают", а не абстрактный IP-адрес.
 */
export function detectBruteForceLogins(client = pool) {
  return client
    .query(
      `SELECT actor_name, count(*)::int AS attempts, max(created_at) AS last_attempt_at
         FROM audit_log
        WHERE action = 'auth.login_failed' AND created_at > now() - interval '1 hour'
        GROUP BY actor_name
       HAVING count(*) >= 5
        ORDER BY attempts DESC`,
    )
    .then((r) => r.rows);
}
