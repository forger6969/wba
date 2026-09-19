import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { processSubmission } from '../../modules/student/lessons/ai-review/service.js';

const QUEUE_NAME = 'ai-review';

export const aiReviewWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    await processSubmission(job.data.submissionId);
  },
  { connection: redisConnection },
);

aiReviewWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, submissionId: job?.data?.submissionId, err }, 'AI-review job failed');
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит процесс
aiReviewWorker.on('error', (err) => {
  logger.error({ err }, 'AI-review worker redis error');
});
