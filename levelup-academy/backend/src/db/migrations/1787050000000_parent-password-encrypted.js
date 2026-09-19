/**
 * Karis 20.08.2026: у студента admin может пересмотреть логин+пароль сколько
 * угодно раз (password_encrypted на student_profiles, см.
 * 1784360000000_student-password-encrypted.js) — у родителя такой копии не
 * было вообще, пароль отдавался один раз в ответе createStudent и терялся
 * навсегда. Родитель — просто role='parent' на users, без своей profile-таблицы,
 * поэтому колонка здесь, а не в отдельной таблице. password_hash (argon2)
 * остаётся единственным источником для входа, это лишь обратимая копия для
 * admin-просмотра (см. utils/credentialCrypto.js). Nullable — у родителей,
 * заведённых до этой миграции, копии нет, пока пароль не перевыпустят.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN password_encrypted TEXT;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS password_encrypted;`);
};
