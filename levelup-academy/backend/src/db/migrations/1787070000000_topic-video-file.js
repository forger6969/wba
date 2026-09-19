/**
 * Karis 21.08.2026: у темы (topics) видео теперь может быть либо ссылкой
 * (video_url, как раньше — YouTube хостит сам, бесплатно для нас), либо
 * файлом, загруженным методистом на Storj — это уже реальные наши деньги
 * (хранение + трафик при каждом просмотре), поэтому файл считается вместе
 * со стоимостью. Взаимоисключающе — переключение делает content.service.js.
 *
 * video_size_bytes — точный размер, снятый с самого Storj (HeadObject) ПОСЛЕ
 * загрузки, не то, что прислал клиент — иначе методист мог бы занизить цифру.
 * video_storage_cost_usd / video_cost_per_view_usd — по тарифу с наценкой
 * (src/config/pricing.js), видны только Main Admin — методисту (сотруднику
 * партнёра) реальная себестоимость нашей инфраструктуры не показывается.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE topics
      ADD COLUMN video_file_key TEXT,
      ADD COLUMN video_size_bytes BIGINT,
      ADD COLUMN video_duration_sec INTEGER,
      ADD COLUMN video_storage_cost_usd NUMERIC(10,4),
      ADD COLUMN video_cost_per_view_usd NUMERIC(10,6);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE topics
      DROP COLUMN IF EXISTS video_file_key,
      DROP COLUMN IF EXISTS video_size_bytes,
      DROP COLUMN IF EXISTS video_duration_sec,
      DROP COLUMN IF EXISTS video_storage_cost_usd,
      DROP COLUMN IF EXISTS video_cost_per_view_usd;
  `);
};
