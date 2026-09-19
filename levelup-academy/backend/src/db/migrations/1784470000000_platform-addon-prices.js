/**
 * Каталог платных фич платформы — НЕ фиксированный список из кода. Main Admin
 * сам заводит новую платную фичу (название + цена/мес) через UI, она сразу
 * становится тумблером, который можно включить любому партнёру
 * (org_feature_flags.feature_key — свободная строка, ссылается сюда только
 * по соглашению, не по FK, чтобы не блокировать удаление старых фич задним
 * числом при живых ссылках в истории — см. platform_org_payments).
 *
 * Единственная сидируемая строка — `ai_review`: ключ должен быть стабильным,
 * потому что на него завязан реальный код-гейт (methodist/student модули).
 * Остальные фичи Karis заводит сам с произвольным feature_key (slug из label).
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE platform_addon_prices (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feature_key VARCHAR(60) UNIQUE NOT NULL,
        label       VARCHAR(80) NOT NULL,
        price       INTEGER NOT NULL DEFAULT 0,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO platform_addon_prices (feature_key, label, price)
    VALUES ('ai_review', 'AI-проверка (AI-review)', 0);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS platform_addon_prices;`);
};
