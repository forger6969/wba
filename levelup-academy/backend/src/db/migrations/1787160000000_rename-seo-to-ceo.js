/**
 * Переименование роли SEO → CEO (решение Karis, 29.08.2026).
 *
 * Причина: `SEO` во всём мире читается как Search Engine Optimization, а здесь
 * это должность — директор учебного центра. Название путало и команду, и
 * партнёров: в одном репозитории лежала и роль `seo`, и настоящая поисковая
 * оптимизация лендинга. Правильная аббревиатура для директора — `CEO`.
 *
 * `RENAME VALUE` — метаданные каталога, без переписи строк: все существующие
 * пользователи с role='seo' становятся role='ceo' мгновенно, без блокировки
 * таблицы users и без отдельного UPDATE. Ровно то же самое для enum-аудитории
 * платформенных объявлений ('all-seo' → 'all-ceo').
 *
 * Колонки `users.role`, `staff_penalties.issuer_role`/`target_role`,
 * `audit_log.actor_role` имеют тип `user_role` — переименование значения типа
 * покрывает их все, отдельных правок не требуется.
 *
 * ВАЖНО: разлогинивает всех текущих CEO (бывш. SEO) — их JWT (access и refresh)
 * несёт старое значение роли в payload; authorize('ceo') после этой миграции
 * перестанет их пускать (403), пока не перелогинятся. Применять вместе с
 * деплоем обновлённого кода (authorize.js и т.д.), не раньше.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role RENAME VALUE 'seo' TO 'ceo';`);
  pgm.sql(`ALTER TYPE platform_announcement_target RENAME VALUE 'all-seo' TO 'all-ceo';`);
};

export const down = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role RENAME VALUE 'ceo' TO 'seo';`);
  pgm.sql(`ALTER TYPE platform_announcement_target RENAME VALUE 'all-ceo' TO 'all-seo';`);
};
