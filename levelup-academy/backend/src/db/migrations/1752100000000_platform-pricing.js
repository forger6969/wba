/**
 * K-MAIN — цены платформы, редактируемые Main Admin'ом.
 *
 * Цена НЕ зависит от плана — она глобальная (одна строка-синглтон на всю платформу):
 *   - base_first_branch — за 1-й филиал (дефолт 260000 сум = 20$ по курсу 13000)
 *   - per_extra_branch  — за каждый филиал сверх первого (130000 сум = 10$)
 *   - per_student       — за каждого ученика в месяц (2500 сум)
 * Валюта — сумы (UZS). Main Admin меняет значения через PUT /api/main/pricing.
 * План pro/max остаётся только лимитом (макс. филиалов/студентов), не влияет на цену.
 *
 * Зона: Karis (Main Admin). Имя миграции согласовать в группе levelUp ДО пуша.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS platform_pricing (
      id                INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      base_first_branch BIGINT NOT NULL DEFAULT 260000,
      per_extra_branch  BIGINT NOT NULL DEFAULT 130000,
      per_student       BIGINT NOT NULL DEFAULT 2500,
      currency          VARCHAR(3) NOT NULL DEFAULT 'UZS',
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- единственная строка настроек (id = 1); при повторной миграции не дублируется
    INSERT INTO platform_pricing (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING;
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS platform_pricing;`);
};
