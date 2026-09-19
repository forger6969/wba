import { AppError } from '../../utils/AppError.js';
import { buildObjectKey, getUploadUrl as getS3UploadUrl } from '../../config/s3.js';
import * as videosRepo from '../videos/videos.repository.js';
import * as repo from './videos.repository.js';

/** Presigned PUT для загрузки видеофайла — тот же приём, что у вложения урока. */
export async function getVideoUploadUrl(orgId, groupId, { filename, contentType }) {
  const group = await repo.findGroupInOrg(groupId, orgId);
  if (!group) throw new AppError(404, 'Group not found');
  const videoKey = buildObjectKey(`videos/${groupId}`, filename);
  const uploadUrl = await getS3UploadUrl(videoKey, contentType);
  return { uploadUrl, videoKey };
}

/** Регистрация видео в БД — вызывается ПОСЛЕ успешной загрузки файла по uploadUrl. */
export async function createVideo(orgId, userId, groupId, { title, videoKey, durationSec }) {
  const group = await repo.findGroupInOrg(groupId, orgId);
  if (!group) throw new AppError(404, 'Group not found');
  return videosRepo.createVideo({
    branchId: group.branch_id,
    groupId,
    uploadedBy: userId,
    title,
    videoKey,
    durationSec,
  });
}

export async function listVideosForGroup(orgId, groupId) {
  const group = await repo.findGroupInOrg(groupId, orgId);
  if (!group) throw new AppError(404, 'Group not found');
  return videosRepo.listForGroup(groupId);
}
