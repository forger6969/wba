/**
 * Finance Manager уже существует как панель frontend/staff, но до этой
 * миграции роль отсутствовала в PostgreSQL и staff-login, поэтому создать
 * такого сотрудника было невозможно.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance_manager'`);
};

export const down = () => {
  // PostgreSQL не умеет безопасно удалить одно значение enum. Откат роли
  // требует пересоздания типа и предварительной проверки живых пользователей.
};
