import { AppError } from '../../../utils/AppError.js';
import * as repo from './rooms.repository.js';

export async function listRooms(branchId) {
  return repo.listRoomsByBranch(branchId);
}

export async function createRoom(branchId, body) {
  return repo.insertRoom({ branchId, name: body.name, capacity: body.capacity });
}

export async function updateRoom(branchId, roomId, patch) {
  const room = await repo.findRoomInBranch(roomId, branchId);
  if (!room) throw new AppError(404, 'Room not found in your branch');
  return repo.updateRoom(roomId, branchId, patch);
}

export async function deleteRoom(branchId, roomId) {
  const room = await repo.findRoomInBranch(roomId, branchId);
  if (!room) throw new AppError(404, 'Room not found in your branch');
  const busy = await repo.countActiveGroupsInRoom(roomId);
  if (busy > 0) throw new AppError(409, 'Room still has active groups assigned — reassign them first');
  await repo.softDeleteRoom(roomId, branchId);
}
