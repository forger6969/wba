import { z } from 'zod';

// penalty_type — 3 уровня, от мягкого к жёсткому:
//  sariq (жёлтый)  — предупреждение, без блокировки
//  qizil (красный) — строгое предупреждение, без блокировки
//  qora            — увольнение
// sariq/qizil — НЕ автоматика: накопление их количества нигде не порождает
// qora само по себе, это остаётся ручным решением того, кто выдаёт взыскание.
//
// amount — необязательный довесок к любому из трёх: НЕ сумма в сумах, а
// процент от оклада, который вычитается (например «жёлтое предупреждение» +
// «−5% от оклада» одной записью). 0..100, поэтому и другое имя поля не
// заводили — диапазон сам по себе достаточно ясно говорит, что это доля.
//
// shtraf как отдельный тип отменён 2026-07-29 — Postgres ENUM (penalty_type в
// БД) технически ещё содержит это значение (значения ENUM нельзя выпилить), и
// у старых тестовых записей оно может остаться, но новые больше не создать:
// в PENALTY_TYPES его нет, zod отклонит.
export const PENALTY_TYPES = ['sariq', 'qizil', 'qora'];

const amountField = z.coerce.number().min(0, 'Процент не может быть отрицательным').max(100, 'Максимум 100%').optional();

// Выдать взыскание сотруднику.
export const issuePenaltySchema = z.object({
  targetUserId: z.string().uuid('Некорректный id сотрудника'),
  type: z.enum(PENALTY_TYPES),
  amount: amountField,
  reason: z.string().trim().min(1, 'Причина обязательна').max(2000, 'Макс. 2000 символов'),
});

// Фильтры списка штрафов (super/admin)
export const listPenaltiesQuery = z.object({
  targetUserId: z.string().uuid().optional(),
  type: z.enum(PENALTY_TYPES).optional(),
});

// Правило дисциплины (qoyda) — каталог «нарушение → уровень», не привязан к
// конкретному сотруднику (см. discipline_rules).
export const createRuleSchema = z.object({
  type: z.enum(PENALTY_TYPES),
  amount: amountField,
  description: z.string().trim().min(1, 'Опишите правило').max(500, 'Макс. 500 символов'),
});

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
