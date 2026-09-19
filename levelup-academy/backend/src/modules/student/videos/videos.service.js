import { AppError } from '../../../utils/AppError.js';
import { getDownloadUrl } from '../../../config/s3.js';
import { getStudentGroupIds, isStudentInGroup } from '../../../shared/membership.js';
import * as videosRepo from '../../videos/videos.repository.js';

export async function listForStudent(studentId) {
  const groupIds = await getStudentGroupIds(studentId);
  return videosRepo.listForGroups(groupIds);
}

/** Presigned GET на стрим видео — только если студент состоит в группе видео. */
export async function getStreamUrl(studentId, videoId) {
  const video = await videosRepo.getById(videoId);
  if (!video) throw new AppError(404, 'Video not found');

  const inGroup = await isStudentInGroup(studentId, video.group_id);
  if (!inGroup) throw new AppError(403, 'Not a member of this group');

  const streamUrl = await getDownloadUrl(video.video_key);
  return { streamUrl };
}
