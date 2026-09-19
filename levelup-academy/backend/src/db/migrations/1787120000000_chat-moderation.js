/**
 * Модерация чата: список запрещённых слов + флаг на сообщении (Karis 26.08.2026).
 *
 * Список ОДИН на всю платформу, не на организацию: Karis настраивает его
 * один раз, и он действует во всех чатах всех партнёров и филиалов сразу —
 * так и было прошено ("1 marta qilinadi va hama filiyallarga ishlaydi").
 *
 * Это НЕ инструмент подглядывания за перепиской. Main Admin по-прежнему не
 * видит обычные сообщения — flagged_word появляется только у сообщения,
 * сработавшего на список, и только оно становится видимым в списке
 * нарушений. Остальная переписка остаётся закрытой, как и была.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE platform_banned_words (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word        TEXT NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- регистр не важен: "Дурак" и "дурак" — одно и то же слово в списке
    CREATE UNIQUE INDEX uq_platform_banned_words_word ON platform_banned_words (lower(word));
    CREATE INDEX idx_platform_banned_words_active ON platform_banned_words (is_active);

    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS flagged_word TEXT;

    -- частичный индекс: сработавших сообщений на порядки меньше общего потока,
    -- полный индекс по created_at был бы лишним весом на каждую вставку чата
    CREATE INDEX idx_chat_messages_flagged
      ON chat_messages (created_at DESC) WHERE flagged_word IS NOT NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_chat_messages_flagged;
    ALTER TABLE chat_messages DROP COLUMN IF EXISTS flagged_word;
    DROP TABLE IF EXISTS platform_banned_words;
  `);
};
