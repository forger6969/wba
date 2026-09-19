/**
 * Автозамена слова на **** прямо в чате — по кнопке, отдельно на каждое
 * слово (Karis 26.08.2026).
 *
 * Раньше запрещённое слово только помечалось (flagged_word) для просмотра
 * Main Admin'ом, сам текст не менялся ни для кого. Теперь у каждого слова
 * два независимых переключателя: is_active (отслеживать вообще) и
 * auto_mask (заменять на **** в самом сообщении, видно всем участникам).
 * По умолчанию auto_mask выключен — включение цензуры не должно быть
 * побочным эффектом простого добавления слова в список.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE platform_banned_words ADD COLUMN IF NOT EXISTS auto_mask BOOLEAN NOT NULL DEFAULT false;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE platform_banned_words DROP COLUMN IF EXISTS auto_mask;
  `);
};
