/**
 * Месячный лимит коинов у ментора.
 *
 * Правило: супер-админ задаёт норму на одного ученика, и на каждую группу
 * ментору отводится «число учеников × норма» коинов в месяц. Больше он выдать
 * не может, неизрасходованное в конце месяца сгорает.
 *
 * Ничего не начисляем и не храним заранее — ни таблицы бюджетов, ни ежемесячной
 * задачи, которая их создаёт. Лимит целиком выводится из уже имеющихся данных:
 * norm × COUNT(активных учеников группы) минус сумма выданного в этом месяце.
 * Причина в требовании «пришёл новый ученик — лимит вырос сразу»: хранимая
 * величина устаревала бы при каждом зачислении и отчислении, и её пришлось бы
 * догонять триггерами. Вычисляемая — верна всегда по определению.
 *
 * Отсюда всего две вещи в схеме:
 *
 *  1. organizations.coins_per_student — сама норма. Колонкой, а не отдельной
 *     таблицей настроек: рядом уже живёт lesson_duration_min, и заводить
 *     инфраструктуру ради второго числа незачем.
 *
 *  2. coin_history.group_id — из какого бюджета операция. Без него нельзя
 *     посчитать израсходованное: ученик может состоять сразу в двух группах
 *     этого же ментора, и по одному student_id не определить, чей это лимит.
 *     NULL — операция вне бюджета ментора (покупка в магазине, начисление
 *     админом); такие в расход не идут.
 */
export const up = (pgm) => {
  pgm.sql(`
ALTER TABLE organizations
    ADD COLUMN coins_per_student SMALLINT NOT NULL DEFAULT 0
        CHECK (coins_per_student >= 0);

ALTER TABLE coin_history
    ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Расход считается за месяц по одной группе: индекс ровно под этот запрос.
-- Частичный — строк без group_id большинство (магазин, начисления админа), и
-- держать их в индексе бюджета незачем.
CREATE INDEX idx_coin_history_group_month
    ON coin_history (group_id, created_at DESC)
    WHERE group_id IS NOT NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS idx_coin_history_group_month;
ALTER TABLE coin_history DROP COLUMN IF EXISTS group_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS coins_per_student;
  `);
};
