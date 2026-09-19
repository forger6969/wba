/**
 * Переименование роли Super Admin → SEO (решение Karis, 07.08.2026).
 *
 * `RENAME VALUE` — метаданные каталога, без переписи строк: все существующие
 * пользователи с role='superadmin' становятся role='seo' мгновенно, без
 * блокировки таблицы users и без отдельного UPDATE. Ровно то же самое для
 * enum-аудитории платформенных объявлений ('all-superadmins' → 'all-seo').
 *
 * ВАЖНО: разлогинивает всех текущих SEO/Super Admin — их JWT (access и
 * refresh) несёт старое значение роли в payload; authorize('seo') после этой
 * миграции перестанет их пускать (403), пока не перелогинятся. Применять
 * вместе с деплоем обновлённого кода (authorize.js и т.д.), не раньше.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role RENAME VALUE 'superadmin' TO 'seo';`);
  pgm.sql(`ALTER TYPE platform_announcement_target RENAME VALUE 'all-superadmins' TO 'all-seo';`);
};

export const down = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role RENAME VALUE 'seo' TO 'superadmin';`);
  pgm.sql(`ALTER TYPE platform_announcement_target RENAME VALUE 'all-seo' TO 'all-superadmins';`);
};
