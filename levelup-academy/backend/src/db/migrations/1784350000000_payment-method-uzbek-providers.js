/**
 * Karis 08.08.2026: referens (marsit.uz) различает Humo/Uzcard/Uzum/Payme/Click/
 * Bank orqali o'tkazma как отдельные способы оплаты — старый payment_method
 * знал только cash/card/transfer, из-за чего «Карта» скрывала, чем именно
 * заплатили. Значения ДОБАВЛЯЮТСЯ, старые (cash/card/transfer) не трогаются —
 * у существующих transactions менять нечего. down необратим (Postgres не
 * умеет удалять значение enum) — это ограничение самого ALTER TYPE ADD VALUE.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'humo';`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'uzcard';`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'uzum';`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'payme';`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'click';`);
  pgm.sql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';`);
};

export const down = () => {
  throw new Error('payment_method: удаление значений enum не поддерживается Postgres — откат невозможен без пересоздания типа.');
};
