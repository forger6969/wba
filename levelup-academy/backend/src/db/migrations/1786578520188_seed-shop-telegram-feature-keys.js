/**
 * Karis (13.08.2026): Shop и Telegram-интеграция становятся управляемыми
 * фичами — Main Admin включает/выключает партнёру, CEO может запросить
 * (тот же механизм, что уже есть у AI-review). Стабильные `feature_key`
 * нужны, потому что на них теперь завязан код-гейт (requireOrgFeature).
 * price=0 — не монетизация, просто ON/OFF через уже готовый UI-каталог.
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO platform_addon_prices (feature_key, label, price)
    VALUES
      ('shop', 'Магазин коинов (Shop)', 0),
      ('telegram_integration', 'Telegram-интеграция', 0)
    ON CONFLICT (feature_key) DO NOTHING;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM platform_addon_prices WHERE feature_key IN ('shop', 'telegram_integration');
  `);
};
