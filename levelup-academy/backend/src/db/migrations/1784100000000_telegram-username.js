/**
 * Karis: кабинет показывает, ЧТО именно привязано, а не только факт привязки.
 *
 * До этого в `telegram_accounts` лежал лишь `tg_chat_id` — число, которое ученику
 * ничего не говорит. Увидеть «привязан @ali_valiyev» он не мог, а значит не мог и
 * заметить, что бот привязан к чужому аккаунту (например, к телефону брата).
 *
 * Оба поля nullable: Telegram не обязывает заводить username, и у уже привязанных
 * записей этих данных нет — заполнятся при следующей привязке.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE telegram_accounts ADD COLUMN tg_username TEXT;`);
  pgm.sql(`ALTER TABLE telegram_accounts ADD COLUMN tg_first_name TEXT;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE telegram_accounts DROP COLUMN IF EXISTS tg_first_name;`);
  pgm.sql(`ALTER TABLE telegram_accounts DROP COLUMN IF EXISTS tg_username;`);
};
