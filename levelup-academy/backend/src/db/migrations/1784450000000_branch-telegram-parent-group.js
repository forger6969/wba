/**
 * Группа родителей филиала в Telegram — сюда потом уходят авто-уведомления
 * (посещаемость, слабые темы и т.п., пользовательский запрос 09.08.2026).
 * Бот добавляется в группу ВРУЧНУЮ (Branch Manager сам это делает — за пределами
 * системы), backend только ловит chat_id через команду /bindbranch <код> в
 * самой группе (см. modules/telegram/bot.handlers.js) — тот же приём, что и
 * личная привязка (bind-token.service.js), только код привязан к branch_id,
 * а не к user_id, и срабатывает в групповом чате, а не в приватном /start.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE branches
      ADD COLUMN parent_tg_chat_id BIGINT UNIQUE,
      ADD COLUMN parent_tg_bound_at TIMESTAMPTZ;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE branches
      DROP COLUMN IF EXISTS parent_tg_chat_id,
      DROP COLUMN IF EXISTS parent_tg_bound_at;
  `);
};
