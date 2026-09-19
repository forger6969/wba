/**
 * Трекер ошибок бэкенда (Karis 26.08.2026).
 *
 * Сегодняшнее падение сервера я нашёл случайно, вручную гоняя процесс в
 * форграунде — обычно такие ошибки просто исчезают в консоли. Здесь они
 * оседают в базе, сгруппированные по отпечатку (kind+сообщение+первая
 * строка стека), чтобы одна и та же повторяющаяся ошибка не заваливала
 * список тысячей одинаковых строк, а увеличивала счётчик у одной записи.
 *
 * НЕ через Redis: ошибки нужно записывать в том числе тогда, когда Redis
 * сам недоступен (ровно сегодняшняя ситуация) — Postgres как основа
 * платформы это переживает лучше.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE platform_error_log (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fingerprint       TEXT NOT NULL,
        kind              TEXT NOT NULL, -- 'http' (5xx из route) | 'infra' (БД/Redis/сеть) | 'crash' (uncaughtException/unhandledRejection)
        message           TEXT NOT NULL,
        stack             TEXT,
        route             TEXT,
        status_code       INT,
        occurrence_count  INT NOT NULL DEFAULT 1,
        first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at       TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX uq_platform_error_log_fingerprint ON platform_error_log (fingerprint);
    CREATE INDEX idx_platform_error_log_open ON platform_error_log (last_seen_at DESC) WHERE resolved_at IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS platform_error_log;
  `);
};
