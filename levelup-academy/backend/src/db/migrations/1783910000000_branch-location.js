/**
 * Координаты филиала.
 *
 * Форма создания филиала уже показывала карту и отправляла `lat`/`lng`, но
 * колонок под них не было, а zod-схема их не описывала — лишние поля молча
 * отбрасывались. То есть точку на карте можно было поставить, а сохранить её
 * было некуда, и никто об этом не узнавал: ошибки не возникало.
 *
 * NUMERIC, а не float: широта и долгота — это координаты, а не результат
 * измерения, и лишние двоичные погрешности при сравнении и группировке ни к
 * чему. Точности 9,6 хватает примерно на 11 сантиметров.
 *
 * Проверки диапазона стоят на уровне БД, чтобы кривые данные не заезжали в
 * обход API — например, при импорте или ручной правке.
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE branches
      ADD COLUMN lat NUMERIC(9,6),
      ADD COLUMN lng NUMERIC(9,6);

    ALTER TABLE branches
      ADD CONSTRAINT branches_lat_range CHECK (lat IS NULL OR (lat BETWEEN -90 AND 90)),
      ADD CONSTRAINT branches_lng_range CHECK (lng IS NULL OR (lng BETWEEN -180 AND 180)),
      -- либо обе координаты, либо ни одной: одна половина точки бесполезна
      ADD CONSTRAINT branches_latlng_together CHECK ((lat IS NULL) = (lng IS NULL));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE branches
      DROP CONSTRAINT IF EXISTS branches_latlng_together,
      DROP CONSTRAINT IF EXISTS branches_lng_range,
      DROP CONSTRAINT IF EXISTS branches_lat_range,
      DROP COLUMN IF EXISTS lng,
      DROP COLUMN IF EXISTS lat;
  `);
};
