/**
 * Karis 08.08.2026: admin должен всегда видеть логин+пароль студента (QR-модалка
 * в StudentDetail.jsx), а не только один раз при создании. password_hash
 * (argon2, необратим) остаётся единственным источником для входа — эта колонка
 * лишь резервная обратимо-зашифрованная копия (см. utils/credentialCrypto.js),
 * НЕ открытый текст. Nullable — у студентов, созданных до этой миграции,
 * копии нет и не появится, пока пароль не перегенерируют.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN password_encrypted TEXT;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS password_encrypted;`);
};
