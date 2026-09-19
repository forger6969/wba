/**
 * Karis 08.08.2026: поля профиля студента для виджета «Профиль заполнен»
 * (frontend/staff/src/pages/admin/StudentDetail.jsx) и формы создания
 * (Students.jsx) — раньше были декоративными (собирались в форме, никуда не
 * отправлялись, см. комментарий emptyForm в Students.jsx). Все nullable —
 * у существующих студентов этих данных нет и не обязано появиться сразу.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN gender VARCHAR(10) CHECK (gender IS NULL OR gender IN ('male', 'female'));`);
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN address VARCHAR(255);`);
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN school VARCHAR(120);`);
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN lead_source VARCHAR(60);`);
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN has_laptop BOOLEAN;`);
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN offer_signed BOOLEAN NOT NULL DEFAULT false;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS offer_signed;`);
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS has_laptop;`);
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS lead_source;`);
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS school;`);
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS address;`);
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS gender;`);
};
