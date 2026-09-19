import { AppError } from '../../../utils/AppError.js';
import { withTransaction } from '../../../config/db.js';
import { changeCoins, emitCoinsChanged } from '../../coins/coins.service.js';
import * as homeworkRepo from '../../homework/homework.repository.js';
import { requireMentorGroup } from '../shared/groupAccess.js';

/** Создать ДЗ для своей группы. */
export async function createHomeworkForGroup({ mentorId, groupId, payload }) {
  const group = await requireMentorGroup(mentorId, groupId);
  return homeworkRepo.createHomework({
    branchId: group.branch_id,
    groupId,
    createdBy: mentorId,
    ...payload,
  });
}

/** ДЗ группы (список для ментора). */
export async function listHomeworkForGroup({ mentorId, groupId }) {
  await requireMentorGroup(mentorId, groupId);
  return homeworkRepo.listHomeworkForGroup(groupId);
}

/** Сдачи по конкретному ДЗ (для проверки ментором). */
export async function listSubmissions({ mentorId, homeworkId }) {
  const hw = await homeworkRepo.getHomeworkById(homeworkId);
  if (!hw) throw new AppError(404, 'Homework not found');
  await requireMentorGroup(mentorId, hw.group_id);
  return homeworkRepo.listSubmissions(homeworkId);
}

/**
 * Оценить сдачу ДЗ. Идемпотентно: повторная попытка оценить уже оценённую
 * сдачу возвращает 409. Начисление коинов и смена статуса — одна транзакция;
 * побочные эффекты (лидерборд/уведомление) шлём только после успешного commit.
 */
export async function gradeSubmission({ mentorId, submissionId, score }) {
  const submission = await homeworkRepo.getSubmissionById(submissionId);
  if (!submission) throw new AppError(404, 'Submission not found');

  await requireMentorGroup(mentorId, submission.group_id);

  if (submission.status === 'graded') {
    throw new AppError(409, 'Submission is already graded');
  }
  if (score < 0 || score > submission.max_score) {
    throw new AppError(422, `Score must be between 0 and ${submission.max_score}`);
  }

  const gradedSubmission = await withTransaction(async (client) => {
    const graded = await homeworkRepo.gradeSubmission(
      { submissionId, score, gradedBy: mentorId },
      client,
    );
    // guard проиграл гонку — сдачу уже оценили параллельно, откат без начисления
    if (!graded) throw new AppError(409, 'Submission is already graded');

    if (submission.coin_reward > 0) {
      await changeCoins(
        {
          studentId: submission.student_id,
          actorId: mentorId,
          amount: submission.coin_reward,
          operation: 'reward',
          reason: 'Homework graded',
          refType: 'homework',
          refId: submission.homework_id,
        },
        client,
      );
    }

    return graded;
  });

  if (submission.coin_reward > 0) {
    await emitCoinsChanged({
      studentId: submission.student_id,
      branchId: submission.branch_id,
      amount: submission.coin_reward,
      reason: 'Homework graded',
    });
  }

  return gradedSubmission;
}
