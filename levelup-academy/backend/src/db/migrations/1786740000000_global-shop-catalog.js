export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE shop_catalog_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      name VARCHAR(160) NOT NULL,
      image_key TEXT,
      coin_price INTEGER NOT NULL CHECK (coin_price > 0),
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE shop_items
      ADD COLUMN catalog_item_id UUID REFERENCES shop_catalog_items(id);

    CREATE UNIQUE INDEX uq_shop_items_branch_catalog
      ON shop_items (branch_id, catalog_item_id)
      WHERE catalog_item_id IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX idx_shop_catalog_items_org
      ON shop_catalog_items (organization_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_shop_catalog_items_org;
    DROP INDEX IF EXISTS uq_shop_items_branch_catalog;
    ALTER TABLE shop_items DROP COLUMN IF EXISTS catalog_item_id;
    DROP TABLE IF EXISTS shop_catalog_items;
  `);
};
