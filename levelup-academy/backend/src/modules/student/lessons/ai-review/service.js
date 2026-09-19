import { logger } from '../../../../config/logger.js';
import { withTransaction } from '../../../../config/db.js';
import { changeCoins, emitCoinsChanged } from '../../../coins/coins.service.js';
import { extractSubmission } from './extractor.js';
import { reviewCode } from './groq.client.js';
import * as repo from '../lessons.repository.js';

// XOB (12.08): язык студента теперь есть в БД (users.preferred_language,
// миграция add-student-preferred-language) — используем его; пока студент
// ничего не выбрал (или ещё не подтянул фронт) — тот же дефолт, что раньше.
const DEFAULT_LANG = 'ru';

// Тот же порог, что у тестов (submitTest, tests.service.js) — оценка от ИИ
// живёт по тем же правилам геймификации, что и авто-скоринг теста.
const PASS_SCORE_THRESHOLD = 50;

/**
 * Karis 21.08.2026: раньше ИИ только писал review/score в БД (saveReview),
 * а закрыть сдачу (status→'graded') и начислить монеты мог только человек —
 * но эндпоинта для ручной оценки methodology_submissions вообще не было,
 * то есть сдача застревала навсегда в 'submitted'. По запросу — ИИ теперь
 * сам закрывает сдачу и сам начисляет монеты, без участия ментора/методиста.
 *
 * Транзакция + идемпотентный UPDATE (finalizeAiGrade) — так же, как в
 * mentor/homework/homework.service.js: если сдачу параллельно закрыли ещё
 * раз (повторный запуск воркера), второй вызов просто ничего не сделает.
 */
async function finalizeAiGrade(submission, score) {
  const result = await withTransaction(async (client) => {
    const graded = await repo.finalizeAiGrade({ submissionId: submission.id, score }, client);
    if (!graded) return null; // уже закрыта раньше — гонка/повтор, монеты не дублируем

    if (score >= PASS_SCORE_THRESHOLD && submission.lesson_coin_reward > 0) {
      const coinResult = await changeCoins(
        {
          studentId: submission.student_id,
          actorId: submission.student_id,
          amount: submission.lesson_coin_reward,
          operation: 'reward',
          reason: 'Aqlli tahlil (AI) — vazifa baholandi',
          refType: 'methodology_lesson',
          refId: submission.lesson_id,
        },
        client,
      );
      return { coinBranchId: coinResult.branchId };
    }
    return {};
  });

  // side-effects (лидерборд/уведомление) — только после commit, как у обычного changeCoins()
  if (result?.coinBranchId) {
    await emitCoinsChanged({
      studentId: submission.student_id,
      branchId: result.coinBranchId,
      amount: submission.lesson_coin_reward,
      reason: 'Aqlli tahlil (AI) — vazifa baholandi',
    }).catch((err) => logger.error({ err, submissionId: submission.id }, 'ai-review: emitCoinsChanged failed'));
  }
}

function deterministicTestsReview(lang) {
  const uz = lang === 'uz';
  return {
    score: null,
    praise: null,
    growth_area: null,
    tips: [],
    summary: uz
      ? "Kod topilmadi — mentoring tekshiradi."
      : 'Код не найден — работу проверит ментор.',
  };
}

/** "Описание задачи" методиста — description/instruction урока (текстовые поля,
 * всегда читаемые) + вложение УРОКА (lesson_file_key), если оно вообще
 * читается тем же экстрактором, что и сдача ученика (best-effort: не
 * получилось — просто нет спеки, отказывать студенту в review из-за
 * нечитаемого файла методиста нельзя). Без этого AI разбирал код "вообще",
 * а не "выполнил ли ученик ИМЕННО ЭТО задание" (запрос пользователя 10.08.2026). */
async function buildTaskDescription(submission) {
  const parts = [submission.lesson_description, submission.lesson_instruction].filter(Boolean);

  if (submission.lesson_file_key) {
    const { bundle } = await extractSubmission({ fileKey: submission.lesson_file_key }).catch(() => ({ bundle: null }));
    if (bundle) parts.push(`--- Metodist ilova qilgan fayl ---\n${bundle}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * submissionId — methodology_submissions.id. Чистая функция побочного
 * эффекта: читает сдачу, извлекает код (extractor), опционально зовёт Groq,
 * пишет review обратно. Ничего не возвращает — воркер (aiReview.worker.js)
 * просто await'ит и ловит исключение сам (BullMQ retry).
 */
export async function processSubmission(submissionId) {
  const submission = await repo.getSubmissionById(submissionId);
  if (!submission) {
    logger.warn({ submissionId }, 'ai-review: submission not found, skipping');
    return;
  }

  const lang = submission.student_language || DEFAULT_LANG;
  const attempts = (submission.review_attempts ?? 0) + 1;
  await repo.saveReview(submissionId, { review: null, reviewSource: null, reviewStatus: 'processing', reviewAttempts: attempts });

  const [{ bundle, reviewSource }, taskDescription] = await Promise.all([
    extractSubmission({ fileKey: submission.file_key, textAnswer: submission.text_answer }),
    buildTaskDescription(submission),
  ]);

  // 'tests'/'unreadable' — Groq НЕ вызывается (спека: не читал код — не
  // выдумывай оценку). Единственная разница между ними: 'unreadable' значит
  // "что-то было, но не прочиталось" (файл/ссылка), 'tests' — "нечего читать".
  if (!bundle) {
    const review = reviewSource === 'unreadable'
      ? { score: null, praise: null, growth_area: null, tips: [], summary: lang === 'uz'
        ? "Kodni o'qib bo'lmadi. Matn yuboring yoki GitHub'ni public qiling — mentoring ham tekshiradi."
        : 'Не удалось прочитать код. Пришлите текстом или откройте GitHub-репозиторий — работу также проверит ментор.' }
      : deterministicTestsReview(lang);
    await repo.saveReview(submissionId, { review, reviewSource, reviewStatus: 'done', reviewAttempts: attempts });
    return;
  }

  try {
    const review = await reviewCode(bundle, lang, taskDescription);
    await repo.saveReview(submissionId, { review, reviewSource, reviewStatus: 'done', reviewAttempts: attempts });

    // Начисление монет — best-effort side-effect ПОСЛЕ того, как review уже
    // сохранён: сам разбор кода студенту важнее и уже сделан, сбой здесь
    // (например гонка/отсутствующий профиль) не должен превращаться в
    // BullMQ retry, который заново дёргал бы Groq без всякой пользы.
    await finalizeAiGrade(submission, review.score).catch((err) => {
      logger.error({ err, submissionId }, 'ai-review: finalizeAiGrade (grade+coins) failed');
    });
  } catch (err) {
    logger.error({ err, submissionId, attempts }, 'ai-review: Groq call failed');
    // GROQ_API_KEY отсутствует/невалидный JSON/сетевая ошибка — половинчатый
    // результат НЕ сохраняется (спека, п.10.3): либо полный review, либо failed.
    await repo.saveReview(submissionId, { review: null, reviewSource, reviewStatus: 'failed', reviewAttempts: attempts });
    throw err; // BullMQ увидит fail → свой retry (см. aiReview.worker.js)
  }
}
