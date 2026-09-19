/**
 * XOB (Telegram, 12.08.2026): язык кабинета живёт только в localStorage фронта
 * (member_lang) — бэкенд его не знает, поэтому AI-review всегда на русском
 * (DEFAULT_LANG='ru', ai-review/service.js), notifyTestResult на фиксированном
 * тексте, Telegram-бот — на одном глобальном TELEGRAM_BOT_LANG для всех.
 * На users, не только students: значение пригодится для любой роли, если
 * понадобится позже (тот же messages(language) уже общий на все роли).
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN preferred_language TEXT CHECK (preferred_language IN ('ru', 'uz'));
  `);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS preferred_language;`);
};
