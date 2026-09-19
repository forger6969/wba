/**
 * methodology_questions поддерживал только 4-вариантный MC (option_a-d +
 * correct_answer). Добавляем ещё два формата вопроса — «Загадка» и
 * «Вопрос и ответ» — оба технически одно и то же (свободный текстовый
 * ответ, сверяется без учёта регистра), отличается только то, как
 * методист формулирует вопрос. Разные значения question_type оставлены
 * для читаемости в UI/аналитике, а не потому что логика проверки разная.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE methodology_questions
      ADD COLUMN question_type VARCHAR(10) NOT NULL DEFAULT 'choice'
        CHECK (question_type IN ('choice', 'riddle', 'open')),
      ADD COLUMN correct_text_answer TEXT,
      ALTER COLUMN option_a DROP NOT NULL,
      ALTER COLUMN option_b DROP NOT NULL,
      ALTER COLUMN option_c DROP NOT NULL,
      ALTER COLUMN option_d DROP NOT NULL,
      ALTER COLUMN correct_answer DROP NOT NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE methodology_questions
      DROP COLUMN question_type,
      DROP COLUMN correct_text_answer,
      ALTER COLUMN option_a SET NOT NULL,
      ALTER COLUMN option_b SET NOT NULL,
      ALTER COLUMN option_c SET NOT NULL,
      ALTER COLUMN option_d SET NOT NULL,
      ALTER COLUMN correct_answer SET NOT NULL;
  `);
};
