import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';

/**
 * Aqlli tahlil (Groq code-review практических уроков). Единственная точка
 * постановки: lessons.service.js submitHomework — после успешной сдачи, если
 * у training_type ai_review_enabled=true.
 *
 *   await aiReviewQueue.add('review', { submissionId })
 */
export const aiReviewQueue = new Queue('ai-review', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 2000,
  },
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит API-процесс
aiReviewQueue.on('error', (err) => {
  logger.error({ err }, 'AI-review queue redis error');
});
